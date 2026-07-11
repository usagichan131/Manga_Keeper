import React, { useState, useEffect } from "react";
import { 
  X, Edit3, Trash2, Plus, Calendar, DollarSign, PieChart as ChartIcon, 
  Grid, ListPlus, Sparkles, BookOpen, CheckCircle2, Star, Image as ImageIcon,
  Share2
} from "lucide-react";
import { Series, Volume } from "../types";
import { 
  getVolumes, 
  saveVolume, 
  saveMultipleVolumes, 
  deleteVolume, 
  updateSeries,
  deleteSeries 
} from "../lib/db";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import EditVolumeModal from "./EditVolumeModal";
import AddSeriesModal from "./AddSeriesModal";

interface SeriesDashboardProps {
  series: Series;
  onClose: () => void;
  onUpdateSeries: () => void; // Trigger list reload
  onDeleteSeries: () => void; // Trigger list reload
}

export default function SeriesDashboard({ series, onClose, onUpdateSeries, onDeleteSeries }: SeriesDashboardProps) {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quick Add states
  const [quickAddFrom, setQuickAddFrom] = useState("1");
  const [quickAddTo, setQuickAddTo] = useState("");
  const [quickAddStatus, setQuickAddStatus] = useState<'owned' | 'wishlist'>("owned");
  const [quickAddPrice, setQuickAddPrice] = useState("");
  const [quickAddSource, setQuickAddSource] = useState("");
  
  // Modals
  const [activeVolume, setActiveVolume] = useState<Volume | null>(null);
  const [isAddingVolumeDirect, setIsAddingVolumeDirect] = useState(false);
  const [isEditingSeries, setIsEditingSeries] = useState(false);
  
  useEffect(() => {
    loadVolumes();
  }, [series.id]);

  const loadVolumes = async () => {
    setLoading(true);
    try {
      const volList = await getVolumes(series.id);
      setVolumes(volList);
    } catch (err) {
      console.error("Error loading volumes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalOwned = volumes.filter(v => v.status === "owned").length;
  const totalWishlist = volumes.filter(v => v.status === "wishlist").length;
  const totalMoneySpent = volumes
    .filter(v => v.status === "owned" && v.price)
    .reduce((sum, v) => sum + (v.price || 0), 0);

  // Recharts Data
  const chartData = [
    { name: "Đã có", value: totalOwned, color: "#6366f1" }, // Indigo 500
    { name: "Chưa có", value: totalWishlist || 1, color: "#475569" } // Slate 600
  ];
  // If both are 0, show a neutral chart
  const isChartEmpty = totalOwned === 0 && totalWishlist === 0;
  const displayChartData = isChartEmpty 
    ? [{ name: "Chưa có tập nào", value: 1, color: "#334155" }] 
    : chartData.filter(d => d.value > 0);

  // Status Labels
  const statusLabel = {
    ongoing: "Đang phát hành",
    completed: "Đã hoàn thành",
    on_hold: "Đang tạm dừng",
    dropped: "Đã drop"
  };

  const statusColors = {
    ongoing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    on_hold: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dropped: "bg-rose-500/10 text-rose-400 border-rose-500/20"
  };

  // Handlers
  const handleEditSeries = async (updatedSeriesData: Omit<Series, "id" | "userId" | "createdAt">) => {
    try {
      await updateSeries(series.id, updatedSeriesData);
      setIsEditingSeries(false);
      onUpdateSeries();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSeries = async () => {
    if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ thông tin của bộ truyện "${series.name}"? Hành động này không thể hoàn tác.`)) {
      try {
        await deleteSeries(series.id);
        onDeleteSeries();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const fromNum = Number(quickAddFrom);
    const toNum = quickAddTo ? Number(quickAddTo) : fromNum;

    if (isNaN(fromNum) || fromNum < 1 || isNaN(toNum) || toNum < fromNum) {
      alert("Vui lòng điền khoảng tập hợp lệ (Ví dụ: từ 1 đến 10)");
      return;
    }

    const newVols: Omit<Volume, "id" | "createdAt">[] = [];
    for (let i = fromNum; i <= toNum; i++) {
      // Check if volume number already exists to avoid duplicate overwriting without user permission
      const exists = volumes.find(v => v.volumeNumber === i);
      if (exists) continue; // Skip existing volumes to protect user edits

      newVols.push({
        seriesId: series.id,
        volumeNumber: i,
        status: quickAddStatus,
        price: quickAddStatus === "owned" && quickAddPrice ? Number(quickAddPrice) : undefined,
        purchaseSource: quickAddStatus === "owned" && quickAddSource ? quickAddSource : undefined,
        purchaseDate: quickAddStatus === "owned" ? new Date().toISOString().split('T')[0] : undefined
      });
    }

    if (newVols.length > 0) {
      try {
        await saveMultipleVolumes(newVols);
        setQuickAddTo("");
        setQuickAddPrice("");
        setQuickAddSource("");
        loadVolumes();
      } catch (err) {
        console.error(err);
      }
    } else {
      alert("Tất cả các tập trong khoảng này đã tồn tại.");
    }
  };

  const handleAddSingleVolumeDirect = () => {
    // Find next sequential volume number
    const maxVolNum = volumes.length > 0 ? Math.max(...volumes.map(v => v.volumeNumber)) : 0;
    const nextVolNum = maxVolNum + 1;
    
    setActiveVolume({
      id: "",
      seriesId: series.id,
      volumeNumber: nextVolNum,
      status: "owned",
      createdAt: Date.now()
    });
    setIsAddingVolumeDirect(true);
  };

  const handleSaveVolume = async (volumeData: Omit<Volume, "id" | "seriesId" | "createdAt">) => {
    if (!activeVolume) return;
    
    try {
      await saveVolume({
        id: activeVolume.id || undefined,
        seriesId: series.id,
        ...volumeData
      });
      setActiveVolume(null);
      setIsAddingVolumeDirect(false);
      loadVolumes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVolume = async () => {
    if (!activeVolume || !activeVolume.id) return;
    if (confirm(`Bạn có chắc chắn muốn xóa Tập ${activeVolume.volumeNumber}?`)) {
      try {
        await deleteVolume(activeVolume.id);
        setActiveVolume(null);
        loadVolumes();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/85 backdrop-blur-lg flex justify-end transition-all duration-300">
      <div className="bg-slate-950/95 w-full max-w-5xl h-full flex flex-col shadow-2xl border-l border-white/5 backdrop-blur-2xl">
        
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-slate-900/25">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-100 text-base sm:text-lg tracking-tight font-sans">{series.name}</h2>
              <p className="text-xs text-slate-400 font-medium">Bảng điều khiển & Chi tiết bộ truyện</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all p-2 rounded-xl cursor-pointer border border-transparent hover:border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard Panels Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Series Info Card */}
            <div className="bento-card p-6 bg-slate-900/30 border border-white/5 rounded-3xl flex flex-col sm:flex-row md:flex-col gap-5 relative overflow-hidden group">
              <div className="w-28 h-36 sm:w-32 sm:h-44 md:w-full md:h-52 bg-slate-950 border border-white/5 rounded-2xl overflow-hidden self-center flex-shrink-0 shadow-xl group-hover:scale-102 transition-transform duration-500">
                {series.coverUrl ? (
                  <img src={series.coverUrl} alt={series.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-1.5 bg-slate-950 shadow-inner">
                    <BookOpen className="w-10 h-10 text-slate-800" />
                    <span className="text-xs font-medium">Chưa có ảnh bìa</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColors[series.status]}`}>
                      {statusLabel[series.status]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold tracking-wider block">Tác giả</span>
                    <p className="text-slate-200 text-sm font-bold">{series.author || "Chưa rõ"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold tracking-wider block">Nhà xuất bản</span>
                    <p className="text-slate-200 text-sm font-bold">{series.publisher || "Chưa rõ"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold tracking-wider block">Tổng số tập dự kiến</span>
                    <p className="text-slate-200 text-sm font-bold font-mono">
                      {series.totalVolumes ? `${series.totalVolumes} tập` : "Đang cập nhật"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-white/5 mt-5">
                  <button
                    onClick={() => setIsEditingSeries(true)}
                    className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white rounded-xl transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={handleDeleteSeries}
                    className="py-2.5 px-3 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-900/30 text-rose-400 hover:text-rose-300 rounded-xl transition-all text-xs font-bold flex items-center justify-center cursor-pointer"
                    title="Xóa toàn bộ bộ truyện"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Circular Pie Chart & Owned Ratio */}
            <div className="bento-card p-6 bg-slate-900/30 border border-white/5 rounded-3xl flex flex-col justify-between relative overflow-hidden bento-glow-indigo">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
                <h4 className="font-extrabold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                  <ChartIcon className="w-4 h-4 text-indigo-400" />
                  Tiến độ sưu tầm
                </h4>
                <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-mono">
                  {volumes.length > 0 ? Math.round((totalOwned / volumes.length) * 100) : 0}% đã có
                </span>
              </div>
              
              {/* Pie Chart Display */}
              <div className="h-44 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {displayChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)", borderRadius: "16px", color: "#f8fafc" }} 
                      itemStyle={{ color: "#f8fafc" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Midtext Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
                  <span className="text-3xl font-black text-slate-100 font-mono tracking-tighter">{totalOwned}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider">Tập đã có</span>
                </div>
              </div>

              {/* Statistics Details */}
              <div className="grid grid-cols-2 gap-3 text-center border-t border-white/5 pt-3">
                <div className="bg-slate-950/65 p-2 rounded-2xl border border-white/5 shadow-inner">
                  <span className="text-slate-500 text-[9px] font-extrabold block uppercase tracking-wider">Wishlist</span>
                  <span className="text-slate-200 text-xs sm:text-sm font-bold font-mono block mt-0.5">{totalWishlist} tập</span>
                </div>
                <div className="bg-slate-950/65 p-2 rounded-2xl border border-white/5 shadow-inner">
                  <span className="text-slate-500 text-[9px] font-extrabold block uppercase tracking-wider">Tổng tập</span>
                  <span className="text-indigo-400 text-xs sm:text-sm font-bold font-mono block mt-0.5">{volumes.length} tập</span>
                </div>
              </div>
            </div>

            {/* Expense details & Purchase insights */}
            <div className="bento-card p-6 bg-slate-900/30 border border-white/5 rounded-3xl flex flex-col justify-between relative overflow-hidden bento-glow-emerald">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
                <h4 className="font-extrabold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Tài chính sưu tầm
                </h4>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-4 py-3">
                <div>
                  <span className="text-slate-500 text-[11px] font-medium block">Tổng chi tiêu bộ truyện này</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 block mt-1 tracking-tight font-mono">
                    {formatVND(totalMoneySpent)}
                  </span>
                </div>

                <div className="space-y-2 bg-slate-950/65 p-3 rounded-2xl border border-white/5 text-[11px] text-slate-300 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Giá mua trung bình:</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {totalOwned > 0 ? formatVND(Math.round(totalMoneySpent / totalOwned)) : "0 đ"}/tập
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                    <span className="text-slate-500 font-medium">Tập cao giá nhất:</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {volumes.length > 0 && volumes.some(v => v.price) 
                        ? formatVND(Math.max(...volumes.filter(v => v.price).map(v => v.price || 0))) 
                        : "Chưa rõ"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress to target */}
              {series.totalVolumes ? (
                <div className="border-t border-white/5 pt-3">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span className="font-medium">Tiến độ mua trọn bộ:</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {Math.round((totalOwned / series.totalVolumes) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalOwned / series.totalVolumes) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="border-t border-white/5 pt-3">
                  <p className="text-[10px] text-slate-500 italic font-mono">Manga chưa xác định số lượng tập cuối</p>
                </div>
              )}
            </div>

          </div>

          {/* Quick Add Form */}
          <div className="bg-slate-950/60 border border-white/5 rounded-3xl p-6 shadow-inner relative overflow-hidden">
            <h4 className="font-extrabold text-slate-200 text-xs sm:text-sm flex items-center gap-2 mb-4">
              <ListPlus className="w-4 h-4 text-indigo-400" />
              Thêm nhanh nhiều tập cùng lúc
            </h4>
            <form onSubmit={handleQuickAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1.5 font-extrabold uppercase tracking-wider">Từ tập số</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quickAddFrom}
                  onChange={(e) => setQuickAddFrom(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-slate-100 text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1.5 font-extrabold uppercase tracking-wider">Đến tập số</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ví dụ: 10"
                  value={quickAddTo}
                  onChange={(e) => setQuickAddTo(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-slate-100 text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1.5 font-extrabold uppercase tracking-wider">Trạng thái sở hữu</label>
                <select
                  value={quickAddStatus}
                  onChange={(e) => setQuickAddStatus(e.target.value as any)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all h-[38px] cursor-pointer"
                >
                  <option value="owned">Đã có</option>
                  <option value="wishlist">Muốn mua (Wishlist)</option>
                </select>
              </div>

              {quickAddStatus === "owned" ? (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5 font-extrabold uppercase tracking-wider">Giá tiền/tập (VND)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Giá mặc định"
                      value={quickAddPrice}
                      onChange={(e) => setQuickAddPrice(e.target.value)}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-slate-100 text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/15 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tạo loạt tập
                    </button>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/15 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tạo loạt tập (Muốn mua)
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Volume Grid Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h4 className="font-extrabold text-slate-200 text-xs sm:text-sm flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-400" />
              Danh sách tập truyện ({volumes.length} tập)
            </h4>
            <button
              onClick={handleAddSingleVolumeDirect}
              className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1 cursor-pointer border border-indigo-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm tập lẻ
            </button>
          </div>

          {/* Volumes Grid */}
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs font-medium">Đang tải danh sách tập truyện...</div>
          ) : volumes.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col items-center gap-2 text-slate-500 shadow-inner">
              <Sparkles className="w-8 h-8 text-slate-800 mx-auto" />
              <p className="text-xs font-bold text-slate-400">Danh sách trống</p>
              <p className="text-[11px] text-slate-500 max-w-[280px] mx-auto font-medium">
                Sử dụng công cụ "Thêm nhanh" bên trên hoặc bấm nút "Thêm tập lẻ" để khởi tạo tập truyện đầu tiên.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
              {volumes.map((vol) => (
                <button
                  key={vol.id}
                  onClick={() => setActiveVolume(vol)}
                  className={`relative p-4 rounded-2xl text-left border flex flex-col justify-between h-28 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer ${
                    vol.status === "owned"
                      ? "bg-indigo-950/35 border-indigo-500/15 hover:border-indigo-500/50 text-indigo-100 hover:bg-indigo-950/45 shadow-inner"
                      : "bg-slate-950/40 border border-white/5 hover:border-indigo-500/30 text-slate-400 hover:text-slate-200 hover:bg-slate-950/60 shadow-sm"
                  }`}
                >
                  {/* Status indicator icon */}
                  <div className="flex items-start justify-between w-full">
                    <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-100 group-hover:text-indigo-400 transition-colors font-mono">
                      Tập {vol.volumeNumber}
                    </span>
                    {vol.status === "owned" ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Star className="w-4 h-4 text-slate-600" />
                    )}
                  </div>

                  {/* Volume properties tags */}
                  <div className="space-y-1">
                    {vol.status === "owned" ? (
                      <>
                        <div className="flex items-center gap-1 text-[10px] text-indigo-300/80">
                          {vol.price ? (
                            <span className="bg-indigo-900/40 border border-indigo-800/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">
                              {Math.round(vol.price / 1000)}k đ
                            </span>
                          ) : (
                            <span className="text-[9px] text-indigo-500/70 italic font-medium">Đã có</span>
                          )}
                          {vol.photoUrl && (
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" title="Đã có ảnh/bill" />
                          )}
                        </div>
                        {vol.purchaseSource && (
                          <span className="text-[9px] text-slate-500 truncate block max-w-full font-medium" title={vol.purchaseSource}>
                            {vol.purchaseSource}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="space-y-1">
                        {vol.releaseDate ? (
                          <div className="flex items-center gap-1 text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md max-w-max font-bold font-mono">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{vol.releaseDate.split('-')[2]}/{vol.releaseDate.split('-')[1]}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-600 block italic font-medium">Chờ mua...</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Volume Edit Modal */}
        {activeVolume && !isAddingVolumeDirect && (
          <EditVolumeModal
            volume={activeVolume}
            seriesName={series.name}
            onSave={handleSaveVolume}
            onDelete={handleDeleteVolume}
            onClose={() => setActiveVolume(null)}
          />
        )}

        {/* Volume Add Modal (Direct) */}
        {activeVolume && isAddingVolumeDirect && (
          <EditVolumeModal
            volume={activeVolume}
            seriesName={series.name}
            onSave={handleSaveVolume}
            onClose={() => {
              setActiveVolume(null);
              setIsAddingVolumeDirect(false);
            }}
          />
        )}

        {/* Edit Series Info Modal */}
        {isEditingSeries && (
          <AddSeriesModal
            initialSeries={series}
            onSave={handleEditSeries}
            onClose={() => setIsEditingSeries(false)}
          />
        )}

      </div>
    </div>
  );
}
