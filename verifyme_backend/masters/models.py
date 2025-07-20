from django.db import models
import uuid

def create_state_manager():
    """Factory function to create StateManager with functional approach"""
    class StateManager(models.Manager):
        def get_active_states(self):
            """Get all active states"""
            return self.filter(is_active=True).order_by('name')
        
        def get_states_by_organization(self, organization_id):
            """Get states available for an organization"""
            return self.filter(
                is_active=True,
                organizations__id=organization_id
            ).order_by('name')
    
    return StateManager()

def create_city_manager():
    """Factory function to create CityManager with functional approach"""
    class CityManager(models.Manager):
        def get_cities_by_state(self, state_id):
            """Get cities by state"""
            return self.filter(
                state_id=state_id,
                is_active=True
            ).order_by('name')
        
        def get_cities_by_organization(self, organization_id):
            """Get cities available for an organization"""
            return self.filter(
                is_active=True,
                state__organizations__id=organization_id
            ).order_by('state__name', 'name')
    
    return CityManager()

def create_bank_manager():
    """Factory function to create BankManager with functional approach"""
    class BankManager(models.Manager):
        def get_active_banks(self):
            """Get all active banks"""
            return self.filter(is_active=True).order_by('name')
        
        def get_banks_by_organization(self, organization_id):
            """Get banks available for an organization"""
            return self.filter(
                is_active=True,
                organizations__id=organization_id
            ).order_by('name')
    
    return BankManager()

class State(models.Model):
    """State model for storing Indian states"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, help_text="State code like MH, GA")
    
    # Configuration
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Manager
    objects = create_state_manager()
    
    class Meta:
        db_table = 'states'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    @property
    def cities_count(self):
        """Get count of cities in this state"""
        return self.cities.filter(is_active=True).count()

class City(models.Model):
    """City model for storing cities within states"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='cities')
    
    # Configuration
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Manager
    objects = create_city_manager()
    
    class Meta:
        db_table = 'cities'
        ordering = ['state__name', 'name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['state']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'state'],
                name='unique_city_per_state'
            )
        ]
    
    def __str__(self):
        return f"{self.name}, {self.state.name}"

class Bank(models.Model):
    """Bank model for storing bank information"""
    
    BANK_TYPES = [
        ('PUBLIC', 'Public Sector Bank'),
        ('PRIVATE', 'Private Sector Bank'),
        ('FOREIGN', 'Foreign Bank'),
        ('COOPERATIVE', 'Cooperative Bank'),
        ('SMALL_FINANCE', 'Small Finance Bank'),
        ('PAYMENT', 'Payment Bank'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=50, blank=True)
    bank_type = models.CharField(max_length=20, choices=BANK_TYPES, default='PRIVATE')
    
    # Contact Information
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    # Address Information
    head_office_address = models.TextField(blank=True)
    head_office_city = models.ForeignKey(
        City, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='head_office_banks'
    )
    
    # Configuration
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Manager
    objects = create_bank_manager()
    
    class Meta:
        db_table = 'banks'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['bank_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name

class NBFC(models.Model):
    """NBFC model for storing Non-Banking Financial Company information"""
    
    NBFC_TYPES = [
        ('DEPOSIT', 'Deposit Taking NBFC'),
        ('NON_DEPOSIT', 'Non-Deposit Taking NBFC'),
        ('INFRASTRUCTURE', 'Infrastructure Finance Company'),
        ('MICROFINANCE', 'Microfinance Institution'),
        ('FACTORING', 'Factoring Company'),
        ('INVESTMENT', 'Investment Company'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=50, blank=True)
    nbfc_type = models.CharField(max_length=20, choices=NBFC_TYPES, default='NON_DEPOSIT')
    
    # Regulatory Information
    rbi_registration_number = models.CharField(max_length=50, blank=True)
    
    # Contact Information
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    # Address Information
    registered_office_address = models.TextField(blank=True)
    registered_office_city = models.ForeignKey(
        City, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='registered_office_nbfcs'
    )
    
    # Configuration
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'nbfcs'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['nbfc_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name

class ProductType(models.Model):
    """Product type model for storing loan/product categories"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    # Configuration
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_types'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name

class CaseStatus(models.Model):
    """Case status model for storing case status options"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    # Status Configuration
    is_positive = models.BooleanField(default=False, help_text="Whether this is a positive status")
    is_negative = models.BooleanField(default=False, help_text="Whether this is a negative status")
    is_pending = models.BooleanField(default=False, help_text="Whether this is a pending status")
    
    # Color coding for UI
    color_code = models.CharField(max_length=7, default='#000000', help_text="Hex color code")
    
    # Configuration
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'case_statuses'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def status_category(self):
        """Get the category of this status"""
        if self.is_positive:
            return 'positive'
        elif self.is_negative:
            return 'negative'
        elif self.is_pending:
            return 'pending'
        return 'neutral'

class OrganizationMasterData(models.Model):
    """Model for storing organization-specific master data relationships"""
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Organization Relationship
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='master_data'
    )
    
    # Master Data Relationships
    states = models.ManyToManyField(State, blank=True, related_name='organizations')
    cities = models.ManyToManyField(City, blank=True, related_name='organizations')
    banks = models.ManyToManyField(Bank, blank=True, related_name='organizations')
    nbfcs = models.ManyToManyField(NBFC, blank=True, related_name='organizations')
    product_types = models.ManyToManyField(ProductType, blank=True, related_name='organizations')
    case_statuses = models.ManyToManyField(CaseStatus, blank=True, related_name='organizations')
    
    # Configuration
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_master_data'
    )
    
    class Meta:
        db_table = 'organization_master_data'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['organization'],
                name='unique_master_data_per_organization'
            )
        ]
    
    def __str__(self):
        return f"Master Data - {self.organization.name}"
    
    def get_available_states(self):
        """Get available states for this organization"""
        return self.states.filter(is_active=True).order_by('name')
    
    def get_available_cities(self):
        """Get available cities for this organization"""
        return self.cities.filter(is_active=True).order_by('state__name', 'name')
    
    def get_available_banks(self):
        """Get available banks for this organization"""
        return self.banks.filter(is_active=True).order_by('name')
    
    def get_available_nbfcs(self):
        """Get available NBFCs for this organization"""
        return self.nbfcs.filter(is_active=True).order_by('name')
    
    def get_available_product_types(self):
        """Get available product types for this organization"""
        return self.product_types.filter(is_active=True).order_by('name')
    
    def get_available_case_statuses(self):
        """Get available case statuses for this organization"""
        return self.case_statuses.filter(is_active=True).order_by('name')
