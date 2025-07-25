# Generated by Django 5.2.3 on 2025-07-19 12:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_rename_organizations_name_idx_organizatio_name_5cd1d4_idx_and_more'),
        ('forms', '0009_add_case_id_remove_agency_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='formentry',
            name='case_id',
            field=models.PositiveIntegerField(blank=True, help_text='Auto-incrementing case ID per organization', null=True),
        ),
        migrations.AlterUniqueTogether(
            name='formentry',
            unique_together={('organization', 'case_id')},
        ),
    ]
