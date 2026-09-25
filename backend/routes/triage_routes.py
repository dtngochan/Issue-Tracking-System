from flask import Blueprint, request, jsonify
from services.auto_triage import AutoTriageEngine
from models import Module

triage_bp = Blueprint('triage', __name__, url_prefix='/api/triage')

@triage_bp.route('/analyze', methods=['POST'])
def analyze_log():
    data = request.get_json() or {}
    title = data.get('title', '')
    raw_logs = data.get('raw_logs', '')
    module_id = data.get('module_id')

    default_assignee_id = None
    if module_id:
        mod = Module.query.get(module_id)
        if mod:
            default_assignee_id = mod.default_assignee_id

    result = AutoTriageEngine.analyze_log_and_title(title, raw_logs, default_assignee_id)
    return jsonify(result), 200
