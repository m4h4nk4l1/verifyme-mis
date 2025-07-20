# Generated manually for initial setup

from django.db import migrations, models
import django.db.models.deletion
import django.contrib.contenttypes.models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserActivity',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('activity_type', models.CharField(choices=[('LOGIN', 'User Login'), ('LOGOUT', 'User Logout'), ('CREATE', 'Create Record'), ('UPDATE', 'Update Record'), ('DELETE', 'Delete Record'), ('VIEW', 'View Record'), ('EXPORT', 'Export Data'), ('IMPORT', 'Import Data'), ('FORM_SUBMIT', 'Form Submission'), ('FORM_EDIT', 'Form Edit'), ('USER_CREATE', 'User Creation'), ('USER_UPDATE', 'User Update'), ('USER_DELETE', 'User Deletion'), ('SCHEMA_CREATE', 'Schema Creation'), ('SCHEMA_UPDATE', 'Schema Update'), ('SCHEMA_DELETE', 'Schema Deletion')], max_length=20)),
                ('description', models.TextField()),
                ('object_id', models.UUIDField(blank=True, null=True)),
                ('metadata', models.JSONField(default=dict, help_text='Additional data about the activity')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('is_successful', models.BooleanField(default=True)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('content_type', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='contenttypes.contenttype')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_activities', to='accounts.organization')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='accounts.user')),
            ],
            options={
                'db_table': 'user_activities',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SystemLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('level', models.CharField(choices=[('DEBUG', 'Debug'), ('INFO', 'Info'), ('WARNING', 'Warning'), ('ERROR', 'Error'), ('CRITICAL', 'Critical')], default='INFO', max_length=10)),
                ('module', models.CharField(help_text='Module/component where log was generated', max_length=100)),
                ('message', models.TextField()),
                ('metadata', models.JSONField(default=dict, help_text='Additional context data')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('request_path', models.CharField(blank=True, max_length=500)),
                ('request_method', models.CharField(blank=True, max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('organization', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='system_logs', to='accounts.organization')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='system_logs', to='accounts.user')),
            ],
            options={
                'db_table': 'system_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('audit_type', models.CharField(choices=[('CREATE', 'Record Created'), ('UPDATE', 'Record Updated'), ('DELETE', 'Record Deleted'), ('RESTORE', 'Record Restored')], max_length=10)),
                ('object_id', models.UUIDField()),
                ('old_values', models.JSONField(default=dict, help_text='Previous values before change')),
                ('new_values', models.JSONField(default=dict, help_text='New values after change')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.contenttype')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='accounts.organization')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='accounts.user')),
            ],
            options={
                'db_table': 'audit_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='useractivity',
            index=models.Index(fields=['user', 'created_at'], name='user_activities_user_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='useractivity',
            index=models.Index(fields=['organization', 'created_at'], name='user_activities_organization_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='useractivity',
            index=models.Index(fields=['activity_type'], name='user_activities_activity_type_idx'),
        ),
        migrations.AddIndex(
            model_name='useractivity',
            index=models.Index(fields=['is_successful'], name='user_activities_is_successful_idx'),
        ),
        migrations.AddIndex(
            model_name='systemlog',
            index=models.Index(fields=['level'], name='system_logs_level_idx'),
        ),
        migrations.AddIndex(
            model_name='systemlog',
            index=models.Index(fields=['module'], name='system_logs_module_idx'),
        ),
        migrations.AddIndex(
            model_name='systemlog',
            index=models.Index(fields=['created_at'], name='system_logs_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='systemlog',
            index=models.Index(fields=['user'], name='system_logs_user_idx'),
        ),
        migrations.AddIndex(
            model_name='systemlog',
            index=models.Index(fields=['organization'], name='system_logs_organization_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['user', 'created_at'], name='audit_logs_user_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['organization', 'created_at'], name='audit_logs_organization_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['audit_type'], name='audit_logs_audit_type_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['content_type', 'object_id'], name='audit_logs_content_type_object_id_idx'),
        ),
    ] 