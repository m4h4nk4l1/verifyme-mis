from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from logs.models import AuditLog
from django.utils import timezone
import json

User = get_user_model()

class AuditMiddleware(MiddlewareMixin):
    """Middleware to automatically log user activities"""
    
    def process_request(self, request):
        """Process the request and log activities"""
        # Store the request for use in process_response
        request._audit_start_time = timezone.now()
        return None
    
    def process_response(self, request, response):
        """Process the response and log activities"""
        # Get IP address
        ip_address = self.get_client_ip(request)
        
        # Log login activities - check for successful token response
        if request.path.endswith('/token/') and request.method == 'POST' and response.status_code == 200:
            try:
                # Parse the response to get user data
                response_data = json.loads(response.content.decode('utf-8'))
                if 'user' in response_data and 'id' in response_data['user']:
                    user_id = response_data['user']['id']
                    user = User.objects.get(id=user_id)
                    
                    # Log the login activity
                    AuditLog.objects.create(
                        user=user,
                        action='LOGIN',
                        details=f'User logged in successfully from {ip_address}',
                        ip_address=ip_address,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        timestamp=timezone.now(),
                        organization=user.organization
                    )
                    print(f"Logged login activity for user: {user.email}")
            except Exception as e:
                # Don't fail the request if logging fails
                print(f"Failed to log login activity: {e}")
        
        # Log logout activities - only for authenticated users
        elif request.path.endswith('/logout/') and request.method == 'POST':
            if request.user.is_authenticated:
                try:
                    AuditLog.objects.create(
                        user=request.user,
                        action='LOGOUT',
                        details=f'User logged out from {ip_address}',
                        ip_address=ip_address,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        timestamp=timezone.now(),
                        organization=request.user.organization
                    )
                    print(f"Logged logout activity for user: {request.user.email}")
                except Exception as e:
                    # Don't fail the request if logging fails
                    print(f"Failed to log logout activity: {e}")
        
        return response
    
    def get_client_ip(self, request):
        """Get the client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip 