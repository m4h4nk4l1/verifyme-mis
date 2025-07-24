from rest_framework import serializers
from django.core.validators import MinValueValidator, MaxValueValidator
from .models import DynamicFormSchema, FormEntry, FormField, FileAttachment, FormFieldFile
from accounts.serializers import UserSerializer, OrganizationSerializer
from accounts.models import User, Organization
from django.conf import settings
from utils.storage import S3FileManager
from django.utils import timezone

class DynamicFormSchemaSerializer(serializers.ModelSerializer):
    """Serializer for DynamicFormSchema model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    fields_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DynamicFormSchema
        fields = [
            'id', 'name', 'description', 'fields_definition', 'max_fields', 'tat_hours_limit',
            'organization', 'organization_name', 'created_by', 'created_by_name',
            'is_active', 'fields_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_fields_count(self, obj):
        """Get the number of fields in the schema"""
        if obj.fields_definition:
            return len(obj.fields_definition)
        return 0

class DynamicFormSchemaCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating DynamicFormSchema"""
    
    class Meta:
        model = DynamicFormSchema
        fields = [
            'name', 'description', 'fields_definition', 'max_fields', 'tat_hours_limit',
            'organization', 'is_active'
        ]

class DynamicFormSchemaUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating DynamicFormSchema - restricts field modifications"""
    
    class Meta:
        model = DynamicFormSchema
        fields = [
            'name', 'description', 'fields_definition', 'max_fields', 'tat_hours_limit',
            'is_active'
        ]
    
    def validate_fields_definition(self, value):
        """Validate that field modifications are not allowed, only reordering"""
        if not self.instance:
            return value
        
        # Get the original fields definition
        original_fields = self.instance.fields_definition or []
        new_fields = value or []
        
        # Check if the number of fields has changed
        if len(original_fields) != len(new_fields):
            raise serializers.ValidationError(
                "Cannot add or remove fields from existing schemas. Only field reordering is allowed."
            )
        
        # Create maps of field names and their properties
        original_field_map = {field.get('name'): field for field in original_fields}
        new_field_map = {field.get('name'): field for field in new_fields}
        
        # Check if all original field names exist in new fields
        for field_name in original_field_map:
            if field_name not in new_field_map:
                raise serializers.ValidationError(
                    f"Cannot remove field '{field_name}' from existing schema."
                )
        
        # Check if any new field names were added
        for field_name in new_field_map:
            if field_name not in original_field_map:
                raise serializers.ValidationError(
                    f"Cannot add new field '{field_name}' to existing schema."
                )
        
        # Check if any field properties have changed (except order)
        for field_name, original_field in original_field_map.items():
            new_field = new_field_map[field_name]
            
            # Compare all properties except order
            for prop in ['display_name', 'field_type', 'is_required', 'is_unique', 'default_value', 'help_text', 'validation_rules']:
                if original_field.get(prop) != new_field.get(prop):
                    raise serializers.ValidationError(
                        f"Cannot modify field '{field_name}' properties in existing schema. Only field reordering is allowed."
                    )
        
        return value

class FormEntrySerializer(serializers.ModelSerializer):
    """Serializer for FormEntry model"""
    employee = UserSerializer(read_only=True)
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    form_schema_name = serializers.CharField(source='form_schema.name', read_only=True)
    form_schema_details = DynamicFormSchemaSerializer(source='form_schema', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    tat_duration_hours = serializers.SerializerMethodField()
    tat_limit_hours = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    is_out_of_tat = serializers.SerializerMethodField()
    filtered_form_data = serializers.SerializerMethodField()
    display_case_id = serializers.SerializerMethodField()
    entry_id = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = FormEntry
        fields = [
            'id', 'entry_id', 'case_id', 'display_case_id', 'employee', 'organization_name', 'employee_name', 'form_schema_name',
            'form_schema_details', 'form_data', 'filtered_form_data', 'is_completed', 'is_verified',
            'verification_notes', 'verified_by_name', 'tat_start_time', 'tat_completion_time', 'tat_duration_hours',
            'tat_limit_hours', 'is_out_of_tat', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'entry_id', 'case_id', 'created_at', 'updated_at']
    
    def get_display_case_id(self, obj):
        """Get properly formatted case ID for display"""
        return obj.case_id if obj.case_id is not None else "N/A"
    
    def get_filtered_form_data(self, obj):
        """Get form data filtered to only include schema-defined fields"""
        if not obj.form_data or not obj.form_schema:
            return obj.form_data
        
        # Get schema field names
        schema_fields = set()
        if obj.form_schema.fields_definition:
            for field in obj.form_schema.fields_definition:
                if isinstance(field, dict) and 'name' in field:
                    schema_fields.add(field['name'])
        
        # Filter form_data to only include schema-defined fields
        filtered_data = {}
        for key, value in obj.form_data.items():
            if key in schema_fields:
                # Check if this is a file ID (UUID format)
                if isinstance(value, str) and len(value) == 36 and '-' in value:
                    # This might be a file ID, try to get the S3 URL
                    from forms.models import FormFieldFile
                    try:
                        field_file = FormFieldFile.objects.get(id=value, form_entry=obj)
                        # Use stored S3 URL if available, otherwise use file URL
                        file_url = field_file.s3_url or field_file.file.url if field_file.file else None
                        if file_url:
                            filtered_data[key] = file_url
                        else:
                            # Keep the file ID if no URL found
                            filtered_data[key] = value
                    except FormFieldFile.DoesNotExist:
                        # Not a file ID, keep the original value
                        filtered_data[key] = value
                else:
                    # Regular value, keep as is
                    filtered_data[key] = value
        
        # Add file URLs for file fields that might not be in form_data
        from forms.models import FormFieldFile
        form_field_files = FormFieldFile.objects.filter(form_entry=obj)
        for field_file in form_field_files:
            if field_file.field_name in schema_fields and field_file.field_name not in filtered_data:
                # Use stored S3 URL if available, otherwise use file URL
                file_url = field_file.s3_url or field_file.file.url if field_file.file else None
                if file_url:
                    filtered_data[field_file.field_name] = file_url
        
        return filtered_data
    
    def get_tat_duration_hours(self, obj):
        """Get TAT duration in hours"""
        if obj.tat_duration:
            return round(obj.tat_duration, 2)
        return None
    
    def get_tat_limit_hours(self, obj):
        """Get the schema-specific TAT limit in hours"""
        return obj.form_schema.tat_hours_limit if obj.form_schema.tat_hours_limit else 24
    
    def get_status(self, obj):
        """Get real-time status based on completion and verification"""
        if obj.is_verified:
            return 'verified'
        elif obj.is_completed:
            return 'completed'
        else:
            return 'pending'
    
    def get_is_out_of_tat(self, obj):
        """Check if entry is out of TAT using schema-specific limit"""
        return obj.is_out_of_tat

class FormEntryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating FormEntry"""
    
    # Make employee and organization optional for creation
    employee = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all(), required=False)
    case_id = serializers.IntegerField(required=False, read_only=True)  # Add case_id field
    entry_id = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = FormEntry
        fields = [
            'id', 'entry_id', 'case_id', 'form_schema', 'form_data', 'employee', 'organization'
        ]
        read_only_fields = ['id', 'entry_id']
    
    def validate(self, data):
        """Validate form entry creation data"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"🔍 Validating form entry data: {data}")
        
        # Check if form_schema exists and is active
        form_schema = data.get('form_schema')
        if not form_schema:
            raise serializers.ValidationError("form_schema is required")
        
        if not form_schema.is_active:
            raise serializers.ValidationError("Form schema is not active")
        
        logger.info(f"✅ Form schema validation passed: {form_schema.id}")
        
        # Validate form_data structure
        form_data = data.get('form_data', {})
        if not isinstance(form_data, dict):
            raise serializers.ValidationError("form_data must be a dictionary")
        
        logger.info(f"✅ Form data validation passed: {form_data}")
        
        return data

class FormEntryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating FormEntry"""
    
    class Meta:
        model = FormEntry
        fields = [
            'form_data', 'is_completed', 'is_verified', 'verification_notes'
        ]

