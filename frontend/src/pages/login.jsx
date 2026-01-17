import React, { useEffect, useState } from 'react'; // IMPORTACIÓN CRUCIAL
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, MessageSquare, X, UserCheck } from 'lucide-react';

const LoginPage = () => {
  const { user, loginWithGoogle, loading, currentRole, sendPasswordReset, loginWithPhone } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMethod, setResetMethod] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [verificationCode, setVerificationCode] = useState(''); 
  const [confirmationResult, setConfirmationResult] = useState(null); 
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [qrRole, setQrRole] = useState(null);

  // 1. LÓGICA DE AUTOREGISTRO (LECTURA DE QR)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleFromUrl = params.get('role');
    if (roleFromUrl) {
      setQrRole(roleFromUrl);
      localStorage.setItem('pendingRole', roleFromUrl);
    }
  }, [location]);

  // 2. REDIRECCIÓN AUTOMÁTICA SEGÚN ROL
  useEffect(() => {
    if (user && !loading) {
      console.log("[LOGIN] Redirigiendo usuario con rol:", currentRole);
      switch (currentRole) {
        case 'admin': navigate('/admin/dashboard'); break;
        case 'mototaxi': navigate('/mototaxi/panel'); break;
        case 'pasajero': navigate('/pasajero/panel'); break;
        case 'motocarga': navigate('/motocarga/panel'); break;
        case 'despachadorinter': navigate('/despachador/panel'); break;
        case 'cond_inter': navigate('/conductor-inter/panel'); break;
        default: navigate('/welcome'); 
      }
    }
  }, [user, loading, currentRole, navigate]);

  const closeModal = () => {
    setShowResetModal(false);
    setResetMethod(null);
    setInputValue('');
    setVerificationCode('');
    setConfirmationResult(null);
    setStatusMsg({ type: '', text: '' });
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: 'info', text: 'Procesando...' });
    try {
      if (resetMethod === 'email') {
        await sendPasswordReset(inputValue);
        setStatusMsg({ type: 'success', text: 'Enlace enviado a tu correo.' });
      } else {
        const result = await loginWithPhone(inputValue, 'recaptcha-container');
        setConfirmationResult(result);
        setStatusMsg({ type: 'success', text: 'Código enviado al celular.' });
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Error en la recuperación.' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      {qrRole && (
        <div className="mb-6 bg-blue-600 text-white px-6 py-3 rounded-full flex items-center shadow-lg animate-bounce">
          <UserCheck className="mr-2" size={20} />
          <span className="font-bold text-sm uppercase">Registrándote como: {qrRole}</span>
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border-t-4 border-blue-600">
        <img src="/img/logo-taxiacimco.png" alt="Logo" className="mx-auto w-32 mb-6" />
        <h1 className="text-2xl font-bold mb-2 text-gray-800">TAXIA CIMCO</h1>
        <p className="text-gray-500 mb-8 text-sm italic">Movilidad inteligente y segura</p>

        <button 
          onClick={loginWithGoogle} 
          disabled={loading} 
          className="w-full flex items-center justify-center bg-white border border-gray-300 p-3 rounded-xl hover:bg-gray-50 transition mb-4 font-bold text-gray-700 shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" className="w-5 h-5 mr-3" alt="G" />
          {loading ? 'Cargando...' : qrRole ? `Registrarme como ${qrRole}` : 'Ingresar con Google'}
        </button>

        <button onClick={() => setShowResetModal(true)} className="text-sm text-blue-600 hover:underline font-medium">
          ¿Olvidaste tu contraseña o método de acceso?
        </button>
      </div>

      {/* Modal de recuperación omitido aquí por brevedad, pero debe mantenerse igual */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default LoginPage;