// testFirestore.js
import admin from "firebase-admin";
import fs from "fs";

// ✅ Ajusta al nombre real de tu archivo
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

// Inicializa Firebase Admin con la cuenta de servicio
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testConnection() {
  try {
    const docRef = db.collection("testConnection").doc("prueba_" + Date.now());
    await docRef.set({
      mensaje: "Conexión exitosa con Firestore 🚀",
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Conexión correcta a Firestore.");
    console.log("Documento de prueba creado en la colección 'testConnection'.");
  } catch (error) {
    console.error("❌ Error al conectar con Firestore:", error);
  }
}

testConnection();
