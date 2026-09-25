BÁO CÁO ĐỀ XUẤT DỰ ÁN: HỆ THỐNG QUẢN LÝ LỖI VÀ PHÂN LOẠI SỰ CỐ (ISSUE TRACKING SYSTEM)
1. Tổng quan Dự án
Tên hệ thống: Hệ thống Quản lý Lỗi và Phân loại Sự cố (Issue & Bug Tracking System).
Phạm vi áp dụng: Sử dụng nội bộ trong doanh nghiệp phát triển phần mềm (Mô hình đa dự án - Multi-project).
Mục tiêu cốt lõi: Số hóa toàn bộ quy trình phát hiện, phân loại, điều phối, sửa lỗi và nghiệm thu chất lượng phần mềm giữa Tester, Developer và Project Manager; đồng thời lưu trữ lịch sử dữ liệu làm kho tri thức cho công ty sau khi dự án đóng.
2. Ma trận Vai trò & Phân quyền (Roles & Permissions Matrix)
Hệ thống quản lý phân quyền theo 2 cấp: Cấp hệ thống (Global Role) và Cấp dự án (Project Role).
3. Quy trình Xử lý Bug & Vòng đời Dự án (Workflow)
3.1. Quy trình xử lý lỗi tiêu chuẩn (Issue Lifecycle)
[ 1. New / Reported ] ────► (PM / System Auto-Triage)
│
▼
[ 2. Assigned / Triaged ] ◄──┐ (Gán lại nếu sai Dev)
│                   │
▼                   │
[ 3. In Progress ] ───────────┘
│
▼
[ 4. Resolved / Fixed ] ──► (Dev đẩy code lên Test)
│
▼
[ 5. QA Verification ]
/            \
(Pass) /              \ (Fail)
▼                ▼
[ 6. Closed ]    [ 7. Reopened ] ──► (Chuyển lại về Step 3)
Trạng thái đặc biệt:
Rejected (Từ chối): Bug không đúng hoặc không phải lỗi phần mềm.
Duplicate (Trùng lặp): Bug đã được báo cáo trong một Ticket khác.
Deferred (Hoãn): Lỗi ghi nhận nhưng hoãn lại sửa trong các Sprint sau.
3.2. Vòng đời Dự án (Project Lifecycle)
Trạng thái Active (Đang hoạt động): Cho phép tạo, sửa, tương tác, chạy SLA và luân chuyển quy trình xử lý lỗi.
Trạng thái Archived (Đã hoàn thành/Lưu trữ): Toàn bộ dữ liệu chuyển sang chế độ Chỉ đọc (Read-only). Không thể tạo hay chỉnh sửa ticket. Phục vụ công tác tra cứu lịch sử và xuất báo cáo kiểm toán chất lượng.
4. Chi tiết các Phân hệ Chức năng
Phân hệ 1: Quản lý Dự án & Phân quyền Thành viên
Tạo và Quản lý Dự án: Thiết lập Mã dự án (Project Key, ví dụ: PRJ-01), Tên dự án, Ngày bắt đầu, Ngày dự kiến kết thúc, Trạng thái (Active/Archived).
Phân bổ nhân sự (Project Membership): Gán nhân viên vào dự án với các vai trò cụ thể (PM, Dev, QA). Một nhân sự chỉ xem và tương tác được với các dự án mà mình là thành viên.
Cấu hình Module & Owner: Chia nhỏ dự án thành các Module (như Thanh toán, Tài khoản, Báo cáo...). Gán Default Assignee (Dev phụ trách chính) cho từng Module.
Phân hệ 2: Khởi tạo & Phân loại Sự cố (Issue Creation & Classification)
Form nhập liệu Bug chuẩn hóa:
Thông tin chung: Tiêu đề, Mô tả chi tiết, Các bước tái hiện (Steps to reproduce), Môi trường gặp lỗi (Dev, Staging, Production).
Tệp đính kèm: Hình ảnh, Video demo, File Log lỗi.
Phân loại: Module, Severity (Mức độ nghiêm trọng), Priority (Mức độ ưu tiên), Type (Bug, Incident, Feature Request).
Cảnh báo trùng lặp (Duplicate Detection): Hệ thống tự động gợi ý các Bug có tiêu đề hoặc từ khóa tương tự đang tồn tại để tránh tạo trùng.
Tự động gán người xử lý (Auto-Assignment): Dựa vào Module được chọn, hệ thống tự điền Assignee là Dev phụ trách module đó.
Phân hệ 3: Xử lý, Tương tác & Theo dõi Lịch sử
Cập nhật trạng thái: Luân chuyển ticket qua các bước trong Workflow (New $\rightarrow$ In Progress $\rightarrow$ Resolved $\rightarrow$ Closed).
Trao đổi & Thảo luận: Cho phép Comment, @tag tên đồng nghiệp để trao đổi bối cảnh lỗi.
Audit Log (Lưu vết thay đổi): Ghi vết chi tiết từng thao tác: Ai đã đổi trạng thái, đổi Assignee từ A sang B, thay đổi Priority lúc mấy giờ.
Liên kết Mã nguồn (Git Integration): Nhập Git Commit Hash hoặc Link Pull Request vào ticket để theo dõi đoạn code đã sửa.
Phân hệ 4: Quản lý SLA & Cảnh báo Tự động
Cấu hình SLA: Thiết lập thời gian phản hồi và sửa lỗi tối đa dựa trên cặp Severity - Priority (Ví dụ: Critical + High $\rightarrow$ Phải fix trong 4 giờ).
Cảnh báo quá hạn (Overdue Alert): Tự động gửi Email/Notification cho Dev và PM khi Ticket sắp hoặc đã quá hạn xử lý (Breached SLA).
Phân hệ 5: Báo cáo, Thống kê & Lưu trữ (Analytics & Archive)
Dashboard thời gian thực:
Biểu đồ tỷ lệ bug theo Trạng thái, Severity, Module.
Thống kê năng suất: Số bug phát hiện/đã đóng của từng QA; Số bug đã fix của từng Dev.
Chỉ số chất lượng phần mềm:
Tỷ lệ Bug Reopen (Chất lượng fix code của Dev).
Chỉ số MTTR (Mean Time To Resolve - Thời gian trung bình để xử lý 1 bug).
Trích xuất dữ liệu (Export): Cho phép xuất báo cáo chất lượng dự án ra file Excel/PDF khi đóng dự án.
5. Thiết kế Cơ sở Dữ liệu Cốt lõi (Database Schema)
Bảng 1: Users (Quản lý người dùng)
user_id (PK): Mã người dùng.
full_name, email, password_hash.
global_role: ADMIN | USER.
status: ACTIVE | INACTIVE.
Bảng 2: Projects (Quản lý dự án)
project_id (PK): Mã dự án.
project_key: Chuỗi viết tắt (VD: ERP, CRM).
project_name: Tên dự án.
status: ACTIVE | ARCHIVED.
created_at, updated_at.
Bảng 3: Project_Members (Thành viên trong dự án)
member_id (PK)
project_id (FK trỏ tới Projects)
user_id (FK trỏ tới Users)
project_role: PM | DEV | QA
Bảng 4: Modules (Các phân hệ của dự án)
module_id (PK)
project_id (FK trỏ tới Projects)
module_name: Tên phân hệ.
default_assignee_id (FK trỏ tới Users - Dev mặc định).
Bảng 5: Issues (Bảng dữ liệu bug/sự cố cốt lõi)
issue_id (PK)
issue_key: Mã hiển thị (VD: PRJ01-102).
project_id (FK)
module_id (FK)
title: Tiêu đề lỗi.
description: Mô tả chi tiết.
steps_to_reproduce: Các bước tái hiện.
environment: DEV | STAGING | PRODUCTION.
issue_type: BUG | INCIDENT | ENHANCEMENT.
severity: CRITICAL | MAJOR | MINOR | TRIVIAL.
priority: HIGH | MEDIUM | LOW.
status: NEW | ASSIGNED | IN_PROGRESS | RESOLVED | VERIFIED | CLOSED | REOPENED | REJECTED.
reporter_id (FK trỏ tới Users - QA tạo bug).
assignee_id (FK trỏ tới Users - Dev xử lý).
sla_due_date: Thời hạn phải sửa xong.
created_at, updated_at.
Bảng 6: Issue_Comments (Bình luận)
comment_id (PK)
issue_id (FK)
user_id (FK)
content: Nội dung trao đổi.
created_at.
Bảng 7: Issue_History (Lịch sử biến động / Audit Log)
history_id (PK)
issue_id (FK)
changed_by (FK trỏ tới Users)
field_name: Tên trường thay đổi (VD: Status, Assignee).
old_value: Giá trị cũ.
new_value: Giá trị mới.
created_at.
Bảng 8: Attachments (Tệp đính kèm)
attachment_id (PK)
issue_id (FK)
file_url: Đường dẫn lưu file/ảnh.
uploaded_by (FK)
created_at.


| Vai trò | Phạm vi | Trách nhiệm chính & Quyền hạn |
| --- | --- | --- |
| System Admin | Toàn hệ thống | Quản lý tài khoản, khởi tạo dự án mới, phân công PM, quản trị danh mục dùng chung (Severity, Module types, SLA rules). |
| Project Manager (PM) | Trong dự án được gán | Thêm/Xóa thành viên vào dự án, cấu hình Module, duyệt phân công lỗi (Triage), đóng/mở lại dự án (Archive/Unarchive), xem Báo cáo/Dashboard. |
| QA / Tester | Trong dự án tham gia | Tạo mới Bug/Sự cố, thực hiện kiểm thử lại (Re-test), chuyển trạng thái Verified, thực hiện đóng bug (Closed) hoặc mở lại (Reopened). |
| Developer (Dev) | Trong dự án tham gia | Nhận nhiệm vụ xử lý bug, cập nhật tiến độ (In Progress), chuyển sang Resolved sau khi fix code, gán lại lỗi nếu không đúng phân vùng module. |
