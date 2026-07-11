import React, { useState } from "react";
import { X, Check, Camera, Calendar, DollarSign, ShoppingCart, FileText, Trash2 } from "lucide-react";
import { Volume } from "../types";
import CameraCapture from "./CameraCapture";

interface EditVolumeModalProps {
  volume: Volume;
  seriesName: string;
  onSave: (updatedVolume: Omit<Volume, "id" | "seriesId" | "createdAt">) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function EditVolumeModal({ volume, seriesName, onSave, onDelete, onClose }: EditVolumeModalProps) {
  const [status, setStatus] = useState<'owned' | 'wishlist'>(volume.status);
  const [purchaseDate, setPurchaseDate] = useState(volume.purchaseDate || "");
  const [purchaseSource, setPurchaseSource] = useState(volume.purchaseSource || "");
  const [price, setPrice] = useState<string>(volume.price ? String(volume.price) : "");
  const [notes, setNotes] = useState(volume.notes || "");
  const [photoUrl, setPhotoUrl] = useState(volume.photoUrl || "");
  const [releaseDate, setReleaseDate] = useState(volume.releaseDate || "");
  const [showCamera, setShowCamera] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      volumeNumber: volume.volumeNumber,
      status,
      // Only include these if 'owned'
      purchaseDate: status === "owned" ? (purchaseDate || undefined) : undefined,
      purchaseSource: status === "owned" ? (purchaseSource || undefined) : undefined,
      price: status === "owned" && price ? Number(price) : undefined,
      notes: status === "owned" ? (notes || undefined) : undefined,
      photoUrl: status === "owned" ? (photoUrl || undefined) : undefined,
      // Only include releaseDate if 'wishlist'
      releaseDate: status === "wishlist" ? (releaseDate || undefined) : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-white/5 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-slate-900/10">
          <div>
            <h3 className="font-extrabold text-slate-100 text-sm sm:text-base leading-tight font-sans">
              Tập {volume.volumeNumber}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{seriesName}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all p-2 rounded-xl cursor-pointer border border-transparent hover:border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* Status Segmented Control */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Trạng thái sở hữu</label>
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setStatus("owned")}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  status === "owned"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Đã có
              </button>
              <button
                type="button"
                onClick={() => setStatus("wishlist")}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  status === "wishlist"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Muốn mua
              </button>
            </div>
          </div>

          {/* Conditional Fields: OWNED */}
          {status === "owned" && (
            <div className="space-y-4 pt-1">
              
              {/* Photo Area */}
              <div className="flex flex-col items-center gap-2.5 bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider self-start">Hình ảnh tập truyện / Bill</label>
                
                {photoUrl ? (
                  <div className="relative w-full aspect-[4/3] max-h-40 rounded-xl overflow-hidden group border border-white/5 bg-slate-950 flex items-center justify-center shadow">
                    <img src={photoUrl} alt="Volume/Invoice Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-slate-950/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="py-1.5 px-3 bg-indigo-600 rounded-xl text-white text-xs font-bold hover:bg-indigo-500 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Chụp lại
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl("")}
                        className="py-1.5 px-3 bg-red-600 rounded-xl text-white text-xs font-bold hover:bg-red-500 transition-all cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="w-full aspect-[4/3] max-h-32 border border-dashed border-white/10 hover:border-indigo-500/30 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 gap-1.5 transition-all bg-slate-900/35 cursor-pointer shadow-sm group"
                  >
                    <Camera className="w-6 h-6 text-slate-500" />
                    <span className="text-xs font-bold">Chụp ảnh tập truyện hoặc hóa đơn</span>
                  </button>
                )}
              </div>

              {/* Purchase Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Ngày mua
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    Giá mua (VND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="35000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
                  Nguồn mua (Nơi mua / Link online)
                </label>
                <input
                  type="text"
                  placeholder="Shopee, Fahasa, Tiki, Hiệu sách..."
                  value={purchaseSource}
                  onChange={(e) => setPurchaseSource(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs font-bold"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Ghi chú truyện
                </label>
                <textarea
                  placeholder="Bản đặc biệt kèm quà tặng, bìa lỗi..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs font-bold resize-none font-sans"
                />
              </div>

            </div>
          )}

          {/* Conditional Fields: WISHLIST */}
          {status === "wishlist" && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Ngày phát hành từ NXB
                </label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs font-bold font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Đặt ngày phát hành dự kiến để bộ truyện tự động xuất hiện trong "Lịch phát hành & Nhắc mua" trên Dashboard chính.
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 bg-transparent">
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="py-2.5 px-3.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 rounded-xl transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa tập này
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 border border-white/10 hover:border-white/20 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Xác nhận
              </button>
            </div>
          </div>
        </form>

        {showCamera && (
          <CameraCapture
            title={`Chụp ảnh Tập ${volume.volumeNumber}`}
            onCapture={(base64) => {
              setPhotoUrl(base64);
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
            initialImage={photoUrl}
          />
        )}
      </div>
    </div>
  );
}
