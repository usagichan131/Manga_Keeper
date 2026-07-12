import { useState, useEffect } from "react";
import { Calendar, AlertCircle, CheckCircle2, ChevronRight, DollarSign, Bell } from "lucide-react";
import { Volume, Series } from "../types";
import { saveVolume, getVolumes } from "../lib/db";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

interface UpcomingReleasesProps {
  userId: string;
  seriesList: Series[];
  onRefreshStats: () => void;
}

interface VolumeWithSeries extends Volume {
  seriesName: string;
  seriesCover?: string;
  isGlobal?: boolean;
  publisher?: string;
}

export default function UpcomingReleases({ userId, seriesList, onRefreshStats }: UpcomingReleasesProps) {
  const [upcomingVolumes, setUpcomingVolumes] = useState<VolumeWithSeries[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'week'>('month');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUpcomingVolumes();
  }, [seriesList]);

  const fetchUpcomingVolumes = async () => {
    setLoading(true);
    try {
      let enriched: VolumeWithSeries[] = [];
      
      if (seriesList.length > 0) {
        // Get all volumes for each of our user's series
        const allVolumesPromises = seriesList.map(series => getVolumes(series.id));
        const allVolumesResults = await Promise.all(allVolumesPromises);
        const allVolumes = allVolumesResults.flat();
        
        // Filter only those belonging to wishlist and with a valid releaseDate
        const userWishlist = allVolumes.filter(v => v.status === "wishlist" && v.releaseDate);
        
        // Match series names
        const userEnriched: VolumeWithSeries[] = userWishlist.map(v => {
          const matchingSeries = seriesList.find(s => s.id === v.seriesId);
          return {
            ...v,
            seriesName: matchingSeries?.name || "Bộ truyện ẩn",
            seriesCover: matchingSeries?.coverUrl
          };
        });
        enriched = [...userEnriched];
      }

      // Fetch global releases
      if (db) {
        const globalRef = collection(db, "globalReleases");
        const globalSnap = await getDocs(globalRef);
        const globalReleases: VolumeWithSeries[] = globalSnap.docs.map(doc => {
          const data = doc.data();
          
          let releaseDate = "";
          if (data.date) {
            const parts = data.date.split('/');
            if (parts.length >= 2) {
              const year = parts.length === 3 ? parts[2] : new Date().getFullYear();
              const month = parts[1].padStart(2, '0');
              const day = parts[0].padStart(2, '0');
              releaseDate = `${year}-${month}-${day}`;
            } else {
              releaseDate = data.date;
            }
          }

          return {
            id: doc.id,
            seriesId: "global",
            volumeNumber: data.volume || "",
            status: "wishlist",
            price: data.price || 0,
            releaseDate: releaseDate,
            seriesName: data.title || "Unknown",
            isGlobal: true,
            publisher: data.publisher,
            createdAt: data.createdAt || Date.now(),
          } as VolumeWithSeries;
        });
        enriched = [...enriched, ...globalReleases];
      }

      // Sort chronologically by releaseDate
      enriched.sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        const dateA = new Date(a.releaseDate).getTime();
        const dateB = new Date(b.releaseDate).getTime();
        return dateA - dateB;
      });
      
      setUpcomingVolumes(enriched);
    } catch (err) {
      console.error("Error loading upcoming releases:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsOwnedDirectly = async (vol: VolumeWithSeries) => {
    if (confirm(`Bạn đã mua "Tập ${vol.volumeNumber}" của bộ "${vol.seriesName}"?`)) {
      try {
        await saveVolume({
          ...vol,
          status: 'owned',
          purchaseDate: new Date().toISOString().split('T')[0] // default to today
        });
        // Reload list
        fetchUpcomingVolumes();
        onRefreshStats();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Date filtering logic based on simulated year 2026-07-10 or browser current time
  const filteredList = upcomingVolumes.filter(vol => {
    if (!vol.releaseDate) return false;
    
    const release = new Date(vol.releaseDate);
    const today = new Date("2026-07-10"); // Use the metadata environment local date for absolute context accuracy!
    
    if (filterMode === 'all') {
      // Only show future/unpurchased releases
      return release >= today || (release.getMonth() === today.getMonth() && release.getFullYear() === today.getFullYear());
    }
    
    if (filterMode === 'month') {
      // Same month and year
      return release.getMonth() === today.getMonth() && release.getFullYear() === today.getFullYear();
    }
    
    if (filterMode === 'week') {
      // Within 7 days
      const diffTime = release.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= -1 && diffDays <= 7;
    }
    
    return true;
  });

  const getDayLabel = (dateStr: string) => {
    const today = new Date("2026-07-10");
    const release = new Date(dateStr);
    
    const diffTime = release.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hôm nay!";
    if (diffDays === 1) return "Ngày mai";
    if (diffDays === -1) return "Hôm qua";
    if (diffDays < -1) return `Đã phát hành`;
    return `Còn ${diffDays} ngày`;
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="bento-card p-5 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex flex-col flex-1 shadow-lg bento-glow-indigo min-h-0">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3.5 mb-4 shrink-0">
        <h3 className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          Lịch phát hành & Nhắc mua
        </h3>
        <span className="text-[9px] bg-indigo-500/15 text-indigo-400 px-2.5 py-0.5 rounded-full font-extrabold border border-indigo-500/25 uppercase tracking-wider font-mono">
          NXB Lịch
        </span>
      </div>

      {/* Segmented Filter */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 border border-white/5 rounded-2xl mb-4 text-center">
        <button
          onClick={() => setFilterMode('week')}
          className={`py-1.5 px-1 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            filterMode === 'week'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tuần này
        </button>
        <button
          onClick={() => setFilterMode('month')}
          className={`py-1.5 px-1 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            filterMode === 'month'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tháng này
        </button>
        <button
          onClick={() => setFilterMode('all')}
          className={`py-1.5 px-1 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            filterMode === 'all'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tất cả
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {loading ? (
          <div className="text-center py-8 text-slate-500 text-xs font-medium">Đang tải lịch phát hành...</div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col items-center gap-2 text-slate-500 shadow-inner">
            <Calendar className="w-6 h-6 text-slate-700" />
            <p className="text-xs font-medium">Không có lịch phát hành truyện nào phù hợp.</p>
            <p className="text-[10px] text-slate-600 max-w-[180px] mx-auto text-center font-medium">
              Đặt ngày phát hành từ NXB ở phần "Muốn mua" của mỗi tập để theo dõi.
            </p>
          </div>
        ) : (
          filteredList.map((vol) => {
            const label = getDayLabel(vol.releaseDate!);
            const isToday = label === "Hôm nay!";
            
            return (
              <div 
                key={vol.id}
                className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between hover:border-indigo-500/30 transition-all duration-300 shadow-inner hover:bg-slate-950/80 group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-12 bg-slate-900 rounded-xl border border-white/5 flex-shrink-0 overflow-hidden shadow">
                    {vol.seriesCover ? (
                      <img src={vol.seriesCover} alt={vol.seriesName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700 text-[10px] font-bold">
                        Manga
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-bold text-slate-200 truncate pr-2" title={vol.seriesName}>
                      {vol.seriesName}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-extrabold text-indigo-400">Tập {vol.volumeNumber}</span>
                      <span className="text-[10px] text-slate-500 font-bold font-mono">| {formatDate(vol.releaseDate!)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                    isToday 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' 
                      : vol.isGlobal ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-slate-900 text-slate-400 border-white/5'
                  }`}>
                    {vol.isGlobal ? vol.publisher || "Chung" : label}
                  </span>
                  
                  {!vol.isGlobal && (
                    <button
                      onClick={() => markAsOwnedDirectly(vol)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 bg-indigo-600 hover:bg-indigo-500 text-white p-1 px-2 rounded-lg text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-sm border border-indigo-500/20"
                      title="Đánh dấu đã mua"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Đã mua
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer Widget */}
      {filteredList.length > 0 && (
        <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-2xl p-3 mt-4 flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            <span>Kế hoạch tuần/tháng này:</span>
          </div>
          <span className="font-bold text-indigo-200 font-mono">
            {filteredList.length} tập
          </span>
        </div>
      )}

    </div>
  );
}
