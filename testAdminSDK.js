import { asignarRol, registrarMovimiento, obtenerUsuario } from "./lib/adminSDK.js";

// Sustituye por un UID real de Firebase Auth
const uid = "AQUI_TU_UID_DE_PRUEBA";

(async () => {
  await asignarRol(uid, "conductor");
  const user = await obtenerUsuario(uid);
  console.log("Usuario obtenido:", user);

  await registrarMovimiento("prueba", {
    descripcion: "Test de registro de movimiento desde adminSDK.js",
  });
})();
