// scripts/initAdminSDKEmulator.js
const admin = require('firebase-admin');

function initApp() {
  // El emulador de Auth no requiere credenciales; pasamos projectId
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo' });
  return admin;
}

module.exports = initApp;
