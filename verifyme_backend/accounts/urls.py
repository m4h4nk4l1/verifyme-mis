from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, UserViewSet, CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView

# Create router and register viewsets
router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')
# Removed UserViewSet from router to avoid conflicts with custom endpoints

app_name = 'accounts'

urlpatterns = [
    # Include router URLs
    path('api/', include(router.urls)),
    
    # Authentication endpoints (frontend expects these)
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    
    # Alternative auth endpoints (for compatibility)
    path('api/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_alt'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout_alt'),
    
    # User management endpoints
    path('api/users/', UserViewSet.as_view({'get': 'list', 'post': 'create'}), name='user-list'),
    path('api/users/<uuid:pk>/', UserViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='user-detail'),
    path('api/users/profile/', UserViewSet.as_view({'get': 'profile'}), name='user-profile'),
    path('api/users/organization-users/', UserViewSet.as_view({'get': 'organization_users'}), name='organization-users'),
    path('api/users/employees/', UserViewSet.as_view({'get': 'employees'}), name='employees'),
    path('api/users/create-employee/', UserViewSet.as_view({'post': 'create_employee'}), name='create-employee'),
    path('api/users/<uuid:pk>/update-employee/', UserViewSet.as_view({'put': 'update_employee', 'patch': 'update_employee'}), name='update-employee'),
    path('api/users/<uuid:pk>/delete-employee/', UserViewSet.as_view({'delete': 'delete_employee'}), name='delete-employee'),
    path('api/users/<uuid:pk>/activate-employee/', UserViewSet.as_view({'post': 'activate_employee'}), name='activate-employee'),
    path('api/users/analytics/', UserViewSet.as_view({'get': 'analytics'}), name='analytics'),
    path('api/users/audit-logs/', UserViewSet.as_view({'get': 'audit_logs'}), name='audit-logs'),
    path('api/users/real-time-analytics/', UserViewSet.as_view({'get': 'real_time_analytics'}), name='real-time-analytics'),
] 