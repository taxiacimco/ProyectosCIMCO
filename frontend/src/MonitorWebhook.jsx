import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  Terminal,
  RefreshCw
} from 'lucide-react';

const MonitorWebhook = () => {
  // TU URL ACTUAL DE NGROK
  const NGROK_URL = "https://c8c360f762ae.ngrok-free.app";
  const WEBHOOK_PATH = "/api/viajes/webhook-taxia";
  const FULL_URL = `${NGROK_URL}${WEBHOOK_PATH}`;

  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('checking');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(FULL_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" /> 
              Configuración de Webhook Taxia
            </h1>
            <p className="text-slate-500 mt-1">Sincronización en tiempo real con la plataforma externa</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium border border-green-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Túnel ngrok Activo
          </div>
        </div>

        {/* URL Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-blue-100">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <span className="text-sm font-semibold uppercase tracking-wider">URL de Destino para Taxia</span>
            <Terminal size={18} className="opacity-80" />
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-lg border border-slate-700">
              <code className="text-blue-400 font-mono text-lg flex-1 break-all">
                {FULL_URL}
              </code>
              <button 
                onClick={copyToClipboard}
                className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
                title="Copiar URL"
              >
                {copied ? <CheckCircle2 className="text-green-500" /> : <Copy />}
              </button>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <p className="text-sm text-amber-800">
                  <strong>Importante:</strong> Si reinicias la terminal de ngrok, deberás actualizar esta URL en el panel de Taxia.
                </p>
              </div>
              <a 
                href="https://dashboard.ngrok.com/tunnels/agents" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-lg transition-all text-sm font-medium"
              >
                Ver Estado en ngrok <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Guía de Pasos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mb-4">1</div>
            <h3 className="font-semibold text-slate-800">Copia la URL</h3>
            <p className="text-sm text-slate-500 mt-2">Usa el botón superior para copiar el enlace generado por ngrok.</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mb-4">2</div>
            <h3 className="font-semibold text-slate-800">Configura Taxia</h3>
            <p className="text-sm text-slate-500 mt-2">Pega la URL en la sección de Webhooks del proveedor externo.</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mb-4">3</div>
            <h3 className="font-semibold text-slate-800">Verifica Logs</h3>
            <p className="text-sm text-slate-500 mt-2">Revisa tu terminal del Backend para ver las peticiones entrantes.</p>
          </div>
        </div>

        {/* Footer Monitor */}
        <div className="text-center py-4 text-slate-400 text-xs">
          ProyectosCIMCO Frontend • Monitor de Integración v1.0
        </div>
      </div>
    </div>
  );
};

export default MonitorWebhook;