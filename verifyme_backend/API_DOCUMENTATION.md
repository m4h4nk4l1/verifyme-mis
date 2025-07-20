 # VerifyMe Multi-Tenant MIS API Documentation

## Overview
This document provides comprehensive API documentation for the VerifyMe Multi-Tenant Management Information System (MIS) built with Django 5.2.3, DRF, PostgreSQL, and AWS S3.

## Base URL
```
http://localhost:8000
```

## Authentication
All API endpoints require JWT authentication except where noted.

### Get JWT Token
```bash
POST /api/auth/token/
Content-Type: application/json

{
    "username": "your_username",
    "password": "your_password"
}
```

### Refresh Token
```bash
POST /api/auth/token/refresh/
Content-Type: application/json

{
    "refresh": "your_refresh_token"
}
```

### Verify Token
```bash
POST /api/auth/token/verify/
Content-Type: application/json

{
    "token": "your_access_token"
}
```

## User Roles
- **SUPER_ADMIN**: Full system access
- **ADMIN**: Organization-level access
- **EMPLOYEE**: Limited access to own data

---

## 1. Accounts Management

### Organizations

#### List Organizations
```bash
GET /accounts/api/organizations/
Authorization: Bearer <token>
```

#### Create Organization (Super Admin Only)
```bash
POST /accounts/api/organizations/
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "Organization Name",
    "display_name": "Display Name",
    "email": "org@example.com",
    "business_type": "AUTO_LOAN",
    "max_employees": 100
}
```

#### Get Organization Statistics
```bash
GET /accounts/api/organizations/statistics/
Authorization: Bearer <token>
```

### Users

#### List Users
```bash
GET /accounts/api/users/
Authorization: Bearer <token>
```

#### Create Employee
```bash
POST /accounts/api/users/
Authorization: Bearer <token>
Content-Type: application/json

{
    "username": "employee1",
    "email": "employee@example.com",
    "password": "secure_password",
    "first_name": "John",
    "last_name": "Doe",
    "role": "EMPLOYEE",
    "organization": "org_uuid",
    "phone": "+1234567890",
    "employee_data": {
        "employee_id": "EMP001",
        "department": "Sales"
    }
}
```

---

## 2. Forms Management

### Form Schemas

#### List Form Schemas
```bash
GET /forms/api/schemas/
Authorization: Bearer <token>
```

#### Create Form Schema
```bash
POST /forms/api/schemas/
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "Loan Application Form",
    "description": "Standard loan application form",
    "is_active": true,
    "fields": [
        {
            "name": "applicant_name",
            "display_name": "Applicant Name",
            "field_type": "TEXT",
            "is_required": true,
            "validation_rules": {"max_length": 100}
        },
        {
            "name": "loan_amount",
            "display_name": "Loan Amount",
            "field_type": "NUMBER",
            "is_required": true,
            "validation_rules": {"min_value": 1000, "max_value": 1000000}
        }
    ]
}
```

#### Get Form Schema Statistics
```bash
GET /forms/api/schemas/statistics/
Authorization: Bearer <token>
```

### Form Entries

#### List Form Entries
```bash
GET /forms/api/entries/
Authorization: Bearer <token>
```

#### Create Form Entry
```bash
POST /forms/api/entries/
Authorization: Bearer <token>
Content-Type: application/json

{
    "form_schema": "schema_uuid",
    "form_data": {
        "applicant_name": "John Doe",
        "loan_amount": 50000
    }
}
```

#### Complete Form Entry
```bash
POST /forms/api/entries/{entry_id}/complete/
Authorization: Bearer <token>
```

#### Verify Form Entry (Admin Only)
```bash
POST /forms/api/entries/{entry_id}/verify/
Authorization: Bearer <token>
Content-Type: application/json

{
    "verification_notes": "All documents verified"
}
```

### File Attachments

#### Upload File
```bash
POST /forms/api/files/
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
form_entry: <entry_uuid>
description: "Supporting document"
```

#### List Files
```bash
GET /forms/api/files/
Authorization: Bearer <token>
```

#### Get File Statistics
```bash
GET /forms/api/files/statistics/
Authorization: Bearer <token>
```

#### Verify File (Admin Only)
```bash
PATCH /forms/api/files/{file_id}/
Authorization: Bearer <token>
Content-Type: application/json

{
    "is_verified": true,
    "verification_notes": "Document verified"
}
```

---

## 3. Reports & Analytics

### Reports

#### List Reports
```bash
GET /reports/api/reports/
Authorization: Bearer <token>
```

#### Create Report
```bash
POST /reports/api/reports/
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "Monthly Form Submissions",
    "description": "Monthly report of form submissions",
    "report_type": "MONTHLY",
    "format": "EXCEL",
    "parameters": {
        "date_range": "last_month",
        "include_attachments": true
    },
    "is_scheduled": true,
    "schedule_cron": "0 0 1 * *"
}
```

#### Generate Report
```bash
POST /reports/api/reports/{report_id}/generate/
Authorization: Bearer <token>
```

#### Schedule Report
```bash
POST /reports/api/reports/{report_id}/schedule/
Authorization: Bearer <token>
Content-Type: application/json

{
    "schedule_cron": "0 0 1 * *"
}
```

#### Get Report Statistics
```bash
GET /reports/api/reports/statistics/
Authorization: Bearer <token>
```

### Exports

#### List Exports
```bash
GET /reports/api/exports/
Authorization: Bearer <token>
```

#### Create Export
```bash
POST /reports/api/exports/
Authorization: Bearer <token>
Content-Type: application/json

{
    "export_type": "FORM_DATA",
    "format": "EXCEL",
    "filters": {
        "date_from": "2024-01-01",
        "date_to": "2024-12-31",
        "organization": "org_uuid"
    }
}
```

