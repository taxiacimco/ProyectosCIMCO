// Versión Arquitectura: V4.1 - Limpieza de Raíz
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Importamos la configuración centralizada para que sea la ÚNICA que se ejecute
import './firebase/firebaseConfig'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);