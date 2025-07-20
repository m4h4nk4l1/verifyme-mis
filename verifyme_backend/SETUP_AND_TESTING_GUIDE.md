# VerifyMe Setup and Testing Guide

## 🚀 Quick Start Guide

This guide will help you set up and test all the critical missing components that have been implemented in the VerifyMe system.

## 📋 Prerequisites

### Backend Dependencies
```bash
# Install Python dependencies
cd verifyme_backend
pip install -r requirements.txt

# Install additional dependencies for new features
pip install openpyxl reportlab pandas
```

### Frontend Dependencies
```bash
# Install Node.js dependencies
cd verifyme_frontend
npm install

# Install AG-Grid for Excel-like interface
npm install ag-grid-react ag-grid-community
```

## 🔧 Backend Setup

### 1. Database Setup
```bash
cd verifyme_backend

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 2. Environment Configuration
Create `.env` file in `verifyme_backend/`:
```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://username:password@localhost:5432/verifyme
ALLOWED_HOSTS=localhost,127.0.0.1

# AWS S3 Configuration (for file storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=your-region

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440
```

### 3. Start Backend Server
```bash
cd verifyme_backend
python manage.py runserver
```

The backend will be available at: `http://localhost:8000`

## 🎨 Frontend Setup

### 1. Environment Configuration
Create `.env.local` file in `verifyme_frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=VerifyMe
```

### 2. Start Frontend Server
```bash
cd verifyme_frontend
npm run dev
```

The frontend will be available at: `http://localhost:3000`

## 🧪 Testing All Features

### 1. Access the Test Page
Navigate to: `http://localhost:3000/test-features`

This page demonstrates all critical missing components:

### 2. AG-Grid Excel-like Interface Testing

**Features to Test:**
- ✅ **Dynamic Column Management**: Select different form schemas to see columns change
- ✅ **Cell-level Editing**: Click on any cell to edit data
- ✅ **Auto-save**: Toggle auto-save on/off and see real-time updates
- ✅ **Conditional Formatting**: Status cells are color-coded (green=verified, yellow=completed, red=pending)
- ✅ **File Upload Integration**: Upload files directly in grid cells
- ✅ **Advanced Filtering**: Use the filter panel to search and filter data
- ✅ **Sorting**: Click column headers to sort data
- ✅ **Pagination**: Navigate through large datasets

**Test Steps:**
1. Select a form schema from the dropdown
2. Try editing cells in the grid
3. Toggle auto-save on/off
4. Use filters to search for specific entries
5. Sort by different columns
6. Upload files using the file upload cells

### 3. Duplicate Detection System Testing

**Features to Test:**
- ✅ **Real-time Detection**: Duplicates are highlighted automatically
- ✅ **Visual Highlighting**: Duplicate rows have orange background with pulse animation
- ✅ **Confidence Scoring**: Different confidence levels for exact, similar, and potential matches
- ✅ **Resolution Workflow**: Keep, merge, or delete duplicate entries
- ✅ **Configurable Settings**: Adjust detection sensitivity and field matching

**Test Steps:**
1. Switch to the "Duplicates" tab
2. View duplicate groups with confidence scores
3. Click on duplicate groups to see details
4. Try resolving duplicates using different actions
5. Check the statistics panel for duplicate counts

### 4. File Preview System Testing

**Features to Test:**
- ✅ **PDF Preview**: View PDF files directly in the browser
- ✅ **Image Preview**: View images with zoom controls
- ✅ **Document Handling**: Download DOCX files with preview fallback
- ✅ **Zoom Controls**: Zoom in/out on images
- ✅ **File Metadata**: View file size, type, and description
- ✅ **Download Functionality**: Download files directly

**Test Steps:**
1. Switch to the "Files" tab
2. Click on file thumbnails to open preview
3. Try zooming in/out on images
4. Download files using the download button
5. View file metadata and descriptions

### 5. Advanced Export Testing

**Features to Test:**
- ✅ **Excel Export**: Multi-sheet Excel files with formatting
- ✅ **PDF Export**: PDF reports with embedded data
- ✅ **CSV Export**: Simple CSV format for data analysis
- ✅ **File References**: Include file attachments in exports
- ✅ **Analytics**: Include performance metrics and insights
- ✅ **Custom Filtering**: Export filtered data sets
- ✅ **Progress Tracking**: Real-time export progress

**Test Steps:**
1. Click the "Export" button
2. Select different export formats (Excel, PDF, CSV)
3. Configure export options (include files, metadata, analytics)
4. Set custom date ranges
5. Choose sorting options
6. Monitor export progress
7. Download and verify exported files

## 📊 Dashboard Features

### 1. Statistics Cards
- Total entries count
- Completion rates
- Verification status
- TAT compliance
- Duplicate counts

### 2. Analytics Tab
- Performance metrics
- Employee statistics
- Recent activity
- Completion trends

## 🔍 API Testing

### 1. Export API
```bash
# Test export functionality
curl -X POST http://localhost:8000/forms/api/export/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "format": "excel",
    "filters": {},
    "options": {
      "include_files": true,
      "include_analytics": true
    },
    "file_name": "test-export"
  }'
```

### 2. Form Entries API
```bash
# Get form entries with filters
curl -X GET "http://localhost:8000/forms/api/entries/?search=test&is_completed=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐛 Troubleshooting

### Common Issues

1. **AG-Grid Not Loading**
   - Ensure AG-Grid CSS is imported
   - Check browser console for errors
   - Verify AG-Grid dependencies are installed

2. **File Upload Issues**
   - Check AWS S3 configuration
   - Verify file size limits
   - Check CORS settings

3. **Export Not Working**
   - Ensure `openpyxl` and `reportlab` are installed
   - Check file permissions for temporary files
   - Verify memory limits for large exports

4. **Duplicate Detection Not Working**
   - Check form data structure
   - Verify critical fields are present
   - Check browser console for JavaScript errors

### Debug Mode
Enable debug mode in Django settings:
```python
DEBUG = True
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

## 📈 Performance Monitoring

### Backend Monitoring
- Check Django admin for performance metrics
- Monitor database query performance
- Track export generation times

### Frontend Monitoring
- Monitor AG-Grid rendering performance
- Check file upload speeds
- Track duplicate detection algorithm performance

## 🚀 Production Deployment

### Backend Deployment
1. Set `DEBUG = False`
2. Configure production database
3. Set up proper AWS S3 bucket
4. Configure HTTPS
5. Set up monitoring and logging

### Frontend Deployment
1. Build production version: `npm run build`
2. Deploy to Vercel, Netlify, or similar
3. Configure environment variables
4. Set up domain and SSL

## 📝 Feature Checklist

- [x] AG-Grid Excel-like Interface
- [x] Dynamic Column Management
- [x] Cell-level Editing
- [x] Auto-save Functionality
- [x] Conditional Formatting
- [x] File Upload Integration
- [x] Duplicate Detection System
- [x] Real-time Highlighting
- [x] Confidence Scoring
- [x] Resolution Workflow
- [x] File Preview System
- [x] PDF Preview
- [x] Image Zoom Controls
- [x] Document Handling
- [x] Advanced Export
- [x] Excel Export with Formatting
- [x] PDF Export with Analytics
- [x] CSV Export
- [x] File References
- [x] Progress Tracking

## 🎯 Next Steps

1. **Test all features** using the test page
2. **Create sample data** for comprehensive testing
3. **Configure production settings** for deployment
4. **Set up monitoring** for performance tracking
5. **Train users** on new features
6. **Gather feedback** and iterate on improvements

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the implementation documentation
3. Check browser console and Django logs
4. Create detailed bug reports with steps to reproduce

---

**🎉 Congratulations!** All critical missing components have been successfully implemented and are ready for testing and production use. 