# Generated manually for initial setup

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DynamicFormSchema',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('fields_definition', models.JSONField(default=list, help_text='Array of field definitions with name, type, required, etc.')),
                ('max_fields', models.PositiveIntegerField(default=120, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(120)])),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_schemas', to='accounts.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='form_schemas', to='accounts.organization')),
            ],
            options={
                'db_table': 'dynamic_form_schemas',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FormEntry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('form_data', models.JSONField(default=dict, help_text='Stores the actual form data as key-value pairs')),
                ('file_attachments', models.JSONField(default=dict, help_text='Stores file attachment references')),
                ('is_completed', models.BooleanField(default=False)),
                ('is_verified', models.BooleanField(default=False)),
                ('verification_notes', models.TextField(blank=True)),
                ('tat_start_time', models.DateTimeField(auto_now_add=True)),
                ('tat_completion_time', models.DateTimeField(blank=True, null=True)),
                ('is_out_of_tat', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('employee', models.ForeignKey(limit_choices_to={'role': 'EMPLOYEE'}, on_delete=django.db.models.deletion.CASCADE, related_name='form_entries', to='accounts.user')),
                ('form_schema', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='entries', to='forms.dynamicformschema')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='form_entries', to='accounts.organization')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_entries', to='accounts.user')),
            ],
            options={
                'db_table': 'form_entries',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FormField',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('display_name', models.CharField(max_length=255)),
                ('field_type', models.CharField(choices=[('NUMERIC', 'Numeric'), ('STRING', 'String'), ('ALPHANUMERIC', 'Alphanumeric'), ('SYMBOLS_ALPHANUMERIC', 'Symbols + Alphanumeric'), ('BOOLEAN', 'Boolean (True/False)'), ('DATE', 'Date'), ('EMAIL', 'Email'), ('PHONE', 'Phone Number')], max_length=50)),
                ('validation_rules', models.JSONField(default=dict, help_text='Stores validation rules like min_length, max_length, pattern, etc.')),
                ('is_required', models.BooleanField(default=True)),
                ('is_unique', models.BooleanField(default=False)),
                ('default_value', models.TextField(blank=True)),
                ('help_text', models.TextField(blank=True)),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_fields', to='accounts.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='form_fields', to='accounts.organization')),
            ],
            options={
                'db_table': 'form_fields',
                'ordering': ['organization', 'order', 'name'],
            },
        ),
        migrations.AddIndex(
            model_name='dynamicformschema',
            index=models.Index(fields=['organization', 'is_active'], name='dynamic_form_schemas_organization_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='dynamicformschema',
            index=models.Index(fields=['created_by'], name='dynamic_form_schemas_created_by_idx'),
        ),
        migrations.AddIndex(
            model_name='formentry',
            index=models.Index(fields=['organization', 'employee'], name='form_entries_organization_employee_idx'),
        ),
        migrations.AddIndex(
            model_name='formentry',
            index=models.Index(fields=['form_schema'], name='form_entries_form_schema_idx'),
        ),
        migrations.AddIndex(
            model_name='formentry',
            index=models.Index(fields=['is_completed'], name='form_entries_is_completed_idx'),
        ),
        migrations.AddIndex(
            model_name='formentry',
            index=models.Index(fields=['is_out_of_tat'], name='form_entries_is_out_of_tat_idx'),
        ),
        migrations.AddIndex(
            model_name='formentry',
            index=models.Index(fields=['created_at'], name='form_entries_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='formfield',
            index=models.Index(fields=['organization', 'is_active'], name='form_fields_organization_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='formfield',
            index=models.Index(fields=['field_type'], name='form_fields_field_type_idx'),
        ),
        migrations.AddConstraint(
            model_name='dynamicformschema',
            constraint=models.UniqueConstraint(fields=('name', 'organization'), name='unique_schema_name_per_organization'),
        ),
        migrations.AddConstraint(
            model_name='formfield',
            constraint=models.UniqueConstraint(fields=('name', 'organization'), name='unique_field_name_per_organization'),
        ),
    ] 