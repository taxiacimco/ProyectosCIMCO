import NequiRechargeFlow from '../../components/NequiRechargeFlow.jsx';

// La función para montar la aplicación React
const mountNequiApp = () => {
    // 1. Obtener el contenedor HTML
    const container = document.getElementById('nequiView');
    if (!container) return;

    // 2. Revisar si la aplicación ya está montada para evitar errores.
    // React 18 no tiene un método fácil para verificar, pero podemos confiar en que la activación solo ocurrirá una vez al cargar la vista.

    // 3. Montar el componente React.
    // Nota: Pasamos el rol 'Mototaxi' como prop al componente para que sepa qué mensaje mostrar.
    const root = ReactDOM.createRoot(container);
    root.render(
        React.createElement(NequiRechargeFlow, { userRole: 'Mototaxi' })
    );

    console.log('Aplicación Nequi montada para Mototaxi.');
    
    // Almacenamos la raíz para poder desmontarla si es necesario.
    window.nequiRootMototaxi = root;
};

// Escuchamos el evento personalizado que disparamos desde el HTML
window.addEventListener('nequiViewActivated', mountNequiApp, { once: true });

// También montamos inmediatamente si la vista está activa por defecto al cargar la página (aunque en este caso no lo está, es buena práctica)
if (!document.getElementById('mapView').classList.contains('view-active')) {
    mountNequiApp();
}