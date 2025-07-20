# 🚀 Complete Setup Guide for VerifyMe Backend

## **Prerequisites Check**

Before we start, make sure you have these installed:

### 1. Python 3.12+ 
```bash
python3 --version
# Should show Python 3.12.x or higher
```

### 2. PostgreSQL 12+
```bash
psql --version
# Should show PostgreSQL 12.x or higher
```

### 3. pip (Python package manager)
```bash
pip --version
# Should show pip 24.x or higher
```

---

## **Step 1: Database Setup**

### 1.1 Create PostgreSQL Database
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE mis_database;
CREATE USER postgres WITH PASSWORD 'your_db_password';
GRANT ALL PRIVILEGES ON DATABASE mis_database TO postgres;
\q
```

### 1.2 Verify Database Connection
```bash
# Test connection
psql -h localhost -U postgres -d mis_database
# Enter password when prompted
# Type \q to exit
```

---

## **Step 2: Virtual Environment Setup**

### 2.1 Navigate to Project Directory
```bash
cd /home/kio/Review/Swanand/verifyme
```

### 2.2 Activate Virtual Environment
```bash
# Activate the existing virtual environment
source venv/bin/activate

# Verify activation (should show venv path)
which python
# Should show: /home/kio/Review/Swanand/verifyme/venv/bin/python
```

### 2.3 Verify Python Version in Virtual Environment
```bash
python --version
# Should show Python 3.12.x
```

---

## **Step 3: Install Dependencies**

### 3.1 Navigate to Backend Directory
```bash
cd verifyme_backend
```

### 3.2 Install Requirements
```bash
# Install all required packages
pip install -r requirements.txt

# This will install:
# - Django 5.2.3
# - Django REST Framework 3.16.0
# - PostgreSQL adapter (psycopg2-binary)
# - JWT authentication
# - CORS headers
# - And all other dependencies
```

### 3.3 Verify Installation
```bash
# Check Django version
python -c "import django; print(django.get_version())"
# Should show: 5.2.3

# Check if all packages are installed
python -c "import djangorestframework, psycopg2, djangorestframework_simplejwt; print('All packages installed successfully!')"
```

---

## **Step 4: Environment Configuration**

### 4.1 Update .env File
Your `.env` file is already created, but let's verify it has the correct values:

```bash
# Check current .env content
cat .env
```

Make sure these values are correct:
- `DB_PASSWORD=your_db_password` (use the password you set in Step 1.1)
- `SECRET_KEY=Swanand-Waidya` (this is fine for development)

### 4.2 Load Environment Variables
```bash
# Install python-dotenv if not already installed
pip install python-dotenv

# Test environment loading
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('DB_NAME:', os.getenv('DB_NAME'))"
# Should show: DB_NAME: mis_database
```

---

## **Step 5: Django Configuration**

### 5.1 Update Settings for Environment Loading
We need to add environment loading to settings.py. The settings file should already have this, but let's verify:

```python
# In verifyme_backend/settings.py, make sure this is at the top:
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
```

### 5.2 Test Django Configuration
```bash
# Test Django settings
python manage.py check
# Should show: System check identified no issues (0 silenced).
```

---

## **Step 6: Database Migrations**

### 6.1 Run Initial Migrations
```bash
# Apply all migrations
python manage.py migrate

# This will create all database tables:
# - users, organizations, user_profiles
# - dynamic_form_schemas, form_entries, form_fields
# - states, cities, banks, nbfcs, product_types, case_statuses
# - user_activities, system_logs, audit_logs
# - reports, exports, analytics, dashboards
```

### 6.2 Verify Database Tables
```bash
# Connect to database and check tables
psql -h localhost -U postgres -d mis_database -c "\dt"
# Should show all the tables listed above
```

---

## **Step 7: Create Superuser**

### 7.1 Create Super Admin Account
```bash
python manage.py createsuperuser

# Follow the prompts:
# Email: admin@verifyme.com
# Username: admin
# First name: Super
# Last name: Admin
# Password: (create a strong password)
# Password (again): (repeat the password)
```

### 7.2 Verify Superuser Creation
```bash
# Test login to Django admin
python manage.py shell
```

```python
# In the shell:
from accounts.models import User
user = User.objects.filter(is_superuser=True).first()
print(f"Superuser: {user.email} - Role: {user.role}")
# Should show: Superuser: admin@verifyme.com - Role: SUPER_ADMIN
exit()
```

---

## **Step 8: Test the Setup**

### 8.1 Run the Test Script
```bash
# Run our comprehensive test script
python test_setup.py

