from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    organization_name = serializers.CharField(source='organization.display_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'action', 'details',
            'user', 'user_name', 'user_email', 'organization', 'organization_name',
            'timestamp', 'ip_address', 'user_agent'
        ]
        read_only_fields = ['id', 'timestamp', 'ip_address', 'user_agent']

class AuditLogStatisticsSerializer(serializers.Serializer):
    """Serializer for audit log statistics"""
    total_logs = serializers.IntegerField()
    today_logs = serializers.IntegerField()
    this_week_logs = serializers.IntegerField()
    this_month_logs = serializers.IntegerField()
    action_breakdown = serializers.ListField()
    recent_logs = AuditLogSerializer(many=True) 