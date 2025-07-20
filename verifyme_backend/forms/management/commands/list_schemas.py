from django.core.management.base import BaseCommand
from forms.models import DynamicFormSchema

class Command(BaseCommand):
    help = 'List all form schemas in the database'

    def handle(self, *args, **options):
        schemas = DynamicFormSchema.objects.all()
        
        if not schemas.exists():
            self.stdout.write(
                self.style.WARNING('No form schemas found in the database.')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'Found {schemas.count()} form schemas:')
        )
        
        for schema in schemas:
            self.stdout.write(
                f'  - {schema.name} (ID: {schema.id}) - Active: {schema.is_active} - Fields: {len(schema.fields_definition)}'
            ) 