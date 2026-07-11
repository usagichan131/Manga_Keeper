import { useState } from "react";
import { auth, isFirebasePlaceholder } from "../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { BookOpen, LogIn, AlertCircle } from "lucide-react";

export default function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (isFirebasePlaceholder) {
      setError("Firebase chưa được cấu hình. Vui lòng deploy Firebase thực trước.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="z-10 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md flex flex-col items-center shadow-2xl">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">MangaKeeper</h1>
        <p className="text-slate-400 text-center mb-8">
          Quản lý bộ sưu tập truyện tranh của bạn một cách thông minh và tiện lợi.
        </p>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2 mb-6 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-slate-900 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-70 disabled:pointer-events-none"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin"></div>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Đăng nhập bằng Google
            </>
          )}
        </button>
        
        {isFirebasePlaceholder && (
          <p className="mt-6 text-xs text-amber-500/80 text-center">
            Lưu ý: Ứng dụng đang chạy với dữ liệu mẫu (Offline mode). 
            Tính năng đăng nhập thực tế sẽ hoạt động sau khi kết nối Firebase.
          </p>
        )}
      </div>
    </div>
  );
}
