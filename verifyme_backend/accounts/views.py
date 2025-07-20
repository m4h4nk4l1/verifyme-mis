from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework import exceptions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.contrib.auth import get_user_model

from .models import Organization, UserProfile
from .serializers import (
    OrganizationSerializer, 
    OrganizationCreateSerializer,
    OrganizationUpdateSerializer,
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserProfileSerializer,
    EmployeeCreateSerializer,
    EmployeeUpdateSerializer
)
from .permissions import IsSuperAdmin, IsOrganizationAdmin

User = get_user_model()

class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet for Organization management"""
    
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_type', 'is_active']
    search_fields = ['name', 'display_name', 'email']
    ordering_fields = ['name', 'display_name', 'created_at', 'active_employees_count']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return OrganizationCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return OrganizationUpdateSerializer
        return OrganizationSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy']:
            permission_classes = [IsAuthenticated, IsSuperAdmin]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsSuperAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all organizations
            return Organization.objects.all()
        elif user.role == 'ADMIN':
            # Admin can only see their organization
            return Organization.objects.filter(id=user.organization.id)
        else:
            # Employees can only see their organization
            return Organization.objects.filter(id=user.organization.id)
    
    def perform_create(self, serializer):
        """Set created_by field"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get organization statistics"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin gets all statistics
            total_organizations = Organization.objects.count()
            active_organizations = Organization.objects.filter(is_active=True).count()
            
            # Business type breakdown
            business_type_stats = Organization.objects.values('business_type').annotate(
                count=Count('id')
            ).order_by('business_type')
            
            # Recent organizations
            recent_organizations = Organization.objects.order_by('-created_at')[:5]
            
            return Response({
                'total_organizations': total_organizations,
                'active_organizations': active_organizations,
                'business_type_breakdown': business_type_stats,
                'recent_organizations': OrganizationSerializer(recent_organizations, many=True).data
            })
        
        elif user.role == 'ADMIN':
            # Admin gets their organization stats
            org = user.organization
            total_employees = org.users.filter(role='EMPLOYEE').count()
            active_employees = org.users.filter(role='EMPLOYEE', is_active=True).count()
            
            return Response({
                'organization_name': org.display_name,
                'total_employees': total_employees,
                'active_employees': active_employees,
                'max_employees': org.max_employees,
                'business_type': org.business_type
            })
        
        else:
            # Employee gets basic org info
            org = user.organization
            return Response({
                'organization_name': org.display_name,
                'business_type': org.business_type
            })
    
    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Get employees for an organization"""
        user = request.user
        organization = self.get_object()
        
        # Check permissions
        if user.role == 'SUPER_ADMIN':
            # Super admin can see employees of any organization
            pass
        elif user.role == 'ADMIN':
            # Admin can only see employees of their organization
            if organization.id != user.organization.id:
                return Response(
                    {'error': 'You can only view employees of your organization'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            # Employees cannot view employee lists
            return Response(
                {'error': 'You do not have permission to view employee lists'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        employees = organization.users.filter(role='EMPLOYEE').order_by('-created_at')
        serializer = UserSerializer(employees, many=True)
        
        return Response({
            'organization': organization.display_name,
            'employees': serializer.data,
            'total_count': employees.count(),
            'active_count': employees.filter(is_active=True).count()
        })

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User management"""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active', 'organization']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering_fields = ['email', 'first_name', 'last_name', 'date_joined']
    ordering = ['-date_joined']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'create_employee']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        elif self.action in ['update', 'partial_update', 'update_employee', 'delete_employee', 'activate_employee']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        elif self.action in ['list', 'retrieve']:
            # Allow super admins and organization admins to list/retrieve users
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all users
            return User.objects.all()
        elif user.role == 'ADMIN':
            # Admin can only see users in their organization
            return User.objects.filter(organization=user.organization)
        else:
            # Employees can only see themselves
            return User.objects.filter(id=user.id)
    
    def perform_create(self, serializer):
        """Set organization and created_by for new users"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can create users for any organization
            new_user = serializer.save(created_by=user)
        elif user.role == 'ADMIN':
            # Admin can only create employees in their organization
            new_user = serializer.save(
                organization=user.organization,
                role='EMPLOYEE',
                created_by=user
            )
        else:
            new_user = serializer.save(created_by=user)
        
        # Log the user creation
        from logs.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='USER_CREATE',
            details=f'User {new_user.get_full_name()} ({new_user.email}) created by {user.get_full_name()}',
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            organization=user.organization
        )
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user's profile"""
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def organization_users(self, request):
        """Get users in current user's organization"""
        user = request.user
        
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot view organization users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all users
            users = User.objects.all()
        else:
            # Admin can only see users in their organization
            users = User.objects.filter(organization=user.organization)
        
        # Group by role
        role_stats = users.values('role').annotate(count=Count('id'))
        
        serializer = UserSerializer(users, many=True)
        return Response({
            'users': serializer.data,
            'role_statistics': role_stats,
            'total_count': users.count()
        })
    
    # Employee-specific endpoints
    @action(detail=False, methods=['get'])
    def employees(self, request):
        """Get employees for the current user's organization"""
        user = request.user
        
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot view employee lists'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all employees
            employees = User.objects.filter(role='EMPLOYEE')
        else:
            # Admin can only see employees in their organization
            employees = User.objects.filter(
                organization=user.organization,
                role='EMPLOYEE'
            )
        
        # Apply filters
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            employees = employees.filter(is_active=is_active.lower() == 'true')
        
        # Apply search
        search = request.query_params.get('search')
        if search:
            employees = employees.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )
        
        serializer = UserSerializer(employees, many=True)
        
        return Response({
            'employees': serializer.data,
            'total_count': employees.count(),
            'active_count': employees.filter(is_active=True).count(),
            'inactive_count': employees.filter(is_active=False).count()
        })
    
    @action(detail=False, methods=['post'])
    def create_employee(self, request):
        """Create a new employee (Admin only)"""
        user = request.user
        
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot create other employees'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check organization employee limit
        if user.role == 'ADMIN':
            org = user.organization
            current_employee_count = org.users.filter(role='EMPLOYEE').count()
            if current_employee_count >= org.max_employees:
                return Response(
                    {'error': f'Organization has reached maximum employee limit ({org.max_employees})'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = EmployeeCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Set organization and role for admin users
            if user.role == 'ADMIN':
                employee = serializer.save(
                    organization=user.organization,
                    created_by=user
                )
            else:
                employee = serializer.save(created_by=user)
            
            # Log the employee creation
            from logs.models import AuditLog
            AuditLog.objects.create(
                user=user,
                action='USER_CREATE',
                details=f'Employee {employee.get_full_name()} ({employee.email}) created by {user.get_full_name()}',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                organization=user.organization
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put', 'patch'])
    def update_employee(self, request, pk=None):
        """Update employee details (Admin only)"""
        user = request.user
        employee = self.get_object()
        
        # Check permissions
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot update other employees'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'ADMIN' and employee.organization != user.organization:
            return Response(
                {'error': 'You can only update employees in your organization'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = EmployeeUpdateSerializer(employee, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'])
    def delete_employee(self, request, pk=None):
        """Delete employee (Admin only)"""
        user = request.user
        employee = self.get_object()
        
        # Check permissions
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot delete other employees'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'ADMIN' and employee.organization != user.organization:
            return Response(
                {'error': 'You can only delete employees in your organization'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Soft delete - set is_active to False
        employee.is_active = False
        employee.save()
        
        return Response({'message': 'Employee deactivated successfully'})
    
    @action(detail=True, methods=['post'])
    def activate_employee(self, request, pk=None):
        """Activate employee (Admin only)"""
        user = request.user
        employee = self.get_object()
        
        # Check permissions
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot activate other employees'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'ADMIN' and employee.organization != user.organization:
            return Response(
                {'error': 'You can only activate employees in your organization'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        employee.is_active = True
        employee.save()
        
        return Response({'message': 'Employee activated successfully'})

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get system analytics for Super Admin"""
        user = request.user
        
        if user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can access analytics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get analytics data
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_organizations = Organization.objects.count()
        active_organizations = Organization.objects.filter(is_active=True).count()
        
        # Get recent activity counts
        from datetime import datetime, timedelta
        now = datetime.now()
        this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        new_users_this_month = User.objects.filter(date_joined__gte=this_month).count()
        new_organizations_this_month = Organization.objects.filter(created_at__gte=this_month).count()
        
        # Get role breakdown
        role_stats = User.objects.values('role').annotate(count=Count('id'))
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'total_organizations': total_organizations,
            'active_organizations': active_organizations,
            'new_users_this_month': new_users_this_month,
            'new_organizations_this_month': new_organizations_this_month,
            'role_breakdown': role_stats,
            'system_uptime': 99.9,  # Mock data
            'active_sessions': 8,  # Mock data
            'total_employees': User.objects.filter(role='EMPLOYEE').count(),
            'total_admins': User.objects.filter(role='ADMIN').count(),
            'recent_logins': 15  # Mock data
        })
    
    @action(detail=False, methods=['get'])
    def audit_logs(self, request):
        """Get audit logs for Super Admin"""
        user = request.user
        
        if user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can access audit logs'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Import AuditLog model
        from logs.models import AuditLog
        
        # Get real audit logs
        logs = AuditLog.objects.select_related('user', 'organization').order_by('-timestamp')[:50]
        
        # Convert to response format
        log_data = []
        for log in logs:
            log_data.append({
                'id': str(log.id),
                'user': {
                    'first_name': log.user.first_name if log.user else 'System',
                    'last_name': log.user.last_name if log.user else ''
                },
                'action': log.action,
                'details': log.details,
                'timestamp': log.timestamp.isoformat(),
                'ip_address': log.ip_address,
                'organization': log.organization.display_name if log.organization else None
            })
        
        return Response({
            'results': log_data,
            'total_count': len(log_data)
        })

    @action(detail=False, methods=['get'])
    def real_time_analytics(self, request):
        """Get real-time analytics for Super Admin"""
        user = request.user
        
        if user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can access real-time analytics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from logs.models import AuditLog
        from datetime import datetime, timedelta
        
        # Get current time
        now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Organization statistics
        total_organizations = Organization.objects.count()
        active_organizations = Organization.objects.filter(is_active=True).count()
        
        # User statistics
        total_users = User.objects.count()
        total_employees = User.objects.filter(role='EMPLOYEE').count()
        total_admins = User.objects.filter(role='ADMIN').count()
        total_super_admins = User.objects.filter(role='SUPER_ADMIN').count()
        
        # Today's statistics
        new_organizations_today = Organization.objects.filter(created_at__gte=today).count()
        new_users_today = User.objects.filter(date_joined__gte=today).count()
        
        # Login/Logout statistics
        total_logins = AuditLog.objects.filter(action='LOGIN').count()
        total_logouts = AuditLog.objects.filter(action='LOGOUT').count()
        logins_today = AuditLog.objects.filter(action='LOGIN', timestamp__gte=today).count()
        logouts_today = AuditLog.objects.filter(action='LOGOUT', timestamp__gte=today).count()
        
        # Recent login/logout activities (last 20)
        recent_activities = AuditLog.objects.filter(
            action__in=['LOGIN', 'LOGOUT']
        ).select_related('user', 'organization').order_by('-timestamp')[:20]
        
        # Format recent activities
        formatted_activities = []
        for activity in recent_activities:
            formatted_activities.append({
                'id': str(activity.id),
                'action': activity.action,
                'user_name': f"{activity.user.first_name} {activity.user.last_name}" if activity.user else "Unknown User",
                'user_role': activity.user.role if activity.user else "Unknown",
                'organization_name': activity.organization.name if activity.organization else "System",
                'timestamp': activity.timestamp.isoformat(),
                'ip_address': activity.ip_address,
                'details': activity.details
            })
        
        return Response({
            'organizations': {
                'total': total_organizations,
                'active': active_organizations,
                'new_today': new_organizations_today
            },
            'users': {
                'total': total_users,
                'employees': total_employees,
                'admins': total_admins,
                'super_admins': total_super_admins,
                'new_today': new_users_today
            },
            'activities': {
                'total_logins': total_logins,
                'total_logouts': total_logouts,
                'logins_today': logins_today,
                'logouts_today': logouts_today
            },
            'recent_activities': formatted_activities,
            'last_updated': now.isoformat()
        })


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view that includes user data in response"""
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except exceptions.AuthenticationFailed:
            return Response(
                {'detail': 'No active account found with the given credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = serializer.user
            from .serializers import UserSerializer
            response.data['user'] = UserSerializer(user).data
        return response


class CustomTokenRefreshView(TokenRefreshView):
    """Custom refresh token view that includes user data in response"""
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response(
                {'detail': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Get user from the refresh token
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh_token = RefreshToken(request.data.get('refresh'))
            user_id = refresh_token.payload.get('user_id')
            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                    from .serializers import UserSerializer
                    response.data['user'] = UserSerializer(user).data
                except User.DoesNotExist:
                    pass
        return response


class LogoutView(APIView):
    """Logout view that blacklists the refresh token"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                from rest_framework_simplejwt.tokens import RefreshToken
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except Exception as e:
                    # If token is invalid, just log it but don't fail
                    print(f"Invalid refresh token during logout: {e}")
            
            # Clear any session data
            request.session.flush()
            
            return Response({'detail': 'Successfully logged out'}, status=status.HTTP_200_OK)
        except Exception as e:
            # Don't return 401 for logout errors, just return success
            print(f"Logout error: {e}")
            return Response({'detail': 'Successfully logged out'}, status=status.HTTP_200_OK)
