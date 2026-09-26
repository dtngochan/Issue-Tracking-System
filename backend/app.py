import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from models import db, User, Project, ProjectMember, Module, Issue, IssueComment, IssueHistory
from routes.auth_routes import auth_bp
from routes.project_routes import project_bp
from routes.issue_routes import issue_bp
from routes.triage_routes import triage_bp
from routes.dashboard_routes import dashboard_bp
from datetime import datetime, timedelta

def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    app.config.from_object(Config)

    # Thu ket noi MySQL, neu that bai se dung SQLite fallback
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[OK] Connected to MySQL database successfully!")
    except Exception as e:
        print(f"[WARN] MySQL failed ({e}). Falling back to SQLite...")
        app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLITE_DATABASE_URI']

    db.init_app(app)
    CORS(app)

    # Dang ky Blueprints API
    app.register_blueprint(auth_bp)
    app.register_blueprint(project_bp)
    app.register_blueprint(issue_bp)
    app.register_blueprint(triage_bp)
    app.register_blueprint(dashboard_bp)

    # Phuc vu Frontend Web UI
    @app.route('/')
    def serve_frontend():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/uploads/<path:filename>')
    def serve_uploads(filename):
        return send_from_directory(app.config.get('UPLOAD_FOLDER', '../uploads'), filename)

    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'OK',
            'system': 'Issue Tracking & Auto-Triage System',
            'version': '2.0.0',
            'database': 'MySQL' if 'mysql' in app.config['SQLALCHEMY_DATABASE_URI'] else 'SQLite',
            'timestamp': datetime.utcnow().isoformat()
        })

    # Tao bang va seed data
    with app.app_context():
        db.create_all()
        seed_initial_data_if_empty()
        
    # Tao thu muc uploads
    os.makedirs(app.config.get('UPLOAD_FOLDER', '../uploads'), exist_ok=True)

    return app

