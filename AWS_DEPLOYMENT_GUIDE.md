# 🚀 AWS Deployment Guide for VerifyMe MIS

## 📋 **Prerequisites**

### **Required Tools**
- AWS CLI configured with appropriate permissions
- Docker installed and running
- Domain name (optional but recommended)
- SSL certificate (for production)

### **AWS Services You'll Need**
- **RDS**: PostgreSQL database
- **S3**: File storage
- **ECS**: Container orchestration (or EC2)
- **ALB**: Application Load Balancer
- **Route 53**: DNS management
- **ACM**: SSL certificates
- **CloudWatch**: Monitoring and logging
- **Secrets Manager**: Secure credential storage

---

## **Phase 1: AWS Infrastructure Setup**

### **Step 1: Create RDS PostgreSQL Database**

1. **Go to RDS Console**
2. **Create Database**:
   - Engine: PostgreSQL 15
   - Template: Free tier (testing) or Production
   - DB instance identifier: `verifyme-prod-db`
   - Master username: `verifyme_admin`
   - Master password: `[Generate strong password]`
   - Instance size: `db.t3.micro` (free) or `db.t3.small` (prod)
   - Storage: 20 GB with auto-scaling
   - Multi-AZ: Disabled (free) or Enabled (prod)

3. **Configure Security Group**:
   ```bash
   aws ec2 create-security-group \
     --group-name verifyme-rds-sg \
     --description "Security group for VerifyMe RDS"
   
   aws ec2 authorize-security-group-ingress \
     --group-name verifyme-rds-sg \
     --protocol tcp \
     --port 5432 \
     --source-group sg-[YOUR_APP_SECURITY_GROUP]
   ```

4. **Note Connection Details**:
   - Endpoint: `verifyme-prod-db.xxxxx.ap-south-1.rds.amazonaws.com`
   - Port: 5432
   - Database: `verifyme_db`

### **Step 2: Configure S3 Bucket**

1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://verifyme-prod-files-[UNIQUE_SUFFIX] --region ap-south-1
   ```

2. **Enable Versioning and Encryption**:
   ```bash
   aws s3api put-bucket-versioning \
     --bucket verifyme-prod-files-[UNIQUE_SUFFIX] \
     --versioning-configuration Status=Enabled
   
   aws s3api put-bucket-encryption \
     --bucket verifyme-prod-files-[UNIQUE_SUFFIX] \
     --server-side-encryption-configuration '{
       "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
     }'
   ```

3. **Create IAM User for S3 Access**:
   ```bash
   aws iam create-user --user-name verifyme-s3-user
   aws iam create-access-key --user-name verifyme-s3-user
   ```

### **Step 3: Set Up AWS Secrets Manager**

1. **Store Sensitive Data**:
   ```bash
   # Store Django secret key
   aws secretsmanager create-secret \
     --name verifyme/secret-key \
     --secret-string "your-super-secret-key-here"
   
   # Store database password
   aws secretsmanager create-secret \
     --name verifyme/db-password \
     --secret-string "your-rds-password"
   
   # Store AWS credentials
   aws secretsmanager create-secret \
     --name verifyme/aws-access-key \
     --secret-string "your-s3-access-key"
   
   aws secretsmanager create-secret \
     --name verifyme/aws-secret-key \
     --secret-string "your-s3-secret-key"
   
   # Store S3 bucket name
   aws secretsmanager create-secret \
     --name verifyme/s3-bucket-name \
     --secret-string "verifyme-prod-files-[UNIQUE_SUFFIX]"
   ```

---

## **Phase 2: Container Registry Setup**

### **Step 1: Create ECR Repositories**

```bash
# Create repositories
aws ecr create-repository --repository-name verifyme-backend --region ap-south-1
aws ecr create-repository --repository-name verifyme-frontend --region ap-south-1

# Get login token
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com
```

### **Step 2: Build and Push Images**

```bash
# Build backend image
docker build -t verifyme-backend:latest ./verifyme_backend
docker tag verifyme-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/verifyme-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/verifyme-backend:latest

