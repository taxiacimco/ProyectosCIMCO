import Swal from 'sweetalert2';

/**
 * Notificación tipo Toast (esquina superior) que no interrumpe
 */
export const notificarExito = (mensaje) => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#0f172a', // Slate 900
    color: '#f8fafc',
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  });

  Toast.fire({
    icon: 'success',
    title: mensaje
  });
};

/**
 * Alerta de error crítica
 */
export const notificarError = (titulo, error) => {
  Swal.fire({
    title: titulo,
    text: error,
    icon: 'error',
    background: '#0f172a',
    color: '#f8fafc',
    confirmButtonColor: '#3b82f6',
    borderRadius: '20px'
  });
};

/**
 * Sonido de Alerta para Viajes Nuevos
 */
export const reproducirSonidoAlerta = () => {
  const audio = new Audio('/sounds/notification.mp3'); // Asegúrate de tener este archivo en public/sounds/
  audio.play().catch(e => console.log("Esperando interacción del usuario para audio"));
};