# This will test:
# ✅ All models can be imported
# ✅ Database connection works
# ✅ Migrations are applied
# ✅ Settings are configured correctly
# ✅ All required packages are installed
```

### 8.2 Start Development Server
```bash
# Start Django development server
python manage.py runserver

# You should see:
# Watching for file changes with StatReloader
# Performing system checks...
# System check identified no issues (0 silenced).
# Django version 5.2.3, using settings 'verifyme_backend.settings'
# Starting development server at http://127.0.0.1:8000/
# Quit the server with CONTROL-C.
```

### 8.3 Test Admin Interface
1. Open your browser
2. Go to: http://127.0.0.1:8000/admin/
3. Login with your superuser credentials
4. You should see the VerifyMe Admin interface

---

## **Step 9: Initial Data Setup**

### 9.1 Create Sample Organization
```bash
python manage.py shell
```

```python
# In the shell:
from accounts.models import User, Organization

# Create a sample organization
org = Organization.objects.create(
    name='sample_bank',
    display_name='Sample Bank Ltd',
    email='info@samplebank.com',
    phone='+91-9876543210',
    business_type='BANK',
    address_data={
        'address': '123 Main Street',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'pincode': '400001'
    }
)

print(f"Created organization: {org.display_name}")
exit()
```

### 9.2 Create Sample Admin User
```bash
python manage.py shell
```

```python
# In the shell:
from accounts.models import User, Organization

# Get the organization
org = Organization.objects.first()

# Create admin user
admin_user = User.objects.create_user(
    email='admin@samplebank.com',
    username='bankadmin',
    first_name='Bank',
    last_name='Admin',
    password='admin123',
    role='ADMIN',
    organization=org
)

print(f"Created admin user: {admin_user.email}")
exit()
```

---

## **Step 10: Verify Everything Works**

### 10.1 Test API Endpoints (Basic)
```bash
# Test if Django is responding
curl http://127.0.0.1:8000/admin/
# Should return HTML (admin login page)
```

### 10.2 Check Database Content
```bash
python manage.py shell
```

```python
# In the shell:
from accounts.models import User, Organization
from forms.models import DynamicFormSchema
from masters.models import State, City

# Check what we have
print(f"Organizations: {Organization.objects.count()}")
print(f"Users: {User.objects.count()}")
print(f"Form Schemas: {DynamicFormSchema.objects.count()}")
print(f"States: {State.objects.count()}")
print(f"Cities: {City.objects.count()}")

exit()
```

---

## **🚨 Troubleshooting Common Issues**

### Issue 1: Database Connection Error
```bash
# Error: connection to server at "localhost" failed
# Solution: Make sure PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Issue 2: Migration Errors
```bash
# Error: relation "django_migrations" does not exist
# Solution: Run migrations in order
python manage.py migrate --run-syncdb
python manage.py migrate
```

### Issue 3: Import Errors
```bash
# Error: No module named 'psycopg2'
# Solution: Install PostgreSQL adapter
pip install psycopg2-binary
```

### Issue 4: Environment Variables Not Loading
```bash
# Error: KeyError: 'DB_NAME'
# Solution: Make sure .env file is in correct location
ls -la .env
# Should show the .env file in verifyme_backend directory
```

---

## **✅ Success Checklist**

After completing all steps, you should have:

- [ ] PostgreSQL database `mis_database` created
- [ ] Virtual environment activated
- [ ] All dependencies installed
- [ ] Environment variables loaded
- [ ] Django migrations applied
- [ ] Superuser account created
- [ ] Development server running
- [ ] Admin interface accessible
- [ ] Sample organization and admin user created
- [ ] All tests passing

---

## **🎯 Next Steps**

Once this setup is complete, you can proceed to:

1. **API Development**: Create REST API endpoints
2. **Authentication**: Implement JWT login/logout
3. **Form Builder**: Create dynamic form management
4. **Frontend Integration**: Connect with React/Next.js
5. **Testing**: Write comprehensive tests

---

## **📞 Need Help?**

If you encounter any issues:

1. Check the error messages carefully
2. Verify all prerequisites are installed
3. Ensure database is running and accessible
4. Check that virtual environment is activated
5. Verify .env file has correct values

**Remember**: This is a production-ready foundation. Take your time to understand each step! 