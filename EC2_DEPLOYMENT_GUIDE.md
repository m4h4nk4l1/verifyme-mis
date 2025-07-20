# EC2 Deployment Guide (Budget-Friendly)

## 1. Create EC2 Instance

### Via AWS Console:
1. Go to EC2 Console
2. Click "Launch Instance"
3. Configure:
   - **Name**: `verifyme-server`
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t3.micro (free tier) or t3.small
   - **Key Pair**: Create new key pair
   - **Security Group**: Create new (see below)
   - **Storage**: 20 GB gp3

### Via AWS CLI:
```bash
# Create security group
aws ec2 create-security-group \
  --group-name verifyme-sg \
  --description "Security group for VerifyMe application"

# Allow SSH
aws ec2 authorize-security-group-ingress \
  --group-name verifyme-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP
aws ec2 authorize-security-group-ingress \
  --group-name verifyme-sg \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS
aws ec2 authorize-security-group-ingress \
  --group-name verifyme-sg \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow Django backend
aws ec2 authorize-security-group-ingress \
  --group-name verifyme-sg \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0

# Allow Next.js frontend
aws ec2 authorize-security-group-ingress \
  --group-name verifyme-sg \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.micro \
  --key-name verifyme-key \
  --security-group-ids sg-[SECURITY_GROUP_ID] \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=verifyme-server}]'
```

## 2. Connect to EC2 Instance

```bash
# Download your key file and set permissions
chmod 400 verifyme-key.pem

# Connect to instance
ssh -i verifyme-key.pem ubuntu@[YOUR_EC2_PUBLIC_IP]
```

## 3. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install Git
sudo apt install git -y

# Install Redis (for caching)
sudo apt install redis-server -y

# Install PM2 (for Node.js process management)
sudo npm install -g pm2

# Install Gunicorn (for Django)
sudo apt install gunicorn -y
```

## 4. Clone Your Repository

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/verifyme-mis.git
cd verifyme-mis

# Set up environment files
cp verifyme_backend/env.production.template verifyme_backend/.env
cp verifyme_frontend/env.production.template verifyme_frontend/.env.local

# Edit environment files with your actual values
nano verifyme_backend/.env
nano verifyme_frontend/.env.local
```

## 5. Set Up Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE verifyme_db;
CREATE USER verifyme_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE verifyme_db TO verifyme_user;
\q

# Test connection
psql -h localhost -U verifyme_user -d verifyme_db
```

## 6. Set Up Backend (Django)

```bash
# Navigate to backend
cd verifyme_backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput

# Test the application
python manage.py runserver 0.0.0.0:8000
```

## 7. Set Up Frontend (Next.js)

```bash
# Navigate to frontend
cd ../verifyme_frontend

# Install dependencies
npm install

# Build for production
npm run build

# Test the application
npm start
```

## 8. Set Up Process Management

### For Django (Gunicorn)
```bash
# Create gunicorn service file
sudo nano /etc/systemd/system/verifyme-backend.service
```

Add this content:
```ini
[Unit]
Description=VerifyMe Django Backend
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/verifyme-mis/verifyme_backend
Environment="PATH=/home/ubuntu/verifyme-mis/verifyme_backend/venv/bin"
ExecStart=/home/ubuntu/verifyme-mis/verifyme_backend/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:8000 verifyme_backend.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

### For Next.js (PM2)
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add this content:
```javascript
module.exports = {
  apps: [{
    name: 'verifyme-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/verifyme-mis/verifyme_frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

## 9. Start Services

```bash
# Start Django backend
sudo systemctl enable verifyme-backend
sudo systemctl start verifyme-backend

# Start Next.js frontend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 10. Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/verifyme
```

Add this content:
```nginx
server {
    listen 80;
    server_name verifyme.co.in www.verifyme.co.in;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /static/ {
        alias /home/ubuntu/verifyme-mis/verifyme_backend/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /home/ubuntu/verifyme-mis/verifyme_backend/media/;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/verifyme /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 11. Set Up SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d verifyme.co.in -d www.verifyme.co.in

# Test auto-renewal
sudo certbot renew --dry-run
```

## 12. Set Up Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Set up log rotation
sudo nano /etc/logrotate.d/verifyme
```

Add this content:
```
/home/ubuntu/verifyme-mis/verifyme_backend/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
```

## 13. Set Up Backups

```bash
# Create backup script
nano backup.sh
```

Add this content:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U verifyme_user verifyme_db > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /home/ubuntu/verifyme-mis

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
# Make executable and add to crontab
chmod +x backup.sh
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
``` 