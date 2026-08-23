// Versión Arquitectura: V10.01 - Delegación Centralizada de Excepciones a Middleware (next) y Generación de Excel
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\excel\excel.controller.js
 * Misión: Exportar directorio global de usuarios, conductores y pasajeros en formato Excel (.xlsx).
 * Ajuste V10.01: Refactorización de controladores asíncronos para delegar la captura de excepciones al middleware centralizado de errores mediante next(error).
 */

import ExcelJS from 'exceljs';
import Usuario from '../../models/Usuario.js';
import Conductor from '../../models/Conductor.js';
import Pasajero from '../../models/Pasajero.js';

export const exportarDirectorioExcel = async (req, res, next) => {
    try {
        const workbook = new ExcelJS.Workbook();
        
        // 1. Consulta simultánea de todas las colecciones
        const [usuarios, conductores, pasajeros] = await Promise.all([
            Usuario.find().lean(),
            Conductor.find().lean(),
            Pasajero.find().lean()
        ]);

        // 2. Hoja 1: CONDUCTORES
        const sheetConductores = workbook.addWorksheet('CONDUCTORES');
        sheetConductores.columns = [
            { header: 'ID', key: '_id', width: 25 },
            { header: 'Nombre', key: 'nombre', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Rol', key: 'rol', width: 15 },
            { header: 'Subrol', key: 'subrol', width: 15 },
            { header: 'Placa', key: 'placa', width: 12 },
            { header: 'N° Interno', key: 'numeroInterno', width: 12 },
            { header: 'Empresa / Coop', key: 'cooperativa', width: 20 },
            { header: 'Estado Admin', key: 'estadoAdministrativo', width: 15 },
            { header: 'Foto Perfil (URL)', key: 'foto_perfil', width: 30 },
            { header: 'Doc Cédula (URL)', key: 'documento_cedula', width: 30 },
            { header: 'Doc Licencia (URL)', key: 'documento_licencia', width: 30 },
            { header: 'Doc Tarjeta Prop. (URL)', key: 'doc_tarjeta', width: 30 }
        ];

        (conductores || []).forEach(c => {
            if (!c) return;
            sheetConductores.addRow({
                ...c,
                telefono: c.telefonoMovil || c.telefono || 'N/A',
                cooperativa: c.cooperativa || c.empresa || 'N/A',
                subrol: c.subrol || 'N/A'
            });
        });

        // 3. Hoja 2: ADMINISTRATIVOS Y DESPACHADORES
        const sheetStaff = workbook.addWorksheet('ADMINISTRATIVOS');
        sheetStaff.columns = [
            { header: 'ID', key: '_id', width: 25 },
            { header: 'Nombre', key: 'nombre', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Rol', key: 'rol', width: 15 },
            { header: 'Nivel Acceso', key: 'access_level', width: 12 },
            { header: 'Terminal / Sede', key: 'terminal_sede', width: 20 },
            { header: 'Empresa / Coop', key: 'empresa', width: 20 },
            { header: 'Doc Identificación (URL)', key: 'doc_identificacion', width: 30 },
            { header: 'Foto Perfil (URL)', key: 'foto_perfil', width: 30 }
        ];

        (usuarios || []).forEach(u => {
            if (!u) return;
            sheetStaff.addRow({
                ...u,
                terminal_sede: u.terminal_sede || u.terminal_id || u.cooperativa || 'N/A',
                doc_identificacion: u.doc_identificacion || 'N/A'
            });
        });

        // 4. Hoja 3: PASAJEROS
        const sheetPasajeros = workbook.addWorksheet('PASAJEROS');
        sheetPasajeros.columns = [
            { header: 'ID', key: '_id', width: 25 },
            { header: 'Nombre', key: 'nombre', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Foto Perfil (URL)', key: 'foto_perfil', width: 30 }
        ];

        (pasajeros || []).forEach(p => {
            if (!p) return;
            sheetPasajeros.addRow({
                ...p,
                nombre: p.fullName || p.nombre || 'N/A'
            });
        });

        // 5. Configurar Encabezados de Respuesta HTTP para Descarga Directa
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Directorio_Global_CIMCO_${Date.now()}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.status(200).end();

    } catch (error) {
        console.error("🚨 Error al generar archivo Excel:", error);
        next(error);
    }
};

export default {
    exportarDirectorioExcel
};