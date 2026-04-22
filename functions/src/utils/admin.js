import admin, { db, auth, storage } from "../firebase/firebase-admin.js";

// Extraemos el servicio de mensajería (Push Notifications)
const messaging = admin.messaging();

export { db, auth, storage, messaging, admin };