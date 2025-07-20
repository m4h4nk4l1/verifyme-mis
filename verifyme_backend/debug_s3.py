#!/usr/bin/env python3
"""
Debug script for S3 configuration and file uploads
"""

import os
import sys
import django
from datetime import datetime

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verifyme_backend.settings')
django.setup()

from django.conf import settings
from utils.storage import S3FileManager, MediaStorage, FormAttachmentStorage
from forms.models import FileAttachment, FormEntry
from accounts.models import User, Organization
from django.core.files.base import ContentFile
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_s3_configuration():
    """Test S3 configuration"""
    print("=== S3 Configuration Test ===")
    
    # Check environment variables
    print(f"USE_S3: {getattr(settings, 'USE_S3', False)}")
    print(f"AWS_ACCESS_KEY_ID: {'Set' if getattr(settings, 'AWS_ACCESS_KEY_ID', None) else 'Not set'}")
    print(f"AWS_SECRET_ACCESS_KEY: {'Set' if getattr(settings, 'AWS_SECRET_ACCESS_KEY', None) else 'Not set'}")
    print(f"AWS_STORAGE_BUCKET_NAME: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Not set')}")
    print(f"AWS_S3_REGION_NAME: {getattr(settings, 'AWS_S3_REGION_NAME', 'Not set')}")
    print(f"AWS_S3_CUSTOM_DOMAIN: {getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', 'Not set')}")
    
    # Test S3 connection
    print("\n=== S3 Connection Test ===")
    connection_ok = S3FileManager.test_s3_connection()
    print(f"S3 Connection: {'OK' if connection_ok else 'FAILED'}")
    
    return connection_ok

def test_file_upload():
    """Test file upload functionality"""
    print("\n=== File Upload Test ===")
    
    try:
        # Get or create test organization and user
        org, created = Organization.objects.get_or_create(
            name="Test Organization",
            defaults={'description': 'Test org for S3 debugging'}
        )
        print(f"Organization: {org.name} (ID: {org.id})")
        
        user, created = User.objects.get_or_create(
            email="test@example.com",
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'organization': org,
                'role': 'EMPLOYEE'
            }
        )
        print(f"User: {user.get_full_name()} (ID: {user.id})")
        
        # Test direct file upload without FormEntry
        print("\n--- Testing direct file upload ---")
        
        # Create test file content
        test_content = f"Test file content created at {datetime.now()}"
        test_file = ContentFile(test_content.encode('utf-8'), name='test_file.txt')
        
        # Test MediaStorage directly
        media_storage = MediaStorage()
        test_file_path = f"test_uploads/{datetime.now().strftime('%Y/%m/%d')}/test_file_{datetime.now().strftime('%H%M%S')}.txt"
        
        print(f"Uploading to path: {test_file_path}")
        
        # Upload file
        uploaded_path = media_storage.save(test_file_path, test_file)
        print(f"File uploaded to: {uploaded_path}")
        
        # Check if file exists
        file_exists = media_storage.exists(uploaded_path)
        print(f"File exists in storage: {file_exists}")
        
        # Get file URL
        file_url = media_storage.url(uploaded_path)
        print(f"File URL: {file_url}")
        
        # Test presigned URL generation
        print("\n--- Testing presigned URL generation ---")
        try:
            presigned_url = S3FileManager.get_presigned_url(uploaded_path)
            print(f"Presigned URL: {presigned_url}")
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
        
        # Test file deletion
        print("\n--- Testing file deletion ---")
        try:
            deleted = S3FileManager.delete_file(uploaded_path)
            print(f"File deletion: {'Success' if deleted else 'Failed'}")
        except Exception as e:
            print(f"Error deleting file: {e}")
        
        # Clean up
        user.delete()
        org.delete()
        
        print("\n=== File Upload Test Completed ===")
        return True
        
    except Exception as e:
        print(f"Error in file upload test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_storage_classes():
    """Test storage classes"""
    print("\n=== Storage Classes Test ===")
    
    try:
        # Test MediaStorage
        media_storage = MediaStorage()
        print(f"MediaStorage location: {media_storage.location}")
        print(f"MediaStorage default_acl: {media_storage.default_acl}")
        
        # Test FormAttachmentStorage
        form_storage = FormAttachmentStorage()
        print(f"FormAttachmentStorage location: {form_storage.location}")
        print(f"FormAttachmentStorage default_acl: {form_storage.default_acl}")
        
        return True
    except Exception as e:
        print(f"Error testing storage classes: {e}")
        return False

def main():
    """Main debug function"""
    print("Starting S3 Debug Script")
    print("=" * 50)
    
    # Test 1: S3 Configuration
    config_ok = test_s3_configuration()
    
    # Test 2: Storage Classes
    storage_ok = test_storage_classes()
    
    # Test 3: File Upload (only if S3 is configured)
    if config_ok:
        upload_ok = test_file_upload()
    else:
        print("\nSkipping file upload test due to S3 configuration issues")
        upload_ok = False
    
    # Summary
    print("\n" + "=" * 50)
    print("DEBUG SUMMARY")
    print("=" * 50)
    print(f"S3 Configuration: {'OK' if config_ok else 'FAILED'}")
    print(f"Storage Classes: {'OK' if storage_ok else 'FAILED'}")
    print(f"File Upload: {'OK' if upload_ok else 'FAILED'}")
    
    if not config_ok:
        print("\nRECOMMENDATIONS:")
        print("1. Check your .env file for AWS credentials")
        print("2. Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set")
        print("3. Verify AWS_STORAGE_BUCKET_NAME is set")
        print("4. Verify AWS_S3_REGION_NAME is set")
        print("5. Check if USE_S3=true in your settings")
    
    return config_ok and storage_ok and upload_ok

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1) 