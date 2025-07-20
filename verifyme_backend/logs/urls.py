from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'logs', AuditLogViewSet, basename='audit-log')

app_name = 'logs'

urlpatterns = [
    # Include router URLs
    path('api/', include(router.urls)),
    
    # Log endpoints
    path('api/logs/statistics/', AuditLogViewSet.as_view({'get': 'statistics'}), name='log-statistics'),
    path('api/logs/employee-analytics/', AuditLogViewSet.as_view({'get': 'employee_analytics'}), name='employee-analytics'),
] 