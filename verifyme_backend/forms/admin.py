from django.contrib import admin
from .models import DynamicFormSchema, FormEntry, FileAttachment, FormField, FormFieldFile


@admin.register(DynamicFormSchema)
class DynamicFormSchemaAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'tat_hours_limit', 'is_active', 'fields_count', 'created_at']
    list_filter = ['is_active', 'organization', 'created_at']
    search_fields = ['name', 'description', 'organization__name']
    readonly_fields = ['created_at', 'updated_at', 'fields_count']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'organization', 'is_active')
        }),
        ('TAT Configuration', {
            'fields': ('tat_hours_limit',),
            'description': 'Set the Turn Around Time limit in hours for this form schema. Cases exceeding this limit will be marked as "Out of TAT". Default is 24 hours.'
        }),
        ('Form Configuration', {
            'fields': ('fields_definition', 'max_fields')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('organization', 'created_by')
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by for new objects
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing object
            return self.readonly_fields + ('created_by',)
        return self.readonly_fields


@admin.register(FormEntry)
class FormEntryAdmin(admin.ModelAdmin):
    list_display = ['entry_id', 'case_id', 'organization', 'employee', 'form_schema', 'is_completed', 'is_verified', 'is_out_of_tat_display', 'tat_duration_display', 'created_at']
    list_filter = ['is_completed', 'is_verified', 'organization', 'form_schema', 'created_at']
    search_fields = ['entry_id', 'case_id', 'employee__first_name', 'employee__last_name', 'form_schema__name']
    readonly_fields = ['entry_id', 'case_id', 'created_at', 'updated_at', 'tat_duration', 'is_out_of_tat']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('case_id', 'organization', 'employee', 'form_schema')
        }),
        ('Status', {
            'fields': ('is_completed', 'is_verified', 'verification_notes')
        }),
        ('TAT Information', {
            'fields': ('tat_start_time', 'tat_completion_time', 'tat_duration', 'is_out_of_tat'),
            'description': 'TAT duration is calculated automatically. Out of TAT status is based on schema-specific TAT limit.'
        }),
        ('Form Data', {
            'fields': ('form_data',),
            'classes': ('collapse',)
        }),
        ('Verification', {
            'fields': ('verified_by', 'verified_at'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('organization', 'employee', 'form_schema', 'verified_by')
    
    def tat_duration_display(self, obj):
        """Display TAT duration in a readable format"""
        if obj.tat_duration:
            return f"{obj.tat_duration:.2f} hours"
        return "N/A"
    tat_duration_display.short_description = "TAT Duration"
    
    def is_out_of_tat_display(self, obj):
        """Display out of TAT status with color coding"""
        if obj.is_out_of_tat:
            return "🔴 OUT OF TAT"
        return "🟢 Within TAT"
    is_out_of_tat_display.short_description = "TAT Status"


@admin.register(FileAttachment)
class FileAttachmentAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'form_entry', 'file_type', 'file_size', 'is_verified', 'uploaded_at']
    list_filter = ['is_verified', 'file_type', 'uploaded_at']
    search_fields = ['original_filename', 'form_entry__case_id']
    readonly_fields = ['uploaded_at', 'file_size']


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_name', 'field_type', 'is_required', 'is_active', 'organization']
    list_filter = ['field_type', 'is_required', 'is_active', 'organization']
    search_fields = ['name', 'display_name']


@admin.register(FormFieldFile)
class FormFieldFileAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'form_entry', 'field_name', 'file_type', 'is_verified', 'uploaded_at']
    list_filter = ['is_verified', 'file_type', 'uploaded_at']
    search_fields = ['original_filename', 'form_entry__case_id', 'field_name']
    readonly_fields = ['uploaded_at', 'file_size']
