from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from logs.models import AuditLog
from accounts.models import Organization
from datetime import timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Populate sample audit logs for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days of data to generate'
        )
        parser.add_argument(
            '--users',
            type=int,
            default=5,
            help='Number of users to create activities for'
        )

    def handle(self, *args, **options):
        days = options['days']
        num_users = options['users']
        
        # Get or create a test organization
        org, created = Organization.objects.get_or_create(
            name='Test Organization',
            defaults={
                'display_name': 'Test Organization',
                'email': 'test@example.com',
                'business_type': 'BANK'
            }
        )
        
        if created:
            self.stdout.write(f'Created test organization: {org.name}')
        
        # Get or create test users
        users = []
        for i in range(num_users):
            user, created = User.objects.get_or_create(
                email=f'employee{i+1}@example.com',
                defaults={
                    'username': f'employee{i+1}',
                    'first_name': f'Employee{i+1}',
                    'last_name': f'User{i+1}',
                    'role': 'EMPLOYEE',
                    'organization': org
                }
            )
            users.append(user)
            if created:
                self.stdout.write(f'Created test user: {user.get_full_name()}')
        
        # Create admin user
        admin, created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'username': 'admin',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'ADMIN',
                'organization': org
            }
        )
        users.append(admin)
        if created:
            self.stdout.write(f'Created admin user: {admin.get_full_name()}')
        
        # Generate audit logs for the specified number of days
        activities_created = 0
        current_time = timezone.now()
        
        for day in range(days):
            day_date = current_time - timedelta(days=day)
            
            # Generate 5-15 activities per day
            num_activities = random.randint(5, 15)
            
            for _ in range(num_activities):
                # Random time during the day
                hour = random.randint(8, 18)  # Business hours
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                
                activity_time = day_date.replace(
                    hour=hour, 
                    minute=minute, 
                    second=second,
                    microsecond=0
                )
                
                # Random user
                user = random.choice(users)
                
                # Random action
                action = random.choice(['LOGIN', 'LOGOUT', 'USER_CREATE'])
                
                # Create appropriate details based on action
                if action == 'LOGIN':
                    details = f'User logged in successfully from {random.choice(["192.168.1.100", "192.168.1.101", "192.168.1.102"])}'
                elif action == 'LOGOUT':
                    details = f'User logged out from {random.choice(["192.168.1.100", "192.168.1.101", "192.168.1.102"])}'
                else:  # USER_CREATE
                    details = f'New employee created by {admin.get_full_name()}'
                    user = admin  # Only admin can create users
                
                # Create audit log
                AuditLog.objects.create(
                    user=user,
                    action=action,
                    details=details,
                    ip_address=random.choice(["192.168.1.100", "192.168.1.101", "192.168.1.102"]),
                    timestamp=activity_time,
                    organization=org
                )
                activities_created += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {activities_created} audit log entries '
                f'for {len(users)} users over {days} days'
            )
        )
        
        # Show summary
        today = timezone.now().date()
        today_logins = AuditLog.objects.filter(
            action='LOGIN',
            timestamp__date=today
        ).count()
        
        today_logouts = AuditLog.objects.filter(
            action='LOGOUT',
            timestamp__date=today
        ).count()
        
        today_creations = AuditLog.objects.filter(
            action='USER_CREATE',
            timestamp__date=today
        ).count()
        
        unique_users_today = AuditLog.objects.filter(
            action='LOGIN',
            timestamp__date=today
        ).values('user').distinct().count()
        
        self.stdout.write(f'\nToday\'s Summary:')
        self.stdout.write(f'- Login activities: {today_logins}')
        self.stdout.write(f'- Logout activities: {today_logouts}')
        self.stdout.write(f'- User creations: {today_creations}')
        self.stdout.write(f'- Unique users: {unique_users_today}') 