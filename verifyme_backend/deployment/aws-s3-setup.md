# AWS S3 Bucket Setup for Production

## 1. Create S3 Bucket

### Via AWS Console:
1. Go to S3 Console
2. Click "Create bucket"
3. Configure:
   - **Bucket name**: `verifyme-prod-files-[UNIQUE_SUFFIX]`
   - **Region**: `ap-south-1` (same as your RDS)
   - **Block Public Access**: Keep all blocks enabled
   - **Bucket Versioning**: Enable
   - **Server-side encryption**: Enable (AES-256)
   - **Object Lock**: Disable (for now)

### Via AWS CLI:
```bash
aws s3 mb s3://verifyme-prod-files-[UNIQUE_SUFFIX] --region ap-south-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket verifyme-prod-files-[UNIQUE_SUFFIX] \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket verifyme-prod-files-[UNIQUE_SUFFIX] \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

## 2. Create IAM User for S3 Access

### Create User:
```bash
aws iam create-user --user-name verifyme-s3-user
```

### Create Access Policy:
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
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:PutObjectAcl"
            ],
            "Resource": [
                "arn:aws:s3:::verifyme-prod-files-[UNIQUE_SUFFIX]",
                "arn:aws:s3:::verifyme-prod-files-[UNIQUE_SUFFIX]/*"
            ]
        }
    ]
}
```

### Attach Policy:
```bash
aws iam put-user-policy \
  --user-name verifyme-s3-user \
  --policy-name S3AccessPolicy \
  --policy-document file://s3-policy.json
```

### Generate Access Keys:
```bash
aws iam create-access-key --user-name verifyme-s3-user
```

## 3. Configure CORS (if needed)

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://your-domain.com"],
        "ExposeHeaders": ["ETag"]
    }
]
```

## 4. Set Up Lifecycle Rules

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket verifyme-prod-files-[UNIQUE_SUFFIX] \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "MoveToIA",
        "Status": "Enabled",
        "Filter": {
          "Prefix": "media/"
        },
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "STANDARD_IA"
          }
        ]
      }
    ]
  }'
```

## 5. Environment Variables

Note these for your deployment:
- **Bucket Name**: `verifyme-prod-files-[UNIQUE_SUFFIX]`
- **Region**: `ap-south-1`
- **Access Key ID**: [From IAM user]
- **Secret Access Key**: [From IAM user] 