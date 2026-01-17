import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import router from './routes/index.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Ruta principal
app.use('/api', router);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🔥 API TAXIA CIMCO corriendo en puerto ${PORT}`);
});
