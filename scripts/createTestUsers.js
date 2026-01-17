// scripts/createTestUsers.js
const init = require('./initAdminSDKEmulator');
const admin = init();

async function main() {
  try {
    // Asegúrate de tener FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 en tu env
    const users = [
      { uid: 'uid_pasajero', email: 'pasajero@local.test', password: 'pass123', role: 'pasajero' },
      { uid: 'uid_conductor', email: 'conductor@local.test', password: 'pass123', role: 'mototaxi' },
      { uid: 'uid_admin', email: 'admin@local.test', password: 'pass123', role: 'admin' }
    ];

    for (const u of users) {
      try {
        await admin.auth().getUser(u.uid);
        console.log('Usuario ya existe:', u.uid);
      } catch (e) {
        await admin.auth().createUser({ uid: u.uid, email: u.email, password: u.password });
        console.log('Usuario creado:', u.uid);
      }
      await admin.auth().setCustomUserClaims(u.uid, { role: u.role, email: u.email });
      console.log('Claims seteadas:', u.uid, u.role);
    }

    console.log('Usuarios creados y claims asignadas.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
