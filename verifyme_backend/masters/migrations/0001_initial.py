# Generated manually for initial setup

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='State',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('code', models.CharField(help_text='State code like MH, GA', max_length=10, unique=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'states',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='City',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('state', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cities', to='masters.state')),
            ],
            options={
                'db_table': 'cities',
                'ordering': ['state__name', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Bank',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('short_name', models.CharField(blank=True, max_length=50)),
                ('bank_type', models.CharField(choices=[('PUBLIC', 'Public Sector Bank'), ('PRIVATE', 'Private Sector Bank'), ('FOREIGN', 'Foreign Bank'), ('COOPERATIVE', 'Cooperative Bank'), ('SMALL_FINANCE', 'Small Finance Bank'), ('PAYMENT', 'Payment Bank')], default='PRIVATE', max_length=20)),
                ('website', models.URLField(blank=True)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('head_office_address', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('head_office_city', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='head_office_banks', to='masters.city')),
            ],
            options={
                'db_table': 'banks',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='NBFC',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('short_name', models.CharField(blank=True, max_length=50)),
                ('nbfc_type', models.CharField(choices=[('DEPOSIT', 'Deposit Taking NBFC'), ('NON_DEPOSIT', 'Non-Deposit Taking NBFC'), ('INFRASTRUCTURE', 'Infrastructure Finance Company'), ('MICROFINANCE', 'Microfinance Institution'), ('FACTORING', 'Factoring Company'), ('INVESTMENT', 'Investment Company')], default='NON_DEPOSIT', max_length=20)),
                ('rbi_registration_number', models.CharField(blank=True, max_length=50)),
                ('website', models.URLField(blank=True)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('registered_office_address', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('registered_office_city', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='registered_office_nbfcs', to='masters.city')),
            ],
            options={
                'db_table': 'nbfcs',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='ProductType',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'product_types',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='CaseStatus',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('is_positive', models.BooleanField(default=False, help_text='Whether this is a positive status')),
                ('is_negative', models.BooleanField(default=False, help_text='Whether this is a negative status')),
                ('is_pending', models.BooleanField(default=False, help_text='Whether this is a pending status')),
                ('color_code', models.CharField(default='#000000', help_text='Hex color code', max_length=7)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'case_statuses',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='OrganizationMasterData',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('banks', models.ManyToManyField(blank=True, related_name='organizations', to='masters.bank')),
                ('case_statuses', models.ManyToManyField(blank=True, related_name='organizations', to='masters.casestatus')),
                ('cities', models.ManyToManyField(blank=True, related_name='organizations', to='masters.city')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_master_data', to='accounts.user')),
                ('nbfcs', models.ManyToManyField(blank=True, related_name='organizations', to='masters.nbfc')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='master_data', to='accounts.organization')),
                ('product_types', models.ManyToManyField(blank=True, related_name='organizations', to='masters.producttype')),
                ('states', models.ManyToManyField(blank=True, related_name='organizations', to='masters.state')),
            ],
            options={
                'db_table': 'organization_master_data',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='state',
            index=models.Index(fields=['name'], name='states_name_idx'),
        ),
        migrations.AddIndex(
            model_name='state',
            index=models.Index(fields=['code'], name='states_code_idx'),
        ),
        migrations.AddIndex(
            model_name='state',
            index=models.Index(fields=['is_active'], name='states_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='city',
            index=models.Index(fields=['name'], name='cities_name_idx'),
        ),
        migrations.AddIndex(
            model_name='city',
            index=models.Index(fields=['state'], name='cities_state_idx'),
        ),
        migrations.AddIndex(
            model_name='city',
            index=models.Index(fields=['is_active'], name='cities_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='bank',
            index=models.Index(fields=['name'], name='banks_name_idx'),
        ),
        migrations.AddIndex(
            model_name='bank',
            index=models.Index(fields=['bank_type'], name='banks_bank_type_idx'),
        ),
        migrations.AddIndex(
            model_name='bank',
            index=models.Index(fields=['is_active'], name='banks_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='nbfc',
            index=models.Index(fields=['name'], name='nbfcs_name_idx'),
        ),
        migrations.AddIndex(
            model_name='nbfc',
            index=models.Index(fields=['nbfc_type'], name='nbfcs_nbfc_type_idx'),
        ),
        migrations.AddIndex(
            model_name='nbfc',
            index=models.Index(fields=['is_active'], name='nbfcs_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='producttype',
            index=models.Index(fields=['name'], name='product_types_name_idx'),
        ),
        migrations.AddIndex(
            model_name='producttype',
            index=models.Index(fields=['is_active'], name='product_types_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='casestatus',
            index=models.Index(fields=['name'], name='case_statuses_name_idx'),
        ),
        migrations.AddIndex(
            model_name='casestatus',
            index=models.Index(fields=['is_active'], name='case_statuses_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='organizationmasterdata',
            index=models.Index(fields=['organization'], name='organization_master_data_organization_idx'),
        ),
        migrations.AddIndex(
            model_name='organizationmasterdata',
            index=models.Index(fields=['is_active'], name='organization_master_data_is_active_idx'),
        ),
        migrations.AddConstraint(
            model_name='city',
            constraint=models.UniqueConstraint(fields=('name', 'state'), name='unique_city_per_state'),
        ),
        migrations.AddConstraint(
            model_name='organizationmasterdata',
            constraint=models.UniqueConstraint(fields=('organization',), name='unique_master_data_per_organization'),
        ),
    ] 