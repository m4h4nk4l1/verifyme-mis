# Generated manually for initial setup

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Organization',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('display_name', models.CharField(max_length=255)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('phone', models.CharField(max_length=15, validators=[django.core.validators.RegexValidator(message='Enter a valid phone number', regex='^\\+?1?\\d{9,15}$')])),
                ('address_data', models.JSONField(default=dict, help_text='Store address, city, state, pincode')),
                ('business_type', models.CharField(choices=[('BANK', 'Bank'), ('NBFC', 'NBFC'), ('FINANCIAL_SERVICES', 'Financial Services'), ('OTHER', 'Other')], default='BANK', max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('max_employees', models.PositiveIntegerField(default=100)),
                ('tat_hours_limit', models.PositiveIntegerField(default=24, help_text='TAT hours limit')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'organizations',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('username', models.CharField(max_length=150, unique=True)),
                ('first_name', models.CharField(max_length=150)),
                ('last_name', models.CharField(max_length=150)),
                ('role', models.CharField(choices=[('SUPER_ADMIN', 'Super Admin'), ('ADMIN', 'Admin'), ('EMPLOYEE', 'Employee')], default='EMPLOYEE', max_length=20)),
                ('employee_data', models.JSONField(default=dict, help_text='Store employee ID, department, designation, etc.')),
                ('phone', models.CharField(blank=True, max_length=15, validators=[django.core.validators.RegexValidator(message='Enter a valid phone number', regex='^\\+?1?\\d{9,15}$')])),
                ('is_active', models.BooleanField(default=True)),
                ('is_staff', models.BooleanField(default=False)),
                ('is_email_verified', models.BooleanField(default=False)),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('organization', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='users', to='accounts.organization')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'db_table': 'users',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('avatar', models.ImageField(blank=True, null=True, upload_to='avatars/')),
                ('bio', models.TextField(blank=True, max_length=500)),
                ('preferences', models.JSONField(default=dict, help_text='Store user preferences like theme, language, etc.')),
                ('last_activity', models.DateTimeField(blank=True, null=True)),
                ('login_count', models.PositiveIntegerField(default=0)),
                ('email_notifications', models.BooleanField(default=True)),
                ('sms_notifications', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to='accounts.user')),
            ],
            options={
                'db_table': 'user_profiles',
            },
        ),
        migrations.AddField(
            model_name='organization',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_organizations', to='accounts.user'),
        ),
        migrations.AddField(
            model_name='user',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_users', to='accounts.user'),
        ),
        migrations.AddIndex(
            model_name='organization',
            index=models.Index(fields=['name'], name='organizations_name_idx'),
        ),
        migrations.AddIndex(
            model_name='organization',
            index=models.Index(fields=['business_type'], name='organizations_business_type_idx'),
        ),
        migrations.AddIndex(
            model_name='organization',
            index=models.Index(fields=['is_active'], name='organizations_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='users_email_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['username'], name='users_username_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['role'], name='users_role_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['organization'], name='users_organization_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['is_active'], name='users_is_active_idx'),
        ),
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(fields=('email', 'organization'), name='unique_email_per_organization'),
        ),
    ] 