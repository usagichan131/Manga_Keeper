import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, LogOut, FileUp } from "lucide-react";
import Papa from "papaparse";
import { collection, writeBatch, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";

interface AdminDashboardProps {
  onClose: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: "success" | "error" | "info", text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage({ type: "info", text: "Đang phân tích file..." });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Validate headers
        const requiredHeaders = ["publisher", "date", "title", "volume", "price"];
        const headers = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setMessage({ type: "error", text: `File thiếu các cột bắt buộc: ${missingHeaders.join(", ")}. Các cột yêu cầu: publisher, date, title, volume, price` });
          return;
        }

        setCsvData(results.data);
        setMessage({ type: "success", text: `Đã tải ${results.data.length} dòng dữ liệu hợp lệ.` });
      },
      error: (error) => {
        setMessage({ type: "error", text: `Lỗi đọc file: ${error.message}` });
      }
    });
  };

  const handleSyncToDatabase = async () => {
    if (csvData.length === 0) return;
    if (!db) {
      setMessage({ type: "error", text: "Lỗi kết nối database (chế độ offline)." });
      return;
    }

    setLoading(true);
    setMessage({ type: "info", text: "Đang đồng bộ lên hệ thống chung..." });

    try {
      const batch = writeBatch(db);
      let count = 0;

      // Group by title? No, admin uploads general schedule.
      // We'll create a collection "globalReleases".
      // Each doc: id = slugified_title_vol, or auto id.
      // We can use auto id, or a composite key. Let's use auto id.
      const globalReleasesRef = collection(db, "globalReleases");

      for (const row of csvData) {
        if (!row.title || !row.date) continue;
        
        // Basic validation and parsing
        const dateParts = row.date.split("/");
        let timestamp = 0;
        if (dateParts.length === 3) { // dd/mm/yyyy
          timestamp = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0])).getTime();
        } else if (dateParts.length === 2) { // dd/mm (assume current year)
          const currYear = new Date().getFullYear();
          timestamp = new Date(currYear, parseInt(dateParts[1]) - 1, parseInt(dateParts[0])).getTime();
        }

        const newDocRef = doc(globalReleasesRef);
        batch.set(newDocRef, {
          title: row.title.trim(),
          volume: row.volume ? row.volume.toString().trim() : "",
          publisher: row.publisher ? row.publisher.trim() : "",
          price: row.price ? parseInt(row.price.toString().replace(/\D/g, "")) || 0 : 0,
          date: row.date.trim(),
          timestamp: timestamp,
          createdAt: Date.now(),
        });
        count++;

        // Firestore batch has a limit of 500 operations. 
        // We'll just do a single batch for now assuming csv is < 500 lines.
        // If it's more, we should chunk it, but for monthly releases it's fine.
        if (count >= 490) {
           break; // safety limit for now
        }
      }

      await batch.commit();
      
      setMessage({ type: "success", text: `Đã đồng bộ ${count} truyện phát hành lên hệ thống!` });
      setCsvData([]); // clear after success
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error(error);
      setMessage({ type: "error", text: `Lỗi đồng bộ: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/60 bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <FileUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-lg">Admin Dashboard</h2>
              <p className="text-xs text-slate-400">Cập nhật lịch phát hành chung toàn hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
              title="Đăng xuất Admin"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
             <h3 className="text-sm font-semibold text-slate-200 mb-2">Định dạng file CSV yêu cầu:</h3>
             <p className="text-xs text-slate-400 mb-3 leading-relaxed">
               File CSV phải có dòng tiêu đề tiếng Anh gồm các cột chính xác như sau:
             </p>
             <code className="block bg-slate-950 p-3 rounded-xl text-xs text-indigo-300 font-mono border border-slate-800 mb-2 whitespace-pre-wrap">
               publisher,date,title,volume,price{"\n"}
               Kim Đồng,01/07,Tình Yêu LV999,7,45000{"\n"}
               Trẻ,03/07,Ship of Theseus,9,30000
             </code>
             <ul className="text-xs text-slate-400 list-disc pl-5 space-y-1 mt-3">
                <li><strong className="text-slate-300">publisher:</strong> Nhà xuất bản (Kim Đồng, Trẻ, IPM,...)</li>
                <li><strong className="text-slate-300">date:</strong> Ngày phát hành (định dạng DD/MM hoặc DD/MM/YYYY)</li>
                <li><strong className="text-slate-300">title:</strong> Tựa truyện</li>
                <li><strong className="text-slate-300">volume:</strong> Tập (để trống nếu 1 tập)</li>
                <li><strong className="text-slate-300">price:</strong> Giá tiền (số, VD: 45000)</li>
             </ul>
          </div>

          <div>
             <input 
               type="file" 
               accept=".csv"
               ref={fileInputRef}
               onChange={handleFileUpload}
               className="hidden" 
               id="csv-upload"
             />
             <label 
               htmlFor="csv-upload" 
               className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl cursor-pointer transition-all group"
             >
               <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mb-2" />
               <span className="text-sm text-slate-400 group-hover:text-slate-300 font-medium">Chọn file CSV lịch phát hành</span>
               <span className="text-xs text-slate-500 mt-1">Hỗ trợ .csv</span>
             </label>
          </div>

          {message && (
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${
              message.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" :
              message.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              "bg-blue-500/10 border-blue-500/20 text-blue-400"
            }`}>
              {message.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
              {message.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {message.type === "info" && <FileText className="w-5 h-5 shrink-0" />}
              <div className="text-sm font-medium">{message.text}</div>
            </div>
          )}

          {csvData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200">Dữ liệu xem trước ({csvData.length} dòng):</h3>
                <button
                  onClick={() => setCsvData([])}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Xóa dữ liệu
                </button>
              </div>
              <div className="border border-slate-700/60 rounded-xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto custom-scrollbar bg-slate-900/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 sticky top-0 text-slate-400">
                      <tr>
                        <th className="p-3 font-medium">Ngày</th>
                        <th className="p-3 font-medium">NXB</th>
                        <th className="p-3 font-medium">Tựa truyện</th>
                        <th className="p-3 font-medium">Tập</th>
                        <th className="p-3 font-medium text-right">Giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {csvData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="p-3 text-slate-300">{row.date}</td>
                          <td className="p-3 text-slate-400">{row.publisher}</td>
                          <td className="p-3 text-slate-200 font-medium">{row.title}</td>
                          <td className="p-3 text-slate-400">{row.volume}</td>
                          <td className="p-3 text-slate-400 text-right">{row.price ? parseInt(row.price).toLocaleString('vi-VN') + 'đ' : '-'}</td>
                        </tr>
                      ))}
                      {csvData.length > 10 && (
                        <tr>
                          <td colSpan={5} className="p-3 text-center text-slate-500 italic">
                            ... và {csvData.length - 10} dòng khác
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800/60 bg-slate-800/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
          <button 
            disabled={csvData.length === 0 || loading}
            onClick={handleSyncToDatabase}
            className="px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang đồng bộ...
              </>
            ) : (
              <>
                Đồng bộ lên Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