#### Download Export
```bash
POST /reports/api/exports/{export_id}/download/
Authorization: Bearer <token>
```

#### Get Export Statistics
```bash
GET /reports/api/exports/statistics/
Authorization: Bearer <token>
```

### Analytics

#### List Analytics
```bash
GET /reports/api/analytics/
Authorization: Bearer <token>
```

#### Create Analytics
```bash
POST /reports/api/analytics/
Authorization: Bearer <token>
Content-Type: application/json

{
    "analytics_type": "FORM_SUBMISSIONS",
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-12-31T23:59:59Z",
    "data": {
        "total_submissions": 150,
        "completed_submissions": 120,
        "verification_rate": 80.0
    }
}
```

#### Generate Analytics
```bash
POST /reports/api/analytics/generate/
Authorization: Bearer <token>
Content-Type: application/json

{
    "analytics_type": "FORM_SUBMISSIONS",
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-12-31T23:59:59Z"
}
```

#### Get Analytics Statistics
```bash
GET /reports/api/analytics/statistics/
Authorization: Bearer <token>
```

### Dashboards

#### List Dashboards
```bash
GET /reports/api/dashboards/
Authorization: Bearer <token>
```

#### Create Dashboard
```bash
POST /reports/api/dashboards/
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "Executive Dashboard",
    "description": "High-level overview dashboard",
    "configuration": {
        "widgets": [
            {
                "id": "form_submissions",
                "type": "chart",
                "position": {"x": 0, "y": 0, "w": 6, "h": 4},
                "config": {
                    "title": "Form Submissions",
                    "chart_type": "line"
                }
            }
        ]
    },
    "is_public": true,
    "allowed_roles": ["ADMIN", "SUPER_ADMIN"],
    "is_default": false
}
```

#### Set Default Dashboard
```bash
POST /reports/api/dashboards/{dashboard_id}/set_default/
Authorization: Bearer <token>
```

#### Get Dashboard Statistics
```bash
GET /reports/api/dashboards/statistics/
Authorization: Bearer <token>
```

---

## 4. Master Data Management

### States
```bash
GET /masters/api/states/
Authorization: Bearer <token>
```

### Cities
```bash
GET /masters/api/cities/?state=Maharashtra
Authorization: Bearer <token>
```

### Banks
```bash
GET /masters/api/banks/
Authorization: Bearer <token>
```

### NBFCs
```bash
GET /masters/api/nbfcs/
Authorization: Bearer <token>
```

### Product Types
```bash
GET /masters/api/product-types/
Authorization: Bearer <token>
```

### Case Statuses
```bash
GET /masters/api/case-statuses/
Authorization: Bearer <token>
```

---

## 5. Logging & Audit

### User Activities
```bash
GET /logs/api/user-activities/
Authorization: Bearer <token>
```

### System Logs
```bash
GET /logs/api/system-logs/
Authorization: Bearer <token>
```

### Audit Logs
```bash
GET /logs/api/audit-logs/
Authorization: Bearer <token>
```

---

## 6. File Management

### S3 File Operations

#### Upload File
Files are automatically uploaded to AWS S3 when using the file attachment endpoints.

#### Get Presigned URL
```python
from utils.storage import S3FileManager

# Get presigned URL for private file
url = S3FileManager.get_presigned_url(file_path, expiration=3600)
```

#### Delete File
```python
from utils.storage import S3FileManager

# Delete file from S3
success = S3FileManager.delete_file(file_path)
```

---

## 7. Common Query Parameters

### Pagination
```bash
GET /api/endpoint/?page=1&page_size=20
```

### Filtering
```bash
GET /api/endpoint/?field=value&another_field=value
```

### Searching
```bash
GET /api/endpoint/?search=search_term
```

### Ordering
```bash
GET /api/endpoint/?ordering=field_name
GET /api/endpoint/?ordering=-field_name  # Descending
```

---

## 8. Error Responses

### Standard Error Format
```json
{
    "error": "Error message",
    "detail": "Detailed error information",
    "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## 9. Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour

---

## 10. Testing Examples

### Complete Workflow Example

1. **Login and Get Token**
```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

2. **Create Form Schema**
```bash
curl -X POST http://localhost:8000/forms/api/schemas/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Form",
    "description": "Test form schema",
    "is_active": true
  }'
```

3. **Create Form Entry**
```bash
curl -X POST http://localhost:8000/forms/api/entries/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "form_schema": "<schema_uuid>",
    "form_data": {"field1": "value1"}
  }'
```

4. **Upload File**
```bash
curl -X POST http://localhost:8000/forms/api/files/ \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "form_entry=<entry_uuid>" \
  -F "description=Supporting document"
```

5. **Generate Report**
```bash
curl -X POST http://localhost:8000/reports/api/reports/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Report",
    "report_type": "CUSTOM",
    "format": "EXCEL"
  }'
```

---

## 11. Environment Variables

Required environment variables:
```bash
# Database
DB_NAME=verifyme_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=ap-south-1
USE_S3=True

# Django
SECRET_KEY=your_secret_key
DEBUG=True
FIELD_ENCRYPTION_KEY=your_32_char_encryption_key
```

---

## 12. Deployment

### Production Checklist
- [ ] Set `DEBUG=False`
- [ ] Configure production database
- [ ] Set up AWS S3 credentials
- [ ] Configure CORS settings
- [ ] Set up SSL/TLS
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Configure backup strategy

### Docker Deployment
```bash
# Build image
docker build -t verifyme-backend .

# Run container
docker run -p 8000:8000 verifyme-backend
```

---

## Support

For technical support or questions about the API:
- Email: support@verifyme.com
- Documentation: https://docs.verifyme.com
- GitHub: https://github.com/verifyme/backend