from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Organization, UserProfile

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer that accepts email instead of username"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.EmailField()
        if 'username' in self.fields:
            del self.fields['username']
    
    def validate(self, attrs):
        """Validate credentials and return tokens"""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            try:
                user = User.objects.get(email=email)
                if user.check_password(password):
                    if not user.is_active:
                        raise serializers.ValidationError('User account is disabled.')
                    
                    # Set the user attribute for the parent class
                    self.user = user
                    
                    refresh = self.get_token(user)
                    data = {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                        'user': UserSerializer(user).data
                    }
                    return data
                else:
                    raise serializers.ValidationError('No active account found with the given credentials.')
            except User.DoesNotExist:
                raise serializers.ValidationError('No active account found with the given credentials.')
        else:
            raise serializers.ValidationError('Must include "email" and "password".')

class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model"""
    
    active_employees_count = serializers.ReadOnlyField()
    admin_users_count = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField(source='created_by.get_full_name')
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'display_name', 'email', 'phone', 'address_data',
            'business_type', 'is_active', 'max_employees', 'tat_hours_limit',
            'active_employees_count', 'admin_users_count', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']
    
    def validate_name(self, value):
        """Validate organization name uniqueness"""
        if Organization.objects.filter(name=value).exists():
            raise serializers.ValidationError("Organization with this name already exists.")
        return value
    
    def validate_email(self, value):
        """Validate organization email uniqueness"""
        if Organization.objects.filter(email=value).exists():
            raise serializers.ValidationError("Organization with this email already exists.")
        return value

class OrganizationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating organizations with admin user"""
    
    # Admin user fields
    admin_email = serializers.EmailField(write_only=True)
    admin_username = serializers.CharField(max_length=150, write_only=True)
    admin_first_name = serializers.CharField(max_length=150, write_only=True)
    admin_last_name = serializers.CharField(max_length=150, write_only=True)
    admin_password = serializers.CharField(max_length=128, write_only=True)
    
    class Meta:
        model = Organization
        fields = [
            'name', 'display_name', 'email', 'phone', 'address_data',
            'business_type', 'max_employees', 'tat_hours_limit',
            'admin_email', 'admin_username', 'admin_first_name', 
            'admin_last_name', 'admin_password'
        ]
    
    def validate(self, data):
        """Validate admin user data"""
        admin_email = data.get('admin_email')
        admin_username = data.get('admin_username')
        
        if User.objects.filter(email=admin_email).exists():
            raise serializers.ValidationError({
                'admin_email': 'User with this email already exists.'
            })
        
        if User.objects.filter(username=admin_username).exists():
            raise serializers.ValidationError({
                'admin_username': 'User with this username already exists.'
            })
        
        return data
    
    def create(self, validated_data):
        """Create organization and admin user"""
        from .models import create_organization_with_admin
        
        # Extract admin data
        admin_data = {
            'email': validated_data.pop('admin_email'),
            'username': validated_data.pop('admin_username'),
            'first_name': validated_data.pop('admin_first_name'),
            'last_name': validated_data.pop('admin_last_name'),
            'password': validated_data.pop('admin_password'),
        }
        
        # Create organization with admin
        organization = create_organization_with_admin(validated_data, admin_data)
        return organization

class OrganizationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating organizations"""
    
    active_employees_count = serializers.ReadOnlyField()
    admin_users_count = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField(source='created_by.get_full_name')
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'display_name', 'email', 'phone', 'address_data',
            'business_type', 'is_active', 'max_employees', 'tat_hours_limit',
            'active_employees_count', 'admin_users_count', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']
    
    def validate_name(self, value):
        """Validate organization name uniqueness (excluding current instance)"""
        if Organization.objects.filter(name=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Organization with this name already exists.")
        return value
    
    def validate_email(self, value):
        """Validate organization email uniqueness (excluding current instance)"""
        if Organization.objects.filter(email=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Organization with this email already exists.")
        return value

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    organization_name = serializers.ReadOnlyField(source='organization.display_name')
    role_display = serializers.ReadOnlyField(source='get_role_display')
    full_name = serializers.ReadOnlyField(source='get_full_name')
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'organization', 'organization_name',
            'employee_data', 'phone', 'is_active', 'is_email_verified',
            'date_joined', 'last_login', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'created_at', 'updated_at']

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 'role',
            'organization', 'employee_data', 'phone', 'password', 'confirm_password'
        ]
    
    def validate(self, data):
        """Validate password confirmation"""
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        if password != confirm_password:
            raise serializers.ValidationError("Passwords don't match.")
        
        return data
    
    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        return user

class EmployeeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating employees (Admin only)"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 'phone',
            'employee_data', 'password', 'confirm_password'
        ]
    
    def validate(self, data):
        """Validate employee data"""
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        email = data.get('email')
        username = data.get('username')
        
        if password != confirm_password:
            raise serializers.ValidationError("Passwords don't match.")
        
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({
                'email': 'User with this email already exists.'
            })
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({
                'username': 'User with this username already exists.'
            })
        
        return data
    
    def create(self, validated_data):
        """Create employee with hashed password"""
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        # Set role to EMPLOYEE
        validated_data['role'] = 'EMPLOYEE'
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        return user

class EmployeeUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating employees (Admin only)"""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'employee_data', 'is_active'
        ]
    
    def validate(self, data):
        """Validate employee update data"""
        # Ensure role cannot be changed to ADMIN or SUPER_ADMIN
        if 'role' in data and data['role'] in ['ADMIN', 'SUPER_ADMIN']:
            raise serializers.ValidationError({
                'role': 'Cannot change employee role to admin roles.'
            })
        
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'avatar', 'bio', 'preferences', 'last_activity',
            'login_count', 'email_notifications', 'sms_notifications',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_activity', 'login_count', 'created_at', 'updated_at'] 

class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users"""
    
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    organization_name = serializers.ReadOnlyField(source='organization.display_name')
    role_display = serializers.ReadOnlyField(source='get_role_display')
    full_name = serializers.ReadOnlyField(source='get_full_name')
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'organization', 'organization_name',
            'employee_data', 'phone', 'is_active', 'is_email_verified',
            'date_joined', 'last_login', 'created_at', 'updated_at', 'password'
        ]
        read_only_fields = ['id', 'email', 'username', 'date_joined', 'last_login', 'created_at', 'updated_at']
    
    def update(self, instance, validated_data):
        """Update user with optional password change"""
        password = validated_data.pop('password', None)
        
        # Update the user
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Set password if provided
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance 