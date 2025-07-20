#!/bin/bash

# Complete VerifyMe Deployment Script
# Budget-friendly EC2 deployment for verifyme.co.in

set -e

echo "🚀 Starting VerifyMe Deployment for verifyme.co.in..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running on Ubuntu
if [[ "$(lsb_release -si)" != "Ubuntu" ]]; then
    print_error "This script is designed for Ubuntu. Please run on Ubuntu 20.04+"
    exit 1
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "Please don't run this script as root. Run as a regular user."
    exit 1
fi

print_status "Starting deployment on $(hostname)..."

# Step 1: Update System
print_step "1. Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install Required Software
print_step "2. Installing required software..."

# Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Nginx
sudo apt install nginx -y

# Git
sudo apt install git -y

# Redis
sudo apt install redis-server -y

# PM2 for Node.js process management
sudo npm install -g pm2

# Gunicorn for Django
sudo apt install gunicorn -y

# Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Monitoring tools
sudo apt install htop iotop -y

print_status "Software installation completed!"

# Step 3: Configure PostgreSQL
print_step "3. Configuring PostgreSQL..."

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE verifyme_db;"
sudo -u postgres psql -c "CREATE USER verifyme_user WITH PASSWORD 'verifyme_secure_password_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE verifyme_db TO verifyme_user;"
sudo -u postgres psql -c "ALTER USER verifyme_user CREATEDB;"

print_status "PostgreSQL configured successfully!"

# Step 4: Clone Repository
print_step "4. Setting up application..."

# Create application directory
mkdir -p /home/$USER/verifyme
cd /home/$USER/verifyme

# Clone repository (replace with your GitHub repo)
print_warning "Please update the git clone URL with your actual repository"
git clone https://github.com/YOUR_USERNAME/verifyme-mis.git .

# Set up environment files
cp verifyme_backend/env.production.template verifyme_backend/.env
cp verifyme_frontend/env.production.template verifyme_frontend/.env.local

print_warning "Please edit the environment files with your actual values:"
print_warning "  - verifyme_backend/.env"
print_warning "  - verifyme_frontend/.env.local"

# Step 5: Set Up Backend
print_step "5. Setting up Django backend..."

cd verifyme_backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Update settings for production
sed -i 's/DEBUG = True/DEBUG = False/' verifyme_backend/settings.py

# Run migrations
python manage.py migrate

# Create superuser (interactive)
print_warning "Creating superuser account..."
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput

# Test backend
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!
sleep 5
curl -f http://localhost:8000/admin/ || print_error "Backend test failed!"
kill $BACKEND_PID

print_status "Backend setup completed!"

# Step 6: Set Up Frontend
print_step "6. Setting up Next.js frontend..."

cd ../verifyme_frontend

# Install dependencies
npm install

# Build for production
npm run build

# Test frontend
npm start &
FRONTEND_PID=$!
sleep 10
curl -f http://localhost:3000/ || print_error "Frontend test failed!"
kill $FRONTEND_PID

print_status "Frontend setup completed!"

# Step 7: Set Up Process Management
print_step "7. Setting up process management..."

# Create Gunicorn service
sudo tee /etc/systemd/system/verifyme-backend.service > /dev/null <<EOF
[Unit]
Description=VerifyMe Django Backend
After=network.target

[Service]
User=$USER
Group=$USER
WorkingDirectory=/home/$USER/verifyme/verifyme_backend
Environment="PATH=/home/$USER/verifyme/verifyme_backend/venv/bin"
ExecStart=/home/$USER/verifyme/verifyme_backend/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:8000 verifyme_backend.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Create PM2 ecosystem file
tee ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: 'verifyme-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/$USER/verifyme/verifyme_frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Enable and start services
sudo systemctl enable verifyme-backend
sudo systemctl start verifyme-backend

cd /home/$USER/verifyme/verifyme_frontend
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_status "Process management configured!"

