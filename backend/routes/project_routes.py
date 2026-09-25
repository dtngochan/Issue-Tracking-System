from flask import Blueprint, request, jsonify
from models import Project, ProjectMember, Module, User, db

project_bp = Blueprint('projects', __name__, url_prefix='/api/projects')

# ──────────────────────────────────────────────────────────────
# Lấy danh sách tất cả dự án
# ──────────────────────────────────────────────────────────────
@project_bp.route('', methods=['GET'])
def get_projects():
    user_id = request.args.get('user_id', type=int)
    
    projects = Project.query.all()
    result = []
    for p in projects:
        p_dict = p.to_dict()
        members = ProjectMember.query.filter_by(project_id=p.project_id).all()
        modules = Module.query.filter_by(project_id=p.project_id).all()
        p_dict['members_count'] = len(members)
        p_dict['modules_count'] = len(modules)
        p_dict['members'] = [m.to_dict() for m in members]
        p_dict['modules'] = [mod.to_dict() for mod in modules]
        
        # Nếu có filter theo user_id, chỉ trả về dự án mà user là thành viên
        if user_id:
            is_member = any(m.user_id == user_id for m in members)
            if not is_member:
                continue
        
        result.append(p_dict)
    return jsonify(result), 200

# ──────────────────────────────────────────────────────────────
# Xem chi tiết dự án (bao gồm thành viên & module)
# ──────────────────────────────────────────────────────────────
@project_bp.route('/<int:project_id>', methods=['GET'])
def get_project_detail(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Dự án không tồn tại'}), 404
        
    p_dict = project.to_dict()
    members = ProjectMember.query.filter_by(project_id=project_id).all()
    modules = Module.query.filter_by(project_id=project_id).all()
    
    p_dict['members'] = [m.to_dict() for m in members]
    p_dict['modules'] = [m.to_dict() for m in modules]
    return jsonify(p_dict), 200

# ──────────────────────────────────────────────────────────────
# Tạo dự án mới (Admin tạo, gán PM)
# ──────────────────────────────────────────────────────────────
@project_bp.route('', methods=['POST'])
def create_project():
    data = request.get_json() or {}
    key = data.get('project_key', '').upper().strip()
    name = data.get('project_name', '').strip()
    desc = data.get('description', '')
    start_date = data.get('start_date')
    end_date = data.get('expected_end_date')
    pm_id = data.get('pm_id')
    dev_id = data.get('dev_id')
    qa_id = data.get('qa_id')
    
    if not key or not name:
        return jsonify({'error': 'Ma du an (Key) va Ten du an la bat buoc'}), 400
        
    if not pm_id or not dev_id or not qa_id:
        return jsonify({'error': 'Vui lòng gán đầy đủ PM, DEV và QA phụ trách để khởi tạo dự án'}), 400
        
    if len(set([pm_id, dev_id, qa_id])) < 3:
        return jsonify({'error': 'Một người không thể kiêm nhiệm 2 hoặc 3 vai trò (PM, DEV, QA) trong cùng một dự án'}), 400
        
    if Project.query.filter_by(project_key=key).first():
        return jsonify({'error': f'Ma du an "{key}" da ton tai'}), 400
        
    new_project = Project(
        project_key=key,
        project_name=name,
        description=desc,
        status='ACTIVE'
    )
    
    if start_date:
        from datetime import datetime
        try:
            new_project.start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        except:
            pass
    if end_date:
        from datetime import datetime
        try:
            new_project.expected_end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except:
            pass
    
    db.session.add(new_project)
    db.session.flush()
    
    # Gán PM, DEV, QA
    roles_to_add = [
        (pm_id, 'PM'),
        (dev_id, 'DEV'),
        (qa_id, 'QA')
    ]
    for uid, role in roles_to_add:
        member = ProjectMember(
            project_id=new_project.project_id,
            user_id=uid,
            project_role=role
        )
        db.session.add(member)
        
    db.session.commit()
    return jsonify(new_project.to_dict()), 201

# ──────────────────────────────────────────────────────────────
# Archive / Unarchive dự án (PM hoặc Admin)
# ──────────────────────────────────────────────────────────────
@project_bp.route('/<int:project_id>/archive', methods=['PUT'])
def toggle_archive(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Du an khong ton tai'}), 404
        
    data = request.get_json() or {}
    new_status = data.get('status', 'ARCHIVED')
    
    project.status = new_status
    db.session.commit()
    
    if new_status == 'ARCHIVED':
        message = 'Da luu tru du an thanh cong (Read-only). Toan bo ticket chuyen sang che do Chi Doc.'
    else:
        message = 'Da mo lai du an (Active). Co the tao va chinh sua ticket.'
    return jsonify({'message': message, 'project': project.to_dict()}), 200

# ──────────────────────────────────────────────────────────────
# Thêm / Cập nhật thành viên dự án (PM quản lý)
# ──────────────────────────────────────────────────────────────
@project_bp.route('/<int:project_id>/members', methods=['POST'])
def add_member(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Du an khong ton tai'}), 404
        
    if project.status == 'ARCHIVED':
        return jsonify({'error': 'Du an da bi ARCHIVED (Chi doc). Khong the thay doi nhan su!'}), 403

    data = request.get_json() or {}
    user_id = data.get('user_id')
    role = data.get('project_role', 'DEV')

    if not user_id or role not in ['PM', 'DEV', 'QA']:
        return jsonify({'error': 'Du lieu khong hop le'}), 400

    existing = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first()
    if existing:
        existing.project_role = role
    else:
        new_m = ProjectMember(project_id=project_id, user_id=user_id, project_role=role)
        db.session.add(new_m)

    db.session.commit()
    return jsonify({'message': 'Cap nhat thanh vien thanh cong'}), 200

# ──────────────────────────────────────────────────────────────
# Xóa thành viên khỏi dự án
# ──────────────────────────────────────────────────────────────
@project_bp.route('/<int:project_id>/members/<int:user_id>', methods=['DELETE'])
def remove_member(project_id, user_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Du an khong ton tai'}), 404

    if project.status == 'ARCHIVED':
        return jsonify({'error': 'Du an da bi ARCHIVED!'}), 403

    member = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first()
    if member:
        db.session.delete(member)
        db.session.commit()
    return jsonify({'message': 'Da xoa thanh vien khoi du an'}), 200

# ──────────────────────────────────────────────────────────────
# Tạo Module cho dự án (PM cấu hình)
# ──────────────────────────────────────────────────────────────
@project_bp.route('/<int:project_id>/modules', methods=['POST'])
def add_module(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Du an khong ton tai'}), 404

    if project.status == 'ARCHIVED':
        return jsonify({'error': 'Du an da bi ARCHIVED. Khong the tao Module moi!'}), 403

    data = request.get_json() or {}
    name = data.get('module_name', '').strip()
    desc = data.get('description', '')
    assignee_id = data.get('default_assignee_id')

    if not name:
        return jsonify({'error': 'Ten Module khong duoc de trong'}), 400

    existing_mod = Module.query.filter(
        Module.project_id == project_id,
        Module.module_name.ilike(name)
    ).first()
    
    if existing_mod:
        return jsonify({'error': f'Module với tên "{name}" đã tồn tại trong dự án này'}), 400

    new_mod = Module(
        project_id=project_id,
        module_name=name,
        description=desc,
        default_assignee_id=assignee_id if assignee_id else None
    )
    db.session.add(new_mod)
    db.session.commit()
    return jsonify(new_mod.to_dict()), 201

# ──────────────────────────────────────────────────────────────
# Xóa Module (PM cấu hình)
# ──────────────────────────────────────────────────────────────
@project_bp.route('/<int:project_id>/modules/<int:module_id>', methods=['DELETE'])
def delete_module(project_id, module_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Du an khong ton tai'}), 404

    if project.status == 'ARCHIVED':
        return jsonify({'error': 'Du an da bi ARCHIVED!'}), 403

    mod = Module.query.get(module_id)
    if mod and mod.project_id == project_id:
        db.session.delete(mod)
        db.session.commit()
    return jsonify({'message': 'Da xoa Module'}), 200
