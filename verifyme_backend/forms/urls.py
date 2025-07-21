from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DynamicFormSchemaViewSet, 
    FormEntryViewSet, 
    FormFieldViewSet, 
    FileAttachmentViewSet, 
    FormFieldFileViewSet, 
    FormEntryExportView,
    FormEntryUploadView,
    EnhancedFormEntryExportView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'schemas', DynamicFormSchemaViewSet, basename='form-schema')
router.register(r'entries', FormEntryViewSet, basename='form-entry')
router.register(r'fields', FormFieldViewSet, basename='form-field')
router.register(r'files', FileAttachmentViewSet, basename='file')
router.register(r'field-files', FormFieldFileViewSet, basename='field-file')

app_name = 'forms'

urlpatterns = [
    # Custom endpoints for EmployeeDashboard (put these BEFORE router URLs)
    path('api/entries/counts/', FormEntryViewSet.as_view({'get': 'counts'}), name='entry-counts'),
    path('api/entries/date-range-count/', FormEntryViewSet.as_view({'get': 'date_range_count'}), name='entry-date-range-count'),
    path('api/entries/advanced-filter/', FormEntryViewSet.as_view({'post': 'advanced_filter'}), name='advanced-filter'),
    path('api/entries/statistics/', FormEntryViewSet.as_view({'get': 'statistics'}), name='entry-statistics'),
    path('api/entries/my-entries/', FormEntryViewSet.as_view({'get': 'my_entries'}), name='my-entries'),
    
    # Detail endpoints (put these BEFORE router URLs)
    path('api/entries/<uuid:pk>/download/', FormEntryViewSet.as_view({'get': 'download'}), name='entry-download'),
    path('api/entries/<uuid:pk>/view-details/', FormEntryViewSet.as_view({'get': 'view_details'}), name='entry-view-details'),
    path('api/entries/<uuid:pk>/update-status/', FormEntryViewSet.as_view({'put': 'update_status'}), name='entry-update-status'),
    
    # Include router URLs
    path('api/', include(router.urls)),
    
    # Export functionality
    path('api/export/', FormEntryExportView.as_view(), name='form-entry-export'),
    path('api/export-enhanced/', EnhancedFormEntryExportView.as_view(), name='enhanced-form-entry-export'),
    
    # Statistics endpoints
    path('api/schemas/statistics/', DynamicFormSchemaViewSet.as_view({'get': 'statistics'}), name='schema-statistics'),
    path('api/files/statistics/', FileAttachmentViewSet.as_view({'get': 'statistics'}), name='file-statistics'),
    
    # File attachments by form entry
    path('api/files/by-form-entry/', FileAttachmentViewSet.as_view({'get': 'by_form_entry'}), name='files-by-entry'),
    
    # Field files by form entry
    path('api/field-files/by-form-entry/', FormFieldFileViewSet.as_view({'get': 'by_form_entry'}), name='field-files-by-entry'),
    
    # File upload
    path('api/upload/', FormEntryUploadView.as_view(), name='file-upload'),
] 