from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, ExportViewSet, AnalyticsViewSet, DashboardViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'exports', ExportViewSet, basename='export')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'dashboards', DashboardViewSet, basename='dashboard')

app_name = 'reports'

urlpatterns = [
    # Include router URLs
    path('api/', include(router.urls)),
    
    # Report endpoints
    path('api/reports/statistics/', ReportViewSet.as_view({'get': 'statistics'}), name='report-statistics'),
    path('api/reports/<int:pk>/generate/', ReportViewSet.as_view({'post': 'generate'}), name='report-generate'),
    path('api/reports/<int:pk>/schedule/', ReportViewSet.as_view({'post': 'schedule'}), name='report-schedule'),
    
    # Export endpoints
    path('api/exports/statistics/', ExportViewSet.as_view({'get': 'statistics'}), name='export-statistics'),
    path('api/exports/<int:pk>/download/', ExportViewSet.as_view({'post': 'download'}), name='export-download'),
    
    # Analytics endpoints
    path('api/analytics/statistics/', AnalyticsViewSet.as_view({'get': 'statistics'}), name='analytics-statistics'),
    path('api/analytics/generate/', AnalyticsViewSet.as_view({'post': 'generate'}), name='analytics-generate'),
    
    # Dashboard endpoints
    path('api/dashboards/statistics/', DashboardViewSet.as_view({'get': 'statistics'}), name='dashboard-statistics'),
    path('api/dashboards/<int:pk>/set-default/', DashboardViewSet.as_view({'post': 'set_default'}), name='dashboard-set-default'),
] 