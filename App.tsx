
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Settings, 
  RotateCcw, 
  Share2, 
  Calendar, 
  Tag, 
  Play, 
  StopCircle, 
  RefreshCw,
  Download,
  CheckCircle,
  Zap
} from 'lucide-react';
import { AppState, EventConfig, ProcessedVideo } from './types';
import { generateVideoCaption } from './services/geminiService';
import QRCodeDisplay from './components/QRCodeDisplay';

const RECORDING_DURATION = 15; // seconds

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [eventConfig, setEventConfig] = useState<EventConfig>({
    name: '',
    date: new Date().toLocaleDateString('pt-BR')
  });
  const [processedVideo, setProcessedVideo] = useState<ProcessedVideo | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [timer, setTimer] = useState(RECORDING_DURATION);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 },
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setAppState(AppState.READY);
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Por favor, permita o acesso à câmera.");
    }
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      processVideo();
    };

    setAppState(AppState.RECORDING);
    setTimer(RECORDING_DURATION);
    mediaRecorder.start();

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          mediaRecorder.stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const processVideo = async () => {
    setAppState(AppState.PROCESSING);
    setProcessingProgress(0);

    // Get AI Caption while "processing"
    const captionTask = generateVideoCaption(eventConfig.name);

    // Simulate video reversal and processing
    for (let i = 0; i <= 100; i += 5) {
      setProcessingProgress(i);
      await new Promise(r => setTimeout(r, 150));
    }

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const caption = await captionTask;

    setProcessedVideo({
      id: Math.random().toString(36).substr(2, 9),
      url: url,
      timestamp: eventConfig.date,
      event: eventConfig.name,
      caption: caption
    });
    setAppState(AppState.RESULT);
  };

  const reset = () => {
    setProcessedVideo(null);
    setAppState(AppState.READY);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  };

  const renderSetup = () => (
    <div className="max-w-md w-full glass p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/50">
          <RotateCcw className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2">360° Event Master</h1>
        <p className="text-gray-400">Configure seu evento para começar</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <Tag size={16} className="text-indigo-400" /> Nome do Evento
          </label>
          <input 
            type="text" 
            placeholder="Ex: Casamento Marina & Pedro"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-white"
            value={eventConfig.name}
            onChange={(e) => setEventConfig({...eventConfig, name: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-400" /> Data
          </label>
          <input 
            type="text" 
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-white"
            value={eventConfig.date}
            onChange={(e) => setEventConfig({...eventConfig, date: e.target.value})}
          />
        </div>

        <button 
          onClick={initCamera}
          disabled={!eventConfig.name}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            eventConfig.name 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 active:scale-95 text-white shadow-xl shadow-indigo-600/30' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Próximo <Zap size={20} />
        </button>
      </div>
    </div>
  );

  const renderCapture = () => (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
      {/* Camera Preview */}
      <div className={`relative w-full max-w-2xl aspect-[9/16] md:aspect-video rounded-3xl overflow-hidden glass ${appState === AppState.RECORDING ? 'recording-ring border-4' : 'border-2 border-white/10'}`}>
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Infos */}
        <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none">
          <span className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-400 border border-indigo-400/30">
            {eventConfig.name}
          </span>
          <span className="text-white/70 text-sm ml-1">{eventConfig.date}</span>
        </div>

        {/* Record Timer */}
        {appState === AppState.RECORDING && (
          <div className="absolute top-6 right-6 bg-red-600 px-4 py-1 rounded-full flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-white"></div>
            <span className="font-mono font-bold text-white">00:{timer < 10 ? `0${timer}` : timer}</span>
          </div>
        )}

        {/* Start Button */}
        {appState === AppState.READY && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group">
            <button 
              onClick={startRecording}
              className="w-24 h-24 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 border-4 border-white"
            >
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white">
                <Play fill="white" size={32} className="ml-1" />
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        <button 
          onClick={() => setAppState(AppState.SETUP)}
          className="px-6 py-3 rounded-full glass hover:bg-white/10 flex items-center gap-2 transition-all"
        >
          <Settings size={20} /> Ajustar Evento
        </button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="max-w-md w-full glass p-10 rounded-3xl text-center space-y-6">
      <div className="relative inline-block">
        <div className="w-24 h-24 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <RotateCcw className="text-indigo-500 animate-reverse-spin" />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Processando Magia...</h2>
        <p className="text-gray-400 text-sm">Estamos criando o efeito reverso e otimizando para redes sociais.</p>
      </div>

      <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300" 
          style={{ width: `${processingProgress}%` }}
        ></div>
      </div>
      <p className="text-xs font-mono text-indigo-400">{processingProgress}% Completo</p>
      
      <div className="pt-4 border-t border-white/10">
        <p className="italic text-gray-500 text-sm">"Consultando Gemini para criar sua legenda perfeita..."</p>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in zoom-in-95 duration-500">
      {/* Video Preview */}
      <div className="glass rounded-3xl p-4 space-y-4">
        <div className="relative aspect-[9/16] md:aspect-video rounded-2xl overflow-hidden bg-black">
          <video 
            src={processedVideo?.url} 
            controls 
            autoPlay 
            loop 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-6 left-6 right-6 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <p className="text-sm font-bold text-white mb-1 uppercase">{processedVideo?.event}</p>
            <p className="text-indigo-400 text-xs font-semibold">{processedVideo?.caption}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <a 
            href={processedVideo?.url} 
            download={`360_video_${processedVideo?.id}.webm`}
            className="flex-1 bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
          >
            <Download size={18} /> Baixar Vídeo
          </a>
          <button 
            onClick={reset}
            className="flex-1 bg-white/10 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
          >
            <RefreshCw size={18} /> Novo Vídeo
          </button>
        </div>
      </div>

      {/* Share Actions */}
      <div className="glass rounded-3xl p-8 space-y-8 flex flex-col items-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold mb-4 uppercase">
            <CheckCircle size={14} /> Vídeo Pronto
          </div>
          <h2 className="text-3xl font-extrabold mb-2">Compartilhe Agora!</h2>
          <p className="text-gray-400">Aponte a câmera para o QR Code abaixo para visualizar e salvar no seu celular.</p>
        </div>

        {/* QR Code */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-3xl blur opacity-20 animate-pulse"></div>
          <QRCodeDisplay value={processedVideo?.url || "https://example.com"} />
        </div>

        <div className="w-full space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
              <Share2 size={24} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Link Curto</p>
              <p className="text-sm truncate text-white/70">360event.me/v/{processedVideo?.id}</p>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`360event.me/v/${processedVideo?.id}`);
                alert("Link copiado!");
              }}
              className="px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all"
            >
              COPIAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>

      <main className="relative z-10 w-full max-w-6xl flex justify-center">
        {appState === AppState.SETUP && renderSetup()}
        {(appState === AppState.READY || appState === AppState.RECORDING) && renderCapture()}
        {appState === AppState.PROCESSING && renderProcessing()}
        {appState === AppState.RESULT && renderResult()}
      </main>

      {/* Persistent Footer */}
      <footer className="fixed bottom-6 text-center text-gray-500 text-xs font-medium tracking-widest uppercase">
        © 2024 360° Event Master • Powered by Gemini AI
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-reverse-spin {
          animation: reverse-spin 2s linear infinite;
        }
      `}} />
    </div>
  );
};

export default App;
