1. Ma trận Phân quyền & Vai trò (Role & Permission Matrix)
Hệ thống quản lý phân quyền theo 2 cấp: Toàn hệ thống (Global) và Trong từng Dự án (Project-level).

2. Quy trình Chuyển trạng thái Lỗi (Issue State Machine)
Một bản ghi lỗi (Bug/Incident) bắt buộc phải chuyển trạng thái theo đúng quy tắc và đúng người thực hiện:

[NEW] ──────────► [IN_PROGRESS] ──────────► [RESOLVED]
│                    ▲                          │
├─► [REJECTED]       │                          ├─► [VERIFIED / CLOSED]
├─► [DUPLICATE]      └──────── [REOPENED] ◄─────┘
└─► [DEFERRED]
Điều kiện chuyển trạng thái (Transition Rules):
NEW $\rightarrow$ IN_PROGRESS:

Người thực hiện: Dev được gán hoặc PM.

Điều kiện: Dev xác nhận lỗi đúng và bắt đầu mở code xử lý.

IN_PROGRESS $\rightarrow$ RESOLVED:

Người thực hiện: Dev.

Điều kiện: Dev đã cập nhật code sửa lỗi lên môi trường Test.

RESOLVED $\rightarrow$ CLOSED:

Người thực hiện: QA / Tester (Người tạo bug).

Điều kiện: QA kiểm thử lại (Re-test) đạt yêu cầu.

RESOLVED $\rightarrow$ REOPENED:

Người thực hiện: QA / Tester.

Điều kiện: QA kiểm thử lại nhưng lỗi vẫn chưa hết hoặc phát sinh lỗi mới do bản fix.

NEW $\rightarrow$ REJECTED / DUPLICATE / DEFERRED:

Người thực hiện: PM hoặc Dev.

Điều kiện: Lỗi không phải do phần mềm, bị trùng với bug đã có, hoặc chưa đủ nguồn lực sửa trong Sprint hiện tại.

3. Luồng Nghiệp vụ Xuyên suốt (End-to-End Workflow)
Giai đoạn 1: Thiết lập Hệ thống & Dự án (Setup Phase)
System Admin tạo dự án mới (Ví dụ: Dự án E-Commerce - ECOM).

System Admin gán tài khoản A làm PM của dự án ECOM.

PM truy cập dự án ECOM, thực hiện:

Thêm các tài khoản QA và Dev vào dự án.

Cấu hình các Module (Ví dụ: Thanh toán, Đăng nhập, Giỏ hàng).

Gán Dev phụ trách mặc định cho từng Module (Ví dụ: Module Thanh toán $\rightarrow$ Dev B).

Giai đoạn 2: Phát hiện Lỗi & Phân loại Tự động (Discovery & Auto-Triage Phase)
QA kiểm thử ứng dụng, phát hiện lỗi (Ví dụ: Bấm thanh toán báo lỗi 500 hoặc crash).

QA mở Form "Tạo Bug", dán đoạn Console Log / HTTP Status / Stacktrace vào ô dữ liệu log.

Bộ máy Phân loại Tự động (Auto-Classification Engine) kích hoạt ngay lập tức:

Trích xuất mã lỗi, phân tích chuỗi văn bản.

Tự động điền: Issue Type (ví dụ: Backend / Server Error), Severity (ví dụ: CRITICAL).

Tự động Gán (Assignee): Dựa vào Module QA chọn, hệ thống tự điền Dev phụ trách module đó.

QA kiểm tra lại thông tin và bấm "Lưu Bug". Ticket chuyển sang trạng thái NEW.

Giai đoạn 3: Xử lý Lỗi (Processing Phase)
Dev nhận thông báo có bug mới được gán.

Dev kiểm tra thông tin:

Nếu đúng bug thuộc về mình: Dev chuyển trạng thái sang IN_PROGRESS và tiến hành sửa code.

Nếu sai Module/không phải code của mình: Dev chọn lại Module đúng hoặc gán lại (Re-assign) cho Dev khác.

Sau khi sửa xong và đẩy code lên môi trường Staging/Test, Dev chuyển trạng thái bug sang RESOLVED.

Giai đoạn 4: Nghiệm thu & Đóng Lỗi (Verification & Closure Phase)
QA nhận thông báo Bug đã ở trạng thái RESOLVED.

QA mở lại môi trường Test và thực hiện kiểm thử lại:

Trường hợp 1 (Đạt): QA chuyển trạng thái sang CLOSED. Vòng đời lỗi kết thúc.

