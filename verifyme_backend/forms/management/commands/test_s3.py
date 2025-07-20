from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import tempfile
import os


class Command(BaseCommand):
    help = 'Test AWS S3 connectivity and configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--upload-test',
            action='store_true',
            help='Upload a test file to S3',
        )
        parser.add_argument(
            '--list-files',
            action='store_true',
            help='List files in S3 bucket',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Testing AWS S3 Configuration...')
        )

        # Check if S3 is configured
        if not getattr(settings, 'USE_S3', False):
            self.stdout.write(
                self.style.WARNING('S3 is not configured. Check your environment variables.')
            )
            return

        # Check required settings
        required_settings = [
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_STORAGE_BUCKET_NAME',
            'AWS_S3_REGION_NAME',
        ]

        missing_settings = []
        for setting_name in required_settings:
            if not getattr(settings, setting_name, None):
                missing_settings.append(setting_name)

        if missing_settings:
            self.stdout.write(
                self.style.ERROR(f'Missing required settings: {", ".join(missing_settings)}')
            )
            return

        self.stdout.write(
            self.style.SUCCESS('✓ All required settings are configured')
        )

        # Test storage backend
        try:
            storage = default_storage
            self.stdout.write(
                self.style.SUCCESS(f'✓ Storage backend: {storage.__class__.__name__}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Storage backend error: {e}')
            )
            return

        # Test S3 connection
        try:
            # Try to list files (this will test the connection)
            files = list(storage.listdir(''))
            self.stdout.write(
                self.style.SUCCESS('✓ S3 connection successful')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ S3 connection failed: {e}')
            )
            return

        # Upload test file
        if options['upload_test']:
            self.test_file_upload(storage)

        # List files
        if options['list_files']:
            self.list_files(storage)

        self.stdout.write(
            self.style.SUCCESS('AWS S3 test completed successfully!')
        )

    def test_file_upload(self, storage):
        """Test file upload to S3"""
        self.stdout.write('Testing file upload...')

        try:
            # Create a test file
            test_content = 'This is a test file for S3 connectivity'
            test_filename = 'test_s3_connection.txt'

            # Upload file
            file_path = storage.save(test_filename, ContentFile(test_content))
            self.stdout.write(
                self.style.SUCCESS(f'✓ File uploaded: {file_path}')
            )

            # Check if file exists
            if storage.exists(file_path):
                self.stdout.write(
                    self.style.SUCCESS('✓ File exists in S3')
                )

                # Read file content
                with storage.open(file_path, 'r') as f:
                    content = f.read()
                    if content == test_content:
                        self.stdout.write(
                            self.style.SUCCESS('✓ File content matches')
                        )
                    else:
                        self.stdout.write(
                            self.style.ERROR('✗ File content mismatch')
                        )

                # Delete test file
                storage.delete(file_path)
                self.stdout.write(
                    self.style.SUCCESS('✓ Test file deleted')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('✗ File not found after upload')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ File upload test failed: {e}')
            )

    def list_files(self, storage):
        """List files in S3 bucket"""
        self.stdout.write('Listing files in S3 bucket...')

        try:
            files = list(storage.listdir(''))
            directories, files_list = files

            if directories:
                self.stdout.write('Directories:')
                for directory in directories:
                    self.stdout.write(f'  📁 {directory}')

            if files_list:
                self.stdout.write('Files:')
                for file in files_list:
                    self.stdout.write(f'  📄 {file}')
            else:
                self.stdout.write('No files found in root directory')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to list files: {e}')
            ) 