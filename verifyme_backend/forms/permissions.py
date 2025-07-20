from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """Allow access only to super admins."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'SUPER_ADMIN'

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """Allow access to admins and super admins."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'SUPER_ADMIN']

class IsEmployeeOrAdmin(permissions.BasePermission):
    """Allow access to employees, admins, and super admins."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN']

class IsFormEntryOwnerOrAdmin(permissions.BasePermission):
    """Allow access to form entry owner or admins."""
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Super admin can access everything
        if user.role == 'SUPER_ADMIN':
            return True
        
        # Admin can access entries in their organization
        if user.role == 'ADMIN':
            return obj.organization == user.organization
        
        # Employee can only access their own entries
        if user.role == 'EMPLOYEE':
            return obj.employee == user
        
        return False

class IsSchemaOwnerOrAdmin(permissions.BasePermission):
    """Allow access to schema owner or admins."""
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Super admin can access everything
        if user.role == 'SUPER_ADMIN':
            return True
        
        # Admin can access schemas in their organization
        if user.role == 'ADMIN':
            return obj.organization == user.organization
        
        # Employee can only access schemas in their organization (read-only)
        if user.role == 'EMPLOYEE':
            return obj.organization == user.organization
        
        return False 