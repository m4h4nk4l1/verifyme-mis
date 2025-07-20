from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import User, UserProfile
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create UserProfile when User is created"""
    if created:
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when User is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()

@receiver(pre_save, sender=User)
def update_user_metadata(sender, instance, **kwargs):
    """Update user metadata before saving"""
    if instance.pk:  # Existing user
        instance.updated_at = timezone.now()
        
        # Log role changes
        try:
            old_instance = User.objects.get(pk=instance.pk)
            if old_instance.role != instance.role:
                logger.info(f"User {instance.email} role changed from {old_instance.role} to {instance.role}")
        except User.DoesNotExist:
            pass