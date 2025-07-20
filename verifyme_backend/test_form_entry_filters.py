#!/usr/bin/env python3
"""
Automated Form Entry Filter Testing Script
Tests all available filters for form entries using employee credentials
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/token/"  # Fixed: Use correct auth endpoint
FORMS_API_BASE = f"{BASE_URL}/forms/api"

# Employee credentials
EMPLOYEE_CREDENTIALS = {
    "email": "messi@coastalseven.com",
    "password": "Admin@super@123"
}

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_test_result(test_name, success, response=None, error=None, details=None, warning=None):
    """Print formatted test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if warning:
        print(f"   ⚠️  Warning: {warning}")
    if error:
        print(f"   Error: {error}")
    if response and not success:
        print(f"   Response: {response.status_code} - {response.text}")
    if details:
        print(f"   Details: {details}")

def get_auth_token(credentials):
    """Get JWT token for authentication using employee login portal"""
    try:
        response = requests.post(
            LOGIN_URL,
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

def get_user_profile(token):
    """Get current user profile"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/accounts/api/users/profile/",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to get user profile: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error getting user profile: {e}")
        return None

def get_available_schemas(token):
    """Get available form schemas for the user's organization"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{FORMS_API_BASE}/schemas/",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json().get("results", [])
        else:
            print(f"Failed to get schemas: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error getting schemas: {e}")
        return []

def analyze_schema_fields(schemas):
    """Analyze schema fields to determine which filters can be tested"""
    available_fields = set()
    schema_info = {}
    
    for schema in schemas:
        schema_id = schema.get("id")
        schema_name = schema.get("name", "Unknown")
        fields = schema.get("fields_definition", [])
        
        schema_fields = set()
        for field in fields:
            field_name = field.get("name", "").lower()
            schema_fields.add(field_name)
            available_fields.add(field_name)
        
        schema_info[schema_id] = {
            "name": schema_name,
            "fields": schema_fields
        }
    
    return available_fields, schema_info

def test_authentication():
    """Test employee authentication using login portal"""
    print_section("Testing Employee Authentication")
    
    print(f"🔐 Logging in as employee: {EMPLOYEE_CREDENTIALS['email']}")
    token = get_auth_token(EMPLOYEE_CREDENTIALS)
    if token:
        print_test_result("Employee Login", True)
        
        # Get user profile
        profile = get_user_profile(token)
        if profile:
            print(f"   👤 User: {profile.get('first_name', '')} {profile.get('last_name', '')}")
            print(f"   🏢 Organization: {profile.get('organization_name', 'N/A')}")
            print(f"   👨‍💼 Role: {profile.get('role', 'N/A')}")
        
        return token
    else:
        print_test_result("Employee Login", False)
        return None

def test_basic_entries_listing(token):
    """Test basic form entries listing"""
    print_section("Testing Basic Form Entries Listing")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{FORMS_API_BASE}/entries/",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            entries = data.get("results", [])
            count = data.get("count", 0)
            print_test_result("List Form Entries", True, details=f"Found {count} entries")
            return entries
        else:
            print_test_result("List Form Entries", False, response)
            return []
            
    except Exception as e:
        print_test_result("List Form Entries", False, error=str(e))
        return []

def test_my_entries_endpoint(token):
    """Test my entries endpoint"""
    print_section("Testing My Entries Endpoint")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{FORMS_API_BASE}/entries/my-entries/",
            headers=headers
        )
        
        if response.status_code == 200:
            entries = response.json()
            print_test_result("Get My Entries", True, details=f"Found {len(entries)} entries")
            return entries
        else:
            print_test_result("Get My Entries", False, response)
            return []
            
    except Exception as e:
        print_test_result("Get My Entries", False, error=str(e))
        return []

