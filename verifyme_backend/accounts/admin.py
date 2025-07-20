from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django import forms
from .models import User, Organization, UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin configuration for UserProfile model"""
    
    list_display = [
        'user_display',
        'user_role',
        'user_organization',
        'last_activity',
        'login_count',
        'email_notifications',
        'created_at'
    ]
    list_filter = [
        'user__role',
        'user__organization',
        'email_notifications',
        'sms_notifications',
        'last_activity',
        'created_at'
    ]
    search_fields = [
        'user__email',
        'user__first_name',
        'user__last_name',
        'user__username'
    ]
    readonly_fields = [
        'user',
        'last_activity',
        'login_count',
        'created_at',
        'updated_at'
    ]
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Profile', {
            'fields': ('avatar', 'bio', 'preferences')
        }),
        ('Activity', {
            'fields': ('last_activity', 'login_count'),
            'classes': ('collapse',)
        }),
        ('Notifications', {
            'fields': ('email_notifications', 'sms_notifications')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_display(self, obj):
        """Display user with role badge"""
        role_colors = {
            'SUPER_ADMIN': '#dc3545',
            'ADMIN': '#fd7e14',
            'EMPLOYEE': '#28a745'
        }
        color = role_colors.get(obj.user.role, '#6c757d')
        return format_html(
            '{} <span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75em;">{}</span>',
            obj.user.get_full_name(),
            color,
            obj.user.get_role_display()
        )
    user_display.short_description = 'User'
    
    def user_role(self, obj):
        """Display user role"""
        return obj.user.get_role_display()
    user_role.short_description = 'Role'
    
    def user_organization(self, obj):
        """Display user organization"""
        return obj.user.organization.display_name if obj.user.organization else '-'
    user_organization.short_description = 'Organization'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('user', 'user__organization')

# Custom admin site configuration
admin.site.site_header = "VerifyMe Admin"
admin.site.site_title = "VerifyMe Admin Portal"
admin.site.index_title = "Welcome to VerifyMe Administration"

# Admin actions
def activate_users(modeladmin, request, queryset):
    """Bulk activate users"""
    updated = queryset.update(is_active=True)
    modeladmin.message_user(request, f'{updated} users were successfully activated.')
activate_users.short_description = "Activate selected users"

def deactivate_users(modeladmin, request, queryset):
    """Bulk deactivate users"""
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f'{updated} users were successfully deactivated.')
deactivate_users.short_description = "Deactivate selected users"

def activate_organizations(modeladmin, request, queryset):
    """Bulk activate organizations"""
    updated = queryset.update(is_active=True)
    modeladmin.message_user(request, f'{updated} organizations were successfully activated.')
activate_organizations.short_description = "Activate selected organizations"

def deactivate_organizations(modeladmin, request, queryset):
    """Bulk deactivate organizations"""
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f'{updated} organizations were successfully deactivated.')
deactivate_organizations.short_description = "Deactivate selected organizations"

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Admin configuration for Organization model"""
    actions = [activate_organizations, deactivate_organizations]
    
    list_display = [
        'display_name', 
        'name', 
        'business_type', 
        'active_employees_count',
        'admin_users_count',
        'is_active', 
        'created_at'
    ]
    list_filter = ['business_type', 'is_active', 'created_at']
    search_fields = ['name', 'display_name', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'active_employees_count', 'admin_users_count']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'id')
        }),
        ('Contact Information', {
            'fields': ('email', 'phone', 'address_data')
        }),
        ('Business Information', {
            'fields': ('business_type', 'max_employees', 'tat_hours_limit')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('created_by')

class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Password confirmation', widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'role', 'organization')

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords don't match")
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

class UserAdmin(BaseUserAdmin):
    add_form = UserCreationForm
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'organization', 'password1', 'password2'),
        }),
    )
    
    list_display = [
        'email', 
        'username', 
        'get_full_name', 
        'role', 
        'organization_display',
        'is_active', 
        'is_staff',
        'date_joined'
    ]
    list_filter = ['role', 'is_active', 'is_staff', 'date_joined', 'organization']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-date_joined']
    readonly_fields = ['id', 'date_joined', 'last_login', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'username', 'password')
        }),
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'phone')
        }),
        ('Role & Organization', {
            'fields': ('role', 'organization', 'employee_data')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        })
    )
    
    def organization_display(self, obj):
        """Display organization name with color coding"""
        if obj.organization:
            color = '#28a745' if obj.organization.is_active else '#dc3545'
            return format_html(
                '<span style="color: {};">{}</span>',
                color,
                obj.organization.display_name
            )
        return '-'
    organization_display.short_description = 'Organization'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('organization', 'created_by')
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter organization choices based on user role"""
        if db_field.name == "organization":
            # Super admin can see all organizations
            if request.user.is_superuser:
                kwargs["queryset"] = Organization.objects.filter(is_active=True)
            # Admin can only see their own organization
            elif hasattr(request.user, 'organization') and request.user.organization:
                kwargs["queryset"] = Organization.objects.filter(
                    id=request.user.organization.id
                )
            else:
                kwargs["queryset"] = Organization.objects.none()
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)