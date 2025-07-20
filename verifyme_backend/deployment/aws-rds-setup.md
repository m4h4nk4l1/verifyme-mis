# AWS RDS PostgreSQL Setup

## 1. Create RDS Instance

### Via AWS Console:
1. Go to RDS Console
2. Click "Create database"
3. Choose "Standard create"
4. Select "PostgreSQL"
5. Choose "Free tier" (for testing) or "Production" template
6. Configure:
   - **DB instance identifier**: `verifyme-prod-db`
   - **Master username**: `verifyme_admin`
   - **Master password**: `[Generate strong password]`
   - **Instance size**: `db.t3.micro` (free tier) or `db.t3.small` (production)
   - **Storage**: 20 GB (auto-scaling enabled)
   - **Multi-AZ deployment**: Disabled (free tier) or Enabled (production)

### Via AWS CLI:
```bash
aws rds create-db-instance \
  --db-instance-identifier verifyme-prod-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username verifyme_admin \
  --master-user-password [YOUR_PASSWORD] \
  --allocated-storage 20 \
  --storage-encrypted \
  --vpc-security-group-ids sg-[YOUR_SECURITY_GROUP] \
  --db-subnet-group-name [YOUR_SUBNET_GROUP]
```

## 2. Configure Security Group

Create security group for RDS:
```bash
aws ec2 create-security-group \
  --group-name verifyme-rds-sg \
  --description "Security group for VerifyMe RDS"

# Add inbound rule for PostgreSQL
aws ec2 authorize-security-group-ingress \
  --group-name verifyme-rds-sg \
  --protocol tcp \
  --port 5432 \
  --source-group sg-[YOUR_APP_SECURITY_GROUP]
```

## 3. Get Connection Details

After creation, note:
- **Endpoint**: `verifyme-prod-db.xxxxx.ap-south-1.rds.amazonaws.com`
- **Port**: 5432
- **Database name**: `verifyme_db` (will be created)
- **Username**: `verifyme_admin`
- **Password**: [Your password]

## 4. Test Connection

```bash
psql -h [ENDPOINT] -U verifyme_admin -d postgres
```

## 5. Create Database

```sql
CREATE DATABASE verifyme_db;
CREATE DATABASE verifyme_test_db;
``` 