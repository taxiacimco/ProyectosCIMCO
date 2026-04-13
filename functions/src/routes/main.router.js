import { Router } from 'express';

const router = Router();

// Ruta de diagnóstico del Router
router.get('/health', (req, res) => {
    res.status(200).send("ROUTER CIMCO: CONECTADO Y LIMPIO");
});

// 🚧 MANTÉN TODO ESTO COMENTADO POR AHORA 🚧
// import authRouter from './auth.routes.js';
// import ridesRouter from './rides.routes.js';       
// import driverRouter from './driver.routes.js';     
// ... (el resto de tus importaciones)

// router.use('/auth', authRouter);
// router.use('/rides', ridesRouter);
// ... (el resto de tus rutas)

export default router;