from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from models import Issue, Project, Module, User, IssueComment, IssueHistory, db
from services.auto_triage import AutoTriageEngine

issue_bp = Blueprint('issues', __name__, url_prefix='/api/issues')

def calculate_sla_due_date(severity, priority):
    hours = 24
    if severity == 'CRITICAL':
        hours = 4 if priority == 'HIGH' else 8
    elif severity == 'MAJOR':
        hours = 12 if priority == 'HIGH' else 24
    elif severity == 'MINOR':
        hours = 48
    else: # TRIVIAL
        hours = 72
    return datetime.utcnow() + timedelta(hours=hours)

@issue_bp.route('', methods=['GET'])
def get_issues():
    project_id = request.args.get('project_id', type=int)
    status = request.args.get('status')
    severity = request.args.get('severity')
    assignee_id = request.args.get('assignee_id', type=int)
    reporter_id = request.args.get('reporter_id', type=int)
    search = request.args.get('search', '').strip()
    user_id = request.args.get('user_id', type=int)

    query = Issue.query

    # RBAC: Filter by user's projects if not admin
    if user_id:
        user = User.query.get(user_id)
        if user and user.global_role != 'ADMIN':
            from models import ProjectMember
            from sqlalchemy import or_, and_
            
            memberships = ProjectMember.query.filter_by(user_id=user_id).all()
            dev_pids = [m.project_id for m in memberships if m.project_role == 'DEV']
            other_pids = [m.project_id for m in memberships if m.project_role in ('PM', 'QA')]
            
            conditions = []
            if other_pids:
                conditions.append(Issue.project_id.in_(other_pids))
            if dev_pids:
                conditions.append(and_(Issue.project_id.in_(dev_pids), Issue.assignee_id == user_id))
                
            if conditions:
                query = query.filter(or_(*conditions))
            else:
                # User has no projects, sees nothing
                query = query.filter(Issue.issue_id == -1)

    if project_id:
        query = query.filter_by(project_id=project_id)
    if status:
        query = query.filter_by(status=status)
    if severity:
        query = query.filter_by(severity=severity)
    if assignee_id:
        query = query.filter_by(assignee_id=assignee_id)
    if reporter_id:
        query = query.filter_by(reporter_id=reporter_id)
    if search:
        query = query.filter(
            (Issue.title.ilike(f'%{search}%')) | 
            (Issue.issue_key.ilike(f'%{search}%')) |
            (Issue.description.ilike(f'%{search}%'))
        )

    issues = query.order_by(Issue.created_at.desc()).all()
    return jsonify([i.to_dict() for i in issues]), 200

@issue_bp.route('/<int:issue_id>', methods=['GET'])
def get_issue_detail(issue_id):
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Không tìm thấy Ticket'}), 404

    i_dict = issue.to_dict()
    i_dict['project_status'] = issue.project.status if issue.project else 'ACTIVE'
    i_dict['comments'] = [c.to_dict() for c in issue.comments]
    i_dict['history'] = [h.to_dict() for h in issue.history]
    return jsonify(i_dict), 200

