import React from 'react';

const BotonRecarga = ({ emailConductor = "mototaxi@test.com", monto = 1000 }) => {
  const handlePago = () => {
    const checkout = new WidgetCheckout({
      currency: 'COP',
      amountInCents: monto * 100, // Wompi usa centavos ($1000 = 100000)
      reference: `TAXIA-${Date.now()}`,
      publicKey: 'pub_test_Q5yDA9xoKdePzhS8qn70X0S7v6pAAnS4', // Llave de pruebas
      redirectUrl: 'http://localhost:5173/wallet',
      customerData: {
        email: emailConductor,
        fullName: 'Conductor TaxiA'
      }
    });

    checkout.open((result) => {
      if (result.transaction.status === 'APPROVED') {
        console.log("Pago aprobado, esperando webhook...");
      }
    });
  };

  return (
    <button
      onClick={handlePago}
      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all"
    >
      ⚡ Recargar ${monto.toLocaleString()}
    </button>
  );
};

export default BotonRecarga;