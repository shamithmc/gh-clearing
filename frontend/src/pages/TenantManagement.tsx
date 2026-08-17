import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Radio,
  Result,
  Select,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Building2, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { canManageTenants } from '../utils/adminAccess';
import { simulatedAuthHeaders } from '../utils/simulatedAuth';

export interface TenantItem {
  id: string;
  name: string;
  type: 'GROUND_HANDLER' | 'AIRLINE' | 'PLATFORM_ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

interface NewTenantFormValues {
  id: string;
  name: string;
  type: 'GROUND_HANDLER' | 'AIRLINE';
}

const responseMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    return body.detail ?? body.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const TenantManagement: React.FC = () => {
  const allowed = canManageTenants();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  // Filter and search state
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string>();
  const [form] = Form.useForm<NewTenantFormValues>();

  const headers = useMemo(
    () => simulatedAuthHeaders('PLATFORM', 'PLATFORM_ADMIN'),
    [],
  );

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/tenants', { headers });
      if (!response.ok) {
        throw new Error(await responseMessage(response));
      }
      const data = (await response.json()) as TenantItem[];
      setTenants(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load tenants');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (allowed) {
      void loadTenants();
    }
  }, [allowed, loadTenants]);

  const handleCreateTenant = async (values: NewTenantFormValues) => {
    setCreating(true);
    setModalError(undefined);
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: values.id.trim().toUpperCase(),
          name: values.name.trim(),
          type: values.type,
        }),
      });

      if (!response.ok) {
        throw new Error(await responseMessage(response));
      }

      const created = (await response.json()) as TenantItem;
      setTenants(prev => [...prev.filter(t => t.id !== created.id), created]);
      setSuccess(`Tenant "${created.name}" (${created.id}) created successfully.`);
      setIsCreateModalOpen(false);
      form.resetFields();
    } catch (cause) {
      setModalError(cause instanceof Error ? cause.message : 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  if (!allowed) {
    return (
      <Result
        status="403"
        title="Tenant administration access denied"
        subTitle="A platform administrator persona or role is required to manage tenants."
      />
    );
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesType = typeFilter === 'ALL' || tenant.type === typeFilter;
    const matchesSearch =
      searchQuery === '' ||
      tenant.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const columns: ColumnsType<TenantItem> = [
    {
      title: 'Tenant Code',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
          {id}
        </span>
      ),
    },
    {
      title: 'Organization Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-semibold text-slate-800">{name}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: TenantItem['type']) => {
        if (type === 'GROUND_HANDLER') {
          return <Tag color="geekblue" className="font-medium">GROUND HANDLER</Tag>;
        }
        if (type === 'AIRLINE') {
          return <Tag color="cyan" className="font-medium">AIRLINE</Tag>;
        }
        return <Tag color="purple" className="font-medium">PLATFORM ADMIN</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: TenantItem['status']) => (
        <Badge
          status={status === 'ACTIVE' ? 'success' : 'default'}
          text={status === 'ACTIVE' ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date?: string) => (
        <span className="text-xs text-slate-500 font-mono">
          {date ? new Date(date).toLocaleDateString() : 'System Seed'}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="tenant-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 m-0">Tenant Management</h1>
            <p className="text-sm text-slate-500 m-0">
              Create and manage ground handler and airline tenant organizations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void loadTenants()}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setModalError(undefined);
              form.resetFields();
              setIsCreateModalOpen(true);
            }}
            data-testid="add-tenant-button"
            className="bg-blue-600 hover:bg-blue-700"
          >
            New Tenant
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load tenants"
          description={error}
          action={
            <Button size="small" onClick={() => void loadTenants()}>
              Retry
            </Button>
          }
        />
      )}

      {success && (
        <Alert
          type="success"
          showIcon
          closable
          onClose={() => setSuccess(undefined)}
          message={success}
        />
      )}

      {/* Filter and Table Card */}
      <Card className="rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type:</span>
            <Radio.Group
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as string)}
              buttonStyle="solid"
              size="small"
              data-testid="tenant-type-filter"
            >
              <Radio.Button value="ALL">All ({tenants.length})</Radio.Button>
              <Radio.Button value="GROUND_HANDLER">
                Ground Handlers ({tenants.filter(t => t.type === 'GROUND_HANDLER').length})
              </Radio.Button>
              <Radio.Button value="AIRLINE">
                Airlines ({tenants.filter(t => t.type === 'AIRLINE').length})
              </Radio.Button>
            </Radio.Group>
          </div>

          <div className="w-full md:w-72">
            <Input
              prefix={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Search by code or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              allowClear
              data-testid="tenant-search-input"
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTenants}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: 'No tenant organizations found' }}
        />
      </Card>

      {/* New Tenant Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Provision New Tenant</span>
          </div>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {modalError && (
          <Alert
            type="error"
            showIcon
            message="Tenant creation failed"
            description={modalError}
            className="mb-4"
          />
        )}

        <Form<NewTenantFormValues>
          form={form}
          layout="vertical"
          onFinish={values => void handleCreateTenant(values)}
          initialValues={{ type: 'AIRLINE' }}
          className="mt-4"
        >
          <Form.Item
            name="id"
            label="Tenant Code / ID"
            extra="Unique identifier (e.g. EK, LH, SWISSPORT, MENZIES)."
            rules={[
              { required: true, message: 'Please enter a tenant code' },
              { max: 50, message: 'Tenant ID cannot exceed 50 characters' },
              { pattern: /^[A-Za-z0-9_-]+$/, message: 'Alphanumeric characters, dashes, and underscores only' },
            ]}
          >
            <Input
              placeholder="e.g. LH"
              data-testid="new-tenant-id-input"
              className="font-mono uppercase"
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Organization Name"
            rules={[
              { required: true, message: 'Please enter the tenant organization name' },
              { max: 100, message: 'Name cannot exceed 100 characters' },
            ]}
          >
            <Input
              placeholder="e.g. Lufthansa"
              data-testid="new-tenant-name-input"
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Organization Type"
            rules={[{ required: true, message: 'Please select organization type' }]}
          >
            <Select
              data-testid="new-tenant-type-select"
              options={[
                { value: 'AIRLINE', label: 'Airline' },
                { value: 'GROUND_HANDLER', label: 'Ground Handler' },
              ]}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              data-testid="submit-new-tenant-button"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Tenant
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantManagement;
