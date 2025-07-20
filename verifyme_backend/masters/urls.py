from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StateViewSet, CityViewSet, BankViewSet, NBFCViewSet,
    ProductTypeViewSet, CaseStatusViewSet, OrganizationMasterDataViewSet
)

router = DefaultRouter()
router.register(r'states', StateViewSet)
router.register(r'cities', CityViewSet)
router.register(r'banks', BankViewSet)
router.register(r'nbfcs', NBFCViewSet)
router.register(r'product-types', ProductTypeViewSet)
router.register(r'case-statuses', CaseStatusViewSet)
router.register(r'organization-master-data', OrganizationMasterDataViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
] 