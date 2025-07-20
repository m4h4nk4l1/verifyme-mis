#!/bin/bash

# AWS S3 Setup Script for VerifyMe MIS System
# This script helps configure AWS S3 integration

set -e

echo "🚀 AWS S3 Setup for VerifyMe MIS System"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating one..."
    cp .env.example .env 2>/dev/null || touch .env
fi

# Function to get user input
get_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        input=${input:-$default}
    else
        read -p "$prompt: " input
    fi
    
    eval "$var_name='$input'"
}

# Function to update .env file
update_env() {
    local key="$1"
    local value="$2"
    
    # Check if key exists in .env
    if grep -q "^$key=" .env; then
        # Update existing key
        sed -i "s/^$key=.*/$key=$value/" .env
    else
        # Add new key
        echo "$key=$value" >> .env
    fi
}

echo ""
print_info "Let's configure AWS S3 for your MIS system..."

# Get AWS credentials
echo ""
echo "AWS Credentials Configuration:"
echo "-----------------------------"

get_input "AWS Access Key ID" "" "AWS_ACCESS_KEY_ID"
get_input "AWS Secret Access Key" "" "AWS_SECRET_ACCESS_KEY"
get_input "AWS S3 Bucket Name" "" "AWS_STORAGE_BUCKET_NAME"
get_input "AWS S3 Region" "ap-south-1" "AWS_S3_REGION_NAME"

# Optional configurations
echo ""
echo "Optional Configurations:"
echo "----------------------"

get_input "Use S3 for file storage? (true/false)" "true" "USE_S3"
get_input "Default ACL for files (private/public-read)" "private" "AWS_DEFAULT_ACL"

# CloudFront configuration (optional)
echo ""
print_info "CloudFront CDN Configuration (Optional):"
echo "Leave blank if you don't have CloudFront set up"

get_input "CloudFront Distribution ID" "" "AWS_CLOUDFRONT_DISTRIBUTION_ID"
get_input "CloudFront Key ID" "" "AWS_CLOUDFRONT_KEY_ID"
get_input "CloudFront Private Key Path" "" "AWS_CLOUDFRONT_KEY_PATH"

# Update .env file
echo ""
print_info "Updating .env file..."

update_env "USE_S3" "$USE_S3"
update_env "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID"
update_env "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY"
update_env "AWS_STORAGE_BUCKET_NAME" "$AWS_STORAGE_BUCKET_NAME"
update_env "AWS_S3_REGION_NAME" "$AWS_S3_REGION_NAME"
update_env "AWS_DEFAULT_ACL" "$AWS_DEFAULT_ACL"

if [ -n "$AWS_CLOUDFRONT_DISTRIBUTION_ID" ]; then
    update_env "AWS_CLOUDFRONT_DISTRIBUTION_ID" "$AWS_CLOUDFRONT_DISTRIBUTION_ID"
fi

if [ -n "$AWS_CLOUDFRONT_KEY_ID" ]; then
    update_env "AWS_CLOUDFRONT_KEY_ID" "$AWS_CLOUDFRONT_KEY_ID"
fi

if [ -n "$AWS_CLOUDFRONT_KEY_PATH" ]; then
    update_env "AWS_CLOUDFRONT_KEY" "$AWS_CLOUDFRONT_KEY_PATH"
fi

print_status ".env file updated successfully"

# Test AWS S3 connection
echo ""
print_info "Testing AWS S3 connection..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run Django management command to test S3
if python manage.py test_s3 --upload-test; then
    print_status "AWS S3 connection test successful!"
else
    print_error "AWS S3 connection test failed!"
    echo ""
    print_info "Please check your AWS credentials and bucket configuration."
    echo "Common issues:"
    echo "1. Invalid AWS credentials"
    echo "2. Bucket doesn't exist or wrong name"
    echo "3. Insufficient IAM permissions"
    echo "4. Wrong region"
    exit 1
fi

# Create necessary directories
echo ""
print_info "Creating necessary directories..."

mkdir -p media
mkdir -p static
mkdir -p logs

print_status "Directories created"

# Set proper permissions
echo ""
print_info "Setting file permissions..."

chmod 755 media
chmod 755 static
chmod 644 .env

print_status "Permissions set"

# Display configuration summary
echo ""
echo "Configuration Summary:"
echo "====================="
print_status "AWS S3 Bucket: $AWS_STORAGE_BUCKET_NAME"
print_status "AWS Region: $AWS_S3_REGION_NAME"
print_status "Use S3: $USE_S3"
print_status "Default ACL: $AWS_DEFAULT_ACL"

if [ -n "$AWS_CLOUDFRONT_DISTRIBUTION_ID" ]; then
    print_status "CloudFront Distribution: $AWS_CLOUDFRONT_DISTRIBUTION_ID"
fi

echo ""
print_status "AWS S3 setup completed successfully!"
echo ""
print_info "Next steps:"
echo "1. Run migrations: python manage.py migrate"
echo "2. Create superuser: python manage.py createsuperuser"
echo "3. Test file uploads through the API"
echo "4. Monitor S3 usage in AWS Console"
echo ""
 