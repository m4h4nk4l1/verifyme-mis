from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Custom permission to only allow super admins to perform actions.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and is a super admin
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'SUPER_ADMIN'
        )

class IsOrganizationAdmin(permissions.BasePermission):
    """
    Custom permission to only allow organization admins to perform actions.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and is an admin or super admin
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ['ADMIN', 'SUPER_ADMIN']
        )
    
    def has_object_permission(self, request, view, obj):
        # Super admin can access any object
        if request.user.role == 'SUPER_ADMIN':
            return True
        
        # Admin can only access objects in their organization
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        elif hasattr(obj, 'user') and hasattr(obj.user, 'organization'):
            return obj.user.organization == request.user.organization
        
        return False

class IsOrganizationMember(permissions.BasePermission):
    """
    Custom permission to only allow organization members to perform actions.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        return bool(
            request.user and
            request.user.is_authenticated
        )
    
    def has_object_permission(self, request, view, obj):
        # Super admin can access any object
        if request.user.role == 'SUPER_ADMIN':
            return True
        
        # Admin and employees can only access objects in their organization
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        elif hasattr(obj, 'user') and hasattr(obj.user, 'organization'):
            return obj.user.organization == request.user.organization
        
        return False

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to access it.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        return bool(
            request.user and
            request.user.is_authenticated
        )
    
    def has_object_permission(self, request, view, obj):
        # Super admin can access any object
        if request.user.role == 'SUPER_ADMIN':
            return True
        
        # Admin can access objects in their organization
        if request.user.role == 'ADMIN':
            if hasattr(obj, 'organization'):
                return obj.organization == request.user.organization
            elif hasattr(obj, 'user') and hasattr(obj.user, 'organization'):
                return obj.user.organization == request.user.organization
        
        # Users can only access their own objects
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'id'):
            return obj.id == request.user.id
        
        return False 