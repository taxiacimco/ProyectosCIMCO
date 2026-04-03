import React, { useState } from 'react';

// Constantes de la empresa
const CIMCO_NEQUI_NUMBER = '3104180514';
const CIMCO_COMPANY_NAME = 'CIMCO (Carlos Fuentes)';

// Roles disponibles en la aplicación
const ROLES = [
  'Mototaxi',
  'Motoparrillero',
  'Motocarga',
  'Despachador Inter',
];

/**
 * Componente principal de la aplicación.
 * Implementa el flujo de recarga Nequi en tres pasos.
 * @param {object} props - Propiedades del componente
 * @param {string} props.userRole - El rol del usuario que está utilizando la aplicación (ej: 'Mototaxi')
 */
const App = ({ userRole = 'Mototaxi' }) => {
  const [step, setStep] = useState(1); // 1: Input, 2: Instrucciones Nequi, 3: Confirmación
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Usamos el userRole pasado por props si está disponible, sino usamos 'Mototaxi' por defecto
  const currentRole = ROLES.includes(userRole) ? userRole : ROLES[0];

  // Función para manejar el inicio de la recarga
  const handleInitiateRecharge = (e) => {
    e.preventDefault();
    setMessage('');
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setMessage('Por favor, ingresa un monto válido para recargar.');
      return;
    }
    setStep(2); // Avanza al paso de instrucciones
  };

  // Función para simular la confirmación de la transferencia
  const handlePaymentConfirmed = () => {
    setLoading(true);
    // Simulación de espera de confirmación del sistema (3 segundos)
    setTimeout(() => {
      setLoading(false);
      setStep(3); // Avanza al paso de confirmación final
    }, 3000);
  };

  // Función para reiniciar el flujo
  const handleNewRecharge = () => {
    setStep(1);
    setAmount('');
    setMessage('');
  };

  // Estilos base de Tailwind
  const cardClasses = "bg-white p-6 md:p-10 rounded-xl shadow-2xl w-full max-w-lg transition-all duration-300 transform scale-100";
  const buttonClasses = "w-full py-3 mt-4 text-white font-bold rounded-lg transition duration-200 ease-in-out transform hover:scale-[1.01] focus:outline-none focus:ring-4";
  const inputClasses = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-500 transition duration-150";

  // --- Renderizado de los pasos ---

  const Step1Input = () => (
    <form onSubmit={handleInitiateRecharge}>
      <h2 className="text-2xl font-extrabold text-gray-800 mb-6">Paso 1: Datos de Recarga</h2>

      {message && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-lg" role="alert">
          <p className="font-bold">Error:</p>
          <p>{message}</p>
        </div>
      )}

      {/* Rol (Se muestra pero es fijo por el contexto del panel) */}
      <div className="mb-6">
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
          Tu Rol:
        </label>
        <div className="p-3 bg-gray-100 rounded-lg border border-gray-300 text-lg font-semibold text-purple-700">
          {currentRole}
        </div>
        <p className="text-xs text-gray-500 mt-1">Este valor es fijo para este panel.</p>
      </div>

      {/* Input de Monto */}
      <div className="mb-6">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Monto a Recargar (COP):
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-lg font-semibold text-green-600">$</span>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClasses} pl-8 text-xl font-bold text-green-700`}
            placeholder="Ej: 15000"
            min="1000"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className={`${buttonClasses} bg-purple-600 hover:bg-purple-700`}
      >
        Continuar con la Recarga
      </button>
    </form>
  );

  const Step2Instructions = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-purple-600 mb-6">Paso 2: Realiza la Transferencia Nequi</h2>
      <p className="text-gray-700 mb-6">
        Para completar la recarga de <span className="font-bold text-xl text-green-600">${parseFloat(amount).toLocaleString('es-CO')} COP</span>, por favor sigue estos pasos:
      </p>

      <div className="space-y-4 text-left">
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 shadow-md">
          <p className="font-semibold text-lg text-gray-800 flex items-center mb-1">
            <span className="bg-purple-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm mr-2">1</span>
            Abre tu aplicación Nequi personal.
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 shadow-md">
          <p className="font-semibold text-lg text-gray-800 flex items-center mb-1">
            <span className="bg-purple-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm mr-2">2</span>
            Selecciona la opción "Envía" o "Transferir".
          </p>
        </div>
        
        <div className="p-4 bg-purple-100 rounded-lg border border-purple-400 shadow-lg">
          <p className="font-semibold text-lg text-gray-800 mb-2">
            <span className="bg-purple-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm mr-2 inline-flex">3</span>
            Transfiere el monto exacto:
          </p>
          <p className="text-center my-3">
            <span className="block text-3xl font-extrabold text-green-700">${parseFloat(amount).toLocaleString('es-CO')}</span>
          </p>
          <p className="font-semibold text-gray-800 mt-2">Al número Nequi de la empresa CIMCO:</p>
          <div className="text-center border border-dashed border-purple-500 p-2 mt-1 rounded-md bg-white">
            <span className="text-2xl font-mono text-purple-700 select-all">{CIMCO_NEQUI_NUMBER}</span>
            <p className="text-sm text-gray-500">({CIMCO_COMPANY_NAME})</p>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mt-6 italic">
        Una vez que la transferencia en Nequi sea exitosa, haz clic en el botón de abajo.
      </p>

      <button
        onClick={handlePaymentConfirmed}
        className={`${buttonClasses} ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando confirmación...
          </div>
        ) : (
          '¡Ya Hice la Transferencia Nequi!'
        )}
      </button>
      <button
        onClick={() => setStep(1)}
        className="w-full py-3 mt-2 text-purple-600 font-semibold rounded-lg hover:bg-purple-100 transition duration-150"
      >
        Regresar
      </button>
    </div>
  );

  const Step3Confirmation = () => (
    <div className="text-center">
      <div className="text-green-500 mb-6 mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-green-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-2xl font-extrabold text-green-700 mb-3">¡Recarga Solicitada con Éxito!</h2>
      <p className="text-gray-700 mb-4">
        Tu recarga de <span className="font-bold text-xl text-green-700">${parseFloat(amount).toLocaleString('es-CO')} COP</span> ha sido registrada.
      </p>
      <p className="text-gray-600 mb-6">
        En unos minutos, el sistema verificará la transferencia en el Nequi de CIMCO ({CIMCO_NEQUI_NUMBER}) y tu saldo será actualizado.
      </p>
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm font-medium text-yellow-800">
          Recuerda guardar la captura de pantalla de tu transferencia Nequi como soporte.
        </p>
      </div>

      <button
        onClick={handleNewRecharge}
        className={`${buttonClasses} bg-purple-500 hover:bg-purple-600`}
      >
        Realizar otra recarga
      </button>
    </div>
  );

  // Determinar qué paso renderizar
  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Input />;
      case 2:
        return <Step2Instructions />;
      case 3:
        return <Step3Confirmation />;
      default:
        return <Step1Input />;
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-0 font-sans">
      <div className={cardClasses}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 p-2 bg-purple-600 rounded-full text-white shadow-lg">
            {/* Ícono de Nequi / Dinero */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-lg font-bold">Recarga Nequi CIMCO</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Flujo para {currentRole}</p>
        </div>

        {renderStep()}

        {/* Indicador de pasos */}
        <div className="flex justify-center mt-8 space-x-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-1 rounded-full ${step === s ? 'bg-purple-600' : 'bg-gray-300'}`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;