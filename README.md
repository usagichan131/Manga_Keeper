# MangaKeeper

Ứng dụng quản lý mua truyện tranh, theo dõi các tập đã có, thống kê chi tiêu.

## Hướng dẫn Deploy lên Render

Render là một nền tảng miễn phí giúp bạn dễ dàng deploy các ứng dụng web. Dưới đây là các bước để deploy MangaKeeper lên Render:

### Bước 1: Đưa mã nguồn lên GitHub
1. Mở menu **Settings** (biểu tượng bánh răng) trong AI Studio.
2. Chọn **Export to GitHub** để đẩy toàn bộ mã nguồn này lên một repository trên tài khoản GitHub của bạn.

### Bước 2: Tạo ứng dụng trên Render
1. Truy cập [Render.com](https://render.com/) và đăng nhập bằng tài khoản GitHub của bạn.
2. Tại màn hình Dashboard, nhấn nút **New** và chọn **Static Site**.
3. Kết nối với tài khoản GitHub và chọn Repository chứa mã nguồn MangaKeeper mà bạn vừa export.

### Bước 3: Cấu hình Render
Điền các thông tin cấu hình như sau:
- **Name:** Đặt tên cho ứng dụng của bạn (ví dụ: `mangakeeper`).
- **Branch:** `main` (hoặc nhánh mặc định của bạn).
- **Build Command:** `npm install && npm run build`
- **Publish directory:** `dist`

### Bước 4: Deploy
- Nhấn nút **Create Static Site** ở cuối trang.
- Render sẽ bắt đầu cài đặt thư viện và build ứng dụng của bạn. Quá trình này có thể mất vài phút.
- Khi hoàn tất, bạn sẽ thấy trạng thái chuyển sang **Live** và một đường link có dạng `https://ten-ung-dung.onrender.com`.

### Bước 5: Cấu hình Routing cho SPA (Quan trọng)
Vì đây là một ứng dụng Single Page Application (SPA) sử dụng React Router (nếu có), bạn cần cấu hình lại route để tránh lỗi 404 khi tải lại trang (refresh):
1. Trong màn hình quản lý Static Site của Render, chọn tab **Redirects/Rewrites**.
2. Thêm một rule mới với các thông tin sau:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`
3. Nhấn **Save Changes**.

🎉 Hoàn tất! Bây giờ bạn có thể truy cập ứng dụng MangaKeeper trên điện thoại hoặc máy tính thông qua đường link của Render.

---

### Lưu ý về Firebase
Dữ liệu của ứng dụng được lưu trữ trên Firebase. File `firebase-applet-config.json` chứa các cấu hình kết nối. Đảm bảo file này đã được đẩy lên GitHub để ứng dụng trên Render có thể kết nối đúng với cơ sở dữ liệu của bạn.
