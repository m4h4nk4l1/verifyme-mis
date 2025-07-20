#!/bin/bash

# 🚀 Quick Setup Script for VerifyMe Backend
# This script automates the setup process for junior developers

set -e  # Exit on any error

echo "🚀 Starting VerifyMe Backend Setup..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    print_error "Please run this script from the verifyme_backend directory"
    exit 1
fi

# Step 1: Check Python version
print_status "Checking Python version..."
python_version=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
required_version="3.12"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" = "$required_version" ]; then
    print_success "Python version $python_version is compatible"
else
    print_error "Python $required_version or higher is required. Found: $python_version"
    exit 1
fi

# Step 2: Check if virtual environment is activated
print_status "Checking virtual environment..."
if [[ "$VIRTUAL_ENV" != "" ]]; then
    print_success "Virtual environment is activated: $VIRTUAL_ENV"
else
    print_warning "Virtual environment not detected. Please activate it first:"
    echo "source ../venv/bin/activate"
    exit 1
fi

# Step 3: Install requirements
print_status "Installing Python dependencies..."
if pip install -r requirements.txt; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 4: Check .env file
print_status "Checking .env file..."
if [ -f ".env" ]; then
    print_success ".env file found"
    
    # Check if database password is set
    if grep -q "DB_PASSWORD=your_db_password" .env; then
        print_warning "Please update DB_PASSWORD in .env file with your actual database password"
        echo "Edit .env file and change: DB_PASSWORD=your_db_password"
        echo "To: DB_PASSWORD=your_actual_password"
        read -p "Press Enter after updating the password..."
    fi
else
    print_error ".env file not found"
    exit 1
fi

# Step 5: Test Django configuration
print_status "Testing Django configuration..."
if python manage.py check; then
    print_success "Django configuration is valid"
else
    print_error "Django configuration has issues"
    exit 1
fi

# Step 6: Run migrations
print_status "Running database migrations..."
if python manage.py migrate; then
    print_success "Database migrations completed"
else
    print_error "Database migration failed"
    echo "Make sure PostgreSQL is running and database is accessible"
    exit 1
fi

# Step 7: Check if superuser exists
print_status "Checking for superuser..."
if python manage.py shell -c "from accounts.models import User; print('Superusers:', User.objects.filter(is_superuser=True).count())" 2>/dev/null | grep -q "Superusers: 0"; then
    print_warning "No superuser found. Creating one..."
    echo "Please create a superuser account:"
    python manage.py createsuperuser
else
    print_success "Superuser already exists"
fi

# Step 8: Run test script
print_status "Running comprehensive tests..."
if python test_setup.py; then
    print_success "All tests passed!"
else
    print_warning "Some tests failed. Check the output above"
fi

# Step 9: Create sample data
print_status "Creating sample data..."
python manage.py shell << EOF
from accounts.models import User, Organization
from masters.models import State, City, Bank, ProductType, CaseStatus

# Create sample states
if State.objects.count() == 0:
    maharashtra = State.objects.create(name='Maharashtra', code='MH')
    goa = State.objects.create(name='Goa', code='GA')
    print("Created states: Maharashtra, Goa")

# Create sample cities
if City.objects.count() == 0:
    City.objects.create(name='Mumbai', state=maharashtra)
    City.objects.create(name='Pune', state=maharashtra)
    City.objects.create(name='Panaji', state=goa)
    print("Created cities: Mumbai, Pune, Panaji")

# Create sample banks
if Bank.objects.count() == 0:
    Bank.objects.create(name='State Bank of India', bank_type='PUBLIC')
    Bank.objects.create(name='HDFC Bank', bank_type='PRIVATE')
    print("Created sample banks")

# Create sample product types
if ProductType.objects.count() == 0:
    ProductType.objects.create(name='Auto Loan')
    ProductType.objects.create(name='Home Loan')
    ProductType.objects.create(name='Personal Loan')
    print("Created sample product types")

# Create sample case statuses
if CaseStatus.objects.count() == 0:
    CaseStatus.objects.create(name='Positive', is_positive=True, color_code='#28a745')
    CaseStatus.objects.create(name='Negative', is_negative=True, color_code='#dc3545')
    CaseStatus.objects.create(name='Pending', is_pending=True, color_code='#ffc107')
    print("Created sample case statuses")

print("Sample data created successfully!")
EOF

print_success "Setup completed successfully!"
echo ""
echo "🎉 Your VerifyMe backend is ready!"
echo ""
echo "Next steps:"
echo "1. Start the development server: python manage.py runserver"
echo "2. Access admin interface: http://127.0.0.1:8000/admin/"
echo "3. Login with your superuser credentials"
echo ""
echo "📚 Documentation:"
echo "- Setup Guide: SETUP_GUIDE.md"
echo "- Backend Summary: BACKEND_FOUNDATION_SUMMARY.md"
echo ""
echo "Happy coding! 🚀" 