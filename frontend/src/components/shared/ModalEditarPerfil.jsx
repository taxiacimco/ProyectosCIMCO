// Versión Arquitectura: V2.1 - Implementación de Sanitización y Validación Regex de Teléfono Móvil (Colombia 10 Dígitos)

import React, { useState, useEffect } from "react";
import { X, Save, Phone, User, Landmark, Loader2 } from "lucide-react";
import api from "@/config/api";

const ModalEditarPerfil = ({ isOpen, onClose, user, onUpdateSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    nombre: "",
    telefonoMovil: "",
    // Campos opcionales o específicos del despachador/central
    cooperativa: "",
    empresa: "",
  });

  // Sincronizar datos del usuario logueado al abrir el modal con guardas anti-undefined
  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user?.nombre || user?.fullName || "",
        telefonoMovil: user?.telefonoMovil || user?.telefono || "",
        cooperativa: user?.cooperativa || "",
        empresa: user?.empresa || "",
      });
      setError("");
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Sanitización en vivo para el campo teléfono (solo dígitos)
    if (name === "telefonoMovil") {
      const sanitizedValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Blindaje de seguridad y sanitización preliminar
    const nombreSanitizado = (formData.nombre || "").trim();
    const telefonoLimpio = (formData.telefonoMovil || "").trim();

    if (!nombreSanitizado) {
      setError("El nombre completo es un campo obligatorio.");
      setLoading(false);
      return;
    }

    // Validación estricta con Expresión Regular para formato celular en Colombia (10 dígitos iniciando en 3)
    const regexTelefonoColombia = /^3\d{9}$/;
    if (!regexTelefonoColombia.test(telefonoLimpio)) {
      setError("Ingrese un número celular válido de Colombia (10 dígitos iniciando con 3).");
      setLoading(false);
      return;
    }

    const payloadFormat = {
      ...formData,
      nombre: nombreSanitizado,
      telefonoMovil: telefonoLimpio,
      cooperativa: (formData.cooperativa || "").trim(),
      empresa: (formData.empresa || "").trim(),
    };

    try {
      // Petición PUT dinámica al controlador unificado de autenticación/perfil
      const response = await api.put("/auth/update-profile", payloadFormat);
      
      if (response?.data?.success) {
        if (onUpdateSuccess) {
          onUpdateSuccess(response.data.user);
        }
        onClose();
      }
    } catch (err) {
      console.error("❌ Error actualizando perfil:", err);
      setError(err?.response?.data?.message || "Ocurrió un error al guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md backdrop-blur-md bg-[#121214]/95 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 relative">
        
        {/* Botón Cerrar */}
        <button 
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Cabecera del Modal */}
        <div className="space-y-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            Configuración del Perfil
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            Rol actual: {user?.rol || user?.role || "Operador"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Campo: Nombre */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} className="text-zinc-500" /> Nombre Completo
            </label>
            <input 
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              placeholder="Ej: Carlos Fuentes"
              className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-orange-500/40 transition-all font-mono placeholder:text-zinc-700"
            />
          </div>

          {/* Campo: Teléfono */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={12} className="text-zinc-500" /> Teléfono Móvil de Contacto
            </label>
            <input 
              type="tel"
              name="telefonoMovil"
              value={formData.telefonoMovil}
              onChange={handleChange}
              required
              maxLength={10}
              placeholder="Ej: 3101234567"
              className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-orange-500/40 transition-all font-mono placeholder:text-zinc-700"
            />
          </div>

          {/* Campos condicionales para despachadores o perfiles que tengan asignados cooperativas */}
          {(user?.rol === 'despachador' || user?.role === 'despachador' || formData.cooperativa || formData.empresa) && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark size={12} className="text-zinc-500" /> Nombre de la Terminal / Cooperativa
              </label>
              <input 
                type="text"
                name="cooperativa"
                value={formData.cooperativa || formData.empresa}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    cooperativa: val,
                    empresa: val
                  }));
                }}
                placeholder="Ej: Terminal La Jagua"
                className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-orange-500/40 transition-all font-mono placeholder:text-zinc-700"
              />
            </div>
          )}

          {error && (
            <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl font-mono uppercase tracking-wide">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 bg-zinc-950 hover:bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 text-zinc-950 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save size={12} /> Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarPerfil;