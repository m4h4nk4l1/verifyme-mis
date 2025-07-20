#!/usr/bin/env python
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verifyme_backend.settings')
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage

print("=== Django Storage Debug ===")
print(f"USE_S3: {settings.USE_S3}")
print(f"DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', None)}")
print(f"default_storage.__class__: {default_storage.__class__}")
print(f"default_storage.__class__.__name__: {default_storage.__class__.__name__}")

# Try to import the storage backend directly
try:
    from storages.backends.s3boto3 import S3Boto3Storage
    s3_storage = S3Boto3Storage()
    print(f"Direct S3Boto3Storage: {s3_storage.__class__}")
except Exception as e:
    print(f"Error importing S3Boto3Storage: {e}")

# Try to import your custom storage
try:
    from utils.storage import MediaStorage
    custom_storage = MediaStorage()
    print(f"Custom MediaStorage: {custom_storage.__class__}")
except Exception as e:
    print(f"Error importing MediaStorage: {e}")

print("=== End Debug ===") 