# Build frontend image
docker build -t verifyme-frontend:latest ./verifyme_frontend
docker tag verifyme-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/verifyme-frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/verifyme-frontend:latest
```

---

## **Phase 3: ECS Cluster Setup**

### **Step 1: Create ECS Cluster**

```bash
aws ecs create-cluster --cluster-name verifyme-cluster
```

### **Step 2: Create Task Definitions**

1. **Update task definition files** with your account ID
2. **Register task definitions**:
   ```bash
   aws ecs register-task-definition --cli-input-json file://verifyme_backend/deployment/ecs-task-definition.json
   aws ecs register-task-definition --cli-input-json file://verifyme_frontend/deployment/ecs-task-definition.json
   ```

### **Step 3: Create Services**

```bash
# Create backend service
aws ecs create-service \
  --cluster verifyme-cluster \
  --service-name verifyme-backend-service \
  --task-definition verifyme-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"

# Create frontend service
aws ecs create-service \
  --cluster verifyme-cluster \
  --service-name verifyme-frontend-service \
  --task-definition verifyme-frontend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"
```

---

## **Phase 4: Load Balancer and DNS**

### **Step 1: Create Application Load Balancer**

1. **Create ALB**:
   - Name: `verifyme-alb`
   - Scheme: `internet-facing`
   - IP address type: `ipv4`
   - VPC: Your VPC
   - Subnets: At least 2 subnets in different AZs

2. **Create Target Groups**:
   ```bash
   # Backend target group
   aws elbv2 create-target-group \
     --name verifyme-backend-tg \
     --protocol HTTP \
     --port 8000 \
     --vpc-id vpc-xxxxx \
     --target-type ip \
     --health-check-path /admin/

   # Frontend target group
   aws elbv2 create-target-group \
     --name verifyme-frontend-tg \
     --protocol HTTP \
     --port 3000 \
     --vpc-id vpc-xxxxx \
     --target-type ip \
     --health-check-path /
   ```

3. **Create Listeners**:
   ```bash
   # Backend listener (port 80)
   aws elbv2 create-listener \
     --load-balancer-arn arn:aws:elasticloadbalancing:ap-south-1:YOUR_ACCOUNT_ID:loadbalancer/app/verifyme-alb/xxxxx \
     --protocol HTTP \
     --port 80 \
     --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:YOUR_ACCOUNT_ID:targetgroup/verifyme-backend-tg/xxxxx

   # Frontend listener (port 443 with SSL)
   aws elbv2 create-listener \
     --load-balancer-arn arn:aws:elasticloadbalancing:ap-south-1:YOUR_ACCOUNT_ID:loadbalancer/app/verifyme-alb/xxxxx \
     --protocol HTTPS \
     --port 443 \
     --certificates CertificateArn=arn:aws:acm:ap-south-1:YOUR_ACCOUNT_ID:certificate/xxxxx \
     --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:YOUR_ACCOUNT_ID:targetgroup/verifyme-frontend-tg/xxxxx
   ```

### **Step 2: Configure Route 53**

1. **Create Hosted Zone** (if you have a domain)
2. **Create A Records**:
   - `api.your-domain.com` → ALB backend listener
   - `your-domain.com` → ALB frontend listener

---

## **Phase 5: Environment Configuration**

### **Step 1: Create Environment Files**

1. **Backend (.env)**:
   ```bash
   cp verifyme_backend/env.production.template verifyme_backend/.env
   # Edit with your actual values
   ```

2. **Frontend (.env.local)**:
   ```bash
   cp verifyme_frontend/env.production.template verifyme_frontend/.env.local
   # Edit with your actual values
   ```

### **Step 2: Update Configuration**

1. **Update Next.js config** with your S3 bucket domain
2. **Update CORS settings** in Django with your domain
3. **Configure SSL certificates** in ACM

---

## **Phase 6: Database Migration**

### **Step 1: Run Migrations**

```bash
# Connect to your ECS task and run migrations
aws ecs run-task \
  --cluster verifyme-cluster \
  --task-definition verifyme-backend:1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"verifyme-backend","command":["python","manage.py","migrate"]}]}'
```

### **Step 2: Create Superuser**

```bash
# Create superuser
aws ecs run-task \
  --cluster verifyme-cluster \
  --task-definition verifyme-backend:1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"verifyme-backend","command":["python","manage.py","createsuperuser"]}]}'
```

---

## **Phase 7: Monitoring and Logging**

### **Step 1: Set Up CloudWatch**

1. **Create Log Groups**:
   ```bash
   aws logs create-log-group --log-group-name /ecs/verifyme-backend
   aws logs create-log-group --log-group-name /ecs/verifyme-frontend
   ```

2. **Create Alarms**:
   - CPU utilization > 80%
   - Memory utilization > 80%
   - Error rate > 5%

### **Step 2: Set Up Monitoring**

1. **Enable CloudWatch Container Insights**
2. **Set up custom metrics** for business KPIs
3. **Configure alerting** for critical issues

---

## **Phase 8: Security Hardening**

### **Step 1: Security Groups**

```bash
# Backend security group
aws ec2 create-security-group \
  --group-name verifyme-backend-sg \
  --description "Security group for VerifyMe backend"