def test_advanced_filter(token, filter_name, filter_data, expected_behavior="", schema_fields=None):
    """Test advanced filter with specific filter data and schema validation"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Check if filter fields exist in schema
    warning = None
    if schema_fields:
        missing_fields = []
        for key in filter_data.keys():
            if key in ['bankNbfc', 'location', 'productType', 'caseStatus', 'fieldVerifier', 'backOfficeExecutive']:
                # Map filter keys to potential schema field names
                field_mappings = {
                    'bankNbfc': ['bank_nbfc_name', 'bank_nbfc', 'bank_name', 'nbfc_name'],
                    'location': ['location', 'state', 'city'],
                    'productType': ['product_type', 'product_type_name'],
                    'caseStatus': ['case_status', 'status'],
                    'fieldVerifier': ['field_verifier_name', 'field_verifier'],
                    'backOfficeExecutive': ['back_office_executive_name', 'back_office_executive']
                }
                
                potential_fields = field_mappings.get(key, [key])
                if not any(field in schema_fields for field in potential_fields):
                    missing_fields.append(key)
        
        if missing_fields:
            warning = f"Schema does not contain fields for filters: {', '.join(missing_fields)}"
    
    try:
        # Use the correct endpoint URL generated by the router
        response = requests.post(
            f"{FORMS_API_BASE}/entries/advanced-filter/",
            json=filter_data,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            entries = data.get("results", [])
            count = data.get("count", len(entries))
            print_test_result(f"Advanced Filter: {filter_name}", True, 
                           details=f"Found {count} entries {expected_behavior}",
                           warning=warning)
            return entries
        else:
            print_test_result(f"Advanced Filter: {filter_name}", False, response, warning=warning)
            return []
            
    except Exception as e:
        print_test_result(f"Advanced Filter: {filter_name}", False, error=str(e), warning=warning)
        return []

def test_basic_filters(token):
    """Test basic filters using query parameters"""
    print_section("Testing Basic Filters (Query Parameters)")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test search filter
    try:
        response = requests.get(
            f"{FORMS_API_BASE}/entries/?search=test",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            entries = data.get("results", [])
            count = data.get("count", 0)
            print_test_result("Basic Search Filter", True, details=f"Found {count} entries containing 'test'")
        else:
            print_test_result("Basic Search Filter", False, response)
    except Exception as e:
        print_test_result("Basic Search Filter", False, error=str(e))
    
    # Test status filter
    try:
        response = requests.get(
            f"{FORMS_API_BASE}/entries/?is_completed=true",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            entries = data.get("results", [])
            count = data.get("count", 0)
            print_test_result("Basic Status Filter", True, details=f"Found {count} completed entries")
        else:
            print_test_result("Basic Status Filter", False, response)
    except Exception as e:
        print_test_result("Basic Status Filter", False, error=str(e))

def test_date_filters(token, schema_fields):
    """Test all date-related filters"""
    print_section("Testing Date Filters")
    
    # Test start date filter
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    test_advanced_filter(token, "Start Date", {
        "startDate": start_date
    }, f"from {start_date}", schema_fields)
    
    # Test end date filter
    end_date = datetime.now().strftime("%Y-%m-%d")
    test_advanced_filter(token, "End Date", {
        "endDate": end_date
    }, f"until {end_date}", schema_fields)
    
    # Test date range
    test_advanced_filter(token, "Date Range", {
        "startDate": start_date,
        "endDate": end_date
    }, f"between {start_date} and {end_date}", schema_fields)
    
    # Test month filter
    current_month = datetime.now().month
    test_advanced_filter(token, "Month Filter", {
        "month": current_month
    }, f"for month {current_month}", schema_fields)
    
    # Test year filter
    current_year = datetime.now().year
    test_advanced_filter(token, "Year Filter", {
        "year": current_year
    }, f"for year {current_year}", schema_fields)

def test_status_filters(token, schema_fields):
    """Test all status-related filters"""
    print_section("Testing Status Filters")
    
    # Test completed filter
    test_advanced_filter(token, "Completed Entries", {
        "isCompleted": True
    }, "that are completed", schema_fields)
    
    test_advanced_filter(token, "Pending Entries", {
        "isCompleted": False
    }, "that are pending", schema_fields)
    
    # Test verified filter
    test_advanced_filter(token, "Verified Entries", {
        "isVerified": True
    }, "that are verified", schema_fields)
    
    test_advanced_filter(token, "Unverified Entries", {
        "isVerified": False
    }, "that are unverified", schema_fields)
    
    # Test out of TAT filter
    test_advanced_filter(token, "Out of TAT", {
        "isOutOfTat": True
    }, "that are out of TAT", schema_fields)

def test_search_filters(token, schema_fields):
    """Test search functionality"""
    print_section("Testing Search Filters")
    
    # Test general search
    test_advanced_filter(token, "General Search", {
        "search": "test"
    }, "containing 'test'", schema_fields)
    
    test_advanced_filter(token, "Empty Search", {
        "search": ""
    }, "with empty search", schema_fields)

def test_business_filters(token, schema_fields):
    """Test business-specific filters"""
    print_section("Testing Business Filters")
    
    # Test bank/NBFC filter
    test_advanced_filter(token, "Bank/NBFC Filter", {
        "bankNbfc": "HDFC"
    }, "for HDFC bank/NBFC", schema_fields)
    
    # Test location filter
    test_advanced_filter(token, "Location Filter - Maharashtra", {
        "location": "Maharashtra"
    }, "in Maharashtra", schema_fields)
    
    test_advanced_filter(token, "Location Filter - Goa", {
        "location": "Goa"
    }, "in Goa", schema_fields)
    
    # Test product type filter
    test_advanced_filter(token, "Product Type Filter", {
        "productType": "Personal Loan"
    }, "for Personal Loan product", schema_fields)
    
    # Test case status filter
    test_advanced_filter(token, "Case Status - Positive", {
        "caseStatus": "Positive"
    }, "with Positive status", schema_fields)
    
    test_advanced_filter(token, "Case Status - Negative", {
        "caseStatus": "Negative"
    }, "with Negative status", schema_fields)
    
    test_advanced_filter(token, "Case Status - Pending", {
        "caseStatus": "Pending"
    }, "with Pending status", schema_fields)

def test_personnel_filters(token, schema_fields):
    """Test personnel-related filters"""
    print_section("Testing Personnel Filters")
    
    # Test field verifier filter
    test_advanced_filter(token, "Field Verifier Filter", {
        "fieldVerifier": "John"
    }, "with field verifier 'John'", schema_fields)
    
    # Test back office executive filter
    test_advanced_filter(token, "Back Office Executive Filter", {
        "backOfficeExecutive": "Jane"
    }, "with back office executive 'Jane'", schema_fields)

def test_combination_filters(token, schema_fields):
    """Test filter combinations"""
    print_section("Testing Filter Combinations")
    
    # Test status + date combination
    test_advanced_filter(token, "Completed + Date Range", {
        "isCompleted": True,
        "startDate": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
        "endDate": datetime.now().strftime("%Y-%m-%d")
    }, "completed entries in last 7 days", schema_fields)
    
    # Test location + status combination
    test_advanced_filter(token, "Maharashtra + Pending", {
        "location": "Maharashtra",
        "isCompleted": False
    }, "pending entries in Maharashtra", schema_fields)
    
    # Test search + status combination
    test_advanced_filter(token, "Search + Verified", {
        "search": "test",
        "isVerified": True
    }, "verified entries containing 'test'", schema_fields)

def test_form_schema_filter(token, schema_info):
    """Test form schema filter"""
    print_section("Testing Form Schema Filter")
    
    if schema_info:
        # Test with first available schema
        first_schema_id = list(schema_info.keys())[0]
        schema_name = schema_info[first_schema_id]["name"]
        
        test_advanced_filter(token, "Form Schema Filter", {
            "formSchema": first_schema_id
        }, f"for schema '{schema_name}'")
    else:
        print_test_result("Form Schema Filter", False, 
                       details="No schemas available to test")

def test_employee_filter(token):
    """Test employee filter"""
    print_section("Testing Employee Filter")
    
    # Get current user profile to get employee ID
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/accounts/api/users/profile/",
            headers=headers
        )
        
        if response.status_code == 200:
            profile = response.json()
            employee_id = profile.get("id")
            if employee_id:
                test_advanced_filter(token, "Employee Filter", {
                    "employee": employee_id
                }, f"for employee {profile.get('first_name', '')} {profile.get('last_name', '')}")
            else:
                print_test_result("Employee Filter", False, 
                               details="No employee ID found")
        else:
            print_test_result("Get Profile", False, response)
            
    except Exception as e:
        print_test_result("Get Profile", False, error=str(e))

def test_repeat_case_filter(token, schema_fields):
    """Test repeat case filter"""
    print_section("Testing Repeat Case Filter")
    
    test_advanced_filter(token, "Repeat Cases", {
        "isRepeatCase": True
    }, "that are repeat cases", schema_fields)
    
    test_advanced_filter(token, "Non-Repeat Cases", {
        "isRepeatCase": False
    }, "that are not repeat cases", schema_fields)

def test_pagination_and_ordering(token, schema_fields):
    """Test pagination and ordering"""
    print_section("Testing Pagination and Ordering")
    
    # Test with pagination
    test_advanced_filter(token, "Pagination Test", {
        "page": 1,
        "page_size": 10
    }, "with pagination (page 1, size 10)", schema_fields)
    
    # Test with ordering
    test_advanced_filter(token, "Ordering Test", {
        "ordering": "-created_at"
    }, "ordered by creation date (newest first)", schema_fields)

def test_empty_filters(token, schema_fields):
    """Test empty filter scenarios"""
    print_section("Testing Empty Filter Scenarios")
    
    # Test with no filters
    test_advanced_filter(token, "No Filters", {}, "with no filters applied", schema_fields)
    
    # Test with null/empty values
    test_advanced_filter(token, "Empty Values", {
        "search": "",
        "bankNbfc": "",
        "location": ""
    }, "with empty filter values", schema_fields)

def main():
    """Main test function"""
    print("🚀 Starting Form Entry Filter Tests")
    print(f"📅 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"👤 Testing as Employee: {EMPLOYEE_CREDENTIALS['email']}")
    
    # Test authentication using employee login portal
    token = test_authentication()
    if not token:
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        sys.exit(1)
    
    # Get available schemas and analyze fields
    print_section("Analyzing Available Schemas")
    schemas = get_available_schemas(token)
    if schemas:
        print(f"📋 Found {len(schemas)} available schemas:")
        for schema in schemas:
            print(f"   • {schema.get('name', 'Unknown')} (ID: {schema.get('id', 'N/A')})")
        
        available_fields, schema_info = analyze_schema_fields(schemas)
        print(f"\n🔍 Available fields across all schemas: {', '.join(sorted(available_fields))}")
    else:
        print("⚠️  No schemas found. Some filters may not work properly.")
        available_fields = set()
        schema_info = {}
    
    # Test basic functionality first
    entries = test_basic_entries_listing(token)
    my_entries = test_my_entries_endpoint(token)
    
    if not entries and not my_entries:
        print("\n⚠️  No form entries found. Some filter tests may not return results.")
    
    # Test basic filters first (these should work)
    test_basic_filters(token)
    
    # Test all advanced filter types with schema validation
    test_date_filters(token, available_fields)
    test_status_filters(token, available_fields)
    test_search_filters(token, available_fields)
    test_business_filters(token, available_fields)
    test_personnel_filters(token, available_fields)
    test_form_schema_filter(token, schema_info)
    test_employee_filter(token)
    test_repeat_case_filter(token, available_fields)
    test_pagination_and_ordering(token, available_fields)
    test_combination_filters(token, available_fields)
    test_empty_filters(token, available_fields)
    
    print_section("Test Summary")
    print("✅ All filter tests completed!")
    print("\n📋 Filter Types Tested:")
    print("   • Basic filters (query parameters)")
    print("   • Date filters (startDate, endDate, month, year)")
    print("   • Status filters (isCompleted, isVerified, isOutOfTat)")
    print("   • Search filters")
    print("   • Business filters (bankNbfc, location, productType, caseStatus)")
    print("   • Personnel filters (fieldVerifier, backOfficeExecutive)")
    print("   • Form schema filter")
    print("   • Employee filter")
    print("   • Repeat case filter")
    print("   • Pagination and ordering")
    print("   • Filter combinations")
    print("   • Empty filter scenarios")
    
    print("\n🔍 Notes:")
    print("   • Some filters may return 0 results if no matching data exists")
    print("   • Warnings are shown when schema doesn't contain required fields")
    print("   • The important thing is that the API responds without errors")
    print("   • Employee login portal is used for authentication")
    print("   • Basic filters use query parameters, advanced filters use POST")

if __name__ == "__main__":
    main() 