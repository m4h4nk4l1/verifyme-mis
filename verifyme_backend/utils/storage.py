import os
import logging
from datetime import datetime
from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings

# Set up logging
logger = logging.getLogger(__name__)

class MediaStorage(S3Boto3Storage):
    """Custom storage for media files"""
    location = 'media'
    file_overwrite = False
    default_acl = 'private'
    
    def get_accessed_time(self, name):
        """Return the last accessed time of the file"""
        return datetime.now()
    
    def get_created_time(self, name):
        """Return the creation time of the file"""
        return datetime.now()
    
    def _save(self, name, content):
        """Override save method to add logging"""
        try:
            logger.info("=== S3 FILE SAVE DEBUG ===")
            logger.info(f"📤 Starting S3 file save...")
            logger.info(f"📤 File name: {name}")
            logger.info(f"📤 Content type: {type(content)}")
            logger.info(f"📤 Content size: {content.size if hasattr(content, 'size') else 'unknown'} bytes")
            logger.info(f"📤 S3 settings - Bucket: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Not set')}")
            logger.info(f"📤 S3 settings - Region: {getattr(settings, 'AWS_S3_REGION_NAME', 'Not set')}")
            
            # Test S3 connection before upload
            logger.info("🔗 Testing S3 connection...")
            if hasattr(self, 'test_s3_connection'):
                if self.test_s3_connection():
                    logger.info("✅ S3 connection successful")
                else:
                    logger.error("❌ S3 connection failed")
                    raise Exception("S3 connection failed")
            
            logger.info(f"💾 Saving file to S3: {name}")
            result = super()._save(name, content)
            logger.info(f"✅ File saved successfully to S3")
            logger.info(f"✅ Result: {result}")
            
            # Verify file exists in S3
            logger.info("🔍 Verifying file exists in S3...")
            if self.exists(name):
                logger.info(f"✅ File verified in S3: {name}")
            else:
                logger.warning(f"⚠️ File not found in S3: {name}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Error saving file to S3: {str(e)}")
            logger.error(f"❌ Error type: {type(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            raise


class StaticStorage(S3Boto3Storage):
    """Custom storage for static files"""
    location = 'static'
    default_acl = 'public-read'
    file_overwrite = True


class FormAttachmentStorage(S3Boto3Storage):
    """Custom storage for form attachments with organization-based organization"""
    location = 'form-attachments'
    file_overwrite = False
    default_acl = 'private'
    
    def get_accessed_time(self, name):
        """Return the last accessed time of the file"""
        return datetime.now()
    
    def get_created_time(self, name):
        """Return the creation time of the file"""
        return datetime.now()
    
    def _save(self, name, content):
        """Override save method to add logging"""
        try:
            logger.info("=== FORM ATTACHMENT S3 SAVE DEBUG ===")
            logger.info(f"📤 Starting form attachment S3 save...")
            logger.info(f"📤 File name: {name}")
            logger.info(f"📤 Content type: {type(content)}")
            logger.info(f"📤 Content size: {content.size if hasattr(content, 'size') else 'unknown'} bytes")
            logger.info(f"📤 Organization path: {name}")
            logger.info(f"📤 S3 settings - Bucket: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Not set')}")
            logger.info(f"📤 S3 settings - Region: {getattr(settings, 'AWS_S3_REGION_NAME', 'Not set')}")
            
            logger.info(f"💾 Saving form attachment to S3: {name}")
            result = super()._save(name, content)
            logger.info(f"✅ Form attachment saved successfully to S3")
            logger.info(f"✅ Result: {result}")
            
            # Verify file exists in S3
            logger.info("🔍 Verifying form attachment exists in S3...")
            if self.exists(name):
                logger.info(f"✅ Form attachment verified in S3: {name}")
            else:
                logger.warning(f"⚠️ Form attachment not found in S3: {name}")
            
            return result
        except Exception as e:
            logger.error(f"❌ Error saving form attachment to S3: {str(e)}")
            logger.error(f"❌ Error type: {type(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            raise


def get_file_upload_path(instance, filename):
    """
    Generate a unique file path for uploads based on organization and date
    """
    from accounts.models import Organization
    
    try:
        # Get organization from the instance or context
        organization = None
        if hasattr(instance, 'form_entry') and instance.form_entry:
            organization = instance.form_entry.organization
            logger.info(f"Getting organization from form_entry: {organization}")
        elif hasattr(instance, 'organization'):
            organization = instance.organization
            logger.info(f"Getting organization from instance: {organization}")
        elif hasattr(instance, 'uploaded_by') and instance.uploaded_by:
            organization = instance.uploaded_by.organization
            logger.info(f"Getting organization from uploaded_by: {organization}")
        
        # Create organization-specific path
        if organization:
            org_path = f"org_{organization.id}"
            logger.info(f"Using organization path: {org_path}")
        else:
            org_path = "unknown"
            logger.warning(f"No organization found for file upload, using: {org_path}")
        
        # Get current date for folder structure
        now = datetime.now()
        date_path = now.strftime("%Y/%m/%d")
        
        # Create unique filename to prevent conflicts
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{now.strftime('%H%M%S')}_{os.urandom(4).hex()}{ext}"
        
        final_path = f"{org_path}/{date_path}/{unique_filename}"
        logger.info(f"Generated file upload path: {final_path}")
        
        return final_path
    except Exception as e:
        logger.error(f"Error generating file upload path: {str(e)}")
        # Fallback path
        now = datetime.now()
        return f"uploads/{now.strftime('%Y/%m/%d')}/{filename}"


def get_document_upload_path(instance, filename):
    """
    Generate path for document uploads
    """
    return get_file_upload_path(instance, filename)


def get_profile_picture_upload_path(instance, filename):
    """
    Generate path for profile picture uploads
    """
    from accounts.models import Organization
    
    try:
        organization = None
        if hasattr(instance, 'organization'):
            organization = instance.organization
        
        org_path = f"org_{organization.id}" if organization else "unknown"
        now = datetime.now()
        date_path = now.strftime("%Y/%m")
        
        name, ext = os.path.splitext(filename)
        unique_filename = f"profile_{name}_{now.strftime('%H%M%S')}{ext}"
        
        final_path = f"profiles/{org_path}/{date_path}/{unique_filename}"
        logger.info(f"Generated profile picture path: {final_path}")
        return final_path
    except Exception as e:
        logger.error(f"Error generating profile picture path: {str(e)}")
        now = datetime.now()
        return f"profiles/{now.strftime('%Y/%m')}/{filename}"


def get_report_upload_path(instance, filename):
    """
    Generate path for report uploads
    """
    from accounts.models import Organization
    
    try:
        organization = None
        if hasattr(instance, 'organization'):
            organization = instance.organization
        
        org_path = f"org_{organization.id}" if organization else "unknown"
        now = datetime.now()
        date_path = now.strftime("%Y/%m")
        
        name, ext = os.path.splitext(filename)
        unique_filename = f"report_{name}_{now.strftime('%H%M%S')}{ext}"
        
        final_path = f"reports/{org_path}/{date_path}/{unique_filename}"
        logger.info(f"Generated report path: {final_path}")
        return final_path
    except Exception as e:
        logger.error(f"Error generating report path: {str(e)}")
        now = datetime.now()
        return f"reports/{now.strftime('%Y/%m')}/{filename}"


class S3FileManager:
    """Utility class for S3 file operations"""
    
    @staticmethod
    def get_presigned_url(file_path, expiration=3600):
        """
        Generate a presigned URL for private files
        """
        try:
            if not settings.DEBUG and hasattr(settings, 'AWS_STORAGE_BUCKET_NAME'):
                storage = MediaStorage()
                # Add timeout to prevent hanging
                import signal
                
                def timeout_handler(signum, frame):
                    raise TimeoutError("S3 operation timed out")
                
                # Set a 10-second timeout
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(10)
                
                try:
                    url = storage.url(file_path, expire=expiration)
                    signal.alarm(0)  # Cancel the alarm
                    logger.info(f"Generated presigned URL for {file_path}: {url}")
                    return url
                except TimeoutError:
                    logger.error(f"Timeout generating presigned URL for {file_path}")
                    return None
                finally:
                    signal.alarm(0)  # Ensure alarm is cancelled
            else:
                logger.info(f"Using local file URL for {file_path}")
                return None
        except Exception as e:
            logger.error(f"Error generating presigned URL for {file_path}: {str(e)}")
            return None
    
    @staticmethod
    def delete_file(file_path):
        """
        Delete a file from S3
        """
        try:
            if not settings.DEBUG and hasattr(settings, 'AWS_STORAGE_BUCKET_NAME'):
                storage = MediaStorage()
                storage.delete(file_path)
                logger.info(f"Successfully deleted file: {file_path}")
                return True
            else:
                logger.info(f"Local file deletion for: {file_path}")
                return True
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")
            return False
    
    @staticmethod
    def file_exists(file_path):
        """
        Check if a file exists in S3
        """
        try:
            if not settings.DEBUG and hasattr(settings, 'AWS_STORAGE_BUCKET_NAME'):
                storage = MediaStorage()
                exists = storage.exists(file_path)
                logger.info(f"File {file_path} exists: {exists}")
                return exists
            else:
                logger.info(f"Local file check for: {file_path}")
                return True
        except Exception as e:
            logger.error(f"Error checking file existence {file_path}: {str(e)}")
            return False
    
    @staticmethod
    def test_s3_connection():
        """
        Test S3 connection and configuration
        """
        try:
            logger.info("Testing S3 connection...")
            logger.info(f"AWS_ACCESS_KEY_ID: {'Set' if getattr(settings, 'AWS_ACCESS_KEY_ID', None) else 'Not set'}")
            logger.info(f"AWS_SECRET_ACCESS_KEY: {'Set' if getattr(settings, 'AWS_SECRET_ACCESS_KEY', None) else 'Not set'}")
            logger.info(f"AWS_STORAGE_BUCKET_NAME: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Not set')}")
            logger.info(f"AWS_S3_REGION_NAME: {getattr(settings, 'AWS_S3_REGION_NAME', 'Not set')}")
            logger.info(f"USE_S3: {getattr(settings, 'USE_S3', False)}")
            
            if getattr(settings, 'USE_S3', False):
                storage = MediaStorage()
                # Try to list files to test connection
                try:
                    files = list(storage.listdir(''))
                    logger.info(f"S3 connection successful. Found {len(files[1])} files in root")
                    return True
                except Exception as e:
                    logger.error(f"S3 connection failed: {str(e)}")
                    return False
            else:
                logger.info("S3 not enabled, using local storage")
                return True
        except Exception as e:
            logger.error(f"Error testing S3 connection: {str(e)}")
            return False 