Trường hợp 2 (Không đạt): QA nhập lý do, chuyển trạng thái sang REOPENED. Lỗi quay lại cho Dev xử lý tiếp.

Giai đoạn 5: Kết thúc Dự án & Lưu trữ (Archival Phase)
Khi sản phẩm bàn giao thành công, PM chuyển trạng thái Dự án sang ARCHIVED.

Hệ thống chuyển toàn bộ dữ liệu của dự án về dạng Chỉ đọc (Read-only).

Khóa toàn bộ tính năng Tạo / Sửa / Đổi trạng thái Bug.

Giữ lại dữ liệu để tra cứu lịch sử, xuất báo cáo đánh giá chất lượng phần mềm.

4. Danh mục Các Phân hệ Chức năng Cốt lõi (Function Breakdown)
Phân hệ 1: Quản lý Tổ chức & Dự án (Project & Organization Management)
Chức năng Quản lý User: Xem danh sách, tạo tài khoản, kích hoạt/vô hiệu hóa.

Chức năng Quản lý Dự án: Tạo mới, đổi trạng thái (Active/Archived), gán danh sách nhân sự vào dự án.

Chức năng Cấu hình Module: Tạo/Xóa phân hệ tính năng, gán Dev mặc định cho từng Module.

Phân hệ 2: Phân loại Sự cố Tự động (Smart Classification Module)
Chức năng Bóc tách Log (Log Parser): Nhận diện HTTP Status Code (5xx, 4xx), nhận diện từ khóa lỗi nguy hiểm (NullPointer, OutOfMemory, SyntaxError).

Chức năng Gợi ý Phân loại (Auto-Fill Engine): Tự động đề xuất Severity, Issue Type và gán nhãn độ tin cậy (Confidence Score %).

Chức năng Tự động Phân công (Auto-Assignee): Tự động liên kết Module với Dev phụ trách.

Phân hệ 3: Quản lý Vòng đời Sự cố (Issue Lifecycle Management)
Chức năng CRUD Ticket: Tạo, xem, cập nhật nội dung, tìm kiếm và lọc bug theo trạng thái/người xử lý/mức độ nghiêm trọng.

Chức năng Điều phối Trạng thái (Workflow Engine): Nút bấm luân chuyển trạng thái dựa trên quyền của Role đăng nhập (In Progress, Resolved, Closed, Reopened).

Chức năng Trao đổi (Comment & Discussion): Cho phép Dev và QA bình luận trực tiếp bên dưới ticket để trao đổi bối cảnh lỗi.

Phân hệ 4: Thống kê & Báo cáo (Dashboard & Analytics)
Chức năng Thống kê Dự án: Biểu đồ tỷ lệ Bug theo Trạng thái (New, In Progress, Closed).

Chức năng Phân tích Chất lượng: Thống kê mật độ Bug theo Mức độ nghiêm trọng (Critical, Major, Minor).

Chức năng Báo cáo Dự án đã đóng: Xem lại toàn bộ dữ liệu lịch sử dự án dưới dạng Read-only.


| Vai trò (Role) | Cấp quản lý | Quyền hạn & Thẩm quyền nghiệp vụ |
| --- | --- | --- |
| System Admin | Global | • Tạo tài khoản người dùng.<br><br><br>• Khởi tạo Dự án mới và gán PM.<br><br><br>• Quản trị các danh mục chung (Severity, Types, Rules). |
| Project Manager (PM) | Project | • Quản lý thành viên trong dự án.<br><br><br>• Tạo Phân hệ (Module) và gán Dev phụ trách mặc định.<br><br><br>• Phê duyệt/Điều hướng lỗi (Đổi Dev, Đổi Priority).<br><br><br>• Quyết định Hoãn (Deferred) hoặc Từ chối (Rejected) bug.<br><br><br>• Đóng/Lưu trữ dự án (Archive Project). |
| QA / Tester | Project | • Báo cáo lỗi mới kèm Log.<br><br><br>• Thực hiện kiểm thử lại (Re-test).<br><br><br>• Duyệt Đóng lỗi (Closed) hoặc Mở lại lỗi (Reopened). |
| Developer (Dev) | Project | • Nhận lỗi được phân công.<br><br><br>• Chuyển trạng thái Đang sửa (In Progress) $\rightarrow$ Đã sửa xong (Resolved).<br><br><br>• Gán lại lỗi cho Dev khác nếu chọn sai Module. |
