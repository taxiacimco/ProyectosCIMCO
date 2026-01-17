import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs-extra";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "panel-mantenimiento.html"));
});

// Endpoint para leer estado Firestore
app.get("/status", async (req, res) => {
  try {
    const statusPath = path.join(
      process.env.SCRIPTS_PATH,
      "status.json"
    );
    const data = await fs.readJson(statusPath);
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: "ERROR", message: "No se pudo leer status.json" });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Panel TAXIA CIMCO activo en http://127.0.0.1:${PORT}`);
});
