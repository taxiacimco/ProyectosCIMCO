import React, { useEffect } from 'react';

const AcercaDe = () => {
    // Replicamos la lógica de animación que tenías en el script
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                }
            });
        }, { threshold: 0.2 });

        document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            {/* Header */}
            <header className="bg-white shadow-lg sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-blue-600">
                        <i className="fas fa-taxi text-3xl"></i>
                        <h1 className="text-3xl font-bold">TAXIA</h1>
                    </div>
                </div>
            </header>

            <main className="py-20">
                <section className="container mx-auto max-w-5xl text-center px-4 animate-on-scroll opacity-0 translate-y-10 transition-all duration-700">
                    <h2 className="text-4xl font-extrabold text-blue-600 mb-4">¿Quiénes Somos?</h2>
                    <p className="text-lg text-gray-600">Conoce la historia y los valores que nos impulsan en La Jagua de Ibirico.</p>
                </section>

                <section className="py-16 px-4 bg-white mt-10">
                    <div className="container mx-auto max-w-5xl grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h3 className="text-3xl font-bold text-gray-800 mb-4">Nuestra Misión</h3>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                Ofrecer un servicio de transporte <strong>seguro, rápido y confiable</strong> utilizando tecnología de punta.
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <div className="w-full max-w-sm h-64 bg-blue-100 rounded-3xl flex items-center justify-center shadow-lg">
                                <i className="fas fa-bullseye text-blue-600 text-6xl"></i>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AcercaDe;