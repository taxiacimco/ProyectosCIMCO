package com.cimco.api.controller;

import com.cimco.api.model.Usuario;
import com.cimco.api.service.UsuarioService;
import com.cimco.api.service.NotificacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para la gestión de conductores y transacciones de billetera.
 * Integra Firebase Cloud Messaging para alertas automáticas de saldo.
 */
@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private NotificacionService notificacionService;

    /**
     * POST: Sincroniza o crea un perfil de usuario en Firestore.
     */
    @PostMapping("/guardar")
    public ResponseEntity<Map<String, Object>> guardar(@RequestBody Usuario usuario) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (usuario.getId() == null || usuario.getId().isEmpty()) {
                throw new IllegalArgumentException("El ID (UID) del usuario es obligatorio.");
            }
            
            String uid = usuarioService.guardarUsuario(usuario);
            
            response.put("success", true);
            response.put("message", "Perfil sincronizado correctamente.");
            response.put("uid", uid);
            
            System.out.println("👤 Usuario Sincronizado: " + uid);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error interno: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * GET: Obtiene la lista completa de conductores.
     */
    @GetMapping("/listar")
    public ResponseEntity<List<Usuario>> listarTodos() {
        try {
            List<Usuario> lista = usuarioService.listarTodos();
            return ResponseEntity.ok(lista);
        } catch (Exception e) {
            System.err.println("❌ Error al listar usuarios: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET: Consulta un conductor por su ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable String id) {
        try {
            Usuario usuario = usuarioService.obtenerUsuarioPorId(id);
            if (usuario != null) {
                return ResponseEntity.ok(usuario);
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("message", "El usuario no existe.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    /**
     * POST: Recarga de Saldo (Wallet) con Notificación Push Automática.
     * Body JSON: { "uid": "ID_CONDUCTOR", "monto": 50000 }
     */
    @PostMapping("/pagar-comision")
    public ResponseEntity<Map<String, Object>> recargarSaldo(@RequestBody Map<String, Object> datosPago) {
        Map<String, Object> response = new HashMap<>();
        try {
            String uid = (String) datosPago.get("uid");
            Object montoObj = datosPago.get("monto");

            if (uid == null || montoObj == null) {
                response.put("success", false);
                response.put("message", "UID y Monto son requeridos.");
                return ResponseEntity.badRequest().body(response);
            }

            Double monto = Double.valueOf(montoObj.toString());
            
            // 1. Ejecutar la lógica de negocio (Actualizar Firestore)
            String resultado = usuarioService.recargarSaldo(uid, monto);
            
            // 2. Intentar enviar Notificación Push al conductor
            enviarNotificacionRecarga(uid, monto);
            
            response.put("success", true);
            response.put("message", "Recarga exitosa y notificación enviada.");
            response.put("log", resultado);
            
            System.out.println("💰 Recarga Procesada -> Conductor: " + uid + " | Monto: $" + monto);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al procesar recarga: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * POST: Descuento manual o automático de comisión.
     */
    @PostMapping("/descontar-comision")
    public ResponseEntity<Map<String, Object>> descontarComision(
            @RequestParam String conductorId, 
            @RequestParam double tarifa) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            String resultado = usuarioService.descontarComision(conductorId, tarifa);
            response.put("success", true);
            response.put("message", "Comisión descontada.");
            response.put("log", resultado);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED).body(response);
        }
    }

    /**
     * DELETE: Elimina un conductor de Firestore.
     */
    @DeleteMapping("/eliminar/{id}")
    public ResponseEntity<Map<String, Object>> eliminar(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            String mensaje = usuarioService.eliminarUsuario(id);
            response.put("success", true);
            response.put("message", mensaje);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al eliminar: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Método privado para gestionar el envío de la notificación sin bloquear la respuesta principal.
     */
    private void enviarNotificacionRecarga(String uid, Double monto) {
        try {
            Usuario u = usuarioService.obtenerUsuarioPorId(uid);
            if (u != null && u.getFcmToken() != null && !u.getFcmToken().isEmpty()) {
                String titulo = "¡Recarga Exitosa! 💰";
                String mensaje = "Se han acreditado $" + String.format("%.0f", monto) + " a tu billetera Cimco.";
                notificacionService.enviarNotificacionPersonalizada(u.getFcmToken(), titulo, mensaje);
            } else {
                System.out.println("⚠️ No se envió notificación: El usuario " + uid + " no tiene un FCM Token registrado.");
            }
        } catch (Exception e) {
            System.err.println("❌ Error al enviar notificación push: " + e.getMessage());
        }
    }
}