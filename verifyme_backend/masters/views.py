from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

from .models import (
    State, City, Bank, NBFC, ProductType, CaseStatus, 
    OrganizationMasterData
)
from .serializers import (
    StateSerializer, CitySerializer, BankSerializer, NBFCSerializer,
    ProductTypeSerializer, CaseStatusSerializer, OrganizationMasterDataSerializer,
    MasterDataSummarySerializer
)
from accounts.permissions import IsOrganizationAdmin, IsSuperAdmin
from accounts.models import Organization

class StateViewSet(viewsets.ModelViewSet):
    """ViewSet for State management"""
    
    queryset = State.objects.all()
    serializer_class = StateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']
    ordering = ['name']
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsSuperAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and organization"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return State.objects.all()
        elif user.role == 'ADMIN':
            # Get states available for the organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.states.filter(is_active=True)
            return State.objects.none()
        else:
            # Employees see states available to their organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.states.filter(is_active=True)
            return State.objects.none()
    
    @action(detail=True, methods=['get'])
    def cities(self, request, pk=None):
        """Get cities for a specific state"""
        state = self.get_object()
        cities = state.cities.filter(is_active=True).order_by('name')
        
        return Response({
            'state': {
                'id': state.id,
                'name': state.name,
                'code': state.code
            },
            'cities': [
                {
                    'id': city.id,
                    'name': city.name,
                    'state_name': city.state.name
                }
                for city in cities
            ],
            'total_count': cities.count()
        })

class CityViewSet(viewsets.ModelViewSet):
    """ViewSet for City management"""
    
    queryset = City.objects.all()
    serializer_class = CitySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['state', 'is_active']
    search_fields = ['name', 'state__name']
    ordering_fields = ['name', 'state__name']
    ordering = ['state__name', 'name']
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsSuperAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and organization"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return City.objects.all()
        elif user.role == 'ADMIN':
            # Get cities available for the organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.cities.filter(is_active=True)
            return City.objects.none()
        else:
            # Employees see cities available to their organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.cities.filter(is_active=True)
            return City.objects.none()

class BankViewSet(viewsets.ModelViewSet):
    """ViewSet for Bank management"""
    
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bank_type', 'is_active']
    search_fields = ['name', 'short_name']
    ordering_fields = ['name', 'bank_type']
    ordering = ['name']
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and organization"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return Bank.objects.all()
        elif user.role == 'ADMIN':
            # Get banks available for the organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.banks.filter(is_active=True)
            return Bank.objects.none()
        else:
            # Employees see banks available to their organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.banks.filter(is_active=True)
            return Bank.objects.none()
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get banks grouped by type"""
        banks = self.get_queryset()
        bank_types = {}
        
        for bank in banks:
            if bank.bank_type not in bank_types:
                bank_types[bank.bank_type] = []
            bank_types[bank.bank_type].append({
                'id': bank.id,
                'name': bank.name,
                'short_name': bank.short_name
            })
        
        return Response(bank_types)

class NBFCViewSet(viewsets.ModelViewSet):
    """ViewSet for NBFC management"""
    
    queryset = NBFC.objects.all()
    serializer_class = NBFCSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['nbfc_type', 'is_active']
    search_fields = ['name', 'short_name']
    ordering_fields = ['name', 'nbfc_type']
    ordering = ['name']
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and organization"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return NBFC.objects.all()
        elif user.role == 'ADMIN':
            # Get NBFCs available for the organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.nbfcs.filter(is_active=True)
            return NBFC.objects.none()
        else:
            # Employees see NBFCs available to their organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.nbfcs.filter(is_active=True)
            return NBFC.objects.none()
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get NBFCs grouped by type"""
        nbfcs = self.get_queryset()
        nbfc_types = {}
        
        for nbfc in nbfcs:
            if nbfc.nbfc_type not in nbfc_types:
                nbfc_types[nbfc.nbfc_type] = []
            nbfc_types[nbfc.nbfc_type].append({
                'id': nbfc.id,
                'name': nbfc.name,
                'short_name': nbfc.short_name
            })
        
        return Response(nbfc_types)

class ProductTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for Product Type management"""
    
    queryset = ProductType.objects.all()
    serializer_class = ProductTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    ordering = ['name']
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and organization"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return ProductType.objects.all()
        elif user.role == 'ADMIN':
            # Get product types available for the organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.product_types.filter(is_active=True)
            return ProductType.objects.none()
        else:
            # Employees see product types available to their organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.product_types.filter(is_active=True)
            return ProductType.objects.none()

class CaseStatusViewSet(viewsets.ModelViewSet):
    """ViewSet for Case Status management"""
    
    queryset = CaseStatus.objects.all()
    serializer_class = CaseStatusSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'is_positive', 'is_negative', 'is_pending']
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    ordering = ['name']
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsOrganizationAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and organization"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return CaseStatus.objects.all()
        elif user.role == 'ADMIN':
            # Get case statuses available for the organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.case_statuses.filter(is_active=True)
            return CaseStatus.objects.none()
        else:
            # Employees see case statuses available to their organization
            org_master_data = OrganizationMasterData.objects.filter(
                organization=user.organization,
                is_active=True
            ).first()
            if org_master_data:
                return org_master_data.case_statuses.filter(is_active=True)
            return CaseStatus.objects.none()
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get case statuses grouped by category"""
        case_statuses = self.get_queryset()
        categories = {
            'positive': [],
            'negative': [],
            'pending': []
        }
        
        for status in case_statuses:
            if status.is_positive:
                categories['positive'].append({
                    'id': status.id,
                    'name': status.name,
                    'description': status.description
                })
            elif status.is_negative:
                categories['negative'].append({
                    'id': status.id,
                    'name': status.name,
                    'description': status.description
                })
            elif status.is_pending:
                categories['pending'].append({
                    'id': status.id,
                    'name': status.name,
                    'description': status.description
                })
        
        return Response(categories)

class OrganizationMasterDataViewSet(viewsets.ModelViewSet):
    """ViewSet for Organization Master Data management"""
    
    queryset = OrganizationMasterData.objects.all()
    serializer_class = OrganizationMasterDataSerializer
    permission_classes = [IsAuthenticated, IsOrganizationAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['organization', 'is_active']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            return OrganizationMasterData.objects.all()
        else:
            # Admin can only see their organization's master data
            return OrganizationMasterData.objects.filter(organization=user.organization)
    
    def perform_create(self, serializer):
        """Set organization for new master data"""
        user = self.request.user
        serializer.save(organization=user.organization)
    
    @action(detail=True, methods=['post'])
    def update_master_data(self, request, pk=None):
        """Update master data for an organization"""
        master_data = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role != 'SUPER_ADMIN' and master_data.organization != user.organization:
            return Response({'error': 'You can only update your organization\'s master data'}, status=status.HTTP_403_FORBIDDEN)
        
        # Update master data based on request data
        data = request.data
        
        if 'states' in data:
            master_data.states.set(data['states'])
        
        if 'cities' in data:
            master_data.cities.set(data['cities'])
        
        if 'banks' in data:
            master_data.banks.set(data['banks'])
        
        if 'nbfcs' in data:
            master_data.nbfcs.set(data['nbfcs'])
        
        if 'product_types' in data:
            master_data.product_types.set(data['product_types'])
        
        if 'case_statuses' in data:
            master_data.case_statuses.set(data['case_statuses'])
        
        master_data.save()
        
        serializer = self.get_serializer(master_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get summary of master data for an organization"""
        master_data = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role != 'SUPER_ADMIN' and master_data.organization != user.organization:
            return Response({'error': 'You can only view your organization\'s master data'}, status=status.HTTP_403_FORBIDDEN)
        
        data = {
            'total_states': master_data.states.count() if master_data.states else 0,
            'total_cities': master_data.cities.count() if master_data.cities else 0,
            'total_banks': master_data.banks.count() if master_data.banks else 0,
            'total_nbfcs': master_data.nbfcs.count() if master_data.nbfcs else 0,
            'total_product_types': master_data.product_types.count() if master_data.product_types else 0,
            'total_case_statuses': master_data.case_statuses.count() if master_data.case_statuses else 0,
            'active_states': master_data.states.filter(is_active=True).count() if master_data.states else 0,
            'active_cities': master_data.cities.filter(is_active=True).count() if master_data.cities else 0,
            'active_banks': master_data.banks.filter(is_active=True).count() if master_data.banks else 0,
            'active_nbfcs': master_data.nbfcs.filter(is_active=True).count() if master_data.nbfcs else 0,
            'active_product_types': master_data.product_types.filter(is_active=True).count() if master_data.product_types else 0,
            'active_case_statuses': master_data.case_statuses.filter(is_active=True).count() if master_data.case_statuses else 0
        }
        
        serializer = MasterDataSummarySerializer(data)
        return Response(serializer.data)
