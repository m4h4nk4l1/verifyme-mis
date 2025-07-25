# Generated by Django 5.2.3 on 2025-07-19 08:52

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_rename_organizations_name_idx_organizatio_name_5cd1d4_idx_and_more'),
        ('forms', '0008_formfieldfile_s3_url'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='formentry',
            name='forms_forme_agency__aa9665_idx',
        ),
        migrations.RemoveField(
            model_name='formentry',
            name='agency_id',
        ),
        migrations.AddField(
            model_name='formentry',
            name='case_id',
            field=models.PositiveIntegerField(blank=True, help_text='Auto-incrementing case ID', null=True, unique=True),
        ),
        migrations.AddIndex(
            model_name='formentry',
            index=models.Index(fields=['case_id'], name='forms_forme_case_id_e04c18_idx'),
        ),
    ]
