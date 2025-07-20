from django.core.management.base import BaseCommand
from django.db import transaction
from forms.models import FormEntry
from django.db import models


class Command(BaseCommand):
    help = 'Fix agency IDs for existing form entries'

    def handle(self, *args, **options):
        self.stdout.write('Starting to fix agency IDs...')
        
        # Get all entries without agency_id
        entries_without_agency = FormEntry.objects.filter(agency_id__isnull=True)
        
        if not entries_without_agency.exists():
            self.stdout.write(self.style.SUCCESS('No entries found without agency_id'))
            return
        
        self.stdout.write(f'Found {entries_without_agency.count()} entries without agency_id')
        
        # Group by organization
        organizations = entries_without_agency.values_list('organization', flat=True).distinct()
        
        for org_id in organizations:
            with transaction.atomic():
                # Get current max agency_id for this organization
                max_agency_id = FormEntry.objects.filter(
                    organization_id=org_id,
                    agency_id__isnull=False
                ).aggregate(max_id=models.Max('agency_id'))['max_id'] or 0
                
                # Get all entries for this organization without agency_id
                org_entries = FormEntry.objects.filter(
                    organization_id=org_id,
                    agency_id__isnull=True
                ).order_by('created_at')
                
                for entry in org_entries:
                    max_agency_id += 1
                    # Check if this agency_id already exists
                    while FormEntry.objects.filter(agency_id=max_agency_id).exists():
                        max_agency_id += 1
                    
                    entry.agency_id = max_agency_id
                    entry.save(update_fields=['agency_id'])
                    self.stdout.write(f'Assigned agency_id {max_agency_id} to entry {entry.id}')
        
        self.stdout.write(self.style.SUCCESS('Successfully fixed agency IDs')) 