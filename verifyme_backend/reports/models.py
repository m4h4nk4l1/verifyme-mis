from django.db import models
from django.contrib.postgres.fields import JSONField
import uuid

def create_report_manager():
    """Factory function to create ReportManager with functional approach"""
    class ReportManager(models.Manager):
        def get_reports_by_organization(self, organization_id):
            """Get reports by organization"""
            return self.filter(
                organization_id=organization_id
            ).select_related('created_by').order_by('-created_at')
        
        def get_reports_by_user(self, user_id):
            """Get reports created by specific user"""
            return self.filter(
                created_by_id=user_id
            ).select_related('organization').order_by('-created_at')
        
        def get_active_reports(self, organization_id):
            """Get active reports for organization"""
            return self.filter(
                organization_id=organization_id,
                is_active=True
            ).order_by('-created_at')
    
    return ReportManager()

def create_export_manager():
    """Factory function to create ExportManager with functional approach"""
    class ExportManager(models.Manager):
        def get_exports_by_organization(self, organization_id):
            """Get exports by organization"""
            return self.filter(
                organization_id=organization_id
            ).select_related('created_by').order_by('-created_at')
        
        def get_pending_exports(self):
            """Get pending exports"""
            return self.filter(
                status='PENDING'
            ).select_related('organization', 'created_by')
    
    return ExportManager()

class Report(models.Model):
    """Model for storing report configurations and metadata"""
    
    REPORT_TYPES = [
        ('DAILY', 'Daily Report'),
        ('WEEKLY', 'Weekly Report'),
        ('MONTHLY', 'Monthly Report'),
        ('QUARTERLY', 'Quarterly Report'),
        ('HALF_YEARLY', 'Half Yearly Report'),
        ('YEARLY', 'Yearly Report'),
        ('CUSTOM', 'Custom Report'),
    ]
    
    REPORT_FORMATS = [
        ('EXCEL', 'Excel (.xlsx)'),
        ('PDF', 'PDF'),
        ('CSV', 'CSV'),
        ('JSON', 'JSON'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Report Configuration
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    format = models.CharField(max_length=10, choices=REPORT_FORMATS, default='EXCEL')
    
    # Organization Relationship
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='reports'
    )
    
    # Report Parameters (JSONB for flexibility)
    parameters = models.JSONField(
        default=dict,
        help_text="Report parameters like date range, filters, etc."
    )
    
    # Schedule Configuration
    is_scheduled = models.BooleanField(default=False)
    schedule_cron = models.CharField(max_length=100, blank=True, help_text="Cron expression for scheduling")
    last_generated = models.DateTimeField(null=True, blank=True)
    next_generation = models.DateTimeField(null=True, blank=True)
    
    # Configuration
    is_active = models.BooleanField(default=True)
    include_attachments = models.BooleanField(default=True, help_text="Include file attachments in report")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_reports'
    )
    
    # Manager
    objects = create_report_manager()
    
    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'report_type']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_scheduled']),
            models.Index(fields=['created_by']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'organization'],
                name='unique_report_name_per_organization'
            )
        ]
    
    def __str__(self):
        return f"{self.name} - {self.organization.name}"
    
    @property
    def is_overdue(self):
        """Check if scheduled report is overdue"""
        if self.is_scheduled and self.next_generation:
            from django.utils import timezone
            return timezone.now() > self.next_generation
        return False
    
    def get_parameter(self, key, default=None):
        """Get a specific parameter value"""
        return self.parameters.get(key, default)
    
    def set_parameter(self, key, value):
        """Set a parameter value"""
        self.parameters[key] = value
        self.save()

