from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)
    global_role = db.Column(db.Enum('ADMIN', 'USER', name='global_role_enum'), default='USER', nullable=False)
    status = db.Column(db.Enum('ACTIVE', 'INACTIVE', name='user_status_enum'), default='ACTIVE', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'full_name': self.full_name,
            'email': self.email,
            'avatar_url': self.avatar_url,
            'global_role': self.global_role,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Project(db.Model):
    __tablename__ = 'projects'
    
    project_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_key = db.Column(db.String(10), nullable=False, unique=True)
    project_name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    expected_end_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.Enum('ACTIVE', 'ARCHIVED', name='project_status_enum'), default='ACTIVE', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    members = db.relationship('ProjectMember', backref='project', cascade='all, delete-orphan')
    modules = db.relationship('Module', backref='project', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'project_id': self.project_id,
            'project_key': self.project_key,
            'project_name': self.project_name,
            'description': self.description,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'expected_end_date': self.expected_end_date.isoformat() if self.expected_end_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProjectMember(db.Model):
    __tablename__ = 'project_members'
    
    member_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    project_role = db.Column(db.Enum('PM', 'DEV', 'QA', name='project_role_enum'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref='project_memberships')

    def to_dict(self):
        return {
            'member_id': self.member_id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'project_role': self.project_role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }

class Module(db.Model):
    __tablename__ = 'modules'
    
    module_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    module_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    default_assignee_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    default_assignee = db.relationship('User', foreign_keys=[default_assignee_id])

    def to_dict(self):
        return {
            'module_id': self.module_id,
            'project_id': self.project_id,
            'module_name': self.module_name,
            'description': self.description,
            'default_assignee_id': self.default_assignee_id,
            'default_assignee': self.default_assignee.to_dict() if self.default_assignee else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Issue(db.Model):
    __tablename__ = 'issues'
    
    issue_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_key = db.Column(db.String(20), nullable=False, unique=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey('modules.module_id', ondelete='SET NULL'), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    steps_to_reproduce = db.Column(db.Text, nullable=True)
    raw_logs = db.Column(db.Text, nullable=True)
    environment = db.Column(db.Enum('DEV', 'STAGING', 'PRODUCTION', name='env_enum'), default='DEV', nullable=False)
    issue_type = db.Column(db.Enum('BUG', 'INCIDENT', 'ENHANCEMENT', name='type_enum'), default='BUG', nullable=False)
    severity = db.Column(db.Enum('CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL', name='severity_enum'), default='MAJOR', nullable=False)
    priority = db.Column(db.Enum('HIGH', 'MEDIUM', 'LOW', name='priority_enum'), default='MEDIUM', nullable=False)
    status = db.Column(db.Enum('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED', 'DUPLICATE', 'DEFERRED', name='status_enum'), default='NEW', nullable=False)
    confidence_score = db.Column(db.Float, default=0)
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    git_commit_ref = db.Column(db.String(255), nullable=True)
    sla_due_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = db.relationship('Project', backref='issues')
    module = db.relationship('Module', backref='issues')
    reporter = db.relationship('User', foreign_keys=[reporter_id])
    assignee = db.relationship('User', foreign_keys=[assignee_id])
    comments = db.relationship('IssueComment', backref='issue', cascade='all, delete-orphan')
    history = db.relationship('IssueHistory', backref='issue', cascade='all, delete-orphan')
    attachments = db.relationship('Attachment', backref='issue', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'issue_id': self.issue_id,
            'issue_key': self.issue_key,
            'project_id': self.project_id,
            'project_key': self.project.project_key if self.project else '',
            'module_id': self.module_id,
            'module_name': self.module.module_name if self.module else 'None',
            'title': self.title,
            'description': self.description,
            'steps_to_reproduce': self.steps_to_reproduce,
            'raw_logs': self.raw_logs,
            'environment': self.environment,
            'issue_type': self.issue_type,
            'severity': self.severity,
            'priority': self.priority,
            'status': self.status,
            'confidence_score': self.confidence_score,
            'reporter_id': self.reporter_id,
            'reporter_name': self.reporter.full_name if self.reporter else 'Unknown',
            'assignee_id': self.assignee_id,
            'assignee_name': self.assignee.full_name if self.assignee else 'Unassigned',
            'git_commit_ref': self.git_commit_ref,
            'sla_due_date': self.sla_due_date.isoformat() if self.sla_due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'attachments': [a.to_dict() for a in self.attachments]
        }

class IssueComment(db.Model):
    __tablename__ = 'issue_comments'
    
    comment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.issue_id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User')

    def to_dict(self):
        return {
            'comment_id': self.comment_id,
            'issue_id': self.issue_id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else 'Unknown',
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class IssueHistory(db.Model):
    __tablename__ = 'issue_history'
    
    history_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.issue_id', ondelete='CASCADE'), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    field_name = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.String(255), nullable=True)
    new_value = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User')

    def to_dict(self):
        return {
            'history_id': self.history_id,
            'issue_id': self.issue_id,
            'changed_by': self.changed_by,
            'user_name': self.user.full_name if self.user else 'System',
            'field_name': self.field_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Attachment(db.Model):
    __tablename__ = 'attachments'
    
    attachment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.issue_id', ondelete='CASCADE'), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.Text, nullable=False)
    file_type = db.Column(db.String(50), nullable=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'attachment_id': self.attachment_id,
            'issue_id': self.issue_id,
            'file_name': self.file_name,
            'file_url': self.file_url,
            'file_type': self.file_type,
            'uploaded_by': self.uploaded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