def seed_initial_data_if_empty():
    if User.query.count() == 0:
        print("[SEED] Seeding initial sample data...")
        admin = User(full_name='Nguyen Van Admin', email='admin@company.com', password_hash='scrypt:admin', global_role='ADMIN')
        pm = User(full_name='Tran Thi PM', email='pm@company.com', password_hash='scrypt:pm', global_role='USER')
        dev1 = User(full_name='Le Van Backend Dev', email='dev.backend@company.com', password_hash='scrypt:dev1', global_role='USER')
        dev2 = User(full_name='Pham Thi Frontend Dev', email='dev.frontend@company.com', password_hash='scrypt:dev2', global_role='USER')
        qa1 = User(full_name='Hoang Van QA Lead', email='qa.lead@company.com', password_hash='scrypt:qa1', global_role='USER')
        qa2 = User(full_name='Ngo Thi QA Tester', email='qa.tester@company.com', password_hash='scrypt:qa2', global_role='USER')
        
        db.session.add_all([admin, pm, dev1, dev2, qa1, qa2])
        db.session.commit()

        p1 = Project(project_key='ECOM', project_name='Du an San Thuong Mai Dien Tu (E-Commerce)', description='He thong ban hang truc tuyen tich hop VNPAY, MoMo', status='ACTIVE')
        p2 = Project(project_key='MBANK', project_name='Du an Ung dung Ngan hang (Mobile Banking)', description='Ung dung chuyen tien di dong', status='ARCHIVED')
        db.session.add_all([p1, p2])
        db.session.commit()

        members = [
            ProjectMember(project_id=p1.project_id, user_id=pm.user_id, project_role='PM'),
            ProjectMember(project_id=p1.project_id, user_id=dev1.user_id, project_role='DEV'),
            ProjectMember(project_id=p1.project_id, user_id=dev2.user_id, project_role='DEV'),
            ProjectMember(project_id=p1.project_id, user_id=qa1.user_id, project_role='QA'),
            ProjectMember(project_id=p1.project_id, user_id=qa2.user_id, project_role='QA'),
            ProjectMember(project_id=p2.project_id, user_id=pm.user_id, project_role='PM'),
            ProjectMember(project_id=p2.project_id, user_id=dev1.user_id, project_role='DEV'),
            ProjectMember(project_id=p2.project_id, user_id=qa1.user_id, project_role='QA'),
        ]
        db.session.add_all(members)
        db.session.commit()

        m1 = Module(project_id=p1.project_id, module_name='Thanh toan & Cong thanh toan', description='VNPAY, MoMo, COD', default_assignee_id=dev1.user_id)
        m2 = Module(project_id=p1.project_id, module_name='Xac thuc & Tai khoan', description='OAuth2, JWT, Login', default_assignee_id=dev1.user_id)
        m3 = Module(project_id=p1.project_id, module_name='Giao dien Gio hang & Checkout', description='Cart, Checkout UI', default_assignee_id=dev2.user_id)
        db.session.add_all([m1, m2, m3])
        db.session.commit()

        i1 = Issue(
            issue_key='ECOM-101', project_id=p1.project_id, module_id=m1.module_id,
            title='Loi HTTP 500 khi bam nut Thanh toan VNPay',
            description='Khach hang bam thanh toan don hang bi vang loi Internal Server Error.',
            steps_to_reproduce='1. Cho san pham vao gio.\n2. Bam Checkout.\n3. Chon cong VNPAY.',
            raw_logs='java.lang.NullPointerException: Cannot invoke payment service API\nHTTP 500 Internal Server Error',
            environment='STAGING', issue_type='BUG', severity='CRITICAL', priority='HIGH', status='IN_PROGRESS',
            confidence_score=95.0, reporter_id=qa1.user_id, assignee_id=dev1.user_id,
            sla_due_date=datetime.utcnow() + timedelta(hours=4)
        )
        i2 = Issue(
            issue_key='ECOM-102', project_id=p1.project_id, module_id=m3.module_id,
            title='Vo giao dien Gio hang tren man hinh Mobile Safari',
            description='Nut Mua hang bi de len tong tien khi xoay ngang man hinh iPhone.',
            steps_to_reproduce='1. Mo web tren Safari iOS.\n2. Them 3 san pham.\n3. Xoay ngang man hinh.',
            raw_logs='CSS media query layout overflow error on .cart-footer element',
            environment='DEV', issue_type='BUG', severity='MINOR', priority='LOW', status='RESOLVED',
            confidence_score=80.0, reporter_id=qa2.user_id, assignee_id=dev2.user_id,
            sla_due_date=datetime.utcnow() + timedelta(hours=24)
        )
        i3 = Issue(
            issue_key='ECOM-103', project_id=p1.project_id, module_id=m2.module_id,
            title='Token JWT het han khong tu dong Refresh',
            description='Nguoi dung bi logout khi dang dien thong tin giao hang.',
            steps_to_reproduce='1. Dang nhap.\n2. Cho 15 phut.\n3. Bam Luu dia chi.',
            raw_logs='jwt.exceptions.ExpiredSignatureError: Signature has expired',
            environment='STAGING', issue_type='BUG', severity='MAJOR', priority='MEDIUM', status='CLOSED',
            confidence_score=90.0, reporter_id=qa1.user_id, assignee_id=dev1.user_id,
            sla_due_date=datetime.utcnow() + timedelta(hours=12)
        )
        i4 = Issue(
            issue_key='ECOM-104', project_id=p1.project_id, module_id=m1.module_id,
            title='Deadlock khi giao dich dong thoi 2 tab browser',
            description='Giao dich chuyen khoan trung ma don hang khien DB bi deadlock.',
            steps_to_reproduce='Tai hien giao dich song song 2 tab browser.',
            raw_logs='MySQLTransactionRollbackException: Deadlock found when trying to get lock',
            environment='PRODUCTION', issue_type='INCIDENT', severity='CRITICAL', priority='HIGH', status='NEW',
            confidence_score=98.0, reporter_id=qa2.user_id, assignee_id=dev1.user_id,
            sla_due_date=datetime.utcnow() + timedelta(hours=2)
        )
        db.session.add_all([i1, i2, i3, i4])
        db.session.commit()

        # Seed comments
        c1 = IssueComment(issue_id=i1.issue_id, user_id=dev1.user_id, content='Dang tai hien loi tren Staging. Co ve do thieu Secret Key VNPAY trong config.')
        c2 = IssueComment(issue_id=i1.issue_id, user_id=qa1.user_id, content='@dev.backend Vui long kiem tra lai log dich vu VNPAY sandbox.')
        c3 = IssueComment(issue_id=i2.issue_id, user_id=dev2.user_id, content='Da fix CSS flex-wrap. Day code len branch staging/fix-cart-layout.')
        db.session.add_all([c1, c2, c3])
        db.session.commit()

        # Seed audit history
        h1 = IssueHistory(issue_id=i1.issue_id, changed_by=qa1.user_id, field_name='Status', old_value='NEW', new_value='ASSIGNED')
        h2 = IssueHistory(issue_id=i1.issue_id, changed_by=dev1.user_id, field_name='Status', old_value='ASSIGNED', new_value='IN_PROGRESS')
        h3 = IssueHistory(issue_id=i2.issue_id, changed_by=dev2.user_id, field_name='Status', old_value='IN_PROGRESS', new_value='RESOLVED')
        h4 = IssueHistory(issue_id=i3.issue_id, changed_by=qa1.user_id, field_name='Status', old_value='RESOLVED', new_value='CLOSED')
        db.session.add_all([h1, h2, h3, h4])
        db.session.commit()
        print("[SEED] Sample data seeded successfully!")

app = create_app()

if __name__ == '__main__':
    print("[SERVER] Starting Issue Tracking API on http://127.0.0.1:5000 ...")
    app.run(host='0.0.0.0', port=5000, debug=True)
