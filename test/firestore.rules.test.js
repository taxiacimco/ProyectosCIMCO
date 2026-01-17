// test/firestore.rules.test.js
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

const projectId = 'demo-project';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync('database/firestore.rules', 'utf8'),
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

test('pasajero no puede leer location de otro conductor sin viaje', async () => {
  const pasante = testEnv.authenticatedContext('uid_pasajero', { role: 'pasajero' });
  const other = testEnv.unauthenticatedContext(); // o conductor
  const dbAsPasajero = pasante.firestore();

  const docRef = dbAsPasajero.doc(`locations/uid_conductor`);
  await assertFails(docRef.get());
});

test('conductor puede escribir su propia location', async () => {
  const conductorCtx = testEnv.authenticatedContext('uid_conductor', { role: 'mototaxi' });
  const db = conductorCtx.firestore();
  const write = db.doc('locations/uid_conductor').set({ lat: 1, lng: 2, ts: Date.now() });
  await assertSucceeds(write);
});
