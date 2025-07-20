from django.core.management.base import BaseCommand
from forms.models import FormEntry
from accounts.models import Organization
from django.db import transaction, connection


class Command(BaseCommand):
    help = 'Fix case_ids to be sequential per organization'

    def handle(self, *args, **options):
        self.stdout.write('Starting case_id reordering...')
        
        # Get all organizations
        organizations = Organization.objects.all()
        
        for org in organizations:
            self.stdout.write(f'Processing organization: {org.name}')
            
            # Get all entries for this organization, ordered by created_at
            entries = FormEntry.objects.filter(organization=org).order_by('created_at')
            
            if not entries.exists():
                self.stdout.write(f'  No entries found for {org.name}')
                continue
            
            # Use raw SQL to avoid unique constraint issues
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # First, set all case_ids to NULL to avoid conflicts
                    cursor.execute("""
                        UPDATE forms_formentry 
                        SET case_id = NULL 
                        WHERE organization_id = %s
                    """, [org.id])
                    
                    # Now assign sequential case_ids
                    for index, entry in enumerate(entries, start=1):
                        cursor.execute("""
                            UPDATE forms_formentry 
                            SET case_id = %s 
                            WHERE id = %s
                        """, [index, entry.id])
                        self.stdout.write(f'  Updated entry {entry.id}: -> {index}')
            
            self.stdout.write(f'  Completed {org.name}: {entries.count()} entries reordered')
        
        self.stdout.write(self.style.SUCCESS('Successfully reordered all case_ids')) 