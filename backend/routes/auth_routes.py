from flask import Blueprint, request, jsonify
from models import User, db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    status = request.args.get('status')
    query = User.query
    if status:
        query = query.filter_by(status=status)
    users = query.all()
    return jsonify([u.to_dict() for u in users]), 200

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email là bắt buộc'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Không tìm thấy người dùng'}), 404
        
    if user.status == 'INACTIVE':
        return jsonify({'error': 'Tài khoản này đã bị vô hiệu hóa bởi Admin!'}), 403

    return jsonify({
        'message': 'Đăng nhập thành công',
        'user': user.to_dict()
    }), 200

@auth_bp.route('/create_user', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip()
    global_role = data.get('global_role', 'USER')
    
    if not full_name or not email:
        return jsonify({'error': 'Vui lòng nhập Tên và Email'}), 400
        
    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'Email đã tồn tại trong hệ thống'}), 400
        
    new_user = User(
        full_name=full_name,
        email=email,
        password_hash='scrypt:default',
        global_role=global_role,
        status='ACTIVE'
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.to_dict()), 201

@auth_bp.route('/users/<int:user_id>/status', methods=['PUT'])
def toggle_user_status(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Người dùng không tồn tại'}), 404

    data = request.get_json() or {}
    new_status = data.get('status', 'ACTIVE')

    user.status = new_status
    db.session.commit()
    return jsonify({'message': f'Đã chuyển trạng thái user thành {new_status}', 'user': user.to_dict()}), 200
