import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'API TAXIA CIMCO funcionando correctamente 🎉' });
});

export default router;
