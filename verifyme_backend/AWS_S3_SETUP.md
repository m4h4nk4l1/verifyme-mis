# AWS S3 Integration Setup Guide

This guide explains how to set up AWS S3 integration for file storage in the VerifyMe MIS system.

## Prerequisites

1. AWS Account with appropriate permissions
2. Python packages: `boto3`, `django-storages` (already in requirements.txt)
3. AWS CLI configured (optional but recommended)

## AWS S3 Bucket Setup

### 1. Create S3 Bucket

1. Log into AWS Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `verifyme-mis-files`)
5. Select your preferred region (recommended: `ap-south-1`)
6. Configure options:
   - **Versioning**: Enable (recommended for data protection)
   - **Server-side encryption**: Enable (AES-256)
   - **Block Public Access**: Keep all blocks enabled
   - **Bucket Policy**: We'll configure this later

### 2. Configure Bucket Policy

Create a bucket policy that allows your application to access files:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowAppAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_IAM_USER"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```

### 3. Create IAM User (Recommended)

1. Navigate to IAM service
2. Create a new user for your application
3. Attach the following policy:

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
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```

4. Generate access keys for this user

## Environment Configuration

### 1. Development Environment (.env)

```bash
# AWS S3 Configuration
USE_S3=True
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=ap-south-1
AWS_DEFAULT_ACL=private

# Optional: CloudFront (for CDN)
AWS_CLOUDFRONT_DISTRIBUTION_ID=your_distribution_id
AWS_CLOUDFRONT_KEY_ID=your_cloudfront_key_id
AWS_CLOUDFRONT_KEY=your_cloudfront_private_key
```

### 2. Production Environment

Set the same environment variables in your production environment (Heroku, AWS, etc.)

## File Organization Structure

The system organizes files in the following structure:

```
s3://your-bucket/
├── media/
│   ├── org_1/                    # Organization-specific folders
│   │   ├── 2024/01/15/          # Date-based organization
│   │   │   ├── document_1.pdf
│   │   │   └── image_1.jpg
│   │   └── 2024/01/16/
│   └── org_2/
├── static/                       # Static files (CSS, JS, images)
├── profiles/                     # Profile pictures
│   ├── org_1/
│   └── org_2/
└── reports/                      # Generated reports
    ├── org_1/
    └── org_2/
```

## Security Features

### 1. Private File Access

- All uploaded files are private by default
- Files are accessed via presigned URLs (expire in 1 hour)
- Organization-based access control

### 2. File Validation

- File type validation
- File size limits (10MB default)
- Virus scanning (can be integrated)

### 3. Encryption

- Server-side encryption enabled
- HTTPS-only access
- Secure file transfer

## Usage Examples

### 1. Upload File (via API)

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "form_entry=FORM_ENTRY_UUID" \
  -F "description=Important document" \
  http://localhost:8000/api/forms/file-attachments/
```

### 2. Get File URL

```python
from utils.storage import S3FileManager

# Get presigned URL for private file
url = S3FileManager.get_presigned_url(file_path, expiration=3600)
```

### 3. Delete File

```python
from utils.storage import S3FileManager

# Delete file from S3
success = S3FileManager.delete_file(file_path)
```

## Monitoring and Maintenance

### 1. CloudWatch Metrics

Monitor your S3 usage with CloudWatch:
- Request counts
- Data transfer
- Error rates
- Storage usage

### 2. Lifecycle Policies

Set up lifecycle policies for cost optimization:
- Move old files to IA (Infrequent Access)
- Archive files older than 1 year
- Delete files older than 7 years

### 3. Backup Strategy

- Enable versioning for file recovery
- Cross-region replication for disaster recovery
- Regular backup testing

## Troubleshooting

### Common Issues

1. **Access Denied**: Check IAM permissions and bucket policy
2. **File Not Found**: Verify file path and organization access
3. **Upload Failures**: Check file size limits and network connectivity
4. **URL Expiration**: Regenerate presigned URLs as needed

### Debug Commands

```bash
# Test S3 connection
aws s3 ls s3://your-bucket-name/

# Check file permissions
aws s3api get-object-acl --bucket your-bucket-name --key file-path

# List files in organization folder
aws s3 ls s3://your-bucket-name/media/org_1/ --recursive
```

## Cost Optimization

1. **Storage Classes**: Use appropriate storage classes based on access patterns
2. **Lifecycle Policies**: Automatically move files to cheaper storage
3. **Compression**: Enable compression for text-based files
4. **CDN**: Use CloudFront for frequently accessed files

## Security Best Practices

1. **Access Keys**: Rotate access keys regularly
2. **Bucket Policy**: Use least privilege principle
3. **Encryption**: Enable server-side encryption
4. **Logging**: Enable S3 access logging
5. **Monitoring**: Set up alerts for unusual access patterns

## Integration with Frontend

The frontend can use the file URLs returned by the API:

```javascript
// Upload file
const formData = new FormData();
formData.append('file', file);
formData.append('form_entry', formEntryId);

const response = await fetch('/api/forms/file-attachments/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// Display file
const fileData = await response.json();
const fileUrl = fileData.file_url; // Presigned URL
```

## Next Steps

1. Set up CloudFront CDN for better performance
2. Implement file virus scanning
3. Add file compression for large files
4. Set up automated backup and archiving
5. Implement file access analytics 