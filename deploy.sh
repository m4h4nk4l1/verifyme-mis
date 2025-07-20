#!/bin/bash

# VerifyMe AWS Deployment Script
# This script deploys the VerifyMe application to AWS

set -e

echo "🚀 Starting VerifyMe AWS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it first."
    exit 1
fi

# Check if .env files exist
if [ ! -f "verifyme_backend/.env" ]; then
    print_error "Backend .env file not found. Please create it from env.production.template"
    exit 1
fi

if [ ! -f "verifyme_frontend/.env.local" ]; then
    print_error "Frontend .env.local file not found. Please create it from env.production.template"
    exit 1
fi

print_status "Prerequisites check passed!"

# Load environment variables
source verifyme_backend/.env

# Build Docker images
print_status "Building Docker images..."

print_status "Building backend image..."
docker build -t verifyme-backend:latest ./verifyme_backend

print_status "Building frontend image..."
docker build -t verifyme-frontend:latest ./verifyme_frontend

print_status "Docker images built successfully!"

# Test local deployment
print_status "Testing local deployment with docker-compose..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Test backend health
print_status "Testing backend health..."
if curl -f http://localhost:8000/admin/ > /dev/null 2>&1; then
    print_status "Backend is healthy!"
else
    print_error "Backend health check failed!"
    docker-compose logs backend
    exit 1
fi

# Test frontend health
print_status "Testing frontend health..."
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    print_status "Frontend is healthy!"
else
    print_error "Frontend health check failed!"
    docker-compose logs frontend
    exit 1
fi

print_status "Local deployment test passed!"

# Stop local services
print_status "Stopping local services..."
docker-compose down

print_status "✅ Deployment script completed successfully!"
print_status "Next steps:"
print_status "1. Set up AWS ECS/EKS or EC2 for production deployment"
print_status "2. Configure your domain and SSL certificates"
print_status "3. Set up monitoring and logging"
print_status "4. Configure backup strategies"

echo ""
print_warning "Remember to:"
print_warning "- Update environment variables for production"
print_warning "- Set up proper SSL certificates"
print_warning "- Configure monitoring and alerting"
print_warning "- Set up automated backups" 