// ===============================================================
// 🚀 TAXIA CIMCO — GENERADOR DE CÓDIGOS QR POR ROL (con título y texto central)
// ===============================================================

import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import Jimp from "jimp"; // <-- nuevo para editar imagenes

const __dirname = path.resolve();

// === 1. Directorio de salida ===
const outputDir = path.join(__dirname, "panel", "public", "qr");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// === 2. Enlaces por rol ===
const roleLinks = {
  pasajero: "https://pelagic-chalice-467818-e1-pasajero.web.app",
  mototaxi: "https://pelagic-chalice-467818-e1-mototaxi.web.app",
  motoparrillero: "https://pelagic-chalice-467818-e1-motoparrillero.web.app",
  motocarga: "https://pelagic-chalice-467818-e1-motocarga.web.app",
  despachador: "https://pelagic-chalice-467818-e1-despachador.web.app",
  interconductor: "https://pelagic-chalice-467818-e1-interconductor.web.app"
};

// === 3. Generar QR por cada rol ===
const htmlCards = [];

for (const [role, url] of Object.entries(roleLinks)) {
  const filePath = path.join(outputDir, `${role}.png`);

  // Generar QR base
  const qrBuffer = await QRCode.toBuffer(url, {
    color: { dark: "#000000", light: "#ffffff" },
    width: 400,
    margin: 2
  });

  // Cargar QR en Jimp para agregar texto
  const qrImage = await Jimp.read(qrBuffer);

  // Crear fondo más grande para título y texto central
  const width = qrImage.bitmap.width;
  const height = qrImage.bitmap.height + 100; // espacio para el título
  const bg = new Jimp(width, height, "#FFFFFF");

  // Insertar QR al fondo
  bg.composite(qrImage, 0, 80);

  // Cargar fuente (blanca y negra por contraste)
  const fontBlack = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const fontBlue = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

  // Escribir título del rol
  bg.print(fontBlack, 0, 10, { text: role.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width, 40);

  // Escribir texto “TAXIA CIMCO” en el centro del QR
  bg.print(fontBlue, 0, qrImage.bitmap.height / 2 + 60, { text: "TAXIA CIMCO", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width, 20);

  await bg.writeAsync(filePath);
  console.log(`✅ QR generado para ${role}: ${filePath}`);

  // Agregar al HTML resumen
  htmlCards.push(`
    <div class="card">
      <h3>${role.toUpperCase()}</h3>
      <img src="./${role}.png" alt="QR ${role}" />
      <p><a href="${url}" target="_blank">${url}</a></p>
    </div>
  `);
}

// === 4. Crear index.html con todos los QR ===
const htmlOutput = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Códigos QR — TAXIA CIMCO</title>
<style>
body { background:#0a0a1a; color:#f0f0f0; font-family:Inter,Segoe UI,sans-serif; text-align:center; }
h1 { color:#00d0ff; margin-top:20px; }
.grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px; margin:40px auto; max-width:1200px; }
.card { background:#121228; border-radius:12px; padding:16px; box-shadow:0 0 12px rgba(0,208,255,0.15); }
.card img { width:250px; margin:10px auto; border-radius:8px; background:#fff; padding:8px; }
a { color:#00d0ff; text-decoration:none; font-size:0.9rem; word-break:break-all; }
footer { margin-top:30px; font-size:13px; color:#aaa; }
</style>
</head>
<body>
  <h1>📱 Códigos QR por Rol — TAXIA CIMCO</h1>
  <div class="grid">
    ${htmlCards.join("\n")}
  </div>
  <footer>Generado automáticamente — ${new Date().toLocaleString()}</footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outputDir, "index.html"), htmlOutput, "utf-8");
console.log(`🌐 Archivo HTML generado en: ${outputDir}\\index.html`);
