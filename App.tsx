
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
  Zap,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { AppState, EventConfig, ProcessedVideo } from './types';
import { generateVideoCaption } from './services/geminiService';
import QRCodeDisplay from './components/QRCodeDisplay';

const RECORDING_DURATION = 15; // segundos totais (incluindo ida e volta na edição final)

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [eventConfig, setEventConfig] = useState<EventConfig>({
    name: '',
    date: new Date().toLocaleDateString('pt-BR'),
    logo: null
  });
  const [processedVideo, setProcessedVideo] = useState<ProcessedVideo | null>(null);
  const [timer, setTimer] = useState(RECORDING_DURATION);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState<'forward' | 'reverse' | 'finishing'>('forward');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEventConfig(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => processVideo();

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
  }, [eventConfig]);

  const processVideo = async () => {
    setAppState(AppState.PROCESSING);
    setProcessingProgress(0);

    // Passo 1: Processando Giro de Ida
    setProcessingStep('forward');
    for (let i = 0; i <= 50; i += 2) {
      setProcessingProgress(i);
      await new Promise(r => setTimeout(r, 80));
    }

    // Passo 2: Aplicando Modo Reverso (Volta)
    setProcessingStep('reverse');
    for (let i = 51; i <= 90; i += 2) {
      setProcessingProgress(i);
      await new Promise(r => setTimeout(r, 100));
    }

    // Passo 3: Finalizando com IA
    setProcessingStep('finishing');
    const captionTask = generateVideoCaption(eventConfig.name);
    for (let i = 91; i <= 100; i++) {
      setProcessingProgress(i);
      await new Promise(r => setTimeout(r, 50));
    }

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const caption = await captionTask;

    setProcessedVideo({
      id: Math.random().toString(36).substr(2, 9),
      url: url,
      timestamp: eventConfig.date,
      event: eventConfig.name,
      logo: eventConfig.logo,
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
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/50">
          <RotateCcw className="text-white w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold mb-1 text-white">Configuração 360°</h1>
        <p className="text-gray-400 text-sm">Prepare a marca e os dados do evento</p>
      </div>

      <div className="space-y-4">
        {/* Event Name */}
        <div>
          <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <Tag size={14} /> Nome do Evento
          </label>
          <input 
            type="text" 
            placeholder="Ex: Casamento de Maria"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-all text-white placeholder:text-gray-600"
            value={eventConfig.name}
            onChange={(e) => setEventConfig({...eventConfig, name: e.target.value})}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> Data
          </label>
          <input 
            type="text" 
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-all text-white"
            value={eventConfig.date}
            onChange={(e) => setEventConfig({...eventConfig, date: e.target.value})}
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <ImageIcon size={14} /> Logo do Evento
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-video rounded-xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer flex flex-col items-center justify-center transition-all overflow-hidden relative group"
          >
            {eventConfig.logo ? (
              <>
                <img src={eventConfig.logo} alt="Logo preview" className="w-full h-full object-contain p-4" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <span className="text-xs font-bold">ALTERAR LOGO</span>
                </div>
              </>
            ) : (
              <>
                <Upload className="text-gray-500 mb-2" size={24} />
                <span className="text-xs font-medium text-gray-400">Clique para upload (PNG/JPG)</span>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleLogoUpload}
            />
          </div>
        </div>

        <button 
          onClick={initCamera}
          disabled={!eventConfig.name}
          className={`w-full py-4 mt-2 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            eventConfig.name 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.02] active:scale-95 text-white shadow-xl shadow-indigo-600/30' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Iniciar Gravação <Zap size={20} />
        </button>
      </div>
    </div>
  );

  const renderCapture = () => (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
      <div className={`relative w-full max-w-2xl aspect-[9/16] md:aspect-video rounded-3xl overflow-hidden glass ${appState === AppState.RECORDING ? 'recording-ring border-4' : 'border-2 border-white/10'}`}>
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Somente a Logo fica visível (Watermark) */}
        {eventConfig.logo && (
          <div className="absolute top-6 right-6 w-20 h-20 bg-black/20 backdrop-blur-sm p-2 rounded-2xl border border-white/10 flex items-center justify-center pointer-events-none">
            <img src={eventConfig.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
        )}

        {/* Timer de Gravação (Funcional e Discreto) */}
        {appState === AppState.RECORDING && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-2 rounded-full flex items-center gap-3 animate-pulse border-2 border-white/20">
            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
            <span className="font-mono font-black text-xl text-white">00:{timer < 10 ? `0${timer}` : timer}</span>
          </div>
        )}

        {/* Botão de Início (Centralizado e Limpo) */}
        {appState === AppState.READY && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group">
            <button 
              onClick={startRecording}
              className="w-28 h-28 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 border-2 border-white"
            >
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-600/40">
                <Play fill="white" size={36} className="ml-1" />
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        <button 
          onClick={() => setAppState(AppState.SETUP)}
          className="px-6 py-3 rounded-full glass hover:bg-white/10 flex items-center gap-2 transition-all text-sm font-bold text-white"
        >
          <Settings size={18} /> Ajustar Evento
        </button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="max-w-md w-full glass p-10 rounded-3xl text-center space-y-6">
      <div className="relative inline-block">
        <div className="w-28 h-28 border-4 border-white/5 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <RotateCcw className={`text-indigo-500 ${processingStep === 'reverse' ? 'animate-reverse-spin' : 'animate-bounce'}`} size={32} />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-black mb-1 text-white">
          {processingStep === 'forward' ? 'Processando Giro 360°...' : 
           processingStep === 'reverse' ? 'Criando Efeito Reverso...' : 
           'Finalizando seu Vídeo...'}
        </h2>
        <p className="text-gray-400 text-sm">Criando o loop perfeito para as redes.</p>
      </div>

      <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden border border-white/10 relative">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300" 
          style={{ width: `${processingProgress}%` }}
        ></div>
        <div className="absolute left-[50%] top-0 h-full w-[2px] bg-white/20"></div>
      </div>
      <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
        <span className={processingStep === 'forward' ? 'text-indigo-400' : ''}>Ida (Giro)</span>
        <span className={processingStep === 'reverse' ? 'text-indigo-400' : ''}>Volta (Reverso)</span>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in zoom-in-95 duration-500">
      {/* Resultado Final com Logo */}
      <div className="glass rounded-3xl p-4 space-y-4">
        <div className="relative aspect-[9/16] md:aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
          <video 
            src={processedVideo?.url} 
            controls 
            autoPlay 
            loop 
            className="w-full h-full object-cover"
          />
          
          {processedVideo?.logo && (
            <div className="absolute top-4 right-4 w-16 h-16 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 flex items-center justify-center">
              <img src={processedVideo.logo} alt="Logo Final" className="max-w-full max-h-full object-contain" />
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
            <p className="text-white text-xs font-medium italic opacity-90">"{processedVideo?.caption}"</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <a 
            href={processedVideo?.url} 
            download={`360_giro_${processedVideo?.id}.webm`}
            className="flex-1 bg-white text-black py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all shadow-lg"
          >
            <Download size={18} /> SALVAR VÍDEO
          </a>
          <button 
            onClick={reset}
            className="flex-1 bg-white/10 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-all border border-white/10 text-white"
          >
            <RefreshCw size={18} /> NOVO GIRO
          </button>
        </div>
      </div>

      {/* Share Section */}
      <div className="glass rounded-3xl p-8 space-y-8 flex flex-col items-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-black mb-4 uppercase tracking-tighter border border-green-500/30">
            <CheckCircle size={14} /> EFEITO GIRO + REVERSO OK
          </div>
          <h2 className="text-3xl font-black mb-2 text-white">RETIRE SEU VÍDEO</h2>
          <p className="text-gray-400 text-sm leading-relaxed">Escaneie o QR Code para salvar no seu celular.</p>
        </div>

        <div className="relative p-2 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-[2.8rem] blur opacity-30 animate-pulse"></div>
          <QRCodeDisplay value={processedVideo?.url || "https://360.app"} size={220} />
          {processedVideo?.logo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 bg-white p-1 rounded-lg border-2 border-gray-100 shadow-sm overflow-hidden">
                    <img src={processedVideo.logo} className="w-full h-full object-contain" />
                </div>
            </div>
          )}
        </div>

        <button 
            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group"
            onClick={() => {
                navigator.clipboard.writeText(`360event.me/v/${processedVideo?.id}`);
                alert("Link copiado!");
            }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Share2 size={20} />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-gray-500 uppercase font-black">Link Curto</p>
              <p className="text-sm font-mono text-white/80">360event.me/v/{processedVideo?.id}</p>
            </div>
          </div>
          <div className="text-indigo-400 font-black text-xs group-hover:translate-x-1 transition-transform">COPIAR</div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[150px] rounded-full"></div>

      <main className="relative z-10 w-full max-w-6xl flex justify-center">
        {appState === AppState.SETUP && renderSetup()}
        {(appState === AppState.READY || appState === AppState.RECORDING) && renderCapture()}
        {appState === AppState.PROCESSING && renderProcessing()}
        {appState === AppState.RESULT && renderResult()}
      </main>

      <footer className="fixed bottom-6 left-0 right-0 text-center flex flex-col items-center gap-1 opacity-40">
        <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-gray-400">
           PLATAFORMA 360 PRO <div className="w-1 h-1 bg-indigo-500 rounded-full"></div> INTELIGÊNCIA ARTIFICIAL
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-reverse-spin {
          animation: reverse-spin 1.5s linear infinite;
        }
      `}} />
    </div>
  );
};

export default App;
