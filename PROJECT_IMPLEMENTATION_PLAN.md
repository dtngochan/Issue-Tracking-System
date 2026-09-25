# KẾ HOẠCH TỔNG THỂ VÀ QUY TRÌNH THỰC HIỆN DỰ ÁN
## HỆ THỐNG QUẢN LÝ LỖI VÀ PHÂN LOẠI SỰ CỐ (ISSUE TRACKING & AUTO-TRIAGE SYSTEM)

> **Công nghệ sử dụng:**
> - **Cơ sở dữ liệu:** MySQL (Thao tác & quản lý qua Navicat)
> - **Backend / REST API:** Python (Flask, Flask-CORS, Flask-SQLAlchemy / PyMySQL, PyJWT)
> - **Bộ máy Phân loại Tự động:** Python Regex & Keyword Heuristics Log Parser Engine
> - **Frontend / UI:** Web UI (HTML5, Vanilla CSS3, JavaScript ES6+, Chart.js)

---

## 📅 CÁC GIAI ĐOẠN THỰC HIỆN (PHASE BREAKDOWN)

### 🔹 GIAI ĐOẠN 1: THIẾT LẬP MÔI TRƯỜNG VÀ CẤU TRÚC DỰ ÁN
- [x] Tạo cấu trúc thư mục dự án chuẩn (Backend, Frontend, Database Scripts, Docs).
- [x] Thiết lập môi trường ảo Python (`venv`) và cài đặt các phụ thuộc (`requirements.txt`).
- [x] Cấu hình file ứng dụng chính (`app.py`, `config.py`).

### 🔹 GIAI ĐOẠN 2: THIẾT KẾ & KHỞI TẠO CƠ SỞ DỮ LIỆU MYSQL (NAVICAT READY)
- [ ] Viết file script SQL `database/schema.sql` khởi tạo 8 bảng chuẩn:
  1. `users` (Quản lý người dùng, vai trò Global Admin/User).
  2. `projects` (Danh mục dự án, trạng thái ACTIVE/ARCHIVED).
  3. `project_members` (Phân bổ nhân sự & vai trò PM/DEV/QA).
  4. `modules` (Phân hệ dự án & Dev phụ trách mặc định).
  5. `issues` (Thông tin bug, trạng thái workflow, severity, priority, assignees, SLA).
  6. `issue_comments` (Bình luận, trao đổi).
  7. `issue_history` (Audit Log ghi vết mọi thay đổi).
  8. `attachments` (Tệp & ảnh đính kèm).
- [ ] Viết script SQL `database/seed_data.sql` tạo sẵn dữ liệu mẫu (1 Admin, 1 PM, 2 Dev, 2 QA, 1 Dự án E-Commerce mẫu kèm các Modules & Bugs mẫu).
- [ ] Hướng dẫn import file SQL vào MySQL bằng Navicat.

### 🔹 GIAI ĐOẠN 3: PHÁT TRIỂN BỘ MÁY PHÂN LOẠI TỰ ĐỘNG (SMART LOG PARSER & AUTO-TRIAGE)
- [ ] Xây dựng module Python `services/auto_triage.py`:
  - **Bóc tách chuỗi Log / Stacktrace:** Nhận diện HTTP Status Code (500, 502, 404...), Exception type (`NullPointerException`, `DatabaseConnectionError`, `OutOfMemoryError`, `SyntaxError`, `TimeoutError`...).
  - **Quy tắc phân loại (Rules Engine):** Tự động đề xuất `severity` (CRITICAL, MAJOR, MINOR, TRIVIAL) và `issue_type` (BUG, INCIDENT, ENHANCEMENT).
  - **Tính toán Confidence Score (%):** Đưa ra độ tin cậy dựa trên số lượng từ khóa nhận diện được.
  - **Tự động gán người xử lý (Auto-Assignee):** Dựa vào `module_id` được chọn để truy vấn Dev phụ trách module đó.

### 🔹 GIAI ĐOẠN 4: PHÁT TRIỂN BACKEND REST API (PYTHON / FLASK)
- [ ] Cấu hình ORM Models (`models/`).
- [ ] Xây dựng các API Routes (`routes/`):
  - `auth_routes.py`: Đăng nhập, đăng xuất, lấy thông tin User hiện tại.
  - `project_routes.py`: Lấy danh sách dự án, tạo dự án, gán thành viên, tạo Module, Đóng/Lưu trữ dự án (`ARCHIVED`).
  - `issue_routes.py`: Tạo ticket, danh sách/lọc ticket, chi tiết ticket, luân chuyển trạng thái lỗi theo phân quyền.
  - `triage_routes.py`: Endpoint API nhận log văn bản và trả về kết quả gợi ý phân loại tự động thời gian thực.
  - `dashboard_routes.py`: Thống kê MTTR, tỷ lệ Reopen, phân bổ Bug theo Severity/Status, báo cáo tổng hợp.

### 🔹 GIAI ĐOẠN 5: XÂY DỰNG GIAO DIỆN NGUỜI DÙNG FRONTEND (PREMIUM WEB UI)
- [ ] Thiết kế hệ thống giao diện hiện đại, trực quan, hỗ trợ Dark/Light Theme:
  - **Trang Login / Switch Role:** Cho phép dễ dàng chuyển đổi qua lại giữa Admin, PM, QA, Dev để test phân quyền.
  - **Trang Project Management:** Quản lý dự án, danh sách thành viên, cấu hình Module & Dev phụ trách.
  - **Trang Issue Board & List:** Danh sách bug dạng bảng và Kanban board, lọc theo Severity, Status, Assignee, Module.
  - **Form Tạo Bug Thông Minh (Live Auto-Triage Demo):** Dán đoạn Log vào -> Hệ thống tự động gọi API phân loại -> Điền sẵn Severity, Type, Dev phụ trách và hiển thị Confidence Score %.
  - **Trang Chi Tiết Ticket:** Cho phép chuyển trạng thái theo quy tắc phân quyền, bình luận, xem Lịch sử biến động (Audit Log).
  - **Trang Dashboard & Analytics:** Biểu đồ tương tác thời gian thực (Chart.js), thống kê hiệu suất QA/Dev, xem báo cáo dự án `ARCHIVED` ở chế độ Read-only.

### 🔹 GIAI ĐOẠN 6: KIỂM THỬ THỰC TẾ & BẢO TRÌ (TESTING & VERIFICATION)
- [ ] Chạy Backend Flask trên cổng local `http://127.0.0.1:5000`.
- [ ] Khởi chạy Web Application và thực nghiệm toàn bộ vòng đời Bug từ A-Z.
