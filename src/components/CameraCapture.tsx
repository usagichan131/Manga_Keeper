import React, { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, RefreshCw, Check, X, SwitchCamera } from "lucide-react";
import { compressImage } from "../lib/image";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  initialImage?: string;
  title?: string;
}

export default function CameraCapture({ onCapture, onClose, initialImage, title = "Chụp hình tập truyện" }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(initialImage || null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceIdx, setActiveDeviceIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Load available camera devices
  const loadDevices = async () => {
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devList.filter(d => d.kind === "videoinput");
      setDevices(videoDevs);
    } catch {
      // Ignore enumeration errors
    }
  };

  const startCamera = async (deviceIndex = activeDeviceIdx) => {
    setErrorMsg(null);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      await loadDevices();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment", // Default to back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 640 }
        }
      };
      
      if (devices.length > 0 && devices[deviceIndex]) {
        constraints.video = {
          deviceId: { exact: devices[deviceIndex].deviceId },
          width: { ideal: 640 },
          height: { ideal: 640 }
        };
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setErrorMsg("Không thể truy cập camera. Vui lòng tải ảnh lên hoặc cấp quyền camera.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const switchCamera = () => {
    if (devices.length <= 1) return;
    const nextIdx = (activeDeviceIdx + 1) % devices.length;
    setActiveDeviceIdx(nextIdx);
    startCamera(nextIdx);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        
        try {
          // Compress immediately to keep document size light
          const compressed = await compressImage(dataUrl);
          setPreviewImage(compressed);
          stopCamera();
        } catch (err) {
          console.error("Image compression error:", err);
          setPreviewImage(dataUrl);
          stopCamera();
        }
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        stopCamera();
        const compressed = await compressImage(file);
        setPreviewImage(compressed);
      } catch (err) {
        setErrorMsg("Lỗi nén ảnh. Hãy thử ảnh khác.");
        console.error(err);
      }
    }
  };

  const handleSave = () => {
    if (previewImage) {
      onCapture(previewImage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-white/5 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-slate-900/10">
          <h3 className="font-extrabold text-slate-100 flex items-center gap-2 text-sm sm:text-base font-sans">
            <Camera className="w-5 h-5 text-indigo-400" />
            {title}
          </h3>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all p-2 rounded-xl cursor-pointer border border-transparent hover:border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-[300px] flex flex-col justify-center bg-black/40 relative">
          
          {/* Active Camera Stream */}
          {isCameraActive && (
            <div className="relative aspect-square w-full bg-black overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover scale-x-[-1]" // mirror effect
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-red-600 text-white rounded-full p-4 hover:bg-red-700 shadow-lg transform transition-transform active:scale-95 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-red-600" />
                </button>
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="absolute right-4 bottom-4 bg-slate-800/85 text-white rounded-full p-3 hover:bg-slate-700 backdrop-blur-sm cursor-pointer border border-white/5"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Preview captured/loaded Image */}
          {!isCameraActive && previewImage && (
            <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden p-4">
              <img 
                src={previewImage} 
                alt="Captured Preview" 
                className="max-h-full max-w-full rounded-2xl object-contain shadow-md"
              />
              <div className="absolute top-3 right-3 bg-indigo-500/10 text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-500/20 backdrop-blur">
                Đã chuẩn bị
              </div>
            </div>
          )}

          {/* Placeholder / State when no camera active and no preview */}
          {!isCameraActive && !previewImage && (
            <div className="p-8 text-center flex flex-col items-center gap-4 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-white/5 flex items-center justify-center text-indigo-400">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-200 text-sm">Chụp hình hoặc Tải ảnh lên</p>
                <p className="text-xs text-slate-500 mt-1.5 max-w-[250px] mx-auto leading-relaxed">
                  Bạn có thể chụp hình gáy truyện, bìa truyện, hoặc hóa đơn thanh toán để lưu trữ.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-x-0 bottom-0 bg-red-950/90 border-t border-red-900/30 p-3 text-xs text-red-200 text-center font-bold">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/5 bg-slate-950/50 flex flex-col gap-3">
          <div className="flex gap-2">
            {!isCameraActive ? (
              <button
                type="button"
                onClick={() => startCamera()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-slate-100 font-bold rounded-xl transition-all text-xs border border-white/10 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-slate-400" />
                Mở Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-slate-100 font-bold rounded-xl transition-all text-xs border border-white/10 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
                Tắt Camera
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-slate-100 font-bold rounded-xl transition-all text-xs border border-white/10 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-slate-400" />
              Chọn từ máy
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          {previewImage && (
            <button
              type="button"
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-lg transition-all text-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Xác nhận sử dụng ảnh này
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
