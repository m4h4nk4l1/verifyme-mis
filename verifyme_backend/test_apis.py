#!/usr/bin/env python3
"""
Comprehensive API Test Script for VerifyMe Backend
Tests organization creation, user management, and authentication APIs
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/accounts/api"

# Test data
SUPER_ADMIN_CREDENTIALS = {
    "email": "superadmin@verifyme.com",
    "password": "superadmin123"
}

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_test_result(test_name, success, response=None, error=None):
    """Print formatted test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if error:
        print(f"   Error: {error}")
    if response and not success:
        print(f"   Response: {response.status_code} - {response.text}")

def get_auth_token(credentials):
    """Get JWT token for authentication"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/token/",
            json=credentials,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json()["access"]
        else:
            print(f"Authentication failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Authentication error: {e}")
        return None

def test_authentication():
    """Test JWT authentication"""
    print_section("Testing Authentication")
    
    # Test super admin login
    token = get_auth_token(SUPER_ADMIN_CREDENTIALS)
    if token:
        print_test_result("Super Admin Login", True)
        return token
    else:
        print_test_result("Super Admin Login", False)
        return None

def test_organization_creation(token):
    """Test organization creation by super admin"""
    print_section("Testing Organization Creation")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test data for organization creation
    org_data = {
        "name": "test_bank_001",
        "display_name": "Test Bank Ltd",
        "email": "contact@testbank.com",
        "phone": "+919876543210",
        "address_data": {
            "address": "123 Main Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001"
        },
        "business_type": "BANK",
        "max_employees": 50,
        "tat_hours_limit": 24,
        "admin_email": "admin@testbank.com",
        "admin_username": "testbank_admin",
        "admin_first_name": "John",
        "admin_last_name": "Doe",
        "admin_password": "admin123"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/organizations/",
            json=org_data,
            headers=headers
        )
        
        if response.status_code == 201:
            org_response = response.json()
            print_test_result("Create Organization", True)
            print(f"   Organization ID: {org_response['id']}")
            print(f"   Organization Name: {org_response['display_name']}")
            return org_response
        else:
            print_test_result("Create Organization", False, response)
            return None
            
    except Exception as e:
        print_test_result("Create Organization", False, error=str(e))
        return None

def test_organization_listing(token):
    """Test organization listing"""
    print_section("Testing Organization Listing")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{API_BASE}/organizations/",
            headers=headers
        )
        
        if response.status_code == 200:
            orgs = response.json()["results"]
            print_test_result("List Organizations", True)
            print(f"   Found {len(orgs)} organizations")
            for org in orgs:
                print(f"   - {org['display_name']} ({org['business_type']})")
            return orgs
        else:
            print_test_result("List Organizations", False, response)
            return None
            
    except Exception as e:
        print_test_result("List Organizations", False, error=str(e))
        return None

def test_organization_statistics(token):
    """Test organization statistics"""
    print_section("Testing Organization Statistics")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{API_BASE}/organizations/statistics/",
            headers=headers
        )
        
        if response.status_code == 200:
            stats = response.json()
            print_test_result("Get Organization Statistics", True)
            print(f"   Total Organizations: {stats.get('total_organizations', 0)}")
            print(f"   Active Organizations: {stats.get('active_organizations', 0)}")
            if 'business_type_breakdown' in stats:
                print("   Business Type Breakdown:")
                for breakdown in stats['business_type_breakdown']:
                    print(f"     - {breakdown['business_type']}: {breakdown['count']}")
            return stats
        else:
            print_test_result("Get Organization Statistics", False, response)
            return None
            
    except Exception as e:
        print_test_result("Get Organization Statistics", False, error=str(e))
        return None

def test_employee_creation(token, organization_id):
    """Test employee creation by admin"""
    print_section("Testing Employee Creation")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test data for employee creation
    employee_data = {
        "email": "employee1@testbank.com",
        "username": "employee1",
        "first_name": "Jane",
        "last_name": "Smith",
        "phone": "+919876543211",
        "employee_data": {
            "employee_id": "EMP001",
            "department": "Operations",
            "designation": "Executive"
        },
        "password": "employee123",
        "confirm_password": "employee123"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/users/create_employee/",
            json=employee_data,
            headers=headers
        )
        
        if response.status_code == 201:
            employee_response = response.json()
            print_test_result("Create Employee", True)
            print(f"   Employee ID: {employee_response['id']}")
            print(f"   Employee Name: {employee_response['first_name']} {employee_response['last_name']}")
            return employee_response
        else:
            print_test_result("Create Employee", False, response)
            return None
            
    except Exception as e:
        print_test_result("Create Employee", False, error=str(e))
        return None

def test_employee_listing(token):
    """Test employee listing"""
    print_section("Testing Employee Listing")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{API_BASE}/users/employees/",
            headers=headers
        )
        
        if response.status_code == 200:
            employees = response.json()["results"]
            print_test_result("List Employees", True)
            print(f"   Found {len(employees)} employees")
            for emp in employees:
                print(f"   - {emp['first_name']} {emp['last_name']} ({emp['role']})")
            return employees
        else:
            print_test_result("List Employees", False, response)
            return None
            
    except Exception as e:
        print_test_result("List Employees", False, error=str(e))
        return None

def test_user_profile(token):
    """Test user profile endpoint"""
    print_section("Testing User Profile")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{API_BASE}/users/profile/",
            headers=headers
        )
        
        if response.status_code == 200:
            profile = response.json()
            print_test_result("Get User Profile", True)
            print(f"   User: {profile['first_name']} {profile['last_name']}")
            print(f"   Role: {profile['role']}")
            print(f"   Organization: {profile.get('organization_name', 'N/A')}")
            return profile
        else:
            print_test_result("Get User Profile", False, response)
            return None
            
    except Exception as e:
        print_test_result("Get User Profile", False, error=str(e))
        return None

def main():
    """Main test function"""
    print("🚀 Starting VerifyMe API Tests")
    print(f"📅 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test authentication
    token = test_authentication()
    if not token:
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        sys.exit(1)
    
    # Test organization management
    org = test_organization_creation(token)
    if org:
        test_organization_listing(token)
        test_organization_statistics(token)
        
        # Test employee management
        employee = test_employee_creation(token, org['id'])
        if employee:
            test_employee_listing(token)
    
    # Test user profile
    test_user_profile(token)
    
    print_section("Test Summary")
    print("✅ All API tests completed!")
    print("\n📋 Next Steps:")
    print("1. Check the Django admin panel for created data")
    print("2. Test the frontend integration")
    print("3. Set up AWS S3 for file storage")
    print("4. Implement form management APIs")

if __name__ == "__main__":
    main() 