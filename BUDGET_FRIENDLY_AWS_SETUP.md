# Budget-Friendly AWS Setup for VerifyMe

## 1. AWS Account Setup

### Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the signup process
4. **IMPORTANT**: Use a credit card for billing

### Set Up Budget Alerts
1. Go to AWS Billing Console
2. Click "Budgets"
3. Create budget alert:
   - **Budget amount**: $50/month
   - **Alert threshold**: $30 (60%)
   - **Email notifications**: Your email

## 2. AWS CLI Setup

```bash
# Install AWS CLI
sudo apt update
sudo apt install awscli

# Configure AWS CLI
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Default region: ap-south-1
# Default output format: json
```

## 3. Create IAM User (Don't use root account!)

### Create Admin User
```bash
# Create admin user
aws iam create-user --user-name verifyme-admin

# Create access key
aws iam create-access-key --user-name verifyme-admin

# Attach admin policy (for initial setup)
aws iam attach-user-policy \
  --user-name verifyme-admin \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### Create Application User (for production)
```bash
# Create app user
aws iam create-user --user-name verifyme-app

# Create access key
aws iam create-access-key --user-name verifyme-app

# Create custom policy for minimal permissions
aws iam create-policy \
  --policy-name VerifymeAppPolicy \
  --policy-document file://app-policy.json
```

## 4. Cost-Effective Service Selection

### Recommended Services (Budget-Friendly)
- **EC2**: t3.micro (free tier) or t3.small ($15/month)
- **RDS**: db.t3.micro (free tier) or db.t3.small ($15/month)
- **S3**: Pay per use (~$2-5/month for your usage)
- **Route 53**: $0.50/month per hosted zone
- **ACM**: Free SSL certificates
- **CloudWatch**: Basic monitoring free, logs ~$1-2/month

### Total Estimated Cost: $30-50/month

## 5. Create app-policy.json

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::verifyme-files-*",
        "arn:aws:s3:::verifyme-files-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-south-1:*:secret:verifyme/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-south-1:*:*"
    }
  ]
}
``` 