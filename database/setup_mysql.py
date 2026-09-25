import pymysql
import os

def setup_mysql_database(host='localhost', port=3306, user='root', password=''):
    """
    Tự động kết nối MySQL và khởi tạo database issue_tracking_db
    từ hai file schema.sql và seed_data.sql
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(base_dir, 'schema.sql')
    seed_path = os.path.join(base_dir, 'seed_data.sql')

    print(f"Connecting to MySQL server at {host}:{port} as user '{user}'...")
    
    try:
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            autocommit=True,
            charset='utf8mb4'
        )
        cursor = connection.cursor()
        print("Connected to MySQL Server successfully!")

        # 1. Đọc và thực thi schema.sql
        print("Executing schema.sql...")
        with open(schema_path, 'r', encoding='utf-8') as f:
            sql_statements = f.read().split(';')
            for stmt in sql_statements:
                stmt = stmt.strip()
                if stmt:
                    cursor.execute(stmt)
        print("Database `issue_tracking_db` and tables created successfully!")

        # 2. Đọc và thực thi seed_data.sql
        print("Executing seed_data.sql...")
        with open(seed_path, 'r', encoding='utf-8') as f:
            sql_statements = f.read().split(';')
            for stmt in sql_statements:
                stmt = stmt.strip()
                if stmt:
                    cursor.execute(stmt)
        print("Seed data populated successfully!")

        cursor.close()
        connection.close()
        return True, "Setup MySQL hoàn tất 100%!"

    except Exception as e:
        err_msg = f"Lỗi kết nối/thực thi MySQL: {str(e)}"
        print(f"❌ {err_msg}")
        return False, err_msg

if __name__ == '__main__':
    print("=== TOOL TỰ ĐỘNG KHỞI TẠO MYSQL DATABASE ===")
    pwd = input("Nhập mật khẩu root MySQL (bấm Enter nếu không có pass): ").strip()
    success, msg = setup_mysql_database(password=pwd)
    print(msg)
