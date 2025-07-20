from rest_framework import serializers
from .models import (
    State, City, Bank, NBFC, ProductType, CaseStatus, 
    OrganizationMasterData
)

class StateSerializer(serializers.ModelSerializer):
    """Serializer for State model"""
    
    class Meta:
        model = State
        fields = [
            'id', 'name', 'code', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class CitySerializer(serializers.ModelSerializer):
    """Serializer for City model"""
    state_name = serializers.CharField(source='state.name', read_only=True)
    state_code = serializers.CharField(source='state.code', read_only=True)
    
    class Meta:
        model = City
        fields = [
            'id', 'name', 'state', 'state_name', 'state_code', 
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class BankSerializer(serializers.ModelSerializer):
    """Serializer for Bank model"""
    
    class Meta:
        model = Bank
        fields = [
            'id', 'name', 'short_name', 'bank_type', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class NBFCSerializer(serializers.ModelSerializer):
    """Serializer for NBFC model"""
    
    class Meta:
        model = NBFC
        fields = [
            'id', 'name', 'short_name', 'nbfc_type', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ProductTypeSerializer(serializers.ModelSerializer):
    """Serializer for ProductType model"""
    
    class Meta:
        model = ProductType
        fields = [
            'id', 'name', 'description', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class CaseStatusSerializer(serializers.ModelSerializer):
    """Serializer for CaseStatus model"""
    
    class Meta:
        model = CaseStatus
        fields = [
            'id', 'name', 'description', 'is_active', 'is_positive', 
            'is_negative', 'is_pending', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class OrganizationMasterDataSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationMasterData model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    states_count = serializers.SerializerMethodField()
    cities_count = serializers.SerializerMethodField()
    banks_count = serializers.SerializerMethodField()
    nbfcs_count = serializers.SerializerMethodField()
    product_types_count = serializers.SerializerMethodField()
    case_statuses_count = serializers.SerializerMethodField()
    
    class Meta:
        model = OrganizationMasterData
        fields = [
            'id', 'organization', 'organization_name', 'is_active',
            'states_count', 'cities_count', 'banks_count', 'nbfcs_count',
            'product_types_count', 'case_statuses_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_states_count(self, obj):
        return obj.states.count() if obj.states else 0
    
    def get_cities_count(self, obj):
        return obj.cities.count() if obj.cities else 0
    
    def get_banks_count(self, obj):
        return obj.banks.count() if obj.banks else 0
    
    def get_nbfcs_count(self, obj):
        return obj.nbfcs.count() if obj.nbfcs else 0
    
    def get_product_types_count(self, obj):
        return obj.product_types.count() if obj.product_types else 0
    
    def get_case_statuses_count(self, obj):
        return obj.case_statuses.count() if obj.case_statuses else 0

class MasterDataSummarySerializer(serializers.Serializer):
    """Serializer for master data summary"""
    total_states = serializers.IntegerField()
    total_cities = serializers.IntegerField()
    total_banks = serializers.IntegerField()
    total_nbfcs = serializers.IntegerField()
    total_product_types = serializers.IntegerField()
    total_case_statuses = serializers.IntegerField()
    active_states = serializers.IntegerField()
    active_cities = serializers.IntegerField()
    active_banks = serializers.IntegerField()
    active_nbfcs = serializers.IntegerField()
    active_product_types = serializers.IntegerField()
    active_case_statuses = serializers.IntegerField() 