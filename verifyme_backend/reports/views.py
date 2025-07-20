from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q, Avg, Sum
from django.utils import timezone
from datetime import timedelta
import json
import os

from .models import Report, Export, Analytics, Dashboard
from .serializers import (
    ReportSerializer,
    ReportCreateSerializer,
    ReportUpdateSerializer,
    ExportSerializer,
    ExportCreateSerializer,
    AnalyticsSerializer,
    AnalyticsCreateSerializer,
    DashboardSerializer,
    DashboardCreateSerializer,
    DashboardUpdateSerializer,
    ReportStatisticsSerializer,
    ExportStatisticsSerializer,
    AnalyticsStatisticsSerializer,
    DashboardStatisticsSerializer
)
from accounts.permissions import IsOrganizationAdmin
from utils.storage import S3FileManager


class ReportViewSet(viewsets.ModelViewSet):
    """ViewSet for Report management"""
    
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['report_type', 'format', 'is_scheduled', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'last_generated']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ReportCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ReportUpdateSerializer
        return ReportSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['destroy']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return Report.objects.all()
        elif user.role == 'ADMIN':
            return Report.objects.filter(organization=user.organization)
        else:
            # Employees can only see public reports in their organization
            return Report.objects.filter(
                organization=user.organization,
                is_active=True
            )
    
    def perform_create(self, serializer):
        """Set organization and created_by for new reports"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can create reports for any organization
            pass
        elif user.role == 'ADMIN':
            # Admin can only create reports in their organization
            serializer.save(
                organization=user.organization,
                created_by=user
            )
            return
        
        serializer.save(created_by=user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get report statistics"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            total_reports = Report.objects.count()
            active_reports = Report.objects.filter(is_active=True).count()
            scheduled_reports = Report.objects.filter(is_scheduled=True).count()
            overdue_reports = Report.objects.filter(is_scheduled=True, is_active=True).filter(
                next_generation__lt=timezone.now()
            ).count()
            recent_reports = Report.objects.order_by('-created_at')[:5]
            
        else:
            org = user.organization
            total_reports = Report.objects.filter(organization=org).count()
            active_reports = Report.objects.filter(organization=org, is_active=True).count()
            scheduled_reports = Report.objects.filter(organization=org, is_scheduled=True).count()
            overdue_reports = Report.objects.filter(
                organization=org,
                is_scheduled=True,
                is_active=True
            ).filter(next_generation__lt=timezone.now()).count()
            recent_reports = Report.objects.filter(organization=org).order_by('-created_at')[:5]
        
        # Get report type distribution
        report_type_stats = Report.objects.values('report_type').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        data = {
            'total_reports': total_reports,
            'active_reports': active_reports,
            'scheduled_reports': scheduled_reports,
            'overdue_reports': overdue_reports,
            'recent_reports': ReportSerializer(recent_reports, many=True, context={'request': request}).data,
            'report_type_distribution': list(report_type_stats)
        }
        
        serializer = ReportStatisticsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Generate a report"""
        report = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot generate reports'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'ADMIN' and report.organization != user.organization:
            return Response(
                {'error': 'You can only generate reports for your organization'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create export for this report
        export = Export.objects.create(
            export_type='CUSTOM',
            format=report.format,
            organization=report.organization,
            created_by=user,
            filters=report.parameters
        )
        
        # Start processing (in a real app, this would be a background task)
        export.start_processing()
        
        # For now, just mark as completed
        export.complete_processing()
        
        return Response({
            'message': 'Report generation started',
            'export_id': export.id
        })
    
    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Schedule a report"""
        report = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot schedule reports'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'ADMIN' and report.organization != user.organization:
            return Response(
                {'error': 'You can only schedule reports for your organization'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        schedule_cron = request.data.get('schedule_cron')
        if not schedule_cron:
            return Response(
                {'error': 'schedule_cron is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        report.is_scheduled = True
        report.schedule_cron = schedule_cron
        report.save()
        
        return Response({
            'message': 'Report scheduled successfully',
            'schedule_cron': schedule_cron
        })


class ExportViewSet(viewsets.ModelViewSet):
    """ViewSet for Export management"""
    
    queryset = Export.objects.all()
    serializer_class = ExportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['export_type', 'format', 'status', 'created_by']
    search_fields = ['file_name', 'error_message']
    ordering_fields = ['created_at', 'completed_at', 'file_size']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ExportCreateSerializer
        return ExportSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return Export.objects.all()
        elif user.role == 'ADMIN':
            return Export.objects.filter(organization=user.organization)
        else:
            return Export.objects.filter(created_by=user)
    
    def perform_create(self, serializer):
        """Set organization and created_by for new exports"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can create exports for any organization
            pass
        elif user.role == 'ADMIN':
            # Admin can only create exports in their organization
            serializer.save(
                organization=user.organization,
                created_by=user
            )
            return
        
        serializer.save(created_by=user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get export statistics"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            total_exports = Export.objects.count()
            completed_exports = Export.objects.filter(status='COMPLETED').count()
            failed_exports = Export.objects.filter(status='FAILED').count()
            pending_exports = Export.objects.filter(status='PENDING').count()
            total_file_size = Export.objects.filter(status='COMPLETED').aggregate(
                total_size=Sum('file_size')
            )['total_size'] or 0
            recent_exports = Export.objects.order_by('-created_at')[:10]
            
        else:
            org = user.organization
            total_exports = Export.objects.filter(organization=org).count()
            completed_exports = Export.objects.filter(organization=org, status='COMPLETED').count()
            failed_exports = Export.objects.filter(organization=org, status='FAILED').count()
            pending_exports = Export.objects.filter(organization=org, status='PENDING').count()
            total_file_size = Export.objects.filter(
                organization=org,
                status='COMPLETED'
            ).aggregate(total_size=Sum('file_size'))['total_size'] or 0
            recent_exports = Export.objects.filter(organization=org).order_by('-created_at')[:10]
        
        # Calculate average export time
        completed_exports_with_time = Export.objects.filter(status='COMPLETED')
        total_duration = timedelta()
        count_with_time = 0
        
        for export in completed_exports_with_time:
            if export.duration:
                total_duration += export.duration
                count_with_time += 1
        
        avg_export_time = total_duration.total_seconds() / count_with_time if count_with_time > 0 else 0
        
        # Get export type distribution
        export_type_stats = Export.objects.values('export_type').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        data = {
            'total_exports': total_exports,
            'completed_exports': completed_exports,
            'failed_exports': failed_exports,
            'pending_exports': pending_exports,
            'total_file_size_mb': round(total_file_size / (1024 * 1024), 2),
            'average_export_time': round(avg_export_time, 2),
            'recent_exports': ExportSerializer(recent_exports, many=True, context={'request': request}).data,
            'export_type_distribution': list(export_type_stats)
        }
        
        serializer = ExportStatisticsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        """Get download URL for completed export"""
        export = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role == 'EMPLOYEE' and export.created_by != user:
            return Response(
                {'error': 'You can only download your own exports'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'ADMIN' and export.organization != user.organization:
            return Response(
                {'error': 'You can only download exports from your organization'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if export.status != 'COMPLETED':
            return Response(
                {'error': 'Export is not completed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not export.file_path:
            return Response(
                {'error': 'Export file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate presigned URL for S3 file
        download_url = S3FileManager.get_presigned_url(export.file_path, expiration=3600)
        
        return Response({
            'download_url': download_url,
            'file_name': export.file_name,
            'file_size': export.file_size,
            'expires_in': 3600
        })


class AnalyticsViewSet(viewsets.ModelViewSet):
    """ViewSet for Analytics management"""
    
    queryset = Analytics.objects.all()
    serializer_class = AnalyticsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['analytics_type', 'organization']
    search_fields = ['analytics_type']
    ordering_fields = ['period_start', 'period_end', 'created_at']
    ordering = ['-period_start']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return AnalyticsCreateSerializer
        return AnalyticsSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return Analytics.objects.all()
        elif user.role == 'ADMIN':
            return Analytics.objects.filter(organization=user.organization)
        else:
            # Employees can only see public analytics
            return Analytics.objects.filter(
                organization=user.organization
            )
    
    def perform_create(self, serializer):
        """Set organization for new analytics"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can create analytics for any organization
            pass
        elif user.role == 'ADMIN':
            # Admin can only create analytics in their organization
            serializer.save(organization=user.organization)
            return
        
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get analytics statistics"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            total_analytics = Analytics.objects.count()
            recent_analytics = Analytics.objects.order_by('-created_at')[:10]
            
        else:
            org = user.organization
            total_analytics = Analytics.objects.filter(organization=org).count()
            recent_analytics = Analytics.objects.filter(organization=org).order_by('-created_at')[:10]
        
        # Calculate average success and error rates
        analytics_data = Analytics.objects.all()
        total_success_rate = 0
        total_error_rate = 0
        count = 0
        
        for analytics in analytics_data:
            if analytics.success_rate is not None:
                total_success_rate += analytics.success_rate
                count += 1
            if analytics.error_rate is not None:
                total_error_rate += analytics.error_rate
        
        avg_success_rate = total_success_rate / count if count > 0 else 0
        avg_error_rate = total_error_rate / count if count > 0 else 0
        
        # Get analytics type distribution
        analytics_type_stats = Analytics.objects.values('analytics_type').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        data = {
            'total_analytics': total_analytics,
            'average_success_rate': round(avg_success_rate, 2),
            'average_error_rate': round(avg_error_rate, 2),
            'recent_analytics': AnalyticsSerializer(recent_analytics, many=True, context={'request': request}).data,
            'analytics_type_distribution': list(analytics_type_stats)
        }
        
        serializer = AnalyticsStatisticsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate analytics for a specific period"""
        user = self.request.user

        # Check permissions
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot generate analytics'},
                status=status.HTTP_403_FORBIDDEN
            )

        analytics_type = request.data.get('analytics_type')
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')

        if not all([analytics_type, period_start, period_end]):
            return Response(
                {'error': 'analytics_type, period_start, and period_end are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create analytics entry
        if user.role == 'SUPER_ADMIN':
            analytics = Analytics.objects.create(
                analytics_type=analytics_type,
                period_start=period_start,
                period_end=period_end,
                organization=None,  # System-wide analytics
                data={}  # Will be populated by background task
            )
        else:
            analytics = Analytics.objects.create(
                analytics_type=analytics_type,
                period_start=period_start,
                period_end=period_end,
                organization=user.organization,
                data={}  # Will be populated by background task
            )

        return Response({
            'message': 'Analytics generation started',
            'analytics_id': analytics.id
        })


class DashboardViewSet(viewsets.ModelViewSet):
    """ViewSet for Dashboard management"""
    
    queryset = Dashboard.objects.all()
    serializer_class = DashboardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_public', 'is_active', 'is_default']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return DashboardCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DashboardUpdateSerializer
        return DashboardSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return Dashboard.objects.all()
        elif user.role == 'ADMIN':
            return Dashboard.objects.filter(organization=user.organization)
        else:
            # Employees can only see public dashboards
            return Dashboard.objects.filter(
                organization=user.organization,
                is_public=True,
                is_active=True
            )
    
    def perform_create(self, serializer):
        """Set organization and created_by for new dashboards"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can create dashboards for any organization
            pass
        elif user.role == 'ADMIN':
            # Admin can only create dashboards in their organization
            serializer.save(
                organization=user.organization,
                created_by=user
            )
            return
        
        serializer.save(created_by=user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get dashboard statistics"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            total_dashboards = Dashboard.objects.count()
            public_dashboards = Dashboard.objects.filter(is_public=True).count()
            active_dashboards = Dashboard.objects.filter(is_active=True).count()
            default_dashboards = Dashboard.objects.filter(is_default=True).count()
            recent_dashboards = Dashboard.objects.order_by('-created_at')[:5]
            
        else:
            org = user.organization
            total_dashboards = Dashboard.objects.filter(organization=org).count()
            public_dashboards = Dashboard.objects.filter(organization=org, is_public=True).count()
            active_dashboards = Dashboard.objects.filter(organization=org, is_active=True).count()
            default_dashboards = Dashboard.objects.filter(organization=org, is_default=True).count()
            recent_dashboards = Dashboard.objects.filter(organization=org).order_by('-created_at')[:5]
        
        data = {
            'total_dashboards': total_dashboards,
            'public_dashboards': public_dashboards,
            'active_dashboards': active_dashboards,
            'default_dashboards': default_dashboards,
            'recent_dashboards': DashboardSerializer(recent_dashboards, many=True, context={'request': request}).data
        }
        
        serializer = DashboardStatisticsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set dashboard as default for organization"""
        dashboard = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot set default dashboards'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'ADMIN' and dashboard.organization != user.organization:
            return Response(
                {'error': 'You can only set default dashboards for your organization'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Remove default from other dashboards in organization
        Dashboard.objects.filter(
            organization=dashboard.organization,
            is_default=True
        ).update(is_default=False)
        
        # Set this dashboard as default
        dashboard.is_default = True
        dashboard.save()
        
        return Response({
            'message': 'Dashboard set as default successfully'
        })
