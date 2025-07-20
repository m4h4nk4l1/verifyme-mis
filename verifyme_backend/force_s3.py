#!/usr/bin/env python
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verifyme_backend.settings')
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage
from django.utils.module_loading import import_string

print("=== Force S3 Storage Test ===")

# Clear any cached storage backends
if hasattr(django.core.files.storage, '_default_storage'):
    delattr(django.core.files.storage, '_default_storage')

# Force reload of storage backend
storage_class = import_string(settings.DEFAULT_FILE_STORAGE)
print(f"Storage class from import_string: {storage_class}")

# Create new storage instance
new_storage = storage_class()
print(f"New storage instance: {new_storage.__class__}")

# Try to get default_storage again
from django.core.files.storage import default_storage
print(f"default_storage after reload: {default_storage.__class__}")

print("=== End Force Test ===") 