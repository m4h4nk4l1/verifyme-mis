from django.apps import AppConfig

class AccountsConfig(AppConfig):
    """Configuration for accounts app"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
    verbose_name = 'User Accounts & Organizations'
    
    def ready(self):
        """Import signals when the app is ready"""
        import accounts.signals