class FormFieldSerializer(serializers.ModelSerializer):
    """Serializer for FormField model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = FormField
        fields = [
            'id', 'name', 'display_name', 'field_type', 'is_required',
            'is_active', 'order', 'validation_rules', 'organization',
            'organization_name', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class FormFieldCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating FormField"""
    
    class Meta:
        model = FormField
        fields = [
            'name', 'display_name', 'field_type', 'is_required',
            'is_active', 'order', 'validation_rules', 'organization'
        ]

class FileAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for FileAttachment model"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = FileAttachment
        fields = [
            'id', 'form_entry', 'file', 'file_url', 'original_filename',
            'file_type', 'file_size', 'file_size_mb', 'description',
            'is_verified', 'verification_notes', 'uploaded_by',
            'uploaded_by_name', 'verified_by', 'verified_by_name',
            'verified_at', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at']
    
    def get_file_url(self, obj):
        """Get the file URL"""
        if obj.file:
            return obj.file.url
        return None
    
    def get_file_size_mb(self, obj):
        """Get file size in MB"""
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return None

class FileAttachmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating FileAttachment"""
    
    class Meta:
        model = FileAttachment
        fields = [
            'form_entry', 'file', 'original_filename', 'file_type', 'file_size',
            'description', 'uploaded_by'
        ]
        read_only_fields = ['uploaded_by']

class FileAttachmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating FileAttachment"""
    
    class Meta:
        model = FileAttachment
        fields = [
            'description', 'is_verified', 'verification_notes'
        ]

class FormSchemaStatisticsSerializer(serializers.Serializer):
    """Serializer for form schema statistics"""
    total_schemas = serializers.IntegerField()
    active_schemas = serializers.IntegerField()
    total_entries = serializers.IntegerField()
    completed_entries = serializers.IntegerField()
    verified_entries = serializers.IntegerField()
    average_completion_time = serializers.FloatField()
    recent_schemas = DynamicFormSchemaSerializer(many=True) 

class FormFieldFileSerializer(serializers.ModelSerializer):
    """Serializer for FormFieldFile model"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = FormFieldFile
        fields = [
            'id', 'form_entry', 'field_name', 'file', 'file_url', 's3_url', 'original_filename',
            'file_type', 'file_size', 'file_size_mb', 'description', 'is_temporary',
            'is_verified', 'verification_notes', 'uploaded_by',
            'uploaded_by_name', 'verified_by', 'verified_by_name',
            'verified_at', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at']
    
    def get_file_url(self, obj):
        """Get the file URL"""
        # First try to use the stored S3 URL
        if obj.s3_url:
            return obj.s3_url
        # Fallback to the file field URL
        if obj.file:
            return obj.file.url
        return None
    
    def get_file_size_mb(self, obj):
        """Get file size in MB"""
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return None

class FormFieldFileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating FormFieldFile"""
    
    class Meta:
        model = FormFieldFile
        fields = [
            'form_entry', 'field_name', 'file', 'original_filename', 'file_type',
            'file_size', 'description', 'uploaded_by', 'is_temporary'
        ]
        read_only_fields = ['uploaded_by']
    
    def validate_form_entry(self, value):
        """Handle cases where form_entry is sent as 'undefined' string"""
        if value == "undefined" or value == "null":
            return None
        return value
    
    def create(self, validated_data):
        """Create a new FormFieldFile with uploaded_by set from request user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['uploaded_by'] = request.user
        
        # Set is_temporary to True by default for new uploads
        if 'is_temporary' not in validated_data:
            validated_data['is_temporary'] = True
            
        return super().create(validated_data)

class FormFieldFileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating FormFieldFile"""
    
    class Meta:
        model = FormFieldFile
        fields = [
            'description', 'is_verified', 'verification_notes'
        ] 