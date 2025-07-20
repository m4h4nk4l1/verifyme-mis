#!/usr/bin/env python
"""
Test script to verify Django setup and models
Run with: python test_setup.py
"""

import os
import sys
import django
from django.conf import settings

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verifyme_backend.settings')
django.setup()

def test_models():
    """Test that all models can be imported and have correct structure"""
    print("🧪 Testing Django Models...")
    
    try:
        # Test accounts models
        from accounts.models import User, Organization, UserProfile
        print("✅ Accounts models imported successfully")
        
        # Test forms models
        from forms.models import DynamicFormSchema, FormEntry, FormField
        print("✅ Forms models imported successfully")
        
        # Test masters models
        from masters.models import State, City, Bank, NBFC, ProductType, CaseStatus, OrganizationMasterData
        print("✅ Masters models imported successfully")
        
        # Test logs models
        from logs.models import UserActivity, SystemLog, AuditLog
        print("✅ Logs models imported successfully")
        
        # Test reports models
        from reports.models import Report, Export, Analytics, Dashboard
        print("✅ Reports models imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error importing models: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    print("\n🔌 Testing Database Connection...")
    
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result[0] == 1:
                print("✅ Database connection successful")
                return True
            else:
                print("❌ Database connection failed")
                return False
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def test_migrations():
    """Test that migrations are ready"""
    print("\n📦 Testing Migrations...")
    
    try:
        from django.core.management import call_command
        from io import StringIO
        
        # Check migration status
        out = StringIO()
        call_command('showmigrations', stdout=out)
        migrations_output = out.getvalue()
        
        # Check if all apps have migrations
        apps_with_migrations = ['accounts', 'forms', 'masters', 'logs', 'reports']
        for app in apps_with_migrations:
            if app in migrations_output:
                print(f"✅ {app} migrations found")
            else:
                print(f"❌ {app} migrations missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Migration test error: {e}")
        return False

def test_settings():
    """Test Django settings configuration"""
    print("\n⚙️ Testing Django Settings...")
    
    try:
        # Test key settings
        assert hasattr(settings, 'DATABASES'), "DATABASES setting missing"
        assert hasattr(settings, 'INSTALLED_APPS'), "INSTALLED_APPS setting missing"
        assert hasattr(settings, 'AUTH_USER_MODEL'), "AUTH_USER_MODEL setting missing"
        assert settings.AUTH_USER_MODEL == 'accounts.User', "Custom user model not configured"
        
        # Test required apps
        required_apps = ['accounts', 'forms', 'masters', 'logs', 'reports']
        for app in required_apps:
            assert app in settings.INSTALLED_APPS, f"{app} not in INSTALLED_APPS"
        
        print("✅ Django settings configured correctly")
        return True
        
    except Exception as e:
        print(f"❌ Settings test error: {e}")
        return False

def test_requirements():
    """Test that required packages are installed"""
    print("\n📦 Testing Required Packages...")
    
    try:
        import django
        import djangorestframework
        import psycopg2
        import djangorestframework_simplejwt
        import django_cors_headers
        import django_filters
        import django_extensions
        import psqlextra
        import openpyxl
        import boto3
        import pillow
        
        print("✅ All required packages installed")
        return True
        
    except ImportError as e:
        print(f"❌ Missing package: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Django Setup Verification...\n")
    
    tests = [
        test_requirements,
        test_settings,
        test_models,
        test_database_connection,
        test_migrations,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend foundation is ready.")
        print("\nNext steps:")
        print("1. Run migrations: python manage.py migrate")
        print("2. Create superuser: python manage.py createsuperuser")
        print("3. Start server: python manage.py runserver")
    else:
        print("⚠️ Some tests failed. Please check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    main() 