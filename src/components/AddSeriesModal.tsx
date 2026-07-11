import React, { useState } from "react";
import { X, BookOpen, Camera, Check } from "lucide-react";
import { Series } from "../types";
import CameraCapture from "./CameraCapture";

interface AddSeriesModalProps {
  onSave: (series: Omit<Series, "id" | "userId" | "createdAt">) => void;
  onClose: () => void;
  initialSeries?: Series;
}

export default function AddSeriesModal({ onSave, onClose, initialSeries }: AddSeriesModalProps) {
  const [name, setName] = useState(initialSeries?.name || "");
  const [author, setAuthor] = useState(initialSeries?.author || "");
  const [publisher, setPublisher] = useState(initialSeries?.publisher || "");
  const [status, setStatus] = useState<'ongoing' | 'completed' | 'on_hold' | 'dropped'>(
    initialSeries?.status || "ongoing"
  );
  const [totalVolumes, setTotalVolumes] = useState<string>(
    initialSeries?.totalVolumes ? String(initialSeries.totalVolumes) : ""
  );
  const [coverUrl, setCoverUrl] = useState<string>(initialSeries?.coverUrl || "");
  const [showCamera, setShowCamera] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      author: author.trim() || undefined,
      publisher: publisher.trim() || undefined,
      status,
      totalVolumes: totalVolumes ? Number(totalVolumes) : undefined,
      coverUrl: coverUrl || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-white/5 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-slate-900/10">
          <h3 className="font-extrabold text-slate-100 flex items-center gap-2 text-sm sm:text-base">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            {initialSeries ? "Chỉnh sửa bộ truyện" : "Thêm bộ truyện mới"}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all p-2 rounded-xl cursor-pointer border border-transparent hover:border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Cover Photo Selection */}
          <div className="flex flex-col items-center gap-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider self-start">Ảnh bìa bộ truyện</label>
            <div className="relative w-36 h-48 bg-slate-900/60 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center overflow-hidden group shadow-inner">
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="p-2 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-all text-[11px] font-bold cursor-pointer"
                    >
                      Thay đổi
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex flex-col items-center gap-2 text-slate-400 hover:text-slate-200 p-4 w-full h-full justify-center transition-all cursor-pointer"
                >
                  <Camera className="w-8 h-8 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-[11px] font-bold">Chụp/Tải ảnh bìa</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tên bộ truyện <span className="text-rose-400">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Doraemon, Conan, One Piece..."
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-xs sm:text-sm font-bold font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tác giả</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ví dụ: Fujiko F. Fujio"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-xs sm:text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nhà xuất bản</label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="Ví dụ: Kim Đồng, Trẻ, IPM..."
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-xs sm:text-sm font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trạng thái bộ truyện</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-xs sm:text-sm font-bold cursor-pointer h-[44px]"
                >
                  <option value="ongoing">Đang phát hành / Đang mua</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="on_hold">Đang tạm dừng</option>
                  <option value="dropped">Đã drop (Không mua nữa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tổng số tập dự kiến</label>
                <input
                  type="number"
                  min="1"
                  value={totalVolumes}
                  onChange={(e) => setTotalVolumes(e.target.value)}
                  placeholder="Để trống nếu chưa rõ"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-xs sm:text-sm font-bold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer inside form */}
          <div className="pt-4 border-t border-white/5 flex justify-end gap-3 bg-transparent">
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
              <Check className="w-4 h-4" />
              Lưu lại
            </button>
          </div>
        </form>

        {showCamera && (
          <CameraCapture
            title="Chụp/Tải ảnh bìa truyện"
            onCapture={(base64) => {
              setCoverUrl(base64);
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
            initialImage={coverUrl}
          />
        )}
      </div>
    </div>
  );
}
