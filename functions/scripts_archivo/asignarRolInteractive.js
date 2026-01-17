// asignarRolInteractive.js
import admin from "firebase-admin";
import { readFileSync } from "fs";
import readline from "readline";

// 🚀 Inicializa Firebase Admin con tus credenciales
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Función para asignar rol
const asignarRol = async (uid, rol) => {
  try {
    // 1. Asignar Custom Claims
    await admin.auth().setCustomUserClaims(uid, { rol });

    // 2. Guardar en Firestore (colección users)
    await admin.firestore().collection("users").doc(uid).set(
      {
        rol,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ Rol '${rol}' asignado correctamente al usuario ${uid}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al asignar rol:", error);
    process.exit(1);
  }
};

// Preguntar interactivamente
rl.question("👉 Ingresa el UID del usuario: ", (uid) => {
  rl.question("👉 Ingresa el rol a asignar (pasajero, mototaxi, motoparrillero, motocarga, despachadorinter, conductorinter, ceo): ", (rol) => {
    asignarRol(uid.trim(), rol.trim());
    rl.close();
  });
});