# Step 8: Configure Nginx
print_step "8. Configuring Nginx..."

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/verifyme > /dev/null <<EOF
server {
    listen 80;
    server_name verifyme.co.in www.verifyme.co.in;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files
    location /static/ {
        alias /home/$USER/verifyme/verifyme_backend/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /home/$USER/verifyme/verifyme_backend/media/;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/verifyme /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

print_status "Nginx configured successfully!"

# Step 9: Set Up SSL Certificate
print_step "9. Setting up SSL certificate..."

print_warning "Make sure your domain verifyme.co.in points to this server's IP address"
print_warning "Current server IP: $(curl -s ifconfig.me)"

read -p "Press Enter when DNS is configured and propagated..."

# Get SSL certificate
sudo certbot --nginx -d verifyme.co.in -d www.verifyme.co.in --non-interactive --agree-tos --email your-email@example.com

# Test auto-renewal
sudo certbot renew --dry-run

print_status "SSL certificate configured!"

# Step 10: Set Up Monitoring and Logs
print_step "10. Setting up monitoring..."

# Create log directory
mkdir -p /home/$USER/verifyme/verifyme_backend/logs

# Set up log rotation
sudo tee /etc/logrotate.d/verifyme > /dev/null <<EOF
/home/$USER/verifyme/verifyme_backend/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

# Create backup script
tee /home/$USER/backup.sh > /dev/null <<EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$USER/backups"

# Create backup directory
mkdir -p \$BACKUP_DIR

# Backup database
pg_dump -h localhost -U verifyme_user verifyme_db > \$BACKUP_DIR/db_backup_\$DATE.sql

# Backup application files
tar -czf \$BACKUP_DIR/app_backup_\$DATE.tar.gz /home/$USER/verifyme

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "*.sql" -mtime +7 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/$USER/backup.sh

# Add backup to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup.sh") | crontab -

print_status "Monitoring and backup configured!"

# Step 11: Final Configuration
print_step "11. Final configuration..."

# Update Django settings for production
sudo tee -a /home/$USER/verifyme/verifyme_backend/verifyme_backend/settings.py > /dev/null <<EOF

# Production settings
ALLOWED_HOSTS = [
    'verifyme.co.in',
    'www.verifyme.co.in',
    'localhost',
    '127.0.0.1',
    '$(curl -s ifconfig.me)'
]

# Security settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
EOF

# Restart services
sudo systemctl restart verifyme-backend
pm2 restart all

print_status "Final configuration completed!"

# Step 12: Test Everything
print_step "12. Testing deployment..."

sleep 5

# Test backend
if curl -f http://localhost:8000/admin/ > /dev/null 2>&1; then
    print_status "✅ Backend is running!"
else
    print_error "❌ Backend test failed!"
fi

# Test frontend
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    print_status "✅ Frontend is running!"
else
    print_error "❌ Frontend test failed!"
fi

# Test Nginx
if curl -f http://localhost/ > /dev/null 2>&1; then
    print_status "✅ Nginx is running!"
else
    print_error "❌ Nginx test failed!"
fi

# Test SSL (if domain is configured)
if curl -f https://verifyme.co.in/ > /dev/null 2>&1; then
    print_status "✅ SSL certificate is working!"
else
    print_warning "⚠️  SSL test failed (domain might not be configured yet)"
fi

print_status "🎉 Deployment completed successfully!"

echo ""
print_status "📋 Next Steps:"
print_status "1. Update your domain DNS to point to: $(curl -s ifconfig.me)"
print_status "2. Edit environment files with your actual values"
print_status "3. Test your application at: https://verifyme.co.in"
print_status "4. Set up monitoring and alerts"
print_status "5. Configure regular backups"

echo ""
print_status "🔧 Useful Commands:"
print_status "  - Check backend logs: sudo journalctl -u verifyme-backend -f"
print_status "  - Check frontend logs: pm2 logs"
print_status "  - Check Nginx logs: sudo tail -f /var/log/nginx/access.log"
print_status "  - Restart backend: sudo systemctl restart verifyme-backend"
print_status "  - Restart frontend: pm2 restart all"
print_status "  - Check SSL: sudo certbot certificates"

echo ""
print_warning "💰 Estimated Monthly Cost: $15-25"
print_warning "  - EC2 t3.micro: $8-12/month"
print_warning "  - Domain: $1-2/month"
print_warning "  - SSL: Free (Let's Encrypt)"
print_warning "  - Monitoring: Free (basic)"

echo ""
print_status "🚀 Your VerifyMe application is now deployed!"
print_status "Visit: https://verifyme.co.in" 