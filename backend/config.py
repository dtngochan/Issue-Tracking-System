import os
from urllib.parse import quote_plus

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_secret_key_issue_tracking_2026')
    
    # Cấu hình kết nối MySQL
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '123456')
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
    MYSQL_DB = os.environ.get('MYSQL_DB', 'issue_tracking_db')
    
    # URL-encode password để tránh lỗi ký tự đặc biệt (@, #, $...)
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}"
        f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
    )
    
    # Fallback SQLite nếu MySQL chưa khởi chạy
    SQLITE_DATABASE_URI = f"sqlite:///{os.path.join(PROJECT_DIR, 'database', 'issue_tracking.db')}"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Thư mục lưu file đính kèm
    UPLOAD_FOLDER = os.path.join(PROJECT_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload
