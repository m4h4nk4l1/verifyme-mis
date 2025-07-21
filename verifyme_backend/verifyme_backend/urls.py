"""
URL configuration for verifyme_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from accounts.views import CustomTokenObtainPairView, LogoutView
import logging

logger = logging.getLogger(__name__)

def test_view(request):
    """Simple test view to verify Django is working"""
    logger.info("🔍 Test view called")
    from django.http import JsonResponse
    return JsonResponse({'message': 'Django server is working', 'status': 'ok'})

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Frontend expects these exact paths
    path('accounts/', include('accounts.urls', namespace='accounts_direct')),
    path('forms/', include('forms.urls', namespace='forms_direct')),
    path('logs/', include('logs.urls', namespace='logs_direct')),
    
    # Alternative paths for compatibility
    path('api/accounts/', include('accounts.urls', namespace='accounts_api')),
    path('api/forms/', include('forms.urls', namespace='forms_api')),
    path('api/logs/', include('logs.urls', namespace='logs_api')),
    
    # Test endpoint
    path('api/test/', test_view, name='test'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