class Export(models.Model):
    """Model for tracking data exports"""
    
    EXPORT_STATUS = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    EXPORT_TYPES = [
        ('FORM_DATA', 'Form Data Export'),
        ('USER_ACTIVITY', 'User Activity Export'),
        ('AUDIT_LOG', 'Audit Log Export'),
        ('CUSTOM', 'Custom Export'),
    ]
    
    EXPORT_FORMATS = [
        ('EXCEL', 'Excel (.xlsx)'),
        ('PDF', 'PDF'),
        ('CSV', 'CSV'),
        ('JSON', 'JSON'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Export Configuration
    export_type = models.CharField(max_length=20, choices=EXPORT_TYPES)
    format = models.CharField(max_length=10, choices=EXPORT_FORMATS, default='EXCEL')
    
    # Organization and User
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='exports'
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='exports'
    )
    
    # Export Parameters
    filters = models.JSONField(
        default=dict,
        help_text="Export filters and parameters"
    )
    
    # File Information
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    
    # Status and Progress
    status = models.CharField(max_length=20, choices=EXPORT_STATUS, default='PENDING')
    progress = models.PositiveIntegerField(default=0, help_text="Progress percentage")
    total_records = models.PositiveIntegerField(default=0)
    processed_records = models.PositiveIntegerField(default=0)
    
    # Error Information
    error_message = models.TextField(blank=True)
    error_details = models.JSONField(default=dict, blank=True)
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Manager
    objects = create_export_manager()
    
    class Meta:
        db_table = 'exports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['export_type']),
            models.Index(fields=['created_by']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.get_export_type_display()} - {self.organization.name} - {self.status}"
    
    @property
    def duration(self):
        """Calculate export duration"""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None
    
    @property
    def is_completed(self):
        """Check if export is completed"""
        return self.status == 'COMPLETED'
    
    @property
    def is_failed(self):
        """Check if export failed"""
        return self.status == 'FAILED'
    
    def start_processing(self):
        """Mark export as started"""
        from django.utils import timezone
        self.status = 'PROCESSING'
        self.started_at = timezone.now()
        self.save()
    
    def complete_processing(self, file_path=None, file_size=None):
        """Mark export as completed"""
        from django.utils import timezone
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        self.progress = 100
        if file_path:
            self.file_path = file_path
        if file_size:
            self.file_size = file_size
        self.save()
    
    def fail_processing(self, error_message):
        """Mark export as failed"""
        from django.utils import timezone
        self.status = 'FAILED'
        self.completed_at = timezone.now()
        self.error_message = error_message
        self.save()

class Analytics(models.Model):
    """Model for storing analytics data"""
    
    ANALYTICS_TYPES = [
        ('FORM_SUBMISSIONS', 'Form Submissions'),
        ('USER_ACTIVITY', 'User Activity'),
        ('TAT_PERFORMANCE', 'TAT Performance'),
        ('DUPLICATE_RATE', 'Duplicate Rate'),
        ('ERROR_RATE', 'Error Rate'),
        ('EXPORT_USAGE', 'Export Usage'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Analytics Configuration
    analytics_type = models.CharField(max_length=20, choices=ANALYTICS_TYPES)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Organization
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='analytics',
        null=True,  # allow null for system-wide analytics
        blank=True
    )
    
    # Analytics Data (JSONB for flexibility)
    data = models.JSONField(
        default=dict,
        help_text="Analytics data in structured format"
    )
    
    # Summary Metrics
    total_count = models.PositiveIntegerField(default=0)
    success_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytics'
        ordering = ['-period_start']
        indexes = [
            models.Index(fields=['organization', 'analytics_type']),
            models.Index(fields=['period_start', 'period_end']),
            models.Index(fields=['analytics_type']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'analytics_type', 'period_start', 'period_end'],
                name='unique_analytics_period'
            )
        ]
    
    def __str__(self):
        return f"{self.get_analytics_type_display()} - {self.organization.name} - {self.period_start.date()}"
    
    @property
    def success_rate(self):
        """Calculate success rate"""
        if self.total_count > 0:
            return (self.success_count / self.total_count) * 100
        return 0
    
    @property
    def error_rate(self):
        """Calculate error rate"""
        if self.total_count > 0:
            return (self.error_count / self.total_count) * 100
        return 0
    
    def get_metric(self, key, default=None):
        """Get a specific metric value"""
        return self.data.get(key, default)
    
    def set_metric(self, key, value):
        """Set a metric value"""
        self.data[key] = value
        self.save()

class Dashboard(models.Model):
    """Model for storing dashboard configurations"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Organization
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='dashboards'
    )
    
    # Dashboard Configuration (JSONB for flexibility)
    configuration = models.JSONField(
        default=dict,
        help_text="Dashboard layout and widget configuration"
    )
    
    # Access Control
    is_public = models.BooleanField(default=False, help_text="Whether dashboard is public to organization")
    allowed_roles = models.JSONField(
        default=list,
        help_text="List of roles that can access this dashboard"
    )
    
    # Configuration
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False, help_text="Whether this is the default dashboard")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_dashboards'
    )
    
    class Meta:
        db_table = 'dashboards'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['is_default']),
            models.Index(fields=['created_by']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'organization'],
                name='unique_dashboard_name_per_organization'
            )
        ]
    
    def __str__(self):
        return f"{self.name} - {self.organization.name}"
    
    def get_widgets(self):
        """Get list of widgets in this dashboard"""
        return self.configuration.get('widgets', [])
    
    def add_widget(self, widget_config):
        """Add a widget to the dashboard"""
        if 'widgets' not in self.configuration:
            self.configuration['widgets'] = []
        self.configuration['widgets'].append(widget_config)
        self.save()
    
    def remove_widget(self, widget_id):
        """Remove a widget from the dashboard"""
        if 'widgets' in self.configuration:
            self.configuration['widgets'] = [
                widget for widget in self.configuration['widgets']
                if widget.get('id') != widget_id
            ]
            self.save()
    
    def can_access(self, user):
        """Check if user can access this dashboard"""
        if self.is_public:
            return True
        if not self.allowed_roles:
            return True
        return user.role in self.allowed_roles
