from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import AuditLog
from .serializers import AuditLogSerializer, AuditLogStatisticsSerializer
from accounts.permissions import IsOrganizationAdmin

class AuditLogViewSet(viewsets.ModelViewSet):
    """ViewSet for AuditLog management"""
    
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'user', 'organization']
    search_fields = ['action', 'details']
    ordering_fields = ['timestamp', 'action']
    ordering = ['-timestamp']
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all logs
            return AuditLog.objects.all()
        elif user.role == 'ADMIN':
            # Admin can see logs in their organization
            return AuditLog.objects.filter(organization=user.organization)
        else:
            # Employees can only see their own logs
            return AuditLog.objects.filter(user=user)
    
    def perform_create(self, serializer):
        """Set user and organization for new logs"""
        user = self.request.user
        serializer.save(
            user=user,
            organization=user.organization
        )
    
    @action(detail=False, methods=['get'], url_path='employee-analytics')
    def employee_analytics(self, request):
        """Get employee activity analytics for real-time dashboard"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin gets all statistics
            # Count actual employees (not just audit logs)
            from accounts.models import User
            employees_created_total = User.objects.filter(role='EMPLOYEE').count()
            
            # Login activities (all time)
            login_activities_total = AuditLog.objects.filter(
                action='LOGIN'
            ).count()
            
            # Logout activities (all time)
            logout_activities_total = AuditLog.objects.filter(
                action='LOGOUT'
            ).count()
            
            # Total unique users who have logged in
            unique_users_total = AuditLog.objects.filter(
                action='LOGIN'
            ).values('user').distinct().count()
            
            # Recent employee activities (last 10)
            recent_activities = AuditLog.objects.filter(
                action__in=['LOGIN', 'LOGOUT', 'USER_CREATE']
            ).select_related('user', 'organization').order_by('-timestamp')[:10]
            
        else:
            # Admin/Employee gets organization-specific statistics
            org = user.organization
            
            # Count actual employees in the organization
            from accounts.models import User
            employees_created_total = User.objects.filter(
                organization=org,
                role='EMPLOYEE'
            ).count()
            
            # Login activities (all time)
            login_activities_total = AuditLog.objects.filter(
                organization=org,
                action='LOGIN'
            ).count()
            
            # Logout activities (all time)
            logout_activities_total = AuditLog.objects.filter(
                organization=org,
                action='LOGOUT'
            ).count()
            
            # Total unique users who have logged in
            unique_users_total = AuditLog.objects.filter(
                organization=org,
                action='LOGIN'
            ).values('user').distinct().count()
            
            # Recent employee activities (last 10)
            recent_activities = AuditLog.objects.filter(
                organization=org,
                action__in=['LOGIN', 'LOGOUT', 'USER_CREATE']
            ).select_related('user', 'organization').order_by('-timestamp')[:10]
        
        data = {
            'employees_created_total': employees_created_total,
            'login_activities_total': login_activities_total,
            'logout_activities_total': logout_activities_total,
            'unique_users_total': unique_users_total,
            'total_activities_total': login_activities_total + logout_activities_total,
            'recent_activities': AuditLogSerializer(recent_activities, many=True, context={'request': request}).data
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get audit log statistics"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin gets all statistics
            total_logs = AuditLog.objects.count()
            today_logs = AuditLog.objects.filter(
                timestamp__date=timezone.now().date()
            ).count()
            this_week_logs = AuditLog.objects.filter(
                timestamp__gte=timezone.now() - timedelta(days=7)
            ).count()
            this_month_logs = AuditLog.objects.filter(
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            # Action breakdown
            action_stats = AuditLog.objects.values('action').annotate(
                count=Count('id')
            ).order_by('-count')[:5]
            
            # Recent logs
            recent_logs = AuditLog.objects.order_by('-timestamp')[:10]
            
        else:
            # Admin/Employee gets organization-specific statistics
            org = user.organization
            total_logs = AuditLog.objects.filter(organization=org).count()
            today_logs = AuditLog.objects.filter(
                organization=org,
                timestamp__date=timezone.now().date()
            ).count()
            this_week_logs = AuditLog.objects.filter(
                organization=org,
                timestamp__gte=timezone.now() - timedelta(days=7)
            ).count()
            this_month_logs = AuditLog.objects.filter(
                organization=org,
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            # Action breakdown for organization
            action_stats = AuditLog.objects.filter(
                organization=org
            ).values('action').annotate(
                count=Count('id')
            ).order_by('-count')[:5]
            
            # Recent logs for organization
            recent_logs = AuditLog.objects.filter(
                organization=org
            ).order_by('-timestamp')[:10]
        
        data = {
            'total_logs': total_logs,
            'today_logs': today_logs,
            'this_week_logs': this_week_logs,
            'this_month_logs': this_month_logs,
            'action_breakdown': list(action_stats),
            'recent_logs': AuditLogSerializer(recent_logs, many=True, context={'request': request}).data
        }
        
        serializer = AuditLogStatisticsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_logs(self, request):
        """Get current user's audit logs"""
        user = request.user
        logs = AuditLog.objects.filter(user=user)
        
        # Apply filters from query parameters
        filters = request.query_params
        
        if filters.get('action'):
            logs = logs.filter(action=filters['action'])
        
        if filters.get('start_date'):
            logs = logs.filter(timestamp__gte=filters['start_date'])
        
        if filters.get('end_date'):
            logs = logs.filter(timestamp__lte=filters['end_date'])
        
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)
