# Generated by Django 5.2.3 on 2025-07-16 14:40

import django.db.models.deletion
import utils.storage
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forms', '0004_alter_fileattachment_file'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='formfield',
            name='field_type',
            field=models.CharField(choices=[('NUMERIC', 'Numeric'), ('STRING', 'String'), ('ALPHANUMERIC', 'Alphanumeric'), ('SYMBOLS_ALPHANUMERIC', 'Symbols + Alphanumeric'), ('BOOLEAN', 'Boolean'), ('DATE', 'Date'), ('EMAIL', 'Email'), ('PHONE', 'Phone'), ('IMAGE_UPLOAD', 'Image Upload'), ('DOCUMENT_UPLOAD', 'Document Upload')], max_length=20),
        ),
        migrations.CreateModel(
            name='FormFieldFile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('field_name', models.CharField(max_length=100)),
                ('file', models.FileField(upload_to=utils.storage.get_file_upload_path)),
                ('original_filename', models.CharField(max_length=255)),
                ('file_type', models.CharField(max_length=100)),
                ('file_size', models.PositiveIntegerField()),
                ('description', models.CharField(blank=True, max_length=255)),
                ('is_verified', models.BooleanField(default=False)),
                ('verification_notes', models.TextField(blank=True)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('form_entry', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='field_files', to='forms.formentry')),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='uploaded_field_files', to=settings.AUTH_USER_MODEL)),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_field_files', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-uploaded_at'],
                'unique_together': {('form_entry', 'field_name')},
            },
        ),
    ]
