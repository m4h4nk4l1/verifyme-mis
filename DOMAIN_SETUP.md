# GoDaddy Domain Configuration for verifyme.co.in

## 1. Access GoDaddy Domain Management

1. Log into your GoDaddy account
2. Go to "My Products" → "Domains"
3. Find `verifyme.co.in` and click "Manage"

## 2. Configure DNS Records

### Option A: Use GoDaddy DNS (Recommended for simplicity)

1. **Go to DNS Management**:
   - Click "DNS" tab
   - Click "Manage Zones"

2. **Add A Record**:
   - **Type**: A
   - **Name**: @ (or leave blank)
   - **Value**: [YOUR_EC2_PUBLIC_IP]
   - **TTL**: 600 (10 minutes)

3. **Add CNAME for www**:
   - **Type**: CNAME
   - **Name**: www
   - **Value**: verifyme.co.in
   - **TTL**: 600

4. **Add API Subdomain** (optional):
   - **Type**: A
   - **Name**: api
   - **Value**: [YOUR_EC2_PUBLIC_IP]
   - **TTL**: 600

### Option B: Use AWS Route 53 (More control)

1. **Create Hosted Zone in Route 53**:
   ```bash
   aws route53 create-hosted-zone \
     --name verifyme.co.in \
     --caller-reference $(date +%s)
   ```

2. **Get Name Servers**:
   ```bash
   aws route53 get-hosted-zone --id [HOSTED_ZONE_ID]
   ```

3. **Update GoDaddy Name Servers**:
   - Go to GoDaddy DNS management
   - Change name servers to AWS nameservers:
     - ns-1234.awsdns-12.com
     - ns-5678.awsdns-34.net
     - ns-9012.awsdns-56.org
     - ns-3456.awsdns-78.co.uk

4. **Create A Records in Route 53**:
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id [HOSTED_ZONE_ID] \
     --change-batch file://dns-changes.json
   ```

## 3. DNS Changes File (for Route 53)

Create `dns-changes.json`:
```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "verifyme.co.in",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "[YOUR_EC2_PUBLIC_IP]"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.verifyme.co.in",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "verifyme.co.in"
          }
        ]
      }
    }
  ]
}
```

## 4. Test DNS Propagation

```bash
# Check if DNS is propagated
nslookup verifyme.co.in
nslookup www.verifyme.co.in

# Test from different locations
dig verifyme.co.in
dig www.verifyme.co.in
```

## 5. SSL Certificate Setup

### Using Let's Encrypt (Free):
```bash
# On your EC2 instance
sudo certbot --nginx -d verifyme.co.in -d www.verifyme.co.in
```

### Using AWS Certificate Manager:
1. Go to AWS Certificate Manager
2. Request certificate for:
   - verifyme.co.in
   - *.verifyme.co.in
3. Validate via DNS (add CNAME records)
4. Install certificate on your server

## 6. Update Application Configuration

### Update Django Settings:
```python
# In verifyme_backend/settings.py
ALLOWED_HOSTS = [
    'verifyme.co.in',
    'www.verifyme.co.in',
    'api.verifyme.co.in',
    'localhost',
    '127.0.0.1',
    '[YOUR_EC2_PUBLIC_IP]'
]
```

### Update Next.js Configuration:
```javascript
// In verifyme_frontend/next.config.ts
const nextConfig = {
  images: {
    domains: [
      'verifyme.co.in',
      'www.verifyme.co.in',
      'your-s3-bucket.s3.ap-south-1.amazonaws.com'
    ],
  },
};
```

## 7. Test Your Domain

```bash
# Test HTTP
curl -I http://verifyme.co.in

# Test HTTPS
curl -I https://verifyme.co.in

# Test API
curl -I https://verifyme.co.in/api/admin/

# Test frontend
curl -I https://verifyme.co.in/
```

## 8. Set Up Email (Optional)

### Using GoDaddy Email:
1. Purchase email hosting from GoDaddy
2. Configure MX records
3. Set up email forwarding

### Using AWS SES:
```bash
# Verify domain in SES
aws ses verify-domain-identity --domain verifyme.co.in

# Add verification records to DNS
# TXT record: _amazonses.verifyme.co.in
# Value: [VERIFICATION_TOKEN]
```

## 9. Monitor DNS Health

```bash
# Check DNS propagation
dig +trace verifyme.co.in

# Check SSL certificate
openssl s_client -connect verifyme.co.in:443 -servername verifyme.co.in

# Monitor uptime
curl -f https://verifyme.co.in/ || echo "Site is down"
```

## 10. Common Issues & Solutions

### DNS Not Propagating:
- Wait 24-48 hours for full propagation
- Check TTL values (lower = faster updates)
- Use different DNS lookup tools

### SSL Certificate Issues:
- Ensure domain points to correct IP
- Check firewall settings
- Verify certificate installation

### Email Not Working:
- Check MX records
- Verify SPF/DKIM records
- Test with email testing tools 