-- ============================================================
-- SEED DATA MẪU HỆ THỐNG QUẢN LÝ LỖI & PHÂN LOẠI SỰ CỐ
-- ============================================================

USE `issue_tracking_db`;

-- 1. Thêm Users mẫu (Mật khẩu mặc định đơn giản "password123" hoặc plain text hash)
INSERT INTO `users` (`user_id`, `full_name`, `email`, `password_hash`, `global_role`, `status`) VALUES
(1, 'Nguyễn Văn Admin', 'admin@company.com', 'scrypt:32768:8:1$hash_admin', 'ADMIN', 'ACTIVE'),
(2, 'Trần Thị PM', 'pm@company.com', 'scrypt:32768:8:1$hash_pm', 'USER', 'ACTIVE'),
(3, 'Lê Văn Backend Dev', 'dev.backend@company.com', 'scrypt:32768:8:1$hash_dev1', 'USER', 'ACTIVE'),
(4, 'Pham Thị Frontend Dev', 'dev.frontend@company.com', 'scrypt:32768:8:1$hash_dev2', 'USER', 'ACTIVE'),
(5, 'Hoàng Văn QA Lead', 'qa.lead@company.com', 'scrypt:32768:8:1$hash_qa1', 'USER', 'ACTIVE'),
(6, 'Ngô Thị QA Tester', 'qa.tester@company.com', 'scrypt:32768:8:1$hash_qa2', 'USER', 'ACTIVE');

-- 2. Thêm Projects mẫu
INSERT INTO `projects` (`project_id`, `project_key`, `project_name`, `description`, `start_date`, `expected_end_date`, `status`) VALUES
(1, 'ECOM', 'Dự án Sàn Thương Mại Điện Tử (E-Commerce Store)', 'Hệ thống bán hàng trực tuyến tích hợp thanh toán VNPay và MoMo', '2026-01-10', '2026-12-31', 'ACTIVE'),
(2, 'MBANK', 'Dự án Ứng dụng Ngân hàng Động (Mobile Banking App)', 'Ứng dụng chuyển tiền & thanh toán hóa đơn trên di động', '2025-06-01', '2026-06-01', 'ARCHIVED');

-- 3. Phân bổ thành viên vào Dự án
INSERT INTO `project_members` (`project_id`, `user_id`, `project_role`) VALUES
-- Dự án ECOM
(1, 2, 'PM'),       -- Trần Thị PM
(1, 3, 'DEV'),      -- Lê Văn Backend Dev
(1, 4, 'DEV'),      -- Pham Thị Frontend Dev
(1, 5, 'QA'),       -- Hoàng Văn QA Lead
(1, 6, 'QA'),       -- Ngô Thị QA Tester
-- Dự án MBANK (Đã Archive)
(2, 2, 'PM'),
(2, 3, 'DEV'),
(2, 5, 'QA');

-- 4. Thêm Modules cho Dự án ECOM
INSERT INTO `modules` (`module_id`, `project_id`, `module_name`, `description`, `default_assignee_id`) VALUES
(1, 1, 'Thanh toán & Cổng thanh toán', 'Xử lý giao dịch VNPAY, Momo, COD', 3), -- Default Assignee: Backend Dev
(2, 1, 'Xác thực & Tài khoản', 'Đăng ký, Đăng nhập, OAuth2, JWT', 3),       -- Default Assignee: Backend Dev
(3, 1, 'Giao diện Giỏ hàng & Checkout', 'Luồng thanh toán giỏ hàng UI', 4);   -- Default Assignee: Frontend Dev

-- 5. Thêm Issues (Ticket Bug mẫu)
INSERT INTO `issues` (`issue_id`, `issue_key`, `project_id`, `module_id`, `title`, `description`, `steps_to_reproduce`, `raw_logs`, `environment`, `issue_type`, `severity`, `priority`, `status`, `confidence_score`, `reporter_id`, `assignee_id`, `sla_due_date`) VALUES
(1, 'ECOM-101', 1, 1, 'Lỗi HTTP 500 khi bấm nút Thanh toán VNPay', 'Khách hàng bấm thanh toán đơn hàng bị văng lỗi Internal Server Error.', '1. Cho sản phẩm vào giỏ.\n2. Bấm Checkout.\n3. Chọn cổng VNPAY.', 'java.lang.NullPointerException: Cannot invoke payment service API at com.ecommerce.payment.VnPayController.process(VnPayController.java:45)\nHTTP 500 Internal Server Error', 'STAGING', 'BUG', 'CRITICAL', 'HIGH', 'IN_PROGRESS', 95.0, 5, 3, DATE_ADD(NOW(), INTERVAL 4 HOUR)),

(2, 'ECOM-102', 1, 3, 'Vỡ giao diện Giỏ hàng trên màn hình Mobile Safari', 'Nút Mua hàng bị đè lên tổng tiền khi xoay ngang màn hình iPhone.', '1. Mở web trên Safari iOS.\n2. Thêm 3 sản phẩm.\n3. Xoay ngang màn hình.', 'CSS media query layout overflow error on .cart-footer element', 'DEV', 'BUG', 'MINOR', 'LOW', 'RESOLVED', 80.0, 6, 4, DATE_ADD(NOW(), INTERVAL 24 HOUR)),

(3, 'ECOM-103', 1, 2, 'Token JWT hết hạn không tự động Refresh', 'Người dùng bị logout ngột ngạt khi đang điền thông tin giao hàng.', '1. Đăng nhập hệ thống.\n2. Chờ 15 phút.\n3. Bấm Lưu địa chỉ.', 'jwt.exceptions.ExpiredSignatureError: Signature has expired', 'STAGING', 'BUG', 'MAJOR', 'MEDIUM', 'CLOSED', 90.0, 5, 3, DATE_ADD(NOW(), INTERVAL 12 HOUR)),

(4, 'ECOM-104', 1, 1, 'Tài khoản ngân hàng trùng lặp bị treo giao dịch', 'Giao dịch chuyển khoản trùng mã đơn hàng khiến DB bị deadlock.', 'Tái hiện giao dịch song song 2 tab browser.', 'com.mysql.cj.jdbc.exceptions.MySQLTransactionRollbackException: Deadlock found when trying to get lock, try restarting transaction', 'PRODUCTION', 'INCIDENT', 'CRITICAL', 'HIGH', 'NEW', 98.0, 6, 3, DATE_ADD(NOW(), INTERVAL 2 HOUR));

-- 6. Thêm Comments mẫu
INSERT INTO `issue_comments` (`issue_id`, `user_id`, `content`) VALUES
(1, 3, 'Tôi đang tái hiện lỗi này trên môi trường Staging. Có vẻ do thiếu Secret Key VNPAY trong file config.'),
(1, 5, '@dev.backend Vui lòng kiểm tra lại log dịch vụ VNPAY sandbox giúp nhé.'),
(2, 4, 'Đã fix xong CSS flex-wrap. Đã đẩy code lên branch staging/fix-cart-layout. Nhờ QA verify giúp.');

-- 7. Thêm Issue History (Audit Log)
INSERT INTO `issue_history` (`issue_id`, `changed_by`, `field_name`, `old_value`, `new_value`) VALUES
(1, 5, 'Status', 'NEW', 'ASSIGNED'),
(1, 3, 'Status', 'ASSIGNED', 'IN_PROGRESS'),
(2, 4, 'Status', 'IN_PROGRESS', 'RESOLVED');
