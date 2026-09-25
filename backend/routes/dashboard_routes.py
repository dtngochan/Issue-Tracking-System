from flask import Blueprint, request, jsonify
from sqlalchemy import func
from datetime import datetime
from models import Issue, Project, User, IssueHistory, ProjectMember, db

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/summary', methods=['GET'])
def get_summary():
    project_id = request.args.get('project_id', type=int)
    user_id = request.args.get('user_id', type=int)

    base = Issue.query

    # RBAC: Filter by user's projects if not admin
    if user_id:
        user = User.query.get(user_id)
        if user and user.global_role != 'ADMIN':
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
                base = base.filter(or_(*conditions))
            else:
                base = base.filter(Issue.issue_id == -1)

    if project_id:
        base = base.filter_by(project_id=project_id)

    total_bugs = base.count()
    new_bugs = base.filter(Issue.status == 'NEW').count()
    in_progress_bugs = base.filter(Issue.status == 'IN_PROGRESS').count()
    resolved_bugs = base.filter(Issue.status == 'RESOLVED').count()
    closed_bugs = base.filter(Issue.status == 'CLOSED').count()
    reopened_bugs = base.filter(Issue.status == 'REOPENED').count()
    critical_bugs = base.filter(Issue.severity == 'CRITICAL').count()
    rejected_bugs = base.filter(Issue.status == 'REJECTED').count()
    deferred_bugs = base.filter(Issue.status == 'DEFERRED').count()

    # Tính tỷ lệ Reopen Rate (%)
    total_resolved_closed = resolved_bugs + closed_bugs + reopened_bugs
    reopen_rate = round((reopened_bugs / total_resolved_closed * 100), 1) if total_resolved_closed > 0 else 0.0

    # Tính MTTR thực tế (Mean Time To Resolve)
    mttr_hours = calculate_mttr(project_id, user_id)

    # Thống kê theo Severity
    severity_breakdown = {
        'CRITICAL': base.filter(Issue.severity == 'CRITICAL').count(),
        'MAJOR': base.filter(Issue.severity == 'MAJOR').count(),
        'MINOR': base.filter(Issue.severity == 'MINOR').count(),
        'TRIVIAL': base.filter(Issue.severity == 'TRIVIAL').count()
    }

    # Thống kê theo Status
    status_breakdown = {
        'NEW': new_bugs,
        'IN_PROGRESS': in_progress_bugs,
        'RESOLVED': resolved_bugs,
        'CLOSED': closed_bugs,
        'REOPENED': reopened_bugs,
        'REJECTED': rejected_bugs,
        'DEFERRED': deferred_bugs
    }

    # Thống kê năng suất QA & Dev
    qa_stats = get_role_stats(project_id, 'QA')
    dev_stats = get_role_stats(project_id, 'DEV')

    return jsonify({
        'total_issues': total_bugs,
        'new_issues': new_bugs,
        'in_progress_issues': in_progress_bugs,
        'resolved_issues': resolved_bugs,
        'closed_issues': closed_bugs,
        'reopened_issues': reopened_bugs,
        'critical_issues': critical_bugs,
        'rejected_issues': rejected_bugs,
        'deferred_issues': deferred_bugs,
        'reopen_rate_percent': reopen_rate,
        'mttr_hours_avg': mttr_hours,
        'severity_breakdown': severity_breakdown,
        'status_breakdown': status_breakdown,
        'qa_stats': qa_stats,
        'dev_stats': dev_stats
    }), 200


def calculate_mttr(project_id=None, user_id=None):
    """Tính MTTR thực tế dựa trên thời gian tạo và thời gian resolve/close"""
    query = Issue.query.filter(Issue.status.in_(['RESOLVED', 'CLOSED']))
    
    if user_id:
        user = User.query.get(user_id)
        if user and user.global_role != 'ADMIN':
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
                query = query.filter(Issue.issue_id == -1)

    if project_id:
        query = query.filter_by(project_id=project_id)
    
    resolved_issues = query.all()
    if not resolved_issues:
        return 0.0
    
    total_hours = 0
    count = 0
    for issue in resolved_issues:
        if issue.updated_at and issue.created_at:
            delta = issue.updated_at - issue.created_at
            total_hours += delta.total_seconds() / 3600
            count += 1
    
    return round(total_hours / count, 1) if count > 0 else 0.0


def get_role_stats(project_id, role):
    """Thống kê năng suất theo vai trò (QA: bug phát hiện, Dev: bug đã fix)"""
    stats = []
    
    members_query = ProjectMember.query.filter_by(project_role=role)
    if project_id:
        members_query = members_query.filter_by(project_id=project_id)
    
    members = members_query.all()
    seen_users = set()
    
    for m in members:
        if m.user_id in seen_users:
            continue
        seen_users.add(m.user_id)
        
        user = User.query.get(m.user_id)
        if not user:
            continue
        
        if role == 'QA':
            # QA: Đếm số bug đã report
            reported = Issue.query.filter_by(reporter_id=m.user_id)
            if project_id:
                reported = reported.filter_by(project_id=project_id)
            count = reported.count()
        else:
            # DEV: Đếm số bug đã fix (RESOLVED hoặc CLOSED)
            fixed = Issue.query.filter_by(assignee_id=m.user_id).filter(
                Issue.status.in_(['RESOLVED', 'CLOSED'])
            )
            if project_id:
                fixed = fixed.filter_by(project_id=project_id)
            count = fixed.count()
        
        stats.append({
            'user_id': m.user_id,
            'full_name': user.full_name,
            'role': role,
            'count': count
        })
    
    return stats
