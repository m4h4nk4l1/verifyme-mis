from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.postgres.fields import JSONField
import uuid
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import json
from utils.storage import get_file_upload_path
from django.db import connection

User = get_user_model()

def create_form_schema_manager():
    """Create a custom manager for DynamicFormSchema"""
    class FormSchemaManager(models.Manager):
        def get_queryset(self):
            return super().get_queryset().select_related('organization', 'created_by')
    
    return FormSchemaManager()

def create_form_entry_manager():
    """Create a custom manager for FormEntry"""
    class FormEntryManager(models.Manager):
        def get_queryset(self):
            return super().get_queryset().select_related(
                'organization', 'employee', 'form_schema', 'verified_by'
            )
    
    return FormEntryManager()

class DynamicFormSchema(models.Model):
    """Dynamic form schema model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    organization = models.ForeignKey('accounts.Organization', on_delete=models.CASCADE, related_name='form_schemas')
    fields_definition = models.JSONField(default=list)  # List of field definitions
    max_fields = models.PositiveIntegerField(default=120, validators=[MinValueValidator(1), MaxValueValidator(120)])
    tat_hours_limit = models.PositiveIntegerField(default=24, help_text="TAT hours limit for this form schema")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_schemas', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = create_form_schema_manager()

    class Meta:
        unique_together = ['organization', 'name']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f"{self.name} - {self.organization.display_name}"

    @property
    def fields_count(self):
        """Return the number of fields in the schema"""
        return len(self.fields_definition) if self.fields_definition else 0

class OrganizationAutoIncrementField(models.PositiveIntegerField):
    """Custom field that auto-increments per organization"""
    
    def __init__(self, *args, **kwargs):
        kwargs['null'] = True  # Allow null initially
        kwargs['blank'] = True
        super().__init__(*args, **kwargs)
    
    def pre_save(self, model_instance, add):
        if add and not getattr(model_instance, self.attname):
            # Get the organization
            org = getattr(model_instance, 'organization')
            if org:
                # Get the next case_id for this organization
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT COALESCE(MAX(case_id), 0) + 1
                        FROM forms_formentry 
                        WHERE organization_id = %s
                    """, [org.id])
                    next_id = cursor.fetchone()[0]
                    setattr(model_instance, self.attname, next_id)
        return super().pre_save(model_instance, add)

class FormEntry(models.Model):
    """Form entry model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_id = OrganizationAutoIncrementField(help_text="Auto-incrementing case ID per organization")
    organization = models.ForeignKey('accounts.Organization', on_delete=models.CASCADE, related_name='form_entries')
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='form_entries')
    form_schema = models.ForeignKey(DynamicFormSchema, on_delete=models.CASCADE, related_name='entries')
    form_data = models.JSONField(default=dict)  # Form submission data
    is_completed = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    verification_notes = models.TextField(blank=True)
    tat_start_time = models.DateTimeField(auto_now_add=True)
    tat_completion_time = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_entries')
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = create_form_entry_manager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'employee']),
            models.Index(fields=['form_schema']),
            models.Index(fields=['is_completed']),
            models.Index(fields=['created_at']),
            models.Index(fields=['case_id']),
        ]
        # Make case_id unique per organization
        unique_together = ['organization', 'case_id']

    def __str__(self):
        return f"Case {self.case_id} - {self.organization.name}"

    @property
    def tat_duration(self):
        """Calculate TAT duration in hours"""
        if self.tat_completion_time and self.tat_start_time:
            duration = self.tat_completion_time - self.tat_start_time
            return duration.total_seconds() / 3600  # Convert to hours
        return None

    @property
    def is_out_of_tat(self):
        """Check if case is out of TAT using schema-specific limit"""
        if self.tat_duration is not None:
            # Use schema-specific TAT limit
            tat_limit = self.form_schema.tat_hours_limit
            return self.tat_duration > tat_limit
        return False

    def mark_completed(self):
        """Mark the form entry as completed"""
        self.is_completed = True
        self.tat_completion_time = timezone.now()
        self.save()

    def check_tat_status(self):
        """Check if entry is out of TAT"""
        if not self.is_completed:
            duration = timezone.now() - self.tat_start_time
            hours = duration.total_seconds() / 3600
            # Use schema-specific TAT limit
            tat_limit = self.form_schema.tat_hours_limit
            return hours > tat_limit
        return self.is_out_of_tat

    def add_file_attachment(self, file_obj, description=''):
        """Add a file attachment to this form entry"""
        from .models import FileAttachment
        
        file_attachment = FileAttachment.objects.create(
            form_entry=self,
            file=file_obj,
            original_filename=file_obj.name,
            file_type=file_obj.content_type,
            file_size=file_obj.size,
            description=description,
            uploaded_by=self.employee
        )
        return file_attachment

class FileAttachment(models.Model):
    """File attachment model for form entries"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form_entry = models.ForeignKey(FormEntry, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to=get_file_upload_path)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)  # e.g., 'image/jpeg', 'application/pdf'
    file_size = models.PositiveIntegerField()  # Size in bytes
    description = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_files')
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_filename} - {self.form_entry}"

    def save(self, *args, **kwargs):
        # Set original filename if not provided
        if not self.original_filename:
            self.original_filename = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)

class FormField(models.Model):
    """Reusable form field model"""
    FIELD_TYPES = [
        ('NUMERIC', 'Numeric'),
        ('STRING', 'String'),
        ('ALPHANUMERIC', 'Alphanumeric'),
        ('SYMBOLS_ALPHANUMERIC', 'Symbols + Alphanumeric'),
        ('BOOLEAN', 'Boolean'),
        ('DATE', 'Date'),
        ('EMAIL', 'Email'),
        ('PHONE', 'Phone'),
        ('IMAGE_UPLOAD', 'Image Upload'),
        ('DOCUMENT_UPLOAD', 'Document Upload'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=255)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
    validation_rules = models.JSONField(default=dict)  # Validation rules for the field
    is_required = models.BooleanField(default=True)
    is_unique = models.BooleanField(default=False)
    default_value = models.TextField(blank=True)
    help_text = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    organization = models.ForeignKey('accounts.Organization', on_delete=models.CASCADE, related_name='form_fields')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_fields', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['organization', 'name']
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['field_type']),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.field_type})"

class FormFieldFile(models.Model):
    """Model for file uploads associated with form fields"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form_entry = models.ForeignKey(FormEntry, on_delete=models.CASCADE, related_name='field_files')
    field_name = models.CharField(max_length=100)  # The field name in the form schema
    file = models.FileField(upload_to=get_file_upload_path)
    s3_url = models.URLField(max_length=500, blank=True, null=True)  # Store S3 URL directly
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.PositiveIntegerField()
    description = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_field_files')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_field_files')
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        unique_together = ['form_entry', 'field_name']

    def __str__(self):
        return f"{self.field_name} - {self.original_filename}"

    def save(self, *args, **kwargs):
        # Set original filename if not provided
        if not self.original_filename:
            self.original_filename = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)
