from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
import uuid

def create_user_manager():
    """Factory function to create UserManager with functional approach"""
    from django.contrib.auth.models import BaseUserManager
    
    class UserManager(BaseUserManager):
        def create_user(self, email, password=None, **extra_fields):
            """Create and return a regular user with email and password"""
            if not email:
                raise ValueError('The Email field must be set')
            
            email = self.normalize_email(email)
            user = self.model(email=email, **extra_fields)
            user.set_password(password)
            user.save(using=self._db)
            return user
        
        def create_superuser(self, email, password=None, **extra_fields):
            """Create and return a superuser with email and password"""
            extra_fields.setdefault('is_staff', True)
            extra_fields.setdefault('is_superuser', True)
            extra_fields.setdefault('role', 'SUPER_ADMIN')
            
            if extra_fields.get('is_staff') is not True:
                raise ValueError('Superuser must have is_staff=True.')
            if extra_fields.get('is_superuser') is not True:
                raise ValueError('Superuser must have is_superuser=True.')
            
            return self.create_user(email, password, **extra_fields)
    
    return UserManager()

class Organization(models.Model):
    """Organization model for multi-tenant support"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(max_length=255)
    
    # Contact Information
    email = models.EmailField(unique=True)
    phone = models.CharField(
        max_length=15,
        validators=[RegexValidator(r'^\+?1?\d{9,15}$', 'Enter a valid phone number')]
    )
    
    # Address Information (JSONB for flexibility)
    address_data = models.JSONField(default=dict, help_text="Store address, city, state, pincode")
    
    # Business Information
    business_type = models.CharField(
        max_length=100,
        choices=[
            ('BANK', 'Bank'),
            ('NBFC', 'NBFC'),
            ('FINANCIAL_SERVICES', 'Financial Services'),
            ('OTHER', 'Other')
        ],
        default='BANK'
    )
    
    # Configuration
    is_active = models.BooleanField(default=True)
    max_employees = models.PositiveIntegerField(default=100)
    tat_hours_limit = models.PositiveIntegerField(default=24, help_text="TAT hours limit")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_organizations'
    )
    
    class Meta:
        db_table = 'organizations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['business_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.display_name
    
    @property
    def active_employees_count(self):
        """Get count of active employees"""
        return self.users.filter(is_active=True, role='EMPLOYEE').count()
    
    @property
    def admin_users_count(self):
        """Get count of admin users"""
        return self.users.filter(is_active=True, role='ADMIN').count()

class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model with role-based access"""
    
    # Role Choices
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('ADMIN', 'Admin'),
        ('EMPLOYEE', 'Employee'),
    ]
    
    # Basic User Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    
    # Role & Organization
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYEE')
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True
    )
    
    # Employee Specific Information (JSONB for flexibility)
    employee_data = models.JSONField(
        default=dict,
        help_text="Store employee ID, department, designation, etc."
    )
    
    # Encrypted Personal Information
    phone = models.CharField(
        max_length=15,
        validators=[RegexValidator(r'^\+?1?\d{9,15}$', 'Enter a valid phone number')],
        blank=True
    )
    
    # Status Fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    
    # Dates
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_users'
    )
    
    # Manager
    objects = create_user_manager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['role']),
            models.Index(fields=['organization']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['email', 'organization'],
                name='unique_email_per_organization'
            )
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Return the short name for the user"""
        return self.first_name
    
    @property
    def is_super_admin(self):
        """Check if user is super admin"""
        return self.role == 'SUPER_ADMIN'
    
    @property
    def is_admin(self):
        """Check if user is admin"""
        return self.role == 'ADMIN'
    
    @property
    def is_employee(self):
        """Check if user is employee"""
        return self.role == 'EMPLOYEE'
    
    @property
    def organization_name(self):
        """Get organization name safely"""
        return self.organization.display_name if self.organization else None
    
    def has_organization_access(self, organization_id):
        """Check if user has access to specific organization"""
        if self.is_super_admin:
            return True
        return str(self.organization_id) == str(organization_id) if self.organization else False
    
    def get_user_permissions(self):
        """Get user permissions based on role"""
        base_permissions = ['view_own_data']
        
        if self.is_super_admin:
            return [
                'create_organization',
                'manage_organizations',
                'create_admin_users',
                'view_all_data',
                'system_settings'
            ]
        elif self.is_admin:
            return [
                'create_employees',
                'manage_employees',
                'create_forms',
                'manage_forms',
                'view_organization_data',
                'export_reports',
                'view_analytics'
            ]
        else:  # EMPLOYEE
            return [
                'fill_forms',
                'view_own_forms',
                'search_data'
            ]

class UserProfile(models.Model):
    """Extended user profile information"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Profile Information
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    
    # Preferences (JSONB for flexibility)
    preferences = models.JSONField(
        default=dict,
        help_text="Store user preferences like theme, language, etc."
    )
    
    # Activity Tracking
    last_activity = models.DateTimeField(null=True, blank=True)
    login_count = models.PositiveIntegerField(default=0)
    
    # Notifications Settings
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"Profile for {self.user.get_full_name()}"
    
    def update_last_activity(self):
        """Update last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])
    
    def increment_login_count(self):
        """Increment login count"""
        self.login_count += 1
        self.save(update_fields=['login_count'])

# Functional approach for model utilities
def get_user_by_email(email):
    """Get user by email address"""
    try:
        return User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return None

def get_users_by_organization(organization_id):
    """Get all users for an organization"""
    return User.objects.filter(organization_id=organization_id, is_active=True)

def get_admin_users_by_organization(organization_id):
    """Get admin users for an organization"""
    return User.objects.filter(
        organization_id=organization_id,
        role='ADMIN',
        is_active=True
    )

def get_employee_users_by_organization(organization_id):
    """Get employee users for an organization"""
    return User.objects.filter(
        organization_id=organization_id,
        role='EMPLOYEE',
        is_active=True
    )

def create_organization_with_admin(org_data, admin_data):
    """Create organization with admin user"""
    from django.db import transaction
    
    with transaction.atomic():
        # Create organization
        organization = Organization.objects.create(**org_data)
        
        # Create admin user
        admin_data['organization'] = organization
        admin_data['role'] = 'ADMIN'
        admin_data['is_staff'] = True
        
        admin_user = User.objects.create_user(**admin_data)
        
        # Profile will be created automatically by signal
        print(f"Created organization: {organization.display_name} with admin: {admin_user.email}")
        
        return organization

def validate_user_organization_access(user, organization_id):
    """Validate if user has access to organization"""
    if user.is_super_admin:
        return True
    
    if user.organization_id and str(user.organization_id) == str(organization_id):
        return True
    
    return False