# GitHub Repository Setup

## 1. Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click "New repository"
3. Configure:
   - **Repository name**: `verifyme-mis`
   - **Description**: `VerifyMe MIS - Multi-tenant form management system`
   - **Visibility**: Private (recommended for business)
   - **Initialize with**: README, .gitignore (Python), .gitignore (Node)

## 2. Push Your Code

```bash
# Navigate to your project root
cd /home/kio/Review/Swanand/verifyme

# Initialize git (if not already done)
git init

# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/verifyme-mis.git

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: VerifyMe MIS application"

# Push to GitHub
git push -u origin main
```

## 3. Repository Structure

Your repository should look like:
```
verifyme-mis/
├── verifyme_backend/     # Django backend
├── verifyme_frontend/    # Next.js frontend
├── deployment/          # Deployment scripts
├── docs/               # Documentation
└── README.md
```

## 4. Environment Files

**IMPORTANT**: Never commit sensitive files!

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo "*.pem" >> .gitignore
echo "secrets/" >> .gitignore
```

## 5. Branch Strategy

```bash
# Create development branch
git checkout -b develop

# Create feature branches as needed
git checkout -b feature/new-feature
git checkout -b hotfix/urgent-fix
``` 