# Allow HTTP from ALB
aws ec2 authorize-security-group-ingress \
  --group-name verifyme-backend-sg \
  --protocol tcp \
  --port 8000 \
  --source-group sg-[ALB_SECURITY_GROUP]

# Frontend security group
aws ec2 create-security-group \
  --group-name verifyme-frontend-sg \
  --description "Security group for VerifyMe frontend"

# Allow HTTP from ALB
aws ec2 authorize-security-group-ingress \
  --group-name verifyme-frontend-sg \
  --protocol tcp \
  --port 3000 \
  --source-group sg-[ALB_SECURITY_GROUP]
```

### **Step 2: IAM Roles**

1. **ECS Task Execution Role**: Allows pulling images and writing logs
2. **ECS Task Role**: Allows accessing S3, Secrets Manager, etc.

---

## **Phase 9: Testing and Validation**

### **Step 1: Health Checks**

```bash
# Test backend
curl -f https://api.your-domain.com/admin/

# Test frontend
curl -f https://your-domain.com/

# Test file upload
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.txt" \
  https://api.your-domain.com/forms/api/file-attachments/
```

### **Step 2: Performance Testing**

1. **Load test** with Apache Bench or similar
2. **Monitor** response times and error rates
3. **Optimize** based on results

---

## **Phase 10: Backup and Recovery**

### **Step 1: Database Backups**

1. **Enable automated backups** in RDS
2. **Set retention period** (7-30 days)
3. **Test restore procedures**

### **Step 2: Application Backups**

1. **Backup S3 bucket** with lifecycle policies
2. **Backup configuration** files
3. **Document recovery procedures**

---

## **🚨 Important Security Notes**

1. **Never commit secrets** to version control
2. **Use Secrets Manager** for all sensitive data
3. **Enable encryption** at rest and in transit
4. **Regular security updates** for all components
5. **Monitor access logs** and set up alerts
6. **Use least privilege** principle for IAM roles

---

## **📊 Cost Optimization**

1. **Use Spot instances** for non-critical workloads
2. **Right-size** your RDS instance
3. **Enable S3 lifecycle policies** for cost optimization
4. **Monitor CloudWatch** for unused resources
5. **Use reserved instances** for predictable workloads

---

## **🔧 Maintenance Tasks**

### **Daily**
- Check CloudWatch alarms
- Monitor error logs
- Verify backup completion

### **Weekly**
- Review performance metrics
- Update security patches
- Test backup restoration

### **Monthly**
- Review cost optimization opportunities
- Update SSL certificates
- Security audit

---

## **📞 Support and Troubleshooting**

### **Common Issues**

1. **Database Connection**: Check security groups and credentials
2. **S3 Access**: Verify IAM permissions and bucket policy
3. **Container Health**: Check logs and resource limits
4. **SSL Issues**: Verify certificate configuration

### **Useful Commands**

```bash
# Check ECS service status
aws ecs describe-services --cluster verifyme-cluster --services verifyme-backend-service

# View logs
aws logs describe-log-streams --log-group-name /ecs/verifyme-backend

# Scale services
aws ecs update-service --cluster verifyme-cluster --service verifyme-backend-service --desired-count 3

# Update task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs update-service --cluster verifyme-cluster --service verifyme-backend-service --task-definition verifyme-backend:2
```

---

## **✅ Deployment Checklist**

- [ ] RDS database created and accessible
- [ ] S3 bucket configured with proper permissions
- [ ] ECR repositories created and images pushed
- [ ] ECS cluster and services running
- [ ] Load balancer configured with SSL
- [ ] DNS records pointing to ALB
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Superuser created
- [ ] Health checks passing
- [ ] Monitoring and alerting configured
- [ ] Backup procedures tested
- [ ] Security groups configured
- [ ] SSL certificates installed
- [ ] Performance testing completed

---

**🎉 Congratulations! Your VerifyMe MIS application is now deployed on AWS!**

Remember to:
- Monitor your application regularly
- Keep security patches updated
- Optimize costs based on usage
- Document any custom configurations
- Set up automated deployments for future updates 