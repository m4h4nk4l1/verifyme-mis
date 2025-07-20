from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q, Avg, Sum
from django.utils import timezone
from datetime import timedelta, datetime
import json
import io
import zipfile
import logging
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils.dataframe import dataframe_to_rows
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from io import BytesIO
import pandas as pd
from django.http import HttpResponse
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import csv

from .models import DynamicFormSchema, FormEntry, FormField, FileAttachment, FormFieldFile
from .serializers import (
    DynamicFormSchemaSerializer,
    DynamicFormSchemaCreateSerializer,
    FormEntrySerializer,
    FormEntryCreateSerializer,
    FormEntryUpdateSerializer,
    FormFieldSerializer,
    FormFieldCreateSerializer,
    FormSchemaStatisticsSerializer,
    FileAttachmentSerializer,
    FileAttachmentCreateSerializer,
    FileAttachmentUpdateSerializer,
    FormFieldFileSerializer,
    FormFieldFileCreateSerializer,
    FormFieldFileUpdateSerializer
)
from accounts.permissions import IsOrganizationAdmin
from utils.storage import S3FileManager

# Set up logging
logger = logging.getLogger(__name__)

class DynamicFormSchemaViewSet(viewsets.ModelViewSet):
    """ViewSet for DynamicFormSchema management"""
    
    queryset = DynamicFormSchema.objects.all()
    serializer_class = DynamicFormSchemaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'fields_count']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return DynamicFormSchemaCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DynamicFormSchemaUpdateSerializer
        return DynamicFormSchemaSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        print(f"🔍 Schema filtering for user: {user.email} (role: {user.role}, org: {user.organization})")
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all schemas
            queryset = DynamicFormSchema.objects.all()
            print(f"🔍 Super admin - returning all schemas: {queryset.count()}")
        elif user.role == 'ADMIN':
            # Admin can only see schemas in their organization
            queryset = DynamicFormSchema.objects.filter(organization=user.organization)
            print(f"🔍 Admin - returning schemas for org {user.organization}: {queryset.count()}")
        else:
            # Employees can only see active schemas from their own organization
            queryset = DynamicFormSchema.objects.filter(
                organization=user.organization,
                is_active=True
            )
            print(f"🔍 Employee - returning active schemas for org {user.organization}: {queryset.count()}")
        
        return queryset
    
    def perform_create(self, serializer):
        """Set organization and created_by for new schemas"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can create schemas for any organization
            pass
        elif user.role == 'ADMIN':
            # Admin can only create schemas in their organization
            serializer.save(
                organization=user.organization,
                created_by=user
            )
            return
        
        serializer.save(created_by=user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get form schema statistics"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin gets all statistics
            total_schemas = DynamicFormSchema.objects.count()
            active_schemas = DynamicFormSchema.objects.filter(is_active=True).count()
            total_entries = FormEntry.objects.count()
            completed_entries = FormEntry.objects.filter(is_completed=True).count()
            verified_entries = FormEntry.objects.filter(is_verified=True).count()
            
            # Calculate average completion time using database fields
            completed_entries_with_time = FormEntry.objects.filter(
                is_completed=True,
                tat_completion_time__isnull=False
            )
            
            # Calculate average using Python instead of database aggregation
            total_hours = 0
            count_with_time = 0
            for entry in completed_entries_with_time:
                if entry.tat_duration:
                    total_hours += entry.tat_duration
                    count_with_time += 1
            
            avg_completion_time = total_hours / count_with_time if count_with_time > 0 else 0
            
            # Recent schemas
            recent_schemas = DynamicFormSchema.objects.order_by('-created_at')[:5]
            
        else:
            # Admin/Employee gets organization-specific statistics
            org = user.organization
            total_schemas = DynamicFormSchema.objects.filter(organization=org).count()
            active_schemas = DynamicFormSchema.objects.filter(
                organization=org, 
                is_active=True
            ).count()
            total_entries = FormEntry.objects.filter(organization=org).count()
            completed_entries = FormEntry.objects.filter(
                organization=org, 
                is_completed=True
            ).count()
            verified_entries = FormEntry.objects.filter(
                organization=org, 
                is_verified=True
            ).count()
            
            # Calculate average completion time for organization
            completed_entries_with_time = FormEntry.objects.filter(
                organization=org,
                is_completed=True,
                tat_completion_time__isnull=False
            )
            
            # Calculate average using Python instead of database aggregation
            total_hours = 0
            count_with_time = 0
            for entry in completed_entries_with_time:
                if entry.tat_duration:
                    total_hours += entry.tat_duration
                    count_with_time += 1
            
            avg_completion_time = total_hours / count_with_time if count_with_time > 0 else 0
            
            # Recent schemas for organization
            recent_schemas = DynamicFormSchema.objects.filter(
                organization=org
            ).order_by('-created_at')[:5]
        
        # Serialize recent schemas separately
        recent_schemas_data = DynamicFormSchemaSerializer(recent_schemas, many=True, context={'request': request}).data
        
        data = {
            'total_schemas': total_schemas,
            'active_schemas': active_schemas,
            'total_entries': total_entries,
            'completed_entries': completed_entries,
            'verified_entries': verified_entries,
            'average_completion_time': round(avg_completion_time, 2),
            'recent_schemas': recent_schemas_data
        }
        
        serializer = FormSchemaStatisticsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def entries(self, request, pk=None):
        """Get form entries for a specific schema"""
        user = request.user
        schema = self.get_object()
        
        # Check permissions
        if user.role == 'EMPLOYEE':
            # Employees can only see their own entries
            entries = FormEntry.objects.filter(
                form_schema=schema,
                employee=user
            )
        else:
            # Admin/Super admin can see all entries for the schema
            entries = FormEntry.objects.filter(form_schema=schema)
        
        serializer = FormEntrySerializer(entries, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a form schema"""
        user = request.user
        original_schema = self.get_object()
        
        # Create a copy of the schema
        new_schema = DynamicFormSchema.objects.create(
            name=f"{original_schema.name} (Copy)",
            description=original_schema.description,
            organization=original_schema.organization,
            fields_definition=original_schema.fields_definition,
            max_fields=original_schema.max_fields,
            created_by=user
        )
        
        serializer = DynamicFormSchemaSerializer(new_schema, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class FormEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for FormEntry management"""
    
    queryset = FormEntry.objects.all()
    serializer_class = FormEntrySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_completed', 'is_verified', 'form_schema', 'employee']
    search_fields = ['verification_notes', 'form_data']
    ordering_fields = ['created_at', 'case_id']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return FormEntryCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FormEntryUpdateSerializer
        return FormEntrySerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['destroy']:
            # Allow employees to delete their own entries, admins to delete any
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update']:
            # Allow employees to update their own entries
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def destroy(self, request, *args, **kwargs):
        """Custom destroy method to handle permissions"""
        instance = self.get_object()
        user = request.user
        
        # Allow employees to delete their own entries
        if user.role == 'EMPLOYEE' and instance.employee != user:
            return Response({'error': 'You can only delete your own entries'}, status=status.HTTP_403_FORBIDDEN)
        
        # Allow admins to delete any entry in their organization
        if user.role == 'ADMIN' and instance.organization != user.organization:
            return Response({'error': 'You can only delete entries in your organization'}, status=status.HTTP_403_FORBIDDEN)
        
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        
        # Add debugging for form data updates
        logger.info(f"=== FORM ENTRY UPDATE DEBUG ===")
        logger.info(f"📝 Updating entry: {instance.id}")
        logger.info(f"📝 Request data: {request.data}")
        logger.info(f"📝 Current form_data: {instance.form_data}")
        
        # Only allow employees to update their own entries
        if user.role == 'EMPLOYEE' and instance.employee != user:
            return Response({'error': 'You can only update your own entries'}, status=status.HTTP_403_FORBIDDEN)
        
        response = super().update(request, *args, **kwargs)
        
        # Log the updated entry
        updated_instance = self.get_object()
        logger.info(f"📝 Updated form_data: {updated_instance.form_data}")
        logger.info(f"📝 Update response: {response.data}")
        
        return response

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        # Only allow employees to update their own entries
        if user.role == 'EMPLOYEE' and instance.employee != user:
            return Response({'error': 'You can only update your own entries'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all entries
            queryset = FormEntry.objects.all()
        elif user.role == 'ADMIN':
            # Admin can see all entries in their organization
            queryset = FormEntry.objects.filter(organization=user.organization)
        else:
            # Employees can see all entries in their organization (not just their own)
            queryset = FormEntry.objects.filter(organization=user.organization)
        
        # Apply custom filters
        is_out_of_tat = self.request.query_params.get('isOutOfTat')
        if is_out_of_tat and is_out_of_tat.lower() == 'true':
            # Filter for entries that are out of TAT
            queryset = queryset.filter(is_completed=False)
            # This will be further filtered by the organization's TAT limit
            # We'll need to do this in Python since it's organization-specific
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Custom list method to handle organization-specific TAT filtering"""
        queryset = self.get_queryset()
        
        # Apply organization-specific TAT filtering
        is_out_of_tat = request.query_params.get('isOutOfTat')
        if is_out_of_tat and is_out_of_tat.lower() == 'true':
            # Filter entries that are out of TAT based on organization limit
            filtered_entries = []
            for entry in queryset:
                if entry.check_tat_status():  # This uses organization-specific TAT
                    filtered_entries.append(entry)
            queryset = queryset.filter(id__in=[entry.id for entry in filtered_entries])
        
        # Apply standard filtering and pagination
        queryset = self.filter_queryset(queryset)
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Set organization and employee for new entries, and update file records"""
        user = self.request.user
        
        # Create the form entry
        if user.role == 'SUPER_ADMIN':
            # Super admin can create entries for any organization
            entry = serializer.save(employee=user)
        elif user.role == 'ADMIN':
            # Admin can create entries in their organization
            entry = serializer.save(organization=user.organization)
        else:
            # Employees can only create entries for themselves
            entry = serializer.save(
                organization=user.organization,
                employee=user
            )
        
        # Update file records to point to the final form entry
        form_data = entry.form_data
        if form_data:
            logger.info(f"🔄 Updating file records for form entry: {entry.id}")
            logger.info(f"📋 Form data: {form_data}")
            
            # Find file IDs in form data
            file_ids_to_update = []
            for field_name, value in form_data.items():
                if isinstance(value, str) and len(value) > 10 and '-' in value:
                    # This looks like a UUID - check if it's a file ID
                    try:
                        # Try to find a FormFieldFile with this ID
                        file_obj = FormFieldFile.objects.filter(id=value).first()
                        if file_obj:
                            file_ids_to_update.append((value, field_name))
                            logger.info(f"📎 Found file ID to update: {value} for field {field_name}")
                            logger.info(f"📎 Current file entry: {file_obj.form_entry}, field: {file_obj.field_name}")
                        else:
                            logger.warning(f"⚠️ File ID {value} not found in database")
                    except Exception as e:
                        logger.warning(f"⚠️ Error checking file ID {value}: {str(e)}")
            
            logger.info(f"📋 Total files to update: {len(file_ids_to_update)}")
            
            # Update file records
            updated_count = 0
            for file_id, field_name in file_ids_to_update:
                try:
                    file_obj = FormFieldFile.objects.get(id=file_id)
                    logger.info(f"🔄 Updating file {file_id}:")
                    logger.info(f"   - Old form_entry: {file_obj.form_entry}")
                    logger.info(f"   - Old field_name: {file_obj.field_name}")
                    logger.info(f"   - New form_entry: {entry.id}")
                    logger.info(f"   - New field_name: {field_name}")
                    
                    file_obj.form_entry = entry
                    file_obj.field_name = field_name
                    file_obj.is_temporary = False  # Mark as permanent
                    file_obj.save()
                    
                    logger.info(f"✅ Updated file {file_id} to point to form entry {entry.id}")
                    updated_count += 1
                    
                    # Verify the update
                    updated_file = FormFieldFile.objects.get(id=file_id)
                    logger.info(f"✅ Verification - File {file_id} now points to entry {updated_file.form_entry}")
                    
                except FormFieldFile.DoesNotExist:
                    logger.warning(f"⚠️ File {file_id} not found")
                except Exception as e:
                    logger.error(f"❌ Error updating file {file_id}: {str(e)}")
                    import traceback
                    logger.error(f"❌ Traceback: {traceback.format_exc()}")
            
            logger.info(f"✅ Successfully updated {updated_count} out of {len(file_ids_to_update)} files")
        
        return entry
    
    def create(self, request, *args, **kwargs):
        """Create a new form entry with duplicate detection"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Temporarily disable duplicate detection for testing
        # TODO: Re-enable with better logic later
        """
        # Check for duplicates based on form data - only check for exact duplicates
        form_data = serializer.validated_data.get('form_data', {})
        form_schema = serializer.validated_data.get('form_schema')
        
        if form_data and form_schema:
            # Look for exact duplicates only (same form_data exactly)
            duplicates = FormEntry.objects.filter(
                form_schema=form_schema,
                form_data=form_data  # Exact match instead of contains
            )
            
            if duplicates.exists():
                return Response({
                    'message': 'Potential duplicate entry detected',
                    'duplicates': FormEntrySerializer(duplicates, many=True).data
                }, status=status.HTTP_409_CONFLICT)
        """
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark a form entry as completed"""
        entry = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role == 'EMPLOYEE' and entry.employee != user:
            return Response({'error': 'You can only complete your own entries'}, status=status.HTTP_403_FORBIDDEN)
        
        entry.mark_completed()
        serializer = self.get_serializer(entry)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a form entry"""
        entry = self.get_object()
        user = request.user
        
        # Only admins can verify entries
        if user.role == 'EMPLOYEE':
            return Response({'error': 'Only admins can verify entries'}, status=status.HTTP_403_FORBIDDEN)
        
        verification_notes = request.data.get('verification_notes', '')
        
        entry.is_verified = True
        entry.verification_notes = verification_notes
        entry.verified_by = user
        entry.verified_at = timezone.now()
        entry.save()
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_entries(self, request):
        """Get current user's form entries"""
        user = request.user
        entries = FormEntry.objects.filter(employee=user)
        
        # Apply filters from query parameters
        filters = request.query_params
        
        if filters.get('is_completed'):
            entries = entries.filter(is_completed=filters['is_completed'].lower() == 'true')
        
        if filters.get('is_verified'):
            entries = entries.filter(is_verified=filters['is_verified'].lower() == 'true')
        
        if filters.get('form_schema'):
            entries = entries.filter(form_schema_id=filters['form_schema'])
        
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get form entry statistics"""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin gets all statistics
            total_entries = FormEntry.objects.count()
            completed_entries = FormEntry.objects.filter(is_completed=True).count()
            verified_entries = FormEntry.objects.filter(is_verified=True).count()
            pending_entries = FormEntry.objects.filter(is_completed=False).count()
            out_of_tat_entries = FormEntry.objects.filter(
                is_completed=False,
                tat_start_time__lt=timezone.now() - timedelta(hours=24)
            ).count()
            
            # Calculate repeat cases (entries with similar data)
            repeat_cases = 0
            all_entries = FormEntry.objects.all()
            for entry in all_entries:
                similar_entries = FormEntry.objects.filter(
                    form_schema=entry.form_schema,
                    form_data__contains=entry.form_data
                ).exclude(id=entry.id)
                if similar_entries.exists():
                    repeat_cases += 1
            
            repeat_cases = repeat_cases // 2  # Divide by 2 to avoid double counting
            
        else:
            # Admin/Employee gets organization-specific statistics
            org = user.organization
            total_entries = FormEntry.objects.filter(organization=org).count()
            completed_entries = FormEntry.objects.filter(
                organization=org, 
                is_completed=True
            ).count()
            verified_entries = FormEntry.objects.filter(
                organization=org, 
                is_verified=True
            ).count()
            pending_entries = FormEntry.objects.filter(
                organization=org, 
                is_completed=False
            ).count()
            out_of_tat_entries = FormEntry.objects.filter(
                organization=org,
                is_completed=False,
                tat_start_time__lt=timezone.now() - timedelta(hours=24)
            ).count()
            
            # Calculate repeat cases for organization
            repeat_cases = 0
            org_entries = FormEntry.objects.filter(organization=org)
            for entry in org_entries:
                similar_entries = FormEntry.objects.filter(
                    organization=org,
                    form_schema=entry.form_schema,
                    form_data__contains=entry.form_data
                ).exclude(id=entry.id)
                if similar_entries.exists():
                    repeat_cases += 1
            
            repeat_cases = repeat_cases // 2  # Divide by 2 to avoid double counting
        
        # Calculate average completion time
        completed_entries_with_time = FormEntry.objects.filter(
            is_completed=True,
            tat_completion_time__isnull=False
        )
        
        total_hours = 0
        count_with_time = 0
        for entry in completed_entries_with_time:
            if entry.tat_duration:
                total_hours += entry.tat_duration
                count_with_time += 1
        
        avg_completion_time = total_hours / count_with_time if count_with_time > 0 else 0
        
        data = {
            'total_entries': total_entries,
            'completed_entries': completed_entries,
            'verified_entries': verified_entries,
            'pending_entries': pending_entries,
            'out_of_tat_entries': out_of_tat_entries,
            'repeat_cases': repeat_cases,
            'average_completion_time': round(avg_completion_time, 2)
        }
        
        return Response(data)
    
    @action(detail=False, methods=['post'])
    def advanced_filter(self, request):
        """Advanced filtering with complex queries and schema field validation"""
        try:
            print(f"🔍 Advanced Filter Debug - Request received:")
            print(f"   - Request data: {request.data}")
            print(f"   - Request user: {request.user}")
            print(f"   - Request user role: {request.user.role}")
            
            # Get filters from request data (not nested)
            filters = request.data
            user = request.user
            warnings = []
            
            # Debug: Print all received filters
            print(f"🔍 Received Filters Debug:")
            print(f"   - Request data: {request.data}")
            print(f"   - Filters: {filters}")
            print(f"   - Date range: {filters.get('date_range')}")
            print(f"   - Start date: {filters.get('start_date')}")
            print(f"   - End date: {filters.get('end_date')}")
            print(f"   - DateFrom: {filters.get('dateFrom')}")
            print(f"   - DateTo: {filters.get('dateTo')}")
            print(f"   - Page: {filters.get('page')}")
            print(f"   - Page size: {filters.get('page_size')}")
            
            # Base queryset
            if user.role == 'SUPER_ADMIN':
                queryset = FormEntry.objects.all()
            elif user.role == 'ADMIN':
                queryset = FormEntry.objects.filter(organization=user.organization)
            else:
                queryset = FormEntry.objects.filter(organization=user.organization)
            
            print(f"🔍 Base queryset count: {queryset.count()}")
            
            # Get all active schemas for the organization to validate fields
            if user.role == 'SUPER_ADMIN':
                schemas = DynamicFormSchema.objects.filter(is_active=True)
            else:
                schemas = DynamicFormSchema.objects.filter(
                    organization=user.organization,
                    is_active=True
                )
            
            print(f"🔍 Active schemas count: {schemas.count()}")
            
            # Collect all field names from schemas
            schema_fields = set()
            for schema in schemas:
                if schema.fields_definition:
                    for field in schema.fields_definition:
                        if isinstance(field, dict) and 'name' in field:
                            schema_fields.add(field['name'])
            
            print(f"🔍 Schema fields found: {schema_fields}")
            
            # Enhanced date filtering with intervals
            if filters.get('date_range'):
                now = timezone.now()
                if filters['date_range'] == 'today':
                    # Get start and end of today in user's timezone
                    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    today_end = today_start + timedelta(days=1)
                    queryset = queryset.filter(
                        created_at__gte=today_start,
                        created_at__lt=today_end
                    )
                    print(f"🔍 Today Filter Debug:")
                    print(f"   - Today start: {today_start}")
                    print(f"   - Today end: {today_end}")
                    print(f"   - Current time: {now}")
                    print(f"   - Query count after today filter: {queryset.count()}")
                elif filters['date_range'] == 'week':
                    week_ago = now - timedelta(days=7)
                    queryset = queryset.filter(created_at__gte=week_ago)
                elif filters['date_range'] == 'month':
                    month_ago = now - timedelta(days=30)
                    queryset = queryset.filter(created_at__gte=month_ago)
                elif filters['date_range'] == 'quarter':
                    quarter_ago = now - timedelta(days=90)
                    queryset = queryset.filter(created_at__gte=quarter_ago)
                elif filters['date_range'] == 'year':
                    year_ago = now - timedelta(days=365)
                    queryset = queryset.filter(created_at__gte=year_ago)
            
            # Custom date range
            if filters.get('start_date'):
                queryset = queryset.filter(created_at__gte=filters['start_date'])
            
            if filters.get('end_date'):
                queryset = queryset.filter(created_at__lte=filters['end_date'])
            
            # Also check for dateFrom/dateTo (frontend compatibility)
            if filters.get('dateFrom'):
                queryset = queryset.filter(created_at__gte=filters['dateFrom'])
            
            if filters.get('dateTo'):
                queryset = queryset.filter(created_at__lte=filters['dateTo'])
            
            # Month and Year filtering
            if filters.get('month'):
                queryset = queryset.filter(created_at__month=filters['month'])
            
            if filters.get('year'):
                queryset = queryset.filter(created_at__year=filters['year'])
            
            # Employee filtering
            if filters.get('employee_name'):
                queryset = queryset.filter(
                    Q(employee__first_name__icontains=filters['employee_name']) |
                    Q(employee__last_name__icontains=filters['employee_name'])
                )
            
            # Schema/Case type filtering
            if filters.get('case_type'):
                queryset = queryset.filter(form_schema__name__icontains=filters['case_type'])
            
            # Status filtering
            if filters.get('status'):
                status_value = filters['status'].lower()
                if status_value == 'completed':
                    queryset = queryset.filter(is_completed=True)
                elif status_value == 'pending':
                    queryset = queryset.filter(is_completed=False)
                elif status_value == 'verified':
                    queryset = queryset.filter(is_verified=True)
            
            # TAT filtering (Out of TAT)
            if filters.get('is_out_of_tat') is not None:
                is_out_of_tat = filters['is_out_of_tat']
                # Handle both string and boolean values
                if isinstance(is_out_of_tat, str):
                    is_out_of_tat = is_out_of_tat.lower() == 'true'
                else:
                    is_out_of_tat = bool(is_out_of_tat)
                
                # Get current time for TAT calculation
                now = timezone.now()
                
                print(f"🔍 TAT Filter Debug:")
                print(f"   - Original value: {filters['is_out_of_tat']}")
                print(f"   - Processed value: {is_out_of_tat}")
                print(f"   - Current time: {now}")
                
                if is_out_of_tat:
                    # Filter for entries that are out of TAT using schema-specific limits
                    # We'll filter in Python since we need schema-specific TAT limits
                    out_of_tat_entries = []
                    for entry in queryset:
                        if entry.check_tat_status():
                            out_of_tat_entries.append(entry.id)
                    queryset = queryset.filter(id__in=out_of_tat_entries)
                    print(f"   - Filtering for OUT OF TAT entries using schema-specific limits")
                else:
                    # Filter for entries that are within TAT using schema-specific limits
                    within_tat_entries = []
                    for entry in queryset:
                        if not entry.check_tat_status():
                            within_tat_entries.append(entry.id)
                    queryset = queryset.filter(id__in=within_tat_entries)
                    print(f"   - Filtering for WITHIN TAT entries using schema-specific limits")
                
                print(f"   - Query count after TAT filter: {queryset.count()}")
            
            # Check for business-specific filters that might not exist in schema
            business_filters = [
                'bank_nbfc_name', 'location', 'product_type', 'case_status',
                'field_verifier_name', 'back_office_executive_name', 'is_repeat_case'
            ]
            
            warnings = []
            for filter_name in business_filters:
                if filters.get(filter_name) and filter_name not in schema_fields:
                    field_display_name = filter_name.replace('_', ' ').title()
                    warnings.append(f"Filter field '{field_display_name}' is not present in your organization's form schemas")
            
            # Apply business-specific filters if they exist in schema
            if filters.get('bank_nbfc_name') and 'bank_nbfc_name' in schema_fields:
                queryset = queryset.filter(form_data__bank_nbfc_name__icontains=filters['bank_nbfc_name'])
            
            if filters.get('location') and 'location' in schema_fields:
                queryset = queryset.filter(form_data__location__icontains=filters['location'])
            
            if filters.get('product_type') and 'product_type' in schema_fields:
                queryset = queryset.filter(form_data__product_type__icontains=filters['product_type'])
            
            if filters.get('case_status') and 'case_status' in schema_fields:
                queryset = queryset.filter(form_data__case_status__icontains=filters['case_status'])
            
            if filters.get('field_verifier_name') and 'field_verifier_name' in schema_fields:
                queryset = queryset.filter(form_data__field_verifier_name__icontains=filters['field_verifier_name'])
            
            if filters.get('back_office_executive_name') and 'back_office_executive_name' in schema_fields:
                queryset = queryset.filter(form_data__back_office_executive_name__icontains=filters['back_office_executive_name'])
            
            if filters.get('is_repeat_case') and 'is_repeat_case' in schema_fields:
                is_repeat = filters['is_repeat_case'].lower() == 'true'
                queryset = queryset.filter(form_data__is_repeat_case=is_repeat)
            
            # Search in all fields
            if filters.get('search'):
                search_term = filters['search']
                print(f"🔍 Search Debug - Term: {search_term}")
                
                # Create a comprehensive search query
                search_query = Q()
                
                # Search in basic fields
                search_query |= Q(employee__first_name__icontains=search_term)
                search_query |= Q(employee__last_name__icontains=search_term)
                search_query |= Q(employee__email__icontains=search_term)
                search_query |= Q(form_schema__name__icontains=search_term)
                search_query |= Q(verification_notes__icontains=search_term)
                search_query |= Q(case_id__icontains=search_term)
                
                # Search in form_data JSON field (all dynamic fields)
                search_query |= Q(form_data__icontains=search_term)
                
                # Search in filtered_form_data if available
                # Note: This might not work directly since it's a computed field
                # We'll handle this by searching the original form_data
                
                # Apply the search query
                queryset = queryset.filter(search_query)
                
                print(f"🔍 Search Debug - Query count after search: {queryset.count()}")
                
                # Additional search in specific form fields if needed
                # This searches for the term in any JSON key or value
                if search_term:
                    # Search in JSON fields more comprehensively
                    # This will search in both keys and values of the JSON
                    json_search_query = Q()
                    
                    # Search in form_data JSON (both keys and values)
                    json_search_query |= Q(form_data__icontains=search_term)
                    
                    # Apply JSON search
                    queryset = queryset.filter(json_search_query)
                    
                    print(f"🔍 Search Debug - Final count after JSON search: {queryset.count()}")
            
            # Ensure proper ordering by case_id (ascending) for consistent display
            # First, handle any entries with null case_ids by assigning them
            null_case_entries = queryset.filter(case_id__isnull=True)
            for entry in null_case_entries:
                # Force save to trigger case_id generation
                entry.save()
            
            # Order by case_id ascending for proper numerical order
            queryset = queryset.order_by('case_id')
            
            # Pagination
            # Extract pagination parameters from request data
            page = filters.get('page', 1)
            page_size = filters.get('page_size', 20)
            
            print(f"🔍 Pagination Debug:")
            print(f"   - Page: {page}")
            print(f"   - Page size: {page_size}")
            print(f"   - Final queryset count: {queryset.count()}")
            
            # Convert to integers
            try:
                page = int(page)
                page_size = int(page_size)
            except (ValueError, TypeError):
                page = 1
                page_size = 20
            
            # Calculate offset for manual pagination
            offset = (page - 1) * page_size
            
            # Apply pagination manually
            paginated_queryset = queryset[offset:offset + page_size]
            total_count = queryset.count()
            
            try:
                # Use select_related to optimize database queries
                paginated_queryset = paginated_queryset.select_related(
                    'employee', 'organization', 'form_schema', 'verified_by'
                ).prefetch_related('field_files')
                
                serializer = self.get_serializer(paginated_queryset, many=True)
                response_data = {
                    'count': total_count,
                    'next': f"?page={page + 1}" if offset + page_size < total_count else None,
                    'previous': f"?page={page - 1}" if page > 1 else None,
                    'results': serializer.data
                }
                
                if warnings:
                    response_data['warnings'] = warnings
                
                print(f"🔍 Success - Returning paginated response with {len(serializer.data)} items")
                print(f"🔍 Total count: {total_count}, Page: {page}, Page size: {page_size}")
                return Response(response_data)
                
            except Exception as e:
                print(f"❌ Error during serialization/pagination: {str(e)}")
                import traceback
                print(f"❌ Traceback: {traceback.format_exc()}")
                return Response(
                    {'error': f'Serialization error: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        except Exception as e:
            print(f"❌ Advanced Filter Error: {str(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Filter error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def counts(self, request):
        """Get case counts for different time periods with optional filtering"""
        try:
            user = request.user
            now = timezone.now()
            
            # Base queryset
            if user.role == 'SUPER_ADMIN':
                queryset = FormEntry.objects.all()
            elif user.role == 'ADMIN':
                queryset = FormEntry.objects.filter(organization=user.organization)
            else:
                queryset = FormEntry.objects.filter(organization=user.organization)
            
            # Apply filters from query parameters if provided
            filters = request.query_params
            
            if filters.get('search'):
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(form_data__icontains=search_term) |
                    Q(employee__first_name__icontains=search_term) |
                    Q(employee__last_name__icontains=search_term) |
                    Q(form_schema__name__icontains=search_term)
                )
            
            if filters.get('status'):
                status_value = filters['status'].lower()
                if status_value == 'completed':
                    queryset = queryset.filter(is_completed=True)
                elif status_value == 'pending':
                    queryset = queryset.filter(is_completed=False)
                elif status_value == 'verified':
                    queryset = queryset.filter(is_verified=True)
            
            if filters.get('dateFrom'):
                queryset = queryset.filter(created_at__gte=filters['dateFrom'])
            
            if filters.get('dateTo'):
                queryset = queryset.filter(created_at__lte=filters['dateTo'])
            
            if filters.get('employee'):
                queryset = queryset.filter(
                    Q(employee__first_name__icontains=filters['employee']) |
                    Q(employee__last_name__icontains=filters['employee'])
                )
            
            if filters.get('caseType'):
                queryset = queryset.filter(form_schema__name__icontains=filters['caseType'])
            
            # Calculate time periods
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            year_ago = now - timedelta(days=365)
            
            # Get counts
            total = queryset.count()
            this_week = queryset.filter(created_at__gte=week_ago).count()
            this_month = queryset.filter(created_at__gte=month_ago).count()
            this_year = queryset.filter(created_at__gte=year_ago).count()
            
            return Response({
                'total': total,
                'thisWeek': this_week,
                'thisMonth': this_month,
                'thisYear': this_year
            })
            
        except Exception as e:
            return Response(
                {'error': f'Count error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def date_range_count(self, request):
        """Get case count for a specific date range"""
        try:
            user = request.user
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            if not start_date or not end_date:
                return Response(
                    {'error': 'Both start_date and end_date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Base queryset
            if user.role == 'SUPER_ADMIN':
                queryset = FormEntry.objects.all()
            elif user.role == 'ADMIN':
                queryset = FormEntry.objects.filter(organization=user.organization)
            else:
                queryset = FormEntry.objects.filter(organization=user.organization)
            
            # Apply date range filter
            queryset = queryset.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            )
            
            count = queryset.count()
            
            return Response({
                'count': count,
                'start_date': start_date,
                'end_date': end_date,
                'date_range': f"{start_date} to {end_date}"
            })
            
        except Exception as e:
            return Response(
                {'error': f'Date range count error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download form entry as PDF"""
        entry = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role == 'EMPLOYEE' and entry.employee != user:
            return Response({'error': 'You can only download your own entries'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Generate PDF content (simplified for now)
            
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            
            # Add content to PDF
            p.drawString(100, 750, f"Form Entry: {entry.id}")
            p.drawString(100, 730, f"Employee: {entry.employee.get_full_name()}")
            p.drawString(100, 710, f"Created: {entry.created_at}")
            p.drawString(100, 690, f"Status: {entry.get_status_display()}")
            
            # Add form data
            y_position = 650
            for key, value in entry.form_data.items():
                p.drawString(100, y_position, f"{key}: {value}")
                y_position -= 20
                if y_position < 50:
                    p.showPage()
                    y_position = 750
            
            p.save()
            buffer.seek(0)
            
            response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="entry_{entry.id}.pdf"'
            return response
            
        except Exception as e:
            return Response({'error': f'Failed to generate PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def view_details(self, request, pk=None):
        """Get detailed view of form entry"""
        entry = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role == 'EMPLOYEE' and entry.employee != user:
            return Response({'error': 'You can only view your own entries'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get form schema details
        schema = entry.form_schema
        schema_data = {
            'id': schema.id,
            'name': schema.name,
            'description': schema.description,
            'fields_definition': schema.fields_definition
        }
        
        # Get file attachments
        attachments = FileAttachment.objects.filter(form_entry=entry)
        attachment_data = FileAttachmentSerializer(attachments, many=True).data
        
        response_data = {
            'entry': self.get_serializer(entry).data,
            'schema': schema_data,
            'attachments': attachment_data
        }
        
        return Response(response_data)
    
    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        """Update entry status (complete/verify)"""
        entry = self.get_object()
        user = request.user
        new_status = request.data.get('status')
        
        if not new_status:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check permissions
        if user.role == 'EMPLOYEE' and entry.employee != user:
            return Response({'error': 'You can only update your own entries'}, status=status.HTTP_403_FORBIDDEN)
        
        # Update status based on action
        if new_status == 'completed':
            if user.role == 'EMPLOYEE':
                # Employees can mark their own entries as completed
                entry.is_completed = True
                entry.tat_completion_time = timezone.now()
                entry.save()
            else:
                return Response({'error': 'Only employees can mark entries as completed'}, status=status.HTTP_403_FORBIDDEN)
        
        elif new_status == 'verified':
            if user.role in ['ADMIN', 'SUPER_ADMIN']:
                # Only admins can verify entries
                entry.is_verified = True
                entry.verified_by = user
                entry.verified_at = timezone.now()
                entry.verification_notes = request.data.get('verification_notes', '')
                entry.save()
            else:
                return Response({'error': 'Only admins can verify entries'}, status=status.HTTP_403_FORBIDDEN)
        
        elif new_status == 'pending':
            # Reset to pending (only for admins)
            if user.role in ['ADMIN', 'SUPER_ADMIN']:
                entry.is_completed = False
                entry.is_verified = False
                entry.verified_by = None
                entry.verified_at = None
                entry.verification_notes = ''
                entry.save()
            else:
                return Response({'error': 'Only admins can reset entries to pending'}, status=status.HTTP_403_FORBIDDEN)
        
        else:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

class FormFieldViewSet(viewsets.ModelViewSet):
    """ViewSet for FormField management"""
    
    queryset = FormField.objects.all()
    serializer_class = FormFieldSerializer
    permission_classes = [IsAuthenticated, IsOrganizationAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['field_type', 'is_active', 'is_required']
    search_fields = ['name', 'display_name']
    ordering_fields = ['name', 'order', 'created_at']
    ordering = ['order', 'name']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return FormFieldCreateSerializer
        return FormFieldSerializer
    
    def get_queryset(self):
        """Filter queryset based on user organization"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all fields
            return FormField.objects.all()
        else:
            # Admin can only see fields in their organization
            return FormField.objects.filter(organization=user.organization)
    
    def perform_create(self, serializer):
        """Set organization and created_by for new fields"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can create fields for any organization
            pass
        else:
            # Admin can only create fields in their organization
            serializer.save(
                organization=user.organization,
                created_by=user
            )
            return
        
        serializer.save(created_by=user)

class FileAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for file attachments"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['form_entry', 'is_verified', 'file_type', 'uploaded_by']
    search_fields = ['original_filename', 'description', 'verification_notes']
    ordering_fields = ['uploaded_at', 'file_size', 'original_filename']
    ordering = ['-uploaded_at']
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all files
            return FileAttachment.objects.all()
        elif user.role == 'ADMIN':
            # Admin can see files in their organization
            return FileAttachment.objects.filter(form_entry__organization=user.organization)
        else:
            # Employees can only see their own files
            return FileAttachment.objects.filter(uploaded_by=user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return FileAttachmentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FileAttachmentUpdateSerializer
        return FileAttachmentSerializer
    
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Set uploaded_by to current user"""
        serializer.save(uploaded_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create a new file attachment with enhanced logging"""
        logger.info(f"File upload request from user {request.user.email}")
        logger.info(f"Request data keys: {list(request.data.keys())}")
        logger.info(f"Request files keys: {list(request.FILES.keys())}")
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Log file information
            file_obj = request.FILES.get('file')
            if file_obj:
                logger.info(f"File details - Name: {file_obj.name}, Size: {file_obj.size}, Type: {file_obj.content_type}")
            else:
                logger.warning("No file found in request")
            
            # Test S3 connection before upload
            s3_connection_ok = S3FileManager.test_s3_connection()
            logger.info(f"S3 connection test: {'OK' if s3_connection_ok else 'FAILED'}")
            
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            
            logger.info(f"File attachment created successfully: {serializer.data.get('id')}")
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            logger.error(f"Error creating file attachment: {str(e)}")
            logger.error(f"Request user: {request.user.email}")
            logger.error(f"Request data: {request.data}")
            raise

class FormFieldFileViewSet(viewsets.ModelViewSet):
    """ViewSet for form field file uploads"""
    
    queryset = FormFieldFile.objects.all()
    serializer_class = FormFieldFileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['form_entry', 'field_name', 'is_verified', 'uploaded_by']
    search_fields = ['original_filename', 'description', 'verification_notes']
    ordering_fields = ['uploaded_at', 'file_size', 'original_filename']
    ordering = ['-uploaded_at']
    
    def retrieve(self, request, *args, **kwargs):
        """Get a specific form field file with debugging"""
        try:
            file_id = kwargs.get('pk')
            print(f"🔍 File request for ID: {file_id}")
            print(f"🔍 Request user: {request.user.email}")
            print(f"🔍 Request path: {request.path}")
            
            file_obj = self.get_object()
            print(f"🔍 File found: {file_obj.id}")
            print(f"🔍 File name: {file_obj.original_filename}")
            print(f"🔍 File URL: {file_obj.file.url if hasattr(file_obj, 'file') and file_obj.file else 'No file URL'}")
            
            serializer = self.get_serializer(file_obj)
            return Response(serializer.data)
        except Exception as e:
            print(f"❌ File retrieval error: {str(e)}")
            print(f"❌ Error type: {type(e)}")
            return Response(
                {'error': f'File not found: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return FormFieldFileCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FormFieldFileUpdateSerializer
        return FormFieldFileSerializer
    
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super admin can see all files
            return FormFieldFile.objects.all()
        elif user.role == 'ADMIN':
            # Admin can see files in their organization
            return FormFieldFile.objects.filter(form_entry__organization=user.organization)
        else:
            # Employees can only see their own files
            return FormFieldFile.objects.filter(uploaded_by=user)
    
    def perform_create(self, serializer):
        """Set uploaded_by for new files"""
        user = self.request.user
        serializer.save(uploaded_by=user)
    
    def create(self, request, *args, **kwargs):
        """Create a new form field file with detailed logging"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info("=== FORM FIELD FILE UPLOAD DEBUG ===")
        logger.info(f"📥 Received file upload request")
        logger.info(f"📥 Request method: {request.method}")
        logger.info(f"📥 Request user: {request.user}")
        logger.info(f"📥 Request data keys: {list(request.data.keys())}")
        logger.info(f"📥 Request files: {list(request.FILES.keys()) if request.FILES else 'No files'}")
        
        # Log form data
        for key, value in request.data.items():
            if key != 'file':  # Don't log the actual file content
                logger.info(f"📥 Form data - {key}: {value}")
        
        # Log file information
        if 'file' in request.FILES:
            file_obj = request.FILES['file']
            logger.info(f"📁 File details:")
            logger.info(f"📁   Name: {file_obj.name}")
            logger.info(f"📁   Size: {file_obj.size} bytes")
            logger.info(f"📁   Type: {file_obj.content_type}")
            logger.info(f"📁   Content-Type: {file_obj.content_type}")
        else:
            logger.warning("⚠️ No file found in request.FILES")
        
        try:
            # Validate the data
            logger.info("🔍 Validating request data...")
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error("❌ Validation failed!")
                logger.error(f"❌ Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info("✅ Validation successful")
            logger.info(f"✅ Validated data: {serializer.validated_data}")
            
            # Get the validated data
            validated_data = serializer.validated_data
            logger.info(f"📋 Form entry ID: {validated_data.get('form_entry')}")
            logger.info(f"📋 Field name: {validated_data.get('field_name')}")
            logger.info(f"📋 Original filename: {validated_data.get('original_filename')}")
            logger.info(f"📋 File type: {validated_data.get('file_type')}")
            logger.info(f"📋 File size: {validated_data.get('file_size')}")
            
            # Create the file object using perform_create
            logger.info("💾 Creating file object...")
            file_obj = serializer.save()
            logger.info(f"✅ File object created with ID: {file_obj.id}")
            
            # Log the file URL and S3 details
            if hasattr(file_obj, 'file') and file_obj.file:
                logger.info(f"✅ File URL: {file_obj.file.url}")
                logger.info(f"✅ File name: {file_obj.file.name}")
                
                # Log S3 bucket details
                try:
                    if hasattr(file_obj.file, 'storage') and hasattr(file_obj.file.storage, 'bucket_name'):
                        logger.info(f"🌐 S3 Bucket: {file_obj.file.storage.bucket_name}")
                        logger.info(f"🌐 S3 Key: {file_obj.file.name}")
                        
                        # Try to get the full S3 URL
                        if hasattr(file_obj.file.storage, 'url'):
                            s3_url = file_obj.file.storage.url(file_obj.file.name)
                            logger.info(f"🌐 Full S3 URL: {s3_url}")
                        else:
                            logger.info(f"🌐 S3 URL method not available")
                    else:
                        logger.info(f"🌐 Storage details not available")
                except Exception as e:
                    logger.error(f"❌ Error getting S3 details: {str(e)}")
            
            # Store the S3 URL for easier access
            if hasattr(file_obj, 'file') and file_obj.file:
                try:
                    s3_url = file_obj.file.url
                    file_obj.s3_url = s3_url
                    file_obj.save()
                    logger.info(f"💾 Stored S3 URL: {s3_url}")
                except Exception as e:
                    logger.warning(f"⚠️ Could not store S3 URL: {str(e)}")
            
            # Return the response
            response_serializer = FormFieldFileSerializer(file_obj, context={'request': request})
            response_data = response_serializer.data
            logger.info(f"✅ Upload successful! File ID: {file_obj.id}")
            logger.info(f"✅ Response data: {response_data}")
            logger.info(f"✅ File URL: {file_obj.file.url if hasattr(file_obj, 'file') and file_obj.file else 'No file URL'}")
            logger.info(f"✅ File name: {file_obj.original_filename}")
            logger.info(f"✅ File size: {file_obj.file_size}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"❌ Error during file upload: {str(e)}")
            logger.error(f"❌ Error type: {type(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            raise
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a form field file"""
        file_obj = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role == 'EMPLOYEE':
            return Response(
                {'error': 'Employees cannot verify files'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        verification_notes = request.data.get('verification_notes', '')
        
        file_obj.is_verified = True
        file_obj.verification_notes = verification_notes
        file_obj.verified_by = user
        file_obj.verified_at = timezone.now()
        file_obj.save()
        
        serializer = self.get_serializer(file_obj)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_form_entry(self, request):
        """Get files for a specific form entry"""
        form_entry_id = request.query_params.get('form_entry_id')
        if not form_entry_id:
            return Response(
                {'error': 'form_entry_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        files = FormFieldFile.objects.filter(form_entry_id=form_entry_id)
        serializer = self.get_serializer(files, many=True)
        return Response(serializer.data)

class FormEntryUploadView(APIView):
    """Handle file uploads for form entries with enhanced logging"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Upload a file for a form entry"""
        logger.info(f"Form entry upload request from user {request.user.email}")
        
        try:
            file_obj = request.FILES.get('file')
            employee_id = request.data.get('employee')
            
            logger.info(f"File upload details - Employee: {employee_id}")
            logger.info(f"Request data: {request.data}")
            logger.info(f"Request files: {list(request.FILES.keys())}")
            
            if not file_obj:
                logger.warning("No file provided in upload request")
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"File details - Name: {file_obj.name}, Size: {file_obj.size}, Type: {file_obj.content_type}")
            
            # Validate file type
            allowed_types = [
                'image/jpeg', 'image/png', 'image/gif', 
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
            
            if file_obj.content_type not in allowed_types:
                logger.warning(f"Invalid file type: {file_obj.content_type}")
                return Response(
                    {'error': 'Invalid file type. Allowed: JPEG, PNG, GIF, PDF, DOC, DOCX'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file size (5MB limit)
            if file_obj.size > 5 * 1024 * 1024:
                logger.warning(f"File too large: {file_obj.size} bytes")
                return Response(
                    {'error': 'File size must be less than 5MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Test S3 connection
            s3_connection_ok = S3FileManager.test_s3_connection()
            logger.info(f"S3 connection test: {'OK' if s3_connection_ok else 'FAILED'}")
            
            # Create file attachment
            attachment = FileAttachment.objects.create(
                original_filename=file_obj.name,
                file=file_obj,
                file_size=file_obj.size,
                file_type=file_obj.content_type,
                uploaded_by=request.user,
                description=f"Uploaded by {request.user.get_full_name() or request.user.email}"
            )
            
            logger.info(f"File attachment created: {attachment.id}")
            logger.info(f"File saved to: {attachment.file.name}")
            
            # Test if file was actually saved
            if hasattr(attachment.file, 'storage'):
                file_exists = attachment.file.storage.exists(attachment.file.name)
                logger.info(f"File exists in storage: {file_exists}")
            
            serializer = FileAttachmentSerializer(attachment, context={'request': request})
            logger.info(f"File upload completed successfully: {attachment.id}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error in file upload: {str(e)}")
            logger.error(f"Request user: {request.user.email}")
            logger.error(f"Request data: {request.data}")
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FormEntryExportView(APIView):
    """
    Advanced export functionality for form entries
    Supports Excel with file references, PDF with attachments, and CSV
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Export form entries based on filters"""
        user = request.user
        export_format = request.data.get('format', 'excel')
        filters = request.data.get('filters', {})
        options = request.data.get('options', {})
        
        logger.info(f"Export request from user {user.email}: format={export_format}, filters={filters}")
        
        # Get filtered entries
        if user.role == 'SUPER_ADMIN':
            organization = None
        else:
            organization = user.organization
        
        entries = self.get_filtered_entries(filters, organization)
        logger.info(f"Found {entries.count()} entries for export")
        
        # Generate filename
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        file_name = f"form_entries_{timestamp}"
        
        if export_format == 'excel':
            return self.export_to_excel(entries, options, file_name)
        elif export_format == 'pdf':
            return self.export_to_pdf(entries, options, file_name)
        elif export_format == 'csv':
            return self.export_to_csv(entries, options, file_name)
        else:
            return Response({'error': 'Unsupported export format'}, status=status.HTTP_400_BAD_REQUEST)
    
    def get_filtered_entries(self, filters, organization):
        """Get filtered entries with date range support"""
        queryset = FormEntry.objects.all()
        
        # Filter by organization
        if organization:
            queryset = queryset.filter(organization=organization)
        
        # Date range filtering
        date_range = filters.get('date_range', 'all')
        custom_start_date = filters.get('custom_start_date')
        custom_end_date = filters.get('custom_end_date')
        
        if date_range == 'last_7_days':
            start_date = timezone.now() - timedelta(days=7)
            queryset = queryset.filter(created_at__gte=start_date)
        elif date_range == 'last_30_days':
            start_date = timezone.now() - timedelta(days=30)
            queryset = queryset.filter(created_at__gte=start_date)
        elif date_range == 'last_90_days':
            start_date = timezone.now() - timedelta(days=90)
            queryset = queryset.filter(created_at__gte=start_date)
        elif date_range == 'custom' and custom_start_date and custom_end_date:
            try:
                start_date = datetime.strptime(custom_start_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                end_date = datetime.strptime(custom_end_date, '%Y-%m-%d').replace(tzinfo=timezone.utc) + timedelta(days=1)
                queryset = queryset.filter(created_at__gte=start_date, created_at__lt=end_date)
                logger.info(f"Custom date range: {start_date} to {end_date}")
            except ValueError as e:
                logger.error(f"Invalid date format: {e}")
        
        # Additional filters
        if filters.get('form_schema'):
            queryset = queryset.filter(form_schema_id=filters['form_schema'])
        
        if filters.get('status'):
            status_filter = filters['status']
            if status_filter == 'completed':
                queryset = queryset.filter(is_completed=True)
            elif status_filter == 'verified':
                queryset = queryset.filter(is_verified=True)
            elif status_filter == 'pending':
                queryset = queryset.filter(is_completed=False, is_verified=False)
        
        if filters.get('search'):
            search_term = filters['search']
            queryset = queryset.filter(
                Q(employee__first_name__icontains=search_term) |
                Q(employee__last_name__icontains=search_term) |
                Q(form_schema__name__icontains=search_term) |
                Q(form_data__icontains=search_term)
            )
        
        return queryset.select_related('employee', 'form_schema', 'organization')
    
    def export_to_excel(self, entries, options, file_name):
        """Export to Excel with file references and S3 links"""
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Form Entries"
        
        # Define styles
        header_font = Font(bold=True, color="FFFFFF", size=12)
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Enhanced headers with business fields
        headers = [
            'Agency ID', 'Employee', 'Organization', 'Form Schema', 'Status', 'Created', 'Completed',
            'TAT Duration (hrs)', 'Verified', 'Verification Notes', 'Bank/NBFC', 'Location', 
            'Product Type', 'Case Status', 'Field Verifier', 'Back Office Executive', 'Repeat Case',
            'Files with S3 Links'
        ]
        
        # Add form data headers based on first entry
        if entries.exists():
            first_entry = entries.first()
            if first_entry.form_data:
                for key in first_entry.form_data.keys():
                    if key not in ['bank_nbfc_name', 'location', 'product_type', 'case_status', 
                                  'field_verifier_name', 'back_office_executive_name', 'is_repeat_case']:
                        headers.append(key.replace('_', ' ').title())
        
        # Write headers
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = border
        
        # Write data
        for row, entry in enumerate(entries, 2):
            col = 1
            # Agency ID (auto-incrementing)
            ws.cell(row=row, column=col, value=row-1)
            col += 1
            
            # Employee
            ws.cell(row=row, column=col, value=f"{entry.employee.first_name} {entry.employee.last_name}")
            col += 1
            
            # Organization
            ws.cell(row=row, column=col, value=entry.organization.name)
            col += 1
            
            # Form Schema
            ws.cell(row=row, column=col, value=entry.form_schema.name)
            col += 1
            
            # Status with color coding
            status_cell = ws.cell(row=row, column=col, value=self.get_status_text(entry))
            if 'Out of TAT' in self.get_status_text(entry):
                status_cell.fill = PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid")
                status_cell.font = Font(color="FFFFFF", bold=True)
            col += 1
            
            # Created
            ws.cell(row=row, column=col, value=entry.created_at.strftime('%Y-%m-%d %H:%M'))
            col += 1
            
            # Completed
            ws.cell(row=row, column=col, value=entry.tat_completion_time.strftime('%Y-%m-%d %H:%M') if entry.tat_completion_time else '')
            col += 1
            
            # TAT Duration with color coding
            tat_hours = entry.tat_duration if entry.tat_duration else 0
            tat_cell = ws.cell(row=row, column=col, value=round(tat_hours, 2) if tat_hours else '')
            # Use schema-specific TAT limit for color coding
            tat_limit = entry.form_schema.tat_hours_limit
            if tat_hours > tat_limit:
                tat_cell.fill = PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid")
                tat_cell.font = Font(color="FFFFFF", bold=True)
            col += 1
            
            # Verified
            ws.cell(row=row, column=col, value='Yes' if entry.is_verified else 'No')
            col += 1
            
            # Verification Notes
            ws.cell(row=row, column=col, value=entry.verification_notes or '')
            col += 1
            
            # Business fields from form data
            form_data = entry.form_data or {}
            ws.cell(row=row, column=col, value=form_data.get('bank_nbfc_name', ''))
            col += 1
            ws.cell(row=row, column=col, value=form_data.get('location', ''))
            col += 1
            ws.cell(row=row, column=col, value=form_data.get('product_type', ''))
            col += 1
            ws.cell(row=row, column=col, value=form_data.get('case_status', ''))
            col += 1
            ws.cell(row=row, column=col, value=form_data.get('field_verifier_name', ''))
            col += 1
            ws.cell(row=row, column=col, value=form_data.get('back_office_executive_name', ''))
            col += 1
            ws.cell(row=row, column=col, value='Yes' if form_data.get('is_repeat_case') else 'No')
            col += 1
            
            # Get file attachments with S3 links
            file_attachments = FileAttachment.objects.filter(form_entry=entry)
            form_field_files = FormFieldFile.objects.filter(form_entry=entry)
            
            file_links = []
            for attachment in file_attachments:
                file_url = S3FileManager.get_presigned_url(attachment.file.name)
                if file_url:
                    file_links.append(f"{attachment.original_filename}: {file_url}")
                else:
                    file_links.append(f"{attachment.original_filename}: No URL")
            
            for field_file in form_field_files:
                file_url = field_file.s3_url or S3FileManager.get_presigned_url(field_file.file.name)
                if file_url:
                    file_links.append(f"{field_file.field_name} - {field_file.original_filename}: {file_url}")
                else:
                    file_links.append(f"{field_file.field_name} - {field_file.original_filename}: No URL")
            
            ws.cell(row=row, column=col, value="\n".join(file_links) if file_links else "No files")
            col += 1
            
            # Add remaining form data
            if entry.form_data:
                for key, value in entry.form_data.items():
                    if key not in ['bank_nbfc_name', 'location', 'product_type', 'case_status', 
                                  'field_verifier_name', 'back_office_executive_name', 'is_repeat_case']:
                        # Check if this is a file field
                        field_definition = entry.form_schema.fields_definition
                        if isinstance(field_definition, list):
                            field = next((f for f in field_definition if f.get('name') == key), {})
                        else:
                            field = field_definition.get(key, {})
                        
                        if field.get('field_type') in ['IMAGE_UPLOAD', 'DOCUMENT_UPLOAD']:
                            # Try to get file attachment
                            try:
                                file_attachment = FileAttachment.objects.filter(
                                    form_entry=entry,
                                    original_filename__icontains=str(value)
                                ).first()
                                if file_attachment:
                                    # Generate S3 presigned URL
                                    file_url = S3FileManager.get_presigned_url(file_attachment.file.name)
                                    cell_value = f"File: {file_attachment.original_filename}\nLink: {file_url}" if file_url else f"File: {file_attachment.original_filename}"
                                else:
                                    cell_value = str(value)
                            except Exception as e:
                                logger.error(f"Error processing file field {key}: {e}")
                                cell_value = str(value)
                        else:
                            cell_value = str(value)
                        
                        ws.cell(row=row, column=col, value=cell_value)
                        col += 1
            
            # Apply borders to all cells in the row
            for col_idx in range(1, len(headers) + 1):
                ws.cell(row=row, column=col_idx).border = border
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = get_column_letter(column[0].column)
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Add summary sheet
        summary_ws = wb.create_sheet("Summary")
        
        # Summary statistics
        total_entries = entries.count()
        completed_entries = entries.filter(is_completed=True).count()
        # Calculate out of TAT entries using Python filtering since tat_duration is a property
        out_of_tat_entries = sum(1 for entry in entries if entry.is_out_of_tat)
        
        summary_data = [
            ['Metric', 'Count'],
            ['Total Entries', total_entries],
            ['Completed Entries', completed_entries],
            ['Out of TAT', out_of_tat_entries],
            ['Completion Rate', f"{(completed_entries/total_entries*100):.1f}%" if total_entries > 0 else "0%"]
        ]
        
        for row, (label, value) in enumerate(summary_data, 1):
            summary_ws.cell(row=row, column=1, value=label).font = Font(bold=True)
            summary_ws.cell(row=row, column=2, value=value)
        
        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{file_name}.xlsx"'
        
        wb.save(response)
        logger.info(f"Excel export completed: {file_name}.xlsx")
        return response
    
    def export_to_pdf(self, entries, options, file_name):
        """Export to PDF with attachments and S3 links"""
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{file_name}.pdf"'
        
        doc = SimpleDocTemplate(response, pagesize=A4)
        story = []
        
        # Title
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30
        )
        story.append(Paragraph("Form Entries Report", title_style))
        story.append(Spacer(1, 12))
        
        # Enhanced Summary
        total_entries = entries.count()
        completed_entries = entries.filter(is_completed=True).count()
        verified_entries = entries.filter(is_verified=True).count()
        # Calculate out of TAT entries using Python filtering since tat_duration is a property
        out_of_tat_entries = sum(1 for entry in entries if entry.is_out_of_tat)
        
        summary_data = [
            ['Metric', 'Count', 'Percentage'],
            ['Total Entries', str(total_entries), '100%'],
            ['Completed', str(completed_entries), f"{(completed_entries/total_entries*100):.1f}%" if total_entries > 0 else "0%"],
            ['Verified', str(verified_entries), f"{(verified_entries/total_entries*100):.1f}%" if total_entries > 0 else "0%"],
            ['Out of TAT', str(out_of_tat_entries), f"{(out_of_tat_entries/total_entries*100):.1f}%" if total_entries > 0 else "0%"]
        ]
        
        summary_table = Table(summary_data, colWidths=[2*inch, 1*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Enhanced Entries table with business fields
        table_data = [['Agency ID', 'Employee', 'Schema', 'Status', 'Created', 'TAT', 'Bank/NBFC', 'Location', 'Product', 'Files']]
        
        for idx, entry in enumerate(entries, 1):
            # Get file attachments for this entry
            file_attachments = FileAttachment.objects.filter(form_entry=entry)
            form_field_files = FormFieldFile.objects.filter(form_entry=entry)
            
            file_info = []
            for attachment in file_attachments:
                file_url = S3FileManager.get_presigned_url(attachment.file.name)
                file_info.append(f"{attachment.original_filename}: {file_url}" if file_url else attachment.original_filename)
            
            for field_file in form_field_files:
                file_url = field_file.s3_url or S3FileManager.get_presigned_url(field_file.file.name)
                if file_url:
                    file_info.append(f"{field_file.field_name} - {field_file.original_filename}: {file_url}")
                else:
                    file_info.append(f"{field_file.field_name} - {field_file.original_filename}: No URL")
            
            file_text = "\n".join(file_info) if file_info else "No files"
            
            # Get business fields from form data
            form_data = entry.form_data or {}
            
            table_data.append([
                str(idx),  # Agency ID
                f"{entry.employee.first_name} {entry.employee.last_name}",
                entry.form_schema.name,
                self.get_status_text(entry),
                entry.created_at.strftime('%Y-%m-%d'),
                f"{round(entry.tat_duration, 1)}h" if entry.tat_duration else 'N/A',
                form_data.get('bank_nbfc_name', ''),
                form_data.get('location', ''),
                form_data.get('product_type', ''),
                file_text
            ])
        
        entries_table = Table(table_data, colWidths=[0.5*inch, 1.2*inch, 1.2*inch, 1*inch, 0.8*inch, 0.6*inch, 1*inch, 0.8*inch, 0.8*inch, 2*inch])
        entries_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(entries_table)
        
        # Add detailed file information page
        story.append(PageBreak())
        story.append(Paragraph("File Attachments with S3 Links", title_style))
        story.append(Spacer(1, 12))
        
        file_data = [['Agency ID', 'Employee', 'File Name', 'Field', 'S3 Link']]
        
        for idx, entry in enumerate(entries, 1):
            # File attachments
            for attachment in FileAttachment.objects.filter(form_entry=entry):
                file_url = S3FileManager.get_presigned_url(attachment.file.name)
                file_data.append([
                    str(idx),
                    f"{entry.employee.first_name} {entry.employee.last_name}",
                    attachment.original_filename,
                    'General Attachment',
                    file_url if file_url else 'No URL'
                ])
            
            # Form field files
            for field_file in FormFieldFile.objects.filter(form_entry=entry):
                file_url = field_file.s3_url or S3FileManager.get_presigned_url(field_file.file.name)
                file_data.append([
                    str(idx),
                    f"{entry.employee.first_name} {entry.employee.last_name}",
                    field_file.original_filename,
                    field_file.field_name,
                    file_url if file_url else 'No URL'
                ])
        
        file_table = Table(file_data, colWidths=[0.5*inch, 1.5*inch, 2*inch, 1*inch, 3*inch])
        file_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(file_table)
        
        doc.build(story)
        logger.info(f"PDF export completed: {file_name}.pdf")
        return response
    
    def export_to_csv(self, entries, options, file_name):
        """Export to CSV with file links"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{file_name}.csv"'
        
        writer = csv.writer(response)
        
        # Headers
        headers = [
            'ID', 'Employee', 'Organization', 'Form Schema', 'Status', 'Created', 'Completed',
            'TAT Duration (hrs)', 'Verified', 'Verification Notes'
        ]
        
        # Add form data headers
        if entries.exists():
            first_entry = entries.first()
            if first_entry.form_data:
                for key in first_entry.form_data.keys():
                    headers.append(key.replace('_', ' ').title())
        
        writer.writerow(headers)
        
        # Data
        for entry in entries:
            row = [
                entry.id,
                f"{entry.employee.first_name} {entry.employee.last_name}",
                entry.organization.name,
                entry.form_schema.name,
                self.get_status_text(entry),
                entry.created_at.strftime('%Y-%m-%d %H:%M'),
                entry.tat_completion_time.strftime('%Y-%m-%d %H:%M') if entry.tat_completion_time else '',
                round(entry.tat_duration, 2) if entry.tat_duration else '',
                'Yes' if entry.is_verified else 'No',
                entry.verification_notes or ''
            ]
            
            # Add form data with file links
            if entry.form_data:
                for key, value in entry.form_data.items():
                    # Check if this is a file field
                    field_definition = entry.form_schema.fields_definition
                    if isinstance(field_definition, list):
                        field = next((f for f in field_definition if f.get('name') == key), {})
                    else:
                        field = field_definition.get(key, {})
                    
                    if field.get('field_type') in ['IMAGE_UPLOAD', 'DOCUMENT_UPLOAD']:
                        # Try to get file attachment
                        try:
                            file_attachment = FileAttachment.objects.filter(
                                form_entry=entry,
                                original_filename__icontains=str(value)
                            ).first()
                            if file_attachment:
                                # Generate S3 presigned URL
                                file_url = S3FileManager.get_presigned_url(file_attachment.file.name)
                                cell_value = f"File: {file_attachment.original_filename}, Link: {file_url}" if file_url else f"File: {file_attachment.original_filename}"
                            else:
                                cell_value = str(value)
                        except Exception as e:
                            logger.error(f"Error processing file field {key}: {e}")
                            cell_value = str(value)
                    else:
                        cell_value = str(value)
                    
                    row.append(cell_value)
            
            writer.writerow(row)
        
        logger.info(f"CSV export completed: {file_name}.csv")
        return response
    
    def get_status_text(self, entry):
        """Get status text for an entry"""
        if entry.is_completed:
            return 'Completed'
        elif entry.check_tat_status():
            return 'Out of TAT'
        else:
            return 'Pending'
    
    def create_summary_sheet(self, ws, entries):
        """Create summary sheet in Excel"""
        ws.title = "Summary"
        
        # Summary statistics
        total_entries = entries.count()
        completed_entries = entries.filter(is_completed=True).count()
        verified_entries = entries.filter(is_verified=True).count()
        out_of_tat_entries = entries.filter(
            is_completed=False,
            tat_start_time__lt=timezone.now() - timedelta(hours=24)
        ).count()
        
        summary_data = [
            ['Metric', 'Count'],
            ['Total Entries', total_entries],
            ['Completed', completed_entries],
            ['Verified', verified_entries],
            ['Out of TAT', out_of_tat_entries],
            ['Completion Rate', f"{(completed_entries/total_entries*100):.1f}%" if total_entries > 0 else "0%"]
        ]
        
        for row, data in enumerate(summary_data, 1):
            for col, value in enumerate(data, 1):
                cell = ws.cell(row=row, column=col, value=value)
                if row == 1:
                    cell.font = Font(bold=True)
                    cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
    
    def create_analytics_sheet(self, ws, entries):
        """Create analytics sheet in Excel"""
        ws.title = "Analytics"
        
        # Analytics data
        analytics_data = [
            ['Analysis', 'Value'],
            ['Average TAT (hours)', ''],
            ['Fastest Completion (hours)', ''],
            ['Slowest Completion (hours)', ''],
            ['Most Active Employee', ''],
            ['Most Used Schema', '']
        ]
        
        # Calculate analytics
        completed_entries = entries.filter(is_completed=True)
        if completed_entries.exists():
            # Calculate using Python since tat_duration is a property
            tat_values = [entry.tat_duration for entry in completed_entries if entry.tat_duration]
            avg_tat = sum(tat_values) / len(tat_values) if tat_values else None
            fastest = min(tat_values) if tat_values else None
            slowest = max(tat_values) if tat_values else None
            
            analytics_data[1][1] = f"{avg_tat:.2f}" if avg_tat else "N/A"
            analytics_data[2][1] = f"{fastest:.2f}" if fastest else "N/A"
            analytics_data[3][1] = f"{slowest:.2f}" if slowest else "N/A"
        
        # Most active employee
        most_active_employee = entries.values('employee__first_name', 'employee__last_name').annotate(
            count=Count('id')
        ).order_by('-count').first()
        
        if most_active_employee:
            analytics_data[4][1] = f"{most_active_employee['employee__first_name']} {most_active_employee['employee__last_name']}"
        
        # Most used schema
        most_used_schema = entries.values('form_schema__name').annotate(
            count=Count('id')
        ).order_by('-count').first()
        
        if most_used_schema:
            analytics_data[5][1] = most_used_schema['form_schema__name']
        
        for row, data in enumerate(analytics_data, 1):
            for col, value in enumerate(data, 1):
                cell = ws.cell(row=row, column=col, value=value)
                if row == 1:
                    cell.font = Font(bold=True)
                    cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
