// ===========================================================
// 🚀 AUTO UPDATE STATUS — Simulador de estado Firestore
// ===========================================================

import fs from "fs";
import path from "path";

const LOGS_DIR = "C:\\Users\\Carlos Fuentes\\ProyectosCIMCO\\logs";
const FILE_PATH = path.join(LOGS_DIR, "status.json");

function generarEstado() {
  const estados = ["OK", "ERROR", "REVIEW"];
  const status = estados[Math.floor(Math.random() * estados.length)];
  const mensaje =
    status === "OK"
      ? "Firestore operativo"
      : status === "ERROR"
      ? "Error durante la verificación de Firestore"
      : "Verificación en curso";

  const contenido = {
    status,
    message: mensaje,
    lastCheck: new Date().toISOString().replace("T", " ").substring(0, 19),
  };

  fs.writeFileSync(FILE_PATH, JSON.stringify(contenido, null, 2), "utf8");
  console.log(`🕓 Estado actualizado → ${status}`);
}

// Actualizar cada 90 segundos
setInterval(generarEstado, 90000);
generarEstado();
