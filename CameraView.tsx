
import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, ScanBarcode, Image as ImageIcon, Search, AlertCircle, CheckCircle2, Utensils, Save, RotateCcw, ArrowRight, Zap } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageData: string) => void;
  onBarcodeScan?: (barcode: string) => void;
  onMenuScan?: (imageData: string) => void;
  onClose: () => void;
}

type ScanMode = 'PHOTO' | 'BARCODE' | 'MENU';
type ScanStatus = 'idle' | 'scanning' | 'success' | 'failed';

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onBarcodeScan, onMenuScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<ScanMode>('PHOTO');
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    if (!capturedImage) {
        startCamera();
    } else {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage]);

  useEffect(() => {
    setScanStatus('idle');
    setCapturedImage(null);
  }, [mode]);

  // Real Barcode Detection + Simulation Fallback
  useEffect(() => {
      if (mode !== 'BARCODE' || capturedImage || scanStatus === 'success') return;

      let interval: any;
      let detector: any;

      const initDetection = async () => {
          // @ts-ignore
          if ('BarcodeDetector' in window) {
              try {
                  // @ts-ignore
                  detector = new window.BarcodeDetector({ 
                      formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e'] 
                  });
              } catch (e) {
                  console.warn("BarcodeDetector supported but failed to init", e);
              }
          }

          interval = setInterval(async () => {
              // 1. Try Real Detection
              if (detector && videoRef.current && videoRef.current.readyState === 4) {
                  try {
                      const barcodes = await detector.detect(videoRef.current);
                      if (barcodes.length > 0) {
                          const code = barcodes[0].rawValue;
                          handleScanSuccess(code);
                          return; // Stop checking
                      }
                  } catch (err) {
                      // Frame read error, continue
                  }
              }
          }, 300);
      };

      initDetection();

      return () => clearInterval(interval);
  }, [mode, capturedImage, scanStatus]);

  const handleScanSuccess = (code: string) => {
      if (scanStatus === 'success') return;
      setScanStatus('success');
      if (navigator.vibrate) navigator.vibrate(200);
      
      setTimeout(() => {
          if (onBarcodeScan) onBarcodeScan(code);
      }, 800);
  };

  const handleAction = () => {
    if (mode === 'PHOTO' || mode === 'MENU') {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const imageData = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(imageData);
            }
        }
    } else {
        // Manual Scan Trigger (Simulation / Fallback)
        if (scanStatus === 'scanning' || scanStatus === 'success') return;

        setScanStatus('scanning');
        
        // Simulate scanning delay
        setTimeout(() => {
            const hasManualInput = manualBarcode.trim().length > 0;
            const code = hasManualInput ? manualBarcode.trim() : '5449000000996'; // Default Coke
            
            // 80% success rate for simulation click
            if (hasManualInput || Math.random() > 0.2) {
                handleScanSuccess(code);
            } else {
                setScanStatus('failed');
                setTimeout(() => setScanStatus('idle'), 1500); 
            }
        }, 1200);
    }
  };

  const handleConfirmSave = () => {
      if (capturedImage) {
          if (mode === 'MENU' && onMenuScan) {
              onMenuScan(capturedImage);
          } else {
              onCapture(capturedImage);
          }
      }
  };

  const handleRetake = () => {
      setCapturedImage(null);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans">
      <div className="relative flex-1 bg-black overflow-hidden group">
        
        {capturedImage ? (
            <div className="absolute inset-0 bg-black flex items-center justify-center animate-in fade-in duration-500">
                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
            </div>
        ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${mode === 'BARCODE' ? 'opacity-60 grayscale-[0.3]' : 'opacity-100'} ${scanStatus === 'success' ? 'scale-105' : 'scale-100'}`}
            />
        )}
        
        {/* --- PHOTO OVERLAY --- */}
        {!capturedImage && mode === 'PHOTO' && (
             <div className="absolute inset-0 m-6 border-2 border-white/40 rounded-[32px] pointer-events-none z-10 flex flex-col justify-between p-6">
                <div className="bg-black/40 backdrop-blur-md rounded-full px-6 py-2 text-white font-medium text-sm self-center border border-white/10">
                    Scan Fridge & Pantry
                </div>
                <div className="flex justify-between w-full opacity-50">
                    <div className="w-8 h-8 border-l-2 border-b-2 border-white rounded-bl-lg" />
                    <div className="w-8 h-8 border-r-2 border-b-2 border-white rounded-br-lg" />
                </div>
            </div>
        )}

        {/* --- MENU OVERLAY --- */}
        {!capturedImage && mode === 'MENU' && (
             <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/40">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-[450px] border border-emerald-400/50 rounded-2xl bg-emerald-500/5 backdrop-blur-[1px] flex flex-col relative overflow-hidden">
                    {/* Menu Scan Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-[scan_3s_ease-in-out_infinite]" />
                    <div className="absolute top-2 right-2">
                        <Utensils className="text-emerald-400 opacity-50" size={20} />
                    </div>
                </div>
                <div className="absolute bottom-24 left-0 w-full text-center px-8">
                    <h3 className="text-white font-bold text-xl drop-shadow-md mb-1">Menu Scanner</h3>
                    <p className="text-white/70 text-sm">Align menu page within frame</p>
                </div>
            </div>
        )}

        {/* --- BARCODE OVERLAY (ENHANCED) --- */}
        {!capturedImage && mode === 'BARCODE' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none bg-black/40 backdrop-blur-sm">
                 
                 {/* Main Scanner Box */}
                 <div className={`relative w-72 h-44 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] transition-all duration-300 ${
                     scanStatus === 'success' ? 'ring-4 ring-emerald-500 scale-105' : 
                     scanStatus === 'failed' ? 'ring-4 ring-red-500 animate-[shake_0.4s_ease-in-out]' : 
                     scanStatus === 'scanning' ? 'ring-2 ring-blue-400' :
                     'ring-1 ring-white/40'
                 }`}>
                    
                    {/* Clear Zone */}
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                        {/* Laser Line */}
                        <div className={`absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] opacity-0 animate-[laser_1.5s_ease-in-out_infinite] ${scanStatus !== 'success' ? 'opacity-100' : 'opacity-0'}`} />
                        
                        {/* Scanning Grid (Visible during scanning) */}
                        {scanStatus === 'scanning' && (
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                        )}
                    </div>

                    {/* Corner Markers */}
                    <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg transition-colors duration-300 ${scanStatus === 'scanning' ? 'border-blue-400' : scanStatus === 'success' ? 'border-emerald-500' : 'border-white'}`} />
                    <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg transition-colors duration-300 ${scanStatus === 'scanning' ? 'border-blue-400' : scanStatus === 'success' ? 'border-emerald-500' : 'border-white'}`} />
                    <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg transition-colors duration-300 ${scanStatus === 'scanning' ? 'border-blue-400' : scanStatus === 'success' ? 'border-emerald-500' : 'border-white'}`} />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-lg transition-colors duration-300 ${scanStatus === 'scanning' ? 'border-blue-400' : scanStatus === 'success' ? 'border-emerald-500' : 'border-white'}`} />

                    {/* Centered Icons */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {scanStatus === 'success' && (
                            <div className="bg-emerald-500/20 p-3 rounded-full backdrop-blur-md animate-in zoom-in duration-300">
                                <CheckCircle2 size={40} className="text-emerald-400 drop-shadow-lg" />
                            </div>
                        )}
                        {scanStatus === 'failed' && (
                            <div className="bg-red-500/20 p-3 rounded-full backdrop-blur-md animate-in zoom-in duration-300">
                                <AlertCircle size={40} className="text-red-500 drop-shadow-lg" />
                            </div>
                        )}
                    </div>
                 </div>

                 {/* Status Feedback Pill */}
                 <div className="mt-12 absolute bottom-36 w-full text-center px-4">
                    <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-md border shadow-2xl transition-all duration-300 ${
                        scanStatus === 'failed' 
                        ? 'bg-red-500/20 border-red-500/50' 
                        : scanStatus === 'success'
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : scanStatus === 'scanning'
                        ? 'bg-blue-600/30 border-blue-400/50'
                        : 'bg-black/60 border-white/10'
                    }`}>
                        {scanStatus === 'idle' && (
                            <>
                                <ScanBarcode className="text-white" size={18} />
                                <span className="text-white text-xs font-bold tracking-wide">Point at barcode</span>
                            </>
                        )}
                        {scanStatus === 'scanning' && (
                            <>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                                <span className="text-blue-200 text-xs font-bold">Scanning...</span>
                            </>
                        )}
                        {scanStatus === 'success' && (
                            <>
                                <CheckCircle2 className="text-emerald-400" size={18} />
                                <span className="text-emerald-400 text-xs font-bold">Scanned!</span>
                            </>
                        )}
                        {scanStatus === 'failed' && (
                            <>
                                <AlertCircle className="text-red-400" size={18} />
                                <span className="text-red-400 text-xs font-bold">Not found. Tap button.</span>
                            </>
                        )}
                    </div>
                 </div>
                 
                 {/* Manual Entry Fallback */}
                 <div className="pointer-events-auto absolute bottom-8 w-64 opacity-80 hover:opacity-100 transition-opacity">
                     <div className="bg-white/10 backdrop-blur-md border border-white/20 p-1.5 rounded-xl flex gap-2 focus-within:bg-black/90 focus-within:opacity-100 transition-all shadow-lg">
                         <div className="pl-2 flex items-center text-slate-400"><Search size={14} /></div>
                         <input 
                            value={manualBarcode}
                            onChange={(e) => setManualBarcode(e.target.value)}
                            placeholder="Type barcode..." 
                            className="bg-transparent text-white placeholder:text-white/40 text-xs font-mono w-full outline-none py-2"
                         />
                         {manualBarcode && (
                             <button onClick={handleAction} className="bg-white text-black rounded-lg px-3 text-xs font-bold hover:bg-slate-200">GO</button>
                         )}
                     </div>
                 </div>
             </div>
        )}

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white z-20 hover:bg-white/20 transition-all active:scale-95"
        >
          <X size={20} />
        </button>
      </div>

      {/* Controls Bar */}
      {capturedImage ? (
          <div className="h-32 bg-black flex items-center justify-between px-8 pb-4 z-20 border-t border-white/10">
              <button 
                onClick={handleRetake}
                className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                  <div className="p-3 rounded-full bg-white/10 border border-white/5">
                    <RotateCcw size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Retake</span>
              </button>

              <button 
                onClick={handleConfirmSave}
                className="flex items-center gap-3 bg-emerald-500 text-slate-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all hover:bg-emerald-400 hover:scale-105"
              >
                  Save Scan <ArrowRight size={18} />
              </button>
          </div>
      ) : (
          <div className="h-44 bg-black flex flex-col items-center justify-between pb-8 pt-4 z-20 border-t border-white/10">
            {/* Mode Toggle */}
            <div className="flex bg-slate-900 rounded-full p-1.5 border border-white/10 mb-2">
                <button 
                    onClick={() => setMode('PHOTO')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${mode === 'PHOTO' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <ImageIcon size={14} /> Fridge
                </button>
                <button 
                    onClick={() => setMode('MENU')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${mode === 'MENU' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Utensils size={14} /> Menu
                </button>
                <button 
                    onClick={() => setMode('BARCODE')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${mode === 'BARCODE' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <ScanBarcode size={14} /> Scan
                </button>
            </div>

            {/* Shutter Button (Changes based on mode) */}
            <button 
              onClick={handleAction}
              disabled={scanStatus === 'scanning' || scanStatus === 'success'}
              className={`w-16 h-16 rounded-full border-4 flex items-center justify-center active:scale-90 transition-all duration-300 ${
                  mode === 'BARCODE' 
                  ? 'border-blue-500 bg-blue-500/20 hover:bg-blue-500/40' 
                  : mode === 'MENU' 
                  ? 'border-emerald-500 bg-emerald-500/20 hover:bg-emerald-500/40'
                  : 'border-white bg-white/20 hover:bg-white/40'
              } ${scanStatus === 'scanning' ? 'opacity-50 cursor-wait scale-90' : ''}`}
            >
              {mode === 'BARCODE' ? (
                  <div className={`transition-transform duration-300 ${scanStatus === 'scanning' ? 'scale-75' : ''}`}>
                      <ScanBarcode className="text-blue-200" size={24} />
                  </div>
              ) : mode === 'MENU' ? (
                  <div className="w-12 h-12 bg-emerald-500 rounded-full shadow-inner flex items-center justify-center">
                      <Zap className="text-emerald-900 fill-emerald-900" size={20} />
                  </div>
              ) : (
                  <div className="w-14 h-14 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
              )}
            </button>
          </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400px); opacity: 0; }
        }
        @keyframes laser {
          0% { top: 10%; opacity: 0.5; }
          50% { top: 90%; opacity: 1; }
          100% { top: 10%; opacity: 0.5; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
};

export default CameraView;
