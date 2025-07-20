from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

def create_user_activity_manager():
    """Factory function to create UserActivityManager with functional approach"""
    class UserActivityManager(models.Manager):
        def get_activities_by_user(self, user_id):
            """Get activities by specific user"""
            return self.filter(
                user_id=user_id
            ).select_related('user', 'organization').order_by('-created_at')
        
        def get_activities_by_organization(self, organization_id):
            """Get activities by organization"""
            return self.filter(
                organization_id=organization_id
            ).select_related('user').order_by('-created_at')
        
        def get_recent_activities(self, organization_id, limit=50):
            """Get recent activities for organization"""
            return self.filter(
                organization_id=organization_id
            ).select_related('user').order_by('-created_at')[:limit]
    
    return UserActivityManager()

def create_system_log_manager():
    """Factory function to create SystemLogManager with functional approach"""
    class SystemLogManager(models.Manager):
        def get_logs_by_level(self, level):
            """Get logs by level"""
            return self.filter(level=level).order_by('-created_at')
        
        def get_logs_by_module(self, module):
            """Get logs by module"""
            return self.filter(module=module).order_by('-created_at')
        
        def get_recent_logs(self, limit=100):
            """Get recent system logs"""
            return self.order_by('-created_at')[:limit]
    
    return SystemLogManager()

class UserActivity(models.Model):
    """Model for tracking user activities"""
    
    ACTIVITY_TYPES = [
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('CREATE', 'Create Record'),
        ('UPDATE', 'Update Record'),
        ('DELETE', 'Delete Record'),
        ('VIEW', 'View Record'),
        ('EXPORT', 'Export Data'),
        ('IMPORT', 'Import Data'),
        ('FORM_SUBMIT', 'Form Submission'),
        ('FORM_EDIT', 'Form Edit'),
        ('USER_CREATE', 'User Creation'),
        ('USER_UPDATE', 'User Update'),
        ('USER_DELETE', 'User Deletion'),
        ('SCHEMA_CREATE', 'Schema Creation'),
        ('SCHEMA_UPDATE', 'Schema Update'),
        ('SCHEMA_DELETE', 'Schema Deletion'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User and Organization
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='activities'
    )
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='user_activities'
    )
    
    # Activity Details
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.TextField()
    
    # Target Object (Generic Foreign Key)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Additional Data (JSONB for flexibility)
    metadata = models.JSONField(
        default=dict,
        help_text="Additional data about the activity"
    )
    
    # IP and User Agent
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Status
    is_successful = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Manager
    objects = create_user_activity_manager()
    
    class Meta:
        db_table = 'user_activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['organization', 'created_at']),
            models.Index(fields=['activity_type']),
            models.Index(fields=['is_successful']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_activity_type_display()} - {self.created_at}"
    
    @property
    def target_object_name(self):
        """Get the name of the target object"""
        if self.content_object:
            return str(self.content_object)
        return "N/A"
    
    @property
    def activity_summary(self):
        """Get a summary of the activity"""
        return f"{self.get_activity_type_display()}: {self.description}"

class SystemLog(models.Model):
    """Model for system-level logs"""
    
    LOG_LEVELS = [
        ('DEBUG', 'Debug'),
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Log Details
    level = models.CharField(max_length=10, choices=LOG_LEVELS, default='INFO')
    module = models.CharField(max_length=100, help_text="Module/component where log was generated")
    message = models.TextField()
    
    # Additional Data
    metadata = models.JSONField(
        default=dict,
        help_text="Additional context data"
    )
    
    # User Context (if applicable)
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_logs'
    )
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_logs'
    )
    
    # Request Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    request_method = models.CharField(max_length=10, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Manager
    objects = create_system_log_manager()
    
    class Meta:
        db_table = 'system_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['level']),
            models.Index(fields=['module']),
            models.Index(fields=['created_at']),
            models.Index(fields=['user']),
            models.Index(fields=['organization']),
        ]
    
    def __str__(self):
        return f"[{self.level}] {self.module}: {self.message[:100]}"
    
    @property
    def is_error(self):
        """Check if this is an error log"""
        return self.level in ['ERROR', 'CRITICAL']
    
    @property
    def is_warning(self):
        """Check if this is a warning log"""
        return self.level == 'WARNING'

class AuditLog(models.Model):
    """Model to track system activities and user actions"""
    
    ACTION_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('ACTIVATE', 'Activate'),
        ('DEACTIVATE', 'Deactivate'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('ORGANIZATION_CREATE', 'Organization Created'),
        ('ORGANIZATION_UPDATE', 'Organization Updated'),
        ('USER_CREATE', 'User Created'),
        ('USER_UPDATE', 'User Updated'),
        ('USER_DELETE', 'User Deleted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, default='LOGIN')
    details = models.TextField(default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['action']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['organization']),
        ]
    
    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"
    
    @classmethod
    def log_activity(cls, user, action, details, ip_address=None, user_agent=None, organization=None):
        """Helper method to log activity"""
        return cls.objects.create(
            user=user,
            action=action,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            organization=organization
        )

# Utility functions for logging
def log_user_activity(user, activity_type, description, organization=None, **kwargs):
    """Log user activity"""
    if not organization and user.organization:
        organization = user.organization
    
    return UserActivity.objects.create(
        user=user,
        organization=organization,
        activity_type=activity_type,
        description=description,
        **kwargs
    )

def log_system_event(level, module, message, user=None, organization=None, **kwargs):
    """Log system event"""
    return SystemLog.objects.create(
        level=level,
        module=module,
        message=message,
        user=user,
        organization=organization,
        **kwargs
    )

def log_audit_event(user, audit_type, content_object, old_values=None, new_values=None, **kwargs):
    """Log audit event"""
    if not old_values:
        old_values = {}
    if not new_values:
        new_values = {}
    
    return AuditLog.objects.create(
        user=user,
        organization=user.organization,
        audit_type=audit_type,
        content_type=ContentType.objects.get_for_model(content_object),
        object_id=content_object.id,
        old_values=old_values,
        new_values=new_values,
        **kwargs
    )
