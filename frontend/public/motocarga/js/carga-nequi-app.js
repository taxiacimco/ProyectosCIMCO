import NequiRechargeFlow from '../../components/NequiRechargeFlow.jsx';

// La función para montar la aplicación React
const mountNequiApp = () => {
    // 1. Obtener el contenedor HTML
    const container = document.getElementById('nequiView');
    if (!container) return;

    // 2. Montar el componente React.
    // IMPORTANTE: Pasamos el rol 'Motocarga' como prop al componente.
    const root = ReactDOM.createRoot(container);
    root.render(
        React.createElement(NequiRechargeFlow, { userRole: 'Motocarga' })
    );

    console.log('Aplicación Nequi montada para Motocarga.');
    
    // Almacenamos la raíz para poder desmontarla si es necesario.
    window.nequiRootMotocarga = root;
};

// Escuchamos el evento personalizado que disparamos desde el HTML
window.addEventListener('nequiViewActivated', mountNequiApp, { once: true });

// Montaje inicial si la vista estuviera activa por defecto (no es el caso aquí)
if (!document.getElementById('mapView').classList.contains('view-active')) {
    mountNequiApp();
}