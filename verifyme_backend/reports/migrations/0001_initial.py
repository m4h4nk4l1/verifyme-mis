# Generated manually for initial setup

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('report_type', models.CharField(choices=[('DAILY', 'Daily Report'), ('WEEKLY', 'Weekly Report'), ('MONTHLY', 'Monthly Report'), ('QUARTERLY', 'Quarterly Report'), ('HALF_YEARLY', 'Half Yearly Report'), ('YEARLY', 'Yearly Report'), ('CUSTOM', 'Custom Report')], max_length=20)),
                ('format', models.CharField(choices=[('EXCEL', 'Excel (.xlsx)'), ('PDF', 'PDF'), ('CSV', 'CSV'), ('JSON', 'JSON')], default='EXCEL', max_length=10)),
                ('parameters', models.JSONField(default=dict, help_text='Report parameters like date range, filters, etc.')),
                ('is_scheduled', models.BooleanField(default=False)),
                ('schedule_cron', models.CharField(blank=True, help_text='Cron expression for scheduling', max_length=100)),
                ('last_generated', models.DateTimeField(blank=True, null=True)),
                ('next_generation', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('include_attachments', models.BooleanField(default=True, help_text='Include file attachments in report')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_reports', to='accounts.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='accounts.organization')),
            ],
            options={
                'db_table': 'reports',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Export',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('export_type', models.CharField(choices=[('FORM_DATA', 'Form Data Export'), ('USER_ACTIVITY', 'User Activity Export'), ('AUDIT_LOG', 'Audit Log Export'), ('CUSTOM', 'Custom Export')], max_length=20)),
                ('format', models.CharField(choices=[('EXCEL', 'Excel (.xlsx)'), ('PDF', 'PDF'), ('CSV', 'CSV'), ('JSON', 'JSON')], default='EXCEL', max_length=10)),
                ('filters', models.JSONField(default=dict, help_text='Export filters and parameters')),
                ('file_path', models.CharField(blank=True, max_length=500)),
                ('file_size', models.BigIntegerField(blank=True, null=True)),
                ('file_name', models.CharField(blank=True, max_length=255)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('PROCESSING', 'Processing'), ('COMPLETED', 'Completed'), ('FAILED', 'Failed'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('progress', models.PositiveIntegerField(default=0, help_text='Progress percentage')),
                ('total_records', models.PositiveIntegerField(default=0)),
                ('processed_records', models.PositiveIntegerField(default=0)),
                ('error_message', models.TextField(blank=True)),
                ('error_details', models.JSONField(blank=True, default=dict)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exports', to='accounts.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exports', to='accounts.organization')),
            ],
            options={
                'db_table': 'exports',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Analytics',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('analytics_type', models.CharField(choices=[('FORM_SUBMISSIONS', 'Form Submissions'), ('USER_ACTIVITY', 'User Activity'), ('TAT_PERFORMANCE', 'TAT Performance'), ('DUPLICATE_RATE', 'Duplicate Rate'), ('ERROR_RATE', 'Error Rate'), ('EXPORT_USAGE', 'Export Usage')], max_length=20)),
                ('period_start', models.DateTimeField()),
                ('period_end', models.DateTimeField()),
                ('data', models.JSONField(default=dict, help_text='Analytics data in structured format')),
                ('total_count', models.PositiveIntegerField(default=0)),
                ('success_count', models.PositiveIntegerField(default=0)),
                ('error_count', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='analytics', to='accounts.organization')),
            ],
            options={
                'db_table': 'analytics',
                'ordering': ['-period_start'],
            },
        ),
        migrations.CreateModel(
            name='Dashboard',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('configuration', models.JSONField(default=dict, help_text='Dashboard layout and widget configuration')),
                ('is_public', models.BooleanField(default=False, help_text='Whether dashboard is public to organization')),
                ('allowed_roles', models.JSONField(default=list, help_text='List of roles that can access this dashboard')),
                ('is_active', models.BooleanField(default=True)),
                ('is_default', models.BooleanField(default=False, help_text='Whether this is the default dashboard')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_dashboards', to='accounts.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dashboards', to='accounts.organization')),
            ],
            options={
                'db_table': 'dashboards',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='report',
            index=models.Index(fields=['organization', 'report_type'], name='reports_organization_report_type_idx'),
        ),
        migrations.AddIndex(
            model_name='report',
            index=models.Index(fields=['is_active'], name='reports_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='report',
            index=models.Index(fields=['is_scheduled'], name='reports_is_scheduled_idx'),
        ),
        migrations.AddIndex(
            model_name='report',
            index=models.Index(fields=['created_by'], name='reports_created_by_idx'),
        ),
        migrations.AddIndex(
            model_name='export',
            index=models.Index(fields=['organization', 'status'], name='exports_organization_status_idx'),
        ),
        migrations.AddIndex(
            model_name='export',
            index=models.Index(fields=['export_type'], name='exports_export_type_idx'),
        ),
        migrations.AddIndex(
            model_name='export',
            index=models.Index(fields=['created_by'], name='exports_created_by_idx'),
        ),
        migrations.AddIndex(
            model_name='export',
            index=models.Index(fields=['status'], name='exports_status_idx'),
        ),
        migrations.AddIndex(
            model_name='analytics',
            index=models.Index(fields=['organization', 'analytics_type'], name='analytics_organization_analytics_type_idx'),
        ),
        migrations.AddIndex(
            model_name='analytics',
            index=models.Index(fields=['period_start', 'period_end'], name='analytics_period_start_period_end_idx'),
        ),
        migrations.AddIndex(
            model_name='analytics',
            index=models.Index(fields=['analytics_type'], name='analytics_analytics_type_idx'),
        ),
        migrations.AddIndex(
            model_name='dashboard',
            index=models.Index(fields=['organization', 'is_active'], name='dashboards_organization_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='dashboard',
            index=models.Index(fields=['is_default'], name='dashboards_is_default_idx'),
        ),
        migrations.AddIndex(
            model_name='dashboard',
            index=models.Index(fields=['created_by'], name='dashboards_created_by_idx'),
        ),
        migrations.AddConstraint(
            model_name='report',
            constraint=models.UniqueConstraint(fields=('name', 'organization'), name='unique_report_name_per_organization'),
        ),
        migrations.AddConstraint(
            model_name='analytics',
            constraint=models.UniqueConstraint(fields=('organization', 'analytics_type', 'period_start', 'period_end'), name='unique_analytics_period'),
        ),
        migrations.AddConstraint(
            model_name='dashboard',
            constraint=models.UniqueConstraint(fields=('name', 'organization'), name='unique_dashboard_name_per_organization'),
        ),
    ] 