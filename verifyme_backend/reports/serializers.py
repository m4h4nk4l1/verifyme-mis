from rest_framework import serializers
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta

from .models import Report, Export, Analytics, Dashboard
from accounts.serializers import UserSerializer, OrganizationSerializer


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for Report model"""
    
    organization = OrganizationSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    is_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = Report
        fields = [
            'id', 'name', 'description', 'report_type', 'format',
            'organization', 'parameters', 'is_scheduled', 'schedule_cron',
            'last_generated', 'next_generation', 'is_active', 'include_attachments',
            'created_at', 'updated_at', 'created_by', 'is_overdue'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_overdue']


class ReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reports"""
    
    class Meta:
        model = Report
        fields = [
            'name', 'description', 'report_type', 'format', 'parameters',
            'is_scheduled', 'schedule_cron', 'is_active', 'include_attachments'
        ]
    
    def validate_name(self, value):
        """Validate report name uniqueness within organization"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            existing_reports = Report.objects.filter(
                organization=user.organization,
                name=value,
                is_active=True
            )
            if self.instance:
                existing_reports = existing_reports.exclude(id=self.instance.id)
            
            if existing_reports.exists():
                raise serializers.ValidationError(
                    f"Report name '{value}' already exists in your organization."
                )
        return value
    
    def create(self, validated_data):
        """Create report with organization and user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['organization'] = request.user.organization
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ReportUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating reports"""
    
    class Meta:
        model = Report
        fields = [
            'name', 'description', 'report_type', 'format', 'parameters',
            'is_scheduled', 'schedule_cron', 'is_active', 'include_attachments'
        ]


class ExportSerializer(serializers.ModelSerializer):
    """Serializer for Export model"""
    
    organization = OrganizationSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    duration = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    is_failed = serializers.ReadOnlyField()
    
    class Meta:
        model = Export
        fields = [
            'id', 'export_type', 'format', 'organization', 'created_by',
            'filters', 'file_path', 'file_size', 'file_name', 'status',
            'progress', 'total_records', 'processed_records', 'error_message',
            'error_details', 'started_at', 'completed_at', 'created_at',
            'duration', 'is_completed', 'is_failed'
        ]
        read_only_fields = [
            'id', 'file_path', 'file_size', 'file_name', 'status', 'progress',
            'total_records', 'processed_records', 'error_message', 'error_details',
            'started_at', 'completed_at', 'created_at', 'duration', 'is_completed', 'is_failed'
        ]


class ExportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating exports"""
    
    class Meta:
        model = Export
        fields = ['export_type', 'format', 'filters']
    
    def create(self, validated_data):
        """Create export with organization and user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['organization'] = request.user.organization
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class AnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for Analytics model"""
    
    organization = OrganizationSerializer(read_only=True)
    success_rate = serializers.ReadOnlyField()
    error_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = Analytics
        fields = [
            'id', 'analytics_type', 'period_start', 'period_end', 'organization',
            'data', 'total_count', 'success_count', 'error_count',
            'created_at', 'updated_at', 'success_rate', 'error_rate'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'success_rate', 'error_rate']


class AnalyticsCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating analytics"""
    
    class Meta:
        model = Analytics
        fields = ['analytics_type', 'period_start', 'period_end', 'data']
    
    def create(self, validated_data):
        """Create analytics with organization"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['organization'] = request.user.organization
        return super().create(validated_data)


class DashboardSerializer(serializers.ModelSerializer):
    """Serializer for Dashboard model"""
    
    organization = OrganizationSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Dashboard
        fields = [
            'id', 'name', 'description', 'organization', 'configuration',
            'is_public', 'allowed_roles', 'is_active', 'is_default',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DashboardCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating dashboards"""
    
    class Meta:
        model = Dashboard
        fields = ['name', 'description', 'configuration', 'is_public', 'allowed_roles', 'is_active', 'is_default']
    
    def validate_name(self, value):
        """Validate dashboard name uniqueness within organization"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            existing_dashboards = Dashboard.objects.filter(
                organization=user.organization,
                name=value,
                is_active=True
            )
            if self.instance:
                existing_dashboards = existing_dashboards.exclude(id=self.instance.id)
            
            if existing_dashboards.exists():
                raise serializers.ValidationError(
                    f"Dashboard name '{value}' already exists in your organization."
                )
        return value
    
    def create(self, validated_data):
        """Create dashboard with organization and user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['organization'] = request.user.organization
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class DashboardUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating dashboards"""
    
    class Meta:
        model = Dashboard
        fields = ['name', 'description', 'configuration', 'is_public', 'allowed_roles', 'is_active', 'is_default']


class ReportStatisticsSerializer(serializers.Serializer):
    """Serializer for report statistics"""
    
    total_reports = serializers.IntegerField()
    active_reports = serializers.IntegerField()
    scheduled_reports = serializers.IntegerField()
    overdue_reports = serializers.IntegerField()
    recent_reports = ReportSerializer(many=True)
    report_type_distribution = serializers.ListField()


class ExportStatisticsSerializer(serializers.Serializer):
    """Serializer for export statistics"""
    
    total_exports = serializers.IntegerField()
    completed_exports = serializers.IntegerField()
    failed_exports = serializers.IntegerField()
    pending_exports = serializers.IntegerField()
    total_file_size_mb = serializers.FloatField()
    average_export_time = serializers.FloatField()
    recent_exports = ExportSerializer(many=True)
    export_type_distribution = serializers.ListField()


class AnalyticsStatisticsSerializer(serializers.Serializer):
    """Serializer for analytics statistics"""
    
    total_analytics = serializers.IntegerField()
    average_success_rate = serializers.FloatField()
    average_error_rate = serializers.FloatField()
    recent_analytics = AnalyticsSerializer(many=True)
    analytics_type_distribution = serializers.ListField()


class DashboardStatisticsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    
    total_dashboards = serializers.IntegerField()
    public_dashboards = serializers.IntegerField()
    active_dashboards = serializers.IntegerField()
    default_dashboards = serializers.IntegerField()
    recent_dashboards = DashboardSerializer(many=True) 