from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'List all users in the database'

    def handle(self, *args, **options):
        users = User.objects.all()
        
        if not users.exists():
            self.stdout.write(
                self.style.WARNING('No users found in the database.')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'Found {users.count()} users:')
        )
        
        for user in users:
            self.stdout.write(
                f'  - {user.get_full_name()} ({user.email}) - Role: {user.role} - Org: {user.organization.display_name if user.organization else "None"}'
            ) 