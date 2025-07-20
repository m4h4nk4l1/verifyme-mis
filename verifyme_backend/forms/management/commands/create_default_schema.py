from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from forms.models import DynamicFormSchema, FormField
from accounts.models import Organization
import uuid

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a default form schema with Customer Details and Quotation Details sections'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organization',
            type=str,
            help='Organization ID to create schema for'
        )

    def handle(self, *args, **options):
        # Get or create a default organization
        if options['organization']:
            try:
                organization = Organization.objects.get(id=options['organization'])
            except Organization.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Organization with ID {options["organization"]} not found')
                )
                return
        else:
            # Get the first organization or create one
            organization = Organization.objects.first()
            if not organization:
                self.stdout.write(
                    self.style.ERROR('No organization found. Please create an organization first.')
                )
                return

        # Get or create a super admin user
        super_admin = User.objects.filter(role='SUPER_ADMIN').first()
        if not super_admin:
            self.stdout.write(
                self.style.ERROR('No super admin user found. Please create a super admin first.')
                )
            return

        # Check if schema already exists
        schema_name = "Customer Quotation Form"
        existing_schema = DynamicFormSchema.objects.filter(
            organization=organization,
            name=schema_name
        ).first()

        if existing_schema:
            self.stdout.write(
                self.style.WARNING(f'Schema "{schema_name}" already exists for organization {organization.name}')
            )
            return

        # Create the form schema
        schema = DynamicFormSchema.objects.create(
            name=schema_name,
            description="Standard customer quotation form with customer and quotation details",
            organization=organization,
            created_by=super_admin,
            is_active=True,
            fields_definition=[
                # Customer Details Section
                {
                    "id": str(uuid.uuid4()),
                    "name": "customer_name",
                    "display_name": "Name",
                    "field_type": "STRING",
                    "validation_rules": {"max_length": 100, "min_length": 2},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "",
                    "help_text": "Enter the customer's full name",
                    "order": 1,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "street",
                    "display_name": "Street",
                    "field_type": "STRING",
                    "validation_rules": {"max_length": 200},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "",
                    "help_text": "Enter the street address",
                    "order": 2,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "house_number",
                    "display_name": "No.",
                    "field_type": "STRING",
                    "validation_rules": {"max_length": 20},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "",
                    "help_text": "Enter the house/building number",
                    "order": 3,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "zip_code",
                    "display_name": "ZIP Code",
                    "field_type": "STRING",
                    "validation_rules": {"max_length": 10, "pattern": r"^\d{5}(-\d{4})?$"},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "",
                    "help_text": "Enter the ZIP/postal code",
                    "order": 4,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "city",
                    "display_name": "City",
                    "field_type": "STRING",
                    "validation_rules": {"max_length": 100},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "",
                    "help_text": "Enter the city name",
                    "order": 5,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "country",
                    "display_name": "Country",
                    "field_type": "STRING",
                    "validation_rules": {"max_length": 100},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "Germany",
                    "help_text": "Enter the country name",
                    "order": 6,
                    "is_active": True
                },
                # Quotation Details Section
                {
                    "id": str(uuid.uuid4()),
                    "name": "purchase_order",
                    "display_name": "Purchase Order",
                    "field_type": "STRING",
                    "validation_rules": {"max_length": 50},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "",
                    "help_text": "Enter the purchase order number",
                    "order": 7,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "valid_from_date",
                    "display_name": "Valid From (Date)",
                    "field_type": "DATE",
                    "validation_rules": {},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "",
                    "help_text": "Enter the validity start date",
                    "order": 8,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "valid_from_time",
                    "display_name": "Valid From (Time)",
                    "field_type": "STRING",
                    "validation_rules": {"pattern": r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$"},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "12:00",
                    "help_text": "Enter the validity start time (HH:MM)",
                    "order": 9,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "net_value",
                    "display_name": "Net Value",
                    "field_type": "NUMERIC",
                    "validation_rules": {"min_value": 0, "max_value": 999999999},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "",
                    "help_text": "Enter the net value amount",
                    "order": 10,
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "currency",
                    "display_name": "Currency",
                    "field_type": "STRING",
                    "validation_rules": {"max_length": 10},
                    "is_required": True,
                    "is_unique": False,
                    "default_value": "Eur",
                    "help_text": "Enter the currency code",
                    "order": 11,
                    "is_active": True
                }
            ]
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created schema "{schema_name}" for organization {organization.name}'
            )
        )
        self.stdout.write(f'Schema ID: {schema.id}')
        self.stdout.write(f'Total fields: {len(schema.fields_definition)}') 