import NequiRechargeFlow from '../../components/NequiRechargeFlow.jsx';

// La función para montar la aplicación React
const mountNequiApp = () => {
    // 1. Obtener el contenedor HTML
    const container = document.getElementById('nequiView');
    if (!container) return;

    // 2. Montar el componente React.
    // IMPORTANTE: Pasamos el rol 'Motoparrillero' como prop al componente.
    const root = ReactDOM.createRoot(container);
    root.render(
        React.createElement(NequiRechargeFlow, { userRole: 'Motoparrillero' })
    );

    console.log('Aplicación Nequi montada para Motoparrillero.');
    
    // Almacenamos la raíz para poder desmontarla si es necesario.
    window.nequiRootMotoparrillero = root;
};

// Escuchamos el evento personalizado que disparamos desde el HTML
window.addEventListener('nequiViewActivated', mountNequiApp, { once: true });

// Montaje inicial si la vista estuviera activa por defecto (no es el caso aquí)
if (!document.getElementById('mapView').classList.contains('view-active')) {
    mountNequiApp();
}