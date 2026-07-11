import React, { useState, useEffect } from "react";
import { 
  BookOpen, Plus, Search, Filter, BookMarked, DollarSign, RefreshCw, 
  Settings, Key, Copy, Check, Info, Sparkles, HelpCircle, Trash2, LogOut, LogIn
} from "lucide-react";
import { Series, Volume } from "./types";
import { getOrCreateUserId, getSeriesList, addSeries, getVolumes, deleteSeries } from "./lib/db";
import AddSeriesModal from "./components/AddSeriesModal";
import SeriesDashboard from "./components/SeriesDashboard";
import UpcomingReleases from "./components/UpcomingReleases";
import { isFirebasePlaceholder, auth, googleProvider, signInWithPopup, firebaseSignOut, onAuthStateChanged, User } from "./firebase";

export default function App() {
  const [userId, setUserId] = useState("");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [globalVolumes, setGlobalVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Modals / Detail active states
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeSeries, setActiveSeries] = useState<Series | null>(null);

  // Bulk delete states
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Backup & sync code states
  const [showSettings, setShowSettings] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");
  const [showOfflineBanner, setShowOfflineBanner] = useState(isFirebasePlaceholder);

  // Initialize and load
  useEffect(() => {
    if (isFirebasePlaceholder) {
      setIsAuthChecking(false);
      const id = getOrCreateUserId();
      setUserId(id);
      loadAllData(id);
    } else if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        setIsAuthChecking(false);
        setFirebaseUser(user);
        if (user) {
          const id = user.uid;
          setUserId(id);
          loadAllData(id);
          // Auto-migrate data from anonymous to authenticated account (optional)
          const localId = localStorage.getItem("comic_tracker_user_id");
          if (localId && localId !== user.uid) {
            // we could migrate here, but let's just clear the localId since we are using Firebase Auth
            localStorage.removeItem("comic_tracker_user_id");
          }
        } else {
          setUserId("");
          setSeriesList([]);
          setGlobalVolumes([]);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const loadAllData = async (uid: string) => {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await getSeriesList(uid);
      setSeriesList(list);

      // Load all volumes globally for calculating total spending
      if (list.length > 0) {
        const allVolumesPromises = list.map(series => getVolumes(series.id));
        const allVolumesResults = await Promise.all(allVolumesPromises);
        const allVolumes = allVolumesResults.flat();
        
        // Filter those belonging to user's active series that are owned
        const userOwned = allVolumes.filter(v => v.status === "owned");
        setGlobalVolumes(userOwned);
      } else {
        setGlobalVolumes([]);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeries = async (newSeriesData: Omit<Series, "id" | "userId" | "createdAt">) => {
    try {
      const created = await addSeries({
        ...newSeriesData,
        userId
      });
      setShowAddModal(false);
      loadAllData(userId);
      // Automatically open dashboard for the newly created series
      setActiveSeries(created);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopySyncCode = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplySyncCode = () => {
    if (!syncCodeInput.trim() || !syncCodeInput.startsWith("user_")) {
      alert("Mã đồng bộ không hợp lệ. Mã đồng bộ phải bắt đầu bằng 'user_'");
      return;
    }
    
    if (confirm("LƯU Ý: Chuyển sang mã đồng bộ mới sẽ thay thế dữ liệu hiện tại trên trình duyệt này. Bạn có chắc chắn muốn tiếp tục?")) {
      localStorage.setItem("comic_tracker_user_id", syncCodeInput.trim());
      setUserId(syncCodeInput.trim());
      loadAllData(syncCodeInput.trim());
      setSyncSuccessMsg("Đã tải dữ liệu từ mã đồng bộ thành công!");
      setSyncCodeInput("");
      setTimeout(() => setSyncSuccessMsg(""), 3000);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedSeriesIds.length} bộ truyện đã chọn và toàn bộ tập truyện của chúng? Hành động này không thể hoàn tác.`)) {
      try {
        setIsBulkDeleting(true);
        await Promise.all(selectedSeriesIds.map(id => deleteSeries(id)));
        setSelectedSeriesIds([]);
        loadAllData(userId);
      } catch (error) {
        console.error("Error deleting series:", error);
        alert("Xóa bộ truyện thất bại.");
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedSeriesIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLogout = async () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      if (!isFirebasePlaceholder && auth) {
        await firebaseSignOut(auth);
      } else {
        localStorage.removeItem("comic_tracker_user_id");
        window.location.reload();
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (auth && googleProvider) {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!isFirebasePlaceholder && !firebaseUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
        
        <div className="max-w-md w-full relative z-10">
          <div className="bento-card text-center p-8">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">MyManga</h1>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Quản lý tủ truyện của bạn mọi lúc, mọi nơi. Đăng nhập để đồng bộ dữ liệu an toàn trên đám mây.
            </p>
            
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Đăng nhập với Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculations
  const totalMoneySpent = globalVolumes
    .filter(v => v.price)
    .reduce((sum, v) => sum + (v.price || 0), 0);
    
  const totalOwnedVolumes = globalVolumes.length;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  // Filter series list
  const filteredSeries = seriesList.filter(series => {
    const matchesSearch = 
      series.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (series.author && series.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (series.publisher && series.publisher.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === "all" || series.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusLabel = {
    ongoing: "Đang phát hành / Đang mua",
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {showOfflineBanner && (
        <div className="w-full bg-amber-600/10 border-b border-amber-500/20 px-4 py-3 text-center flex flex-col sm:flex-row items-center justify-center gap-2 relative z-50">
          <span className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
            <HelpCircle className="w-4.5 h-4.5" />
            Ứng dụng đang chạy ở chế độ Lưu trữ Trình duyệt (Offline fallback) do chưa hoàn tất thiết lập Firebase.
          </span>
          <span className="text-[11px] text-slate-400">
            Hãy nhấp nút "Thiết lập Firebase" trong giao diện AI Studio để kích hoạt sao lưu đám mây đồng bộ.
          </span>
          <button 
            onClick={() => setShowOfflineBanner(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded"
          >
            Đóng
          </button>
        </div>
      )}
      
      {/* Upper Floating Bento Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 pt-6 sm:px-6">
        <div className="bento-card p-4 sm:p-5 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl shadow-black/30 bento-glow-indigo">
          
          {/* Logo / App Name */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-700 to-indigo-400 opacity-80" />
              <BookMarked className="w-6 h-6 relative z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                MangaKeeper
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Sổ tay thông minh cho người sưu tầm truyện tranh</p>
            </div>
          </div>

          {/* Quick Global Stats & Action buttons */}
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Nest-styled glassmorphic Bento cells for stats */}
            <div className="hidden md:flex items-center gap-2.5 bg-slate-950/50 p-1 rounded-2xl border border-white/5">
              <div className="py-1 px-3 bg-slate-900/45 rounded-xl border border-white/5 flex items-center gap-1.5 shadow-sm">
                <span className="text-slate-500 font-medium text-[11px]">Tổng bộ:</span>
                <span className="font-bold text-indigo-400 font-mono text-xs">{seriesList.length}</span>
              </div>
              <div className="py-1 px-3 bg-slate-900/45 rounded-xl border border-white/5 flex items-center gap-1.5 shadow-sm">
                <span className="text-slate-500 font-medium text-[11px]">Tập đã có:</span>
                <span className="font-bold text-slate-200 font-mono text-xs">{totalOwnedVolumes}</span>
              </div>
              <div className="py-1 px-3 bg-slate-900/45 rounded-xl border border-white/5 flex items-center gap-1.5 shadow-sm">
                <span className="text-slate-500 font-medium text-[11px]">Chi tiêu:</span>
                <span className="font-bold text-emerald-400 font-mono text-xs">{formatVND(totalMoneySpent)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={handleLogout}
                className="py-2 px-3.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-1.5 shadow-md"
                title="Đăng xuất khỏi thiết bị"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="py-2 px-3.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-1.5 shadow-md"
                title="Đồng bộ & Sao lưu dữ liệu"
              >
                <Settings className={`w-4 h-4 text-slate-400 transition-transform duration-500 ${showSettings ? "rotate-90 text-indigo-400" : ""}`} />
                <span>Đồng bộ</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-300 flex items-center gap-1.5 border border-indigo-500/30"
              >
                <Plus className="w-4.5 h-4.5" />
                Thêm bộ mới
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column / Widget Sidebar */}
        <section className="w-full lg:w-[330px] flex-shrink-0 space-y-6">
          
          {/* Settings / Cloud Synchronization Box */}
          {showSettings && (
            <div className="bento-card bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 shadow-lg space-y-4 bento-glow-indigo">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-400" />
                  Sao lưu đám mây (Miễn phí)
                </h4>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-semibold hover:bg-slate-800/50 px-2 py-1 rounded-lg transition-all"
                >
                  Đóng
                </button>
              </div>

              <div className="text-[11px] text-slate-400 space-y-2.5 leading-relaxed">
                <p>
                  Mọi dữ liệu của bạn được lưu trữ hoàn toàn miễn phí trên cơ sở dữ liệu đám mây <strong className="text-slate-200 font-semibold">Firebase Firestore</strong>.
                </p>
                <p>
                  Để truy cập dữ liệu của bạn trên các thiết bị khác (điện thoại, máy tính bảng...), hãy copy và dán <strong className="text-indigo-400 font-semibold">Mã đồng bộ</strong> bên dưới.
                </p>
              </div>

              {/* Your Code Copy Box */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-900 flex flex-col gap-2 shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-widest font-mono">Mã đồng bộ của bạn:</span>
                <div className="flex items-center justify-between gap-2 bg-slate-900/40 p-1 rounded-lg border border-white/5">
                  <code className="text-xs font-mono text-indigo-300 truncate select-all pl-2">{userId}</code>
                  <button
                    onClick={handleCopySyncCode}
                    className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg hover:text-white transition-all flex-shrink-0 border border-white/5"
                    title="Sao chép mã"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Restore / Import Sync Code Box */}
              <div className="space-y-2.5 pt-3.5 border-t border-slate-800/60">
                <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-widest block font-mono">Đồng bộ từ thiết bị khác:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập mã 'user_...'"
                    value={syncCodeInput}
                    onChange={(e) => setSyncCodeInput(e.target.value)}
                    className="flex-1 bg-slate-950/80 border border-slate-900 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                  />
                  <button
                    onClick={handleApplySyncCode}
                    className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 border border-indigo-500/20"
                  >
                    Kết nối
                  </button>
                </div>
                {syncSuccessMsg && (
                  <p className="text-emerald-400 text-[11px] text-center font-semibold mt-1">
                    {syncSuccessMsg}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Core Release Calendar widget */}
          <UpcomingReleases 
            userId={userId} 
            seriesList={seriesList} 
            onRefreshStats={() => loadAllData(userId)} 
          />



        </section>

        {/* Right Column / Main Feed Area */}
        <section className="flex-1 space-y-6">
          
          {/* Search, Filter bar & Welcome header */}
          <div className="bento-card p-5 sm:p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-lg space-y-5 bento-glow-indigo">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Hộp công cụ sưu tầm
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Tìm kiếm bộ truyện, phân loại trạng thái mua nhanh chóng.</p>
              </div>

              {/* Status statistics indicator pills */}
              <div className="flex gap-2 text-[10px] font-bold self-stretch sm:self-auto justify-end">
                <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-xl border border-blue-500/20 shadow-sm">
                  Đang mua: {seriesList.filter(s => s.status === 'ongoing').length}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-xl border border-emerald-500/20 shadow-sm">
                  Đã xong: {seriesList.filter(s => s.status === 'completed').length}
                </span>
              </div>
            </div>

            {/* Inputs controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Search bar */}
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bộ truyện, tác giả, nhà xuất bản..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-2xl py-3 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-inner"
                />
              </div>

              {/* Filter selection */}
              <div className="relative">
                <Filter className="absolute left-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-2xl py-3 pl-9 pr-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer shadow-inner"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="ongoing">Đang mua / Đang phát hành</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="on_hold">Đang tạm dừng</option>
                  <option value="dropped">Đã drop (Không mua nữa)</option>
                </select>
                <div className="absolute right-3 top-4 w-1.5 h-1.5 border-r border-b border-slate-400 transform rotate-45 pointer-events-none" />
              </div>

            </div>

          </div>

          {/* Total Overview Stats Panel (Mobile view friendly) */}
          <div className="grid grid-cols-3 gap-3 md:hidden">
            <div className="bento-card bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl text-center">
              <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider block font-mono">Tổng bộ</span>
              <span className="text-base font-extrabold text-indigo-400 mt-1 block">{seriesList.length}</span>
            </div>
            <div className="bento-card bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl text-center">
              <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider block font-mono">Đã có</span>
              <span className="text-base font-extrabold text-slate-100 mt-1 block">{totalOwnedVolumes} tập</span>
            </div>
            <div className="bento-card bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl text-center">
              <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider block font-mono">Chi tiêu</span>
              <span className="text-[11px] font-extrabold text-emerald-400 mt-1.5 block truncate">
                {Math.round(totalMoneySpent / 1000)}k đ
              </span>
            </div>
          </div>

          {/* Series Feed Header */}
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h2 className="font-extrabold text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Tủ truyện của bạn ({filteredSeries.length} bộ)
            </h2>
            <div className="flex items-center gap-2">
              {selectedSeriesIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="py-1 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/20 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xóa đã chọn ({selectedSeriesIds.length})</span>
                  <span className="sm:hidden">Xóa ({selectedSeriesIds.length})</span>
                </button>
              )}
              {loading && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
              <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">Mới nhất xếp trên</span>
            </div>
          </div>

          {/* Main Feed Series Cards Grid */}
          {loading && seriesList.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold">Đang tải tủ truyện của bạn từ đám mây...</p>
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/25 border-2 border-dashed border-slate-800/80 rounded-3xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800/85 flex items-center justify-center mx-auto text-slate-500 shadow-inner">
                <BookMarked className="w-7 h-7 text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-300 text-sm">Tủ truyện trống rỗng</h4>
                <p className="text-xs text-slate-500 max-w-[340px] mx-auto leading-relaxed">
                  {searchTerm || statusFilter !== "all" 
                    ? "Không tìm thấy bộ truyện nào phù hợp với bộ lọc tìm kiếm hiện tại." 
                    : "Bạn chưa đăng ký bộ truyện tranh nào cả. Bấm nút 'Thêm bộ mới' ở trên để khởi tạo bộ đầu tiên."}
                </p>
              </div>
              {!(searchTerm || statusFilter !== "all") && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all border border-indigo-500/20"
                >
                  Bắt đầu thêm ngay
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSeries.map((series) => {
                // Calculate properties for this specific series
                const seriesOwnedCount = globalVolumes.filter(v => v.seriesId === series.id).length;
                const totalSpentOnThis = globalVolumes
                  .filter(v => v.seriesId === series.id && v.price)
                  .reduce((sum, v) => sum + (v.price || 0), 0);
                  
                return (
                  <div
                    key={series.id}
                    onClick={() => setActiveSeries(series)}
                    className={`bento-card bento-card-interactive overflow-hidden cursor-pointer flex flex-col justify-between transition-all duration-350 shadow-md relative group ${selectedSeriesIds.includes(series.id) ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
                  >
                    
                    {/* Visual Card Upper Section */}
                    <div>
                      {/* Cover Photo */}
                      <div className="relative h-48 bg-slate-950 overflow-hidden border-b border-white/5 flex items-center justify-center group-hover:brightness-110 transition-all">
                        {/* Checkbox for selection */}
                        <div 
                          className="absolute top-2 left-2 z-20"
                          onClick={(e) => toggleSelection(e, series.id)}
                        >
                          <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${selectedSeriesIds.includes(series.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-900/60 border-slate-700/80 text-transparent opacity-0 group-hover:opacity-100 hover:bg-slate-800/80 hover:border-slate-600'}`}>
                            <Check className="w-4 h-4" />
                          </div>
                        </div>

                        {series.coverUrl ? (
                          <img 
                            src={series.coverUrl} 
                            alt={series.name} 
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-1.5 bg-slate-950 shadow-inner">
                            <BookOpen className="w-8 h-8 text-slate-800" />
                            <span className="text-[11px] font-medium font-sans">Chưa có ảnh bìa</span>
                          </div>
                        )}
                        
                        {/* Status absolute badge */}
                        <div className="absolute top-3 right-3 z-10">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border backdrop-blur-md bg-slate-900/80 shadow-md tracking-wide ${statusColors[series.status]}`}>
                            {series.status === 'ongoing' ? 'Đang mua' : series.status === 'completed' ? 'Hoàn thành' : series.status === 'on_hold' ? 'Tạm dừng' : 'Đã drop'}
                          </span>
                        </div>
                      </div>

                      {/* Info and content */}
                      <div className="p-5 space-y-3">
                        <div className="space-y-0.5">
                          <h4 className="font-extrabold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 text-sm tracking-tight" title={series.name}>
                            {series.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium truncate">Tác giả: <span className="text-slate-300">{series.author || "Chưa rõ"}</span></p>
                        </div>

                        {/* Visual owned ratio bar info */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span className="font-medium">Đã sở hữu:</span>
                            <span className="font-bold text-slate-200">
                              {seriesOwnedCount} {series.totalVolumes ? `/ ${series.totalVolumes}` : ""} tập
                            </span>
                          </div>
                          
                          {/* Progress slider bar */}
                          {series.totalVolumes ? (
                            <div className="w-full bg-slate-950/70 h-1.5 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (seriesOwnedCount / series.totalVolumes) * 100)}%` }}
                              />
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-500 italic font-mono">Manga chưa giới hạn tập</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer: Price Info spent */}
                    <div className="px-5 py-3 bg-slate-950/45 border-t border-white/5 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Chi tiêu bộ này:</span>
                      <span className="font-extrabold text-emerald-400 font-mono text-[13px]">{formatVND(totalSpentOnThis)}</span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </section>

      </main>

      {/* Footer credits and information */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-6 text-center text-[11px] text-slate-500 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 MangaKeeper. Thiết kế tinh tế cho tín đồ sưu tầm Manga.</p>
          <div className="flex gap-4 font-medium text-slate-400">
            <a href="#" className="hover:text-indigo-400 transition-colors">Hướng dẫn</a>
            <span className="text-slate-800">|</span>
            <a href="#" className="hover:text-indigo-400 transition-colors">Điều khoản</a>
            <span className="text-slate-800">|</span>
            <a href="#" className="hover:text-indigo-400 transition-colors">Bảo mật</a>
          </div>
        </div>
      </footer>

      {/* MODAL: Add New Comic Series */}
      {showAddModal && (
        <AddSeriesModal
          onSave={handleCreateSeries}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* DRAWER / DASHBOARD: Comic Series details page */}
      {activeSeries && (
        <SeriesDashboard
          series={activeSeries}
          onClose={() => {
            setActiveSeries(null);
            loadAllData(userId); // Reload list when closing the series detailed page to ensure stats stay synchronized
          }}
          onUpdateSeries={() => {
            loadAllData(userId);
            // Reload the activeSeries information if it was edited
            getSeriesList(userId).then(list => {
              const updated = list.find(s => s.id === activeSeries.id);
              if (updated) setActiveSeries(updated);
            });
          }}
          onDeleteSeries={() => {
            setActiveSeries(null);
            loadAllData(userId);
          }}
        />
      )}

    </div>
  );
}
