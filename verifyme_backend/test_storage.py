import os
from dotenv import load_dotenv
load_dotenv()
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verifyme_backend.settings')
print('AWS_ACCESS_KEY_ID:', os.environ.get('AWS_ACCESS_KEY_ID'))
print('USE_S3:', os.environ.get('USE_S3'))
print('DEBUG:', os.environ.get('DEBUG'))
import django
django.setup()
from django.conf import settings
print('USE_S3:', settings.USE_S3)
print('DEFAULT_FILE_STORAGE:', getattr(settings, 'DEFAULT_FILE_STORAGE', None))

def check_storage():
    from django.core.files.storage import default_storage
    print(default_storage.__class__)

if __name__ == '__main__':
    check_storage()