#!/usr/bin/env python3
"""
Test script to verify form schema creation
"""
import requests
import json

# Configuration
BASE_URL = 'http://localhost:8000'
LOGIN_URL = f'{BASE_URL}/accounts/api/token/'
SCHEMAS_URL = f'{BASE_URL}/forms/api/schemas/'

def test_form_creation():
    """Test form schema creation"""
    
    # 1. Login to get token
    login_data = {
        'email': 'admin@example.com',  # Replace with actual admin email
        'password': 'admin123'  # Replace with actual password
    }
    
    print("1. Logging in...")
    login_response = requests.post(LOGIN_URL, json=login_data)
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return False
    
    token_data = login_response.json()
    access_token = token_data['access']
    
    print(f"Login successful. User: {token_data.get('user', {}).get('email', 'Unknown')}")
    
    # 2. Get current user to find organization
    headers = {'Authorization': f'Bearer {access_token}'}
    profile_response = requests.get(f'{BASE_URL}/accounts/api/users/profile/', headers=headers)
    
    if profile_response.status_code != 200:
        print(f"Failed to get user profile: {profile_response.status_code}")
        return False
    
    user_data = profile_response.json()
    organization_id = user_data.get('organization')
    
    print(f"User organization: {organization_id}")
    
    # 3. Create a test form schema
    schema_data = {
        'name': 'Test Form Schema',
        'description': 'A test form schema created via API',
        'max_fields': 10,
        'fields_definition': [
            {
                'name': 'full_name',
                'display_name': 'Full Name',
                'field_type': 'STRING',
                'is_required': True,
                'is_unique': False,
                'default_value': '',
                'help_text': 'Enter your full name'
            },
            {
                'name': 'email',
                'display_name': 'Email Address',
                'field_type': 'EMAIL',
                'is_required': True,
                'is_unique': True,
                'default_value': '',
                'help_text': 'Enter your email address'
            }
        ],
        'organization': organization_id,
        'is_active': True
    }
    
    print("2. Creating form schema...")
    print(f"Schema data: {json.dumps(schema_data, indent=2)}")
    
    create_response = requests.post(SCHEMAS_URL, json=schema_data, headers=headers)
    
    print(f"Create response status: {create_response.status_code}")
    print(f"Create response: {create_response.text}")
    
    if create_response.status_code == 201:
        print("✅ Form schema created successfully!")
        return True
    else:
        print("❌ Form schema creation failed!")
        return False

if __name__ == '__main__':
    test_form_creation() 