@issue_bp.route('', methods=['POST'])
def create_issue():
    import os
    from werkzeug.utils import secure_filename
    from flask import current_app
    from models import Attachment

    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    project_id = data.get('project_id')
    module_id = data.get('module_id')
    title = data.get('title', '').strip()
    desc = data.get('description', '')
    steps = data.get('steps_to_reproduce', '')
    logs = data.get('raw_logs', '')
    env = data.get('environment', 'DEV')
    reporter_id = data.get('reporter_id')
    
    if not project_id or not title or not reporter_id:
        return jsonify({'error': 'Vui lòng điền đủ Dự án, Tiêu đề và Người báo cáo (QA)'}), 400

    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Dự án không tồn tại'}), 404

    if project.status == 'ARCHIVED':
        return jsonify({'error': 'Dự án này đã bị ARCHIVED (Lưu trữ chỉ đọc). Không thể tạo bug mới!'}), 403

    # Kiểm tra Module & default assignee
    default_assignee_id = None
    if module_id:
        mod = Module.query.get(module_id)
        if mod:
            default_assignee_id = mod.default_assignee_id

    # Auto Triage nếu người dùng chưa chọn thủ công
    triage_res = AutoTriageEngine.analyze_log_and_title(title, logs, default_assignee_id)

    severity = data.get('severity') or triage_res['suggested_severity']
    issue_type = data.get('issue_type') or triage_res['suggested_type']
    priority = data.get('priority') or triage_res['suggested_priority']
    assignee_id = data.get('assignee_id') or triage_res['suggested_assignee_id']
    confidence = triage_res['confidence_score']

    # Tạo Mã Issue Key duy nhất (VD: ECOM-105)
    count = Issue.query.filter_by(project_id=project_id).count() + 101
    issue_key = f"{project.project_key}-{count}"
    
    while Issue.query.filter_by(issue_key=issue_key).first():
        count += 1
        issue_key = f"{project.project_key}-{count}"

    sla_due = calculate_sla_due_date(severity, priority)

    new_issue = Issue(
        issue_key=issue_key,
        project_id=project_id,
        module_id=module_id,
        title=title,
        description=desc,
        steps_to_reproduce=steps,
        raw_logs=logs,
        environment=env,
        issue_type=issue_type,
        severity=severity,
        priority=priority,
        status='NEW',
        confidence_score=confidence,
        reporter_id=reporter_id,
        assignee_id=assignee_id,
        sla_due_date=sla_due
    )

    db.session.add(new_issue)
    db.session.flush()

    # Thêm Audit log khởi tạo
    history = IssueHistory(
        issue_id=new_issue.issue_id,
        changed_by=reporter_id,
        field_name='Issue',
        old_value=None,
        new_value=f'Tạo mới ticket {issue_key} (Auto-Triage Confidence: {confidence}%)'
    )
    db.session.add(history)

    # -------------------------------------
    # XỬ LÝ LƯU FILE ẢNH/VIDEO ĐÍNH KÈM
    # -------------------------------------
    uploaded_file = request.files.get('file')
    if uploaded_file and uploaded_file.filename != '':
        filename = secure_filename(uploaded_file.filename)
        # Thêm timestamp để tránh trùng tên file
        unique_filename = f"{new_issue.issue_id}_{filename}"
        upload_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', '../uploads'), unique_filename)
        
        uploaded_file.save(upload_path)
        
        # Lưu vào DB
        attachment = Attachment(
            issue_id=new_issue.issue_id,
            file_name=filename,
            file_url=f"/uploads/{unique_filename}",
            file_type=uploaded_file.content_type,
            uploaded_by=reporter_id
        )
        db.session.add(attachment)

    db.session.commit()
    return jsonify(new_issue.to_dict()), 201

@issue_bp.route('/<int:issue_id>/status', methods=['PUT'])
def update_status(issue_id):
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Ticket không tồn tại'}), 404

    if issue.project.status == 'ARCHIVED':
        return jsonify({'error': 'Dự án đã bị ARCHIVED (Chỉ đọc). Không thể cập nhật trạng thái bug!'}), 403

    data = request.get_json() or {}
    new_status = data.get('status')
    user_id = data.get('user_id')
    git_ref = data.get('git_commit_ref')

    if not new_status or not user_id:
        return jsonify({'error': 'Trạng thái mới và user_id là bắt buộc'}), 400

    old_status = issue.status
    if old_status == new_status:
        return jsonify({'message': 'Trạng thái không thay đổi', 'issue': issue.to_dict()}), 200

    # 1. Get User and Project Role
    from models import User, ProjectMember
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Người dùng không tồn tại'}), 401
    
    project_role = 'ADMIN'
    if user.global_role != 'ADMIN':
        membership = ProjectMember.query.filter_by(project_id=issue.project_id, user_id=user_id).first()
        if not membership:
            return jsonify({'error': 'Bạn không có quyền thao tác trên dự án này'}), 403
        project_role = membership.project_role

    # 2. State Machine Validation (Quy tắc luồng)
    valid_transitions = {
        'NEW': ['IN_PROGRESS', 'DEFERRED', 'REJECTED', 'RESOLVED'],
        'IN_PROGRESS': ['RESOLVED', 'DEFERRED', 'REJECTED'],
        'RESOLVED': ['CLOSED', 'REOPENED'],
        'REOPENED': ['IN_PROGRESS', 'RESOLVED', 'DEFERRED', 'REJECTED'],
        'DEFERRED': ['NEW', 'IN_PROGRESS', 'CLOSED'],
        'REJECTED': ['CLOSED', 'REOPENED'],
        'CLOSED': ['REOPENED']
    }
    if new_status not in valid_transitions.get(old_status, []):
        return jsonify({'error': f'Lỗi State Machine: Không thể chuyển từ {old_status} sang {new_status}'}), 400

    # 3. RBAC Validation (Phân quyền)
    if project_role == 'DEV':
        # Dev chỉ được phép làm việc trên ticket của mình
        if issue.assignee_id != user_id:
            return jsonify({'error': 'Từ chối: Ticket này không được giao cho bạn!'}), 403

    issue.status = new_status
    if git_ref:
        issue.git_commit_ref = git_ref

    # Audit log
    h = IssueHistory(
        issue_id=issue.issue_id,
        changed_by=user_id,
        field_name='Status',
        old_value=old_status,
        new_value=new_status
    )
    db.session.add(h)
    db.session.commit()

    return jsonify({'message': f'Đã chuyển trạng thái từ {old_status} -> {new_status}', 'issue': issue.to_dict()}), 200

@issue_bp.route('/<int:issue_id>/triage', methods=['PUT'])
def update_triage(issue_id):
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Ticket không tồn tại'}), 404

    if issue.project.status == 'ARCHIVED':
        return jsonify({'error': 'Dự án đã bị ARCHIVED (Chỉ đọc). Không thể thay đổi thông tin triage!'}), 403

    data = request.get_json() or {}
    user_id = data.get('user_id')
    assignee_id = data.get('assignee_id')
    priority = data.get('priority')
    severity = data.get('severity')
    module_id = data.get('module_id')

    changes = []
    if assignee_id and assignee_id != issue.assignee_id:
        old_ass = issue.assignee.full_name if issue.assignee else 'Unassigned'
        new_user = User.query.get(assignee_id)
        new_ass = new_user.full_name if new_user else 'Unassigned'
        issue.assignee_id = assignee_id
        changes.append(f"Dev: {old_ass} -> {new_ass}")

    if priority and priority != issue.priority:
        changes.append(f"Priority: {issue.priority} -> {priority}")
        issue.priority = priority

    if severity and severity != issue.severity:
        changes.append(f"Severity: {issue.severity} -> {severity}")
        issue.severity = severity

    if module_id and module_id != issue.module_id:
        issue.module_id = module_id
        changes.append(f"Module: {issue.module_id} -> {module_id}")

    if changes and user_id:
        h = IssueHistory(
            issue_id=issue.issue_id,
            changed_by=user_id,
            field_name='Triage/Reassign',
            old_value=None,
            new_value=" | ".join(changes)
        )
        db.session.add(h)

    db.session.commit()
    return jsonify({'message': 'Đã cập nhật phân công / mức độ ưu tiên', 'issue': issue.to_dict()}), 200

@issue_bp.route('/<int:issue_id>/comments', methods=['POST'])
def add_comment(issue_id):
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Ticket không tồn tại'}), 404

    if issue.project.status == 'ARCHIVED':
        return jsonify({'error': 'Dự án đã bị ARCHIVED (Chỉ đọc). Không thể bình luận!'}), 403

    data = request.get_json() or {}
    user_id = data.get('user_id')
    content = data.get('content', '').strip()

    if not user_id or not content:
        return jsonify({'error': 'Vui lòng nhập nội dung bình luận'}), 400

    comment = IssueComment(
        issue_id=issue_id,
        user_id=user_id,
        content=content
    )
    db.session.add(comment)
    db.session.commit()

    return jsonify(comment.to_dict()), 201
