# Generated manually to fix FormFieldFile model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('forms', '0002_fileattachment_organization_and_more'),
    ]

    operations = [
        # Add is_temporary field to FormFieldFile
        migrations.AddField(
            model_name='formfieldfile',
            name='is_temporary',
            field=models.BooleanField(default=True),
        ),
        
        # Make form_entry nullable
        migrations.AlterField(
            model_name='formfieldfile',
            name='form_entry',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='field_files', to='forms.formentry'),
        ),
        
        # Remove the old unique constraint
        migrations.AlterUniqueTogether(
            name='formfieldfile',
            unique_together=set(),
        ),
        
        # Add the new conditional unique constraint
        migrations.AddConstraint(
            model_name='formfieldfile',
            constraint=models.UniqueConstraint(
                condition=models.Q(is_temporary=False),
                fields=('form_entry', 'field_name'),
                name='unique_form_field_file'
            ),
        ),
    ] 