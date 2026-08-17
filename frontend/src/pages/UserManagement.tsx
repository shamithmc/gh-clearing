import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Building2,
  Edit2,
  Layers,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  canManageUsers,
  getAllowedRolesForTenant,
  isPlatformAdmin,
} from '../utils/adminAccess';
import { getAuthenticatedUser } from '../auth/workosAuth';
import { simulatedAuthHeaders } from '../utils/simulatedAuth';

export interface UserItem {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  roles: string[];
  airportRestrictions?: string[];
  airlineRestrictions?: string[];
  chargeCodeRestrictions?: string[];
  createdAt?: string;
}

interface TenantOption {
  id: string;
  name: string;
  type: 'GROUND_HANDLER' | 'AIRLINE' | 'PLATFORM_ADMIN';
}

interface AirportRef {
  iataCode: string;
  name: string;
}

interface AirlineRef {
  iataCode: string;
  name: string;
}

interface ChargeCodeRef {
  code: string;
  displayName: string;
  description?: string;
}

interface CreateUserFormValues {
  id: string;
  username: string;
  email: string;
  roles: string[];
  airportRestrictions?: string[];
  airlineRestrictions?: string[];
  chargeCodeRestrictions?: string[];
}

interface EditUserFormValues {
  username: string;
  email: string;
  roles: string[];
  airportRestrictions?: string[];
  airlineRestrictions?: string[];
  chargeCodeRestrictions?: string[];
}

const responseMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    return body.detail ?? body.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const UserManagement: React.FC = () => {
  const authUser = getAuthenticatedUser();
  const simulatedTenantType = localStorage.getItem('simTenantType');
  const allowed = canManageUsers();
  const isPlatform = isPlatformAdmin();

  // Active Tenant Selection
  const defaultTenantId =
    authUser?.tenantId ??
    localStorage.getItem('simTenantId') ??
    (simulatedTenantType === 'AIRLINE' ? 'EK' : 'SWISSPORT');

  const [activeTenantId, setActiveTenantId] = useState<string>(
    isPlatform ? defaultTenantId : (authUser?.tenantId ?? defaultTenantId),
  );
  const [activeTenantType, setActiveTenantType] = useState<'GROUND_HANDLER' | 'AIRLINE' | 'PLATFORM_ADMIN'>(
    (simulatedTenantType as 'GROUND_HANDLER' | 'AIRLINE' | 'PLATFORM_ADMIN') ?? 'GROUND_HANDLER',
  );

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [airports, setAirports] = useState<AirportRef[]>([]);
  const [airlines, setAirlines] = useState<AirlineRef[]>([]);
  const [chargeCodes, setChargeCodes] = useState<ChargeCodeRef[]>([]);

  const [loading, setLoading] = useState(allowed);
  const [loadingReferenceData, setLoadingReferenceData] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createModalError, setCreateModalError] = useState<string>();
  const [createForm] = Form.useForm<CreateUserFormValues>();

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editModalError, setEditModalError] = useState<string>();
  const [editForm] = Form.useForm<EditUserFormValues>();

  const headers = useMemo(() => {
    if (isPlatform) {
      return simulatedAuthHeaders('PLATFORM', 'PLATFORM_ADMIN');
    }
    return simulatedAuthHeaders(activeTenantId, activeTenantType);
  }, [isPlatform, activeTenantId, activeTenantType]);

  // Load Tenants for Platform Admin
  useEffect(() => {
    if (!allowed) return;
    if (isPlatform) {
      void fetch('/api/tenants', { headers })
        .then(async r => {
          if (r.ok) {
            const data = (await r.json()) as TenantOption[];
            setTenants(data);
            if (data.length > 0 && !data.some(t => t.id === activeTenantId)) {
              setActiveTenantId(data[0].id);
              setActiveTenantType(data[0].type);
            }
          }
        })
        .catch(() => {});
    }
  }, [allowed, isPlatform, headers, activeTenantId]);

  // Load Reference Data for Dimensional Scopes
  useEffect(() => {
    if (!allowed) return;
    setLoadingReferenceData(true);
    Promise.all([
      fetch('/api/reference/airports', { headers }).then(r => (r.ok ? r.json() : [])),
      fetch('/api/reference/airlines', { headers }).then(r => (r.ok ? r.json() : [])),
      fetch('/api/reference/charge-codes', { headers }).then(r => (r.ok ? r.json() : [])),
    ])
      .then(([airportsData, airlinesData, chargeCodesData]) => {
        setAirports(airportsData as AirportRef[]);
        setAirlines(airlinesData as AirlineRef[]);
        setChargeCodes(chargeCodesData as ChargeCodeRef[]);
      })
      .catch(() => {})
      .finally(() => setLoadingReferenceData(false));
  }, [allowed, headers]);

  // Update activeTenantType when activeTenantId changes
  useEffect(() => {
    if (isPlatform && tenants.length > 0) {
      const match = tenants.find(t => t.id === activeTenantId);
      if (match) {
        setActiveTenantType(match.type);
      }
    }
  }, [activeTenantId, tenants, isPlatform]);

  // Load Users for active tenant
  const loadUsers = useCallback(async () => {
    if (!activeTenantId) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/tenants/${encodeURIComponent(activeTenantId)}/users`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(await responseMessage(response));
      }
      const data = (await response.json()) as UserItem[];
      setUsers(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, headers]);

  useEffect(() => {
    if (allowed && activeTenantId) {
      void loadUsers();
    }
  }, [allowed, activeTenantId, loadUsers]);

  const handleCreateUser = async (values: CreateUserFormValues) => {
    setCreating(true);
    setCreateModalError(undefined);
    try {
      const payload = {
        id: values.id.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        roles: values.roles,
        airportRestrictions: values.airportRestrictions ?? [],
        airlineRestrictions: activeTenantType === 'AIRLINE' ? [] : (values.airlineRestrictions ?? []),
        chargeCodeRestrictions: values.chargeCodeRestrictions ?? [],
      };

      const response = await fetch(
        `/api/tenants/${encodeURIComponent(activeTenantId)}/users`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await responseMessage(response));
      }

      const created = (await response.json()) as UserItem;
      setUsers(prev => [...prev.filter(u => u.id !== created.id), created]);
      setSuccess(`User "${created.username}" (${created.id}) provisioned successfully.`);
      setIsCreateModalOpen(false);
      createForm.resetFields();
    } catch (cause) {
      setCreateModalError(cause instanceof Error ? cause.message : 'Failed to provision user');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (values: EditUserFormValues) => {
    if (!editingUser) return;
    setUpdating(true);
    setEditModalError(undefined);
    try {
      const payload = {
        username: values.username.trim(),
        email: values.email.trim(),
        roles: values.roles,
        airportRestrictions: values.airportRestrictions ?? [],
        airlineRestrictions: activeTenantType === 'AIRLINE' ? [] : (values.airlineRestrictions ?? []),
        chargeCodeRestrictions: values.chargeCodeRestrictions ?? [],
      };

      const response = await fetch(
        `/api/tenants/${encodeURIComponent(activeTenantId)}/users/${encodeURIComponent(editingUser.id)}`,
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await responseMessage(response));
      }

      const updated = (await response.json()) as UserItem;
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      setSuccess(`User "${updated.username}" updated successfully.`);
      setEditingUser(null);
      editForm.resetFields();
    } catch (cause) {
      setEditModalError(cause instanceof Error ? cause.message : 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditModalError(undefined);
    editForm.setFieldsValue({
      username: user.username,
      email: user.email,
      roles: user.roles,
      airportRestrictions: user.airportRestrictions ?? [],
      airlineRestrictions: user.airlineRestrictions ?? [],
      chargeCodeRestrictions: user.chargeCodeRestrictions ?? [],
    });
  };

  if (!allowed) {
    return (
      <Result
        status="403"
        title="User administration access denied"
        subTitle="An administrative persona or role is required to manage users and ABAC scopes."
      />
    );
  }

  const allowedRoles = getAllowedRolesForTenant(activeTenantType, isPlatform);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      searchQuery === '' ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || user.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const columns: ColumnsType<UserItem> = [
    {
      title: 'User ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-xs">
          {id}
        </span>
      ),
    },
    {
      title: 'Name & Email',
      key: 'user',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-900">{record.username}</div>
          <div className="text-xs text-slate-500 font-mono">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Assigned Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <div className="flex flex-wrap gap-1">
          {roles.map(r => (
            <Tag key={r} color="blue" className="text-[11px] font-mono m-0">
              {r}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Dimensional Scope (ABAC)',
      key: 'scope',
      render: (_, record) => {
        const airportsCount = record.airportRestrictions?.length ?? 0;
        const airlinesCount = record.airlineRestrictions?.length ?? 0;
        const chargeCodesCount = record.chargeCodeRestrictions?.length ?? 0;
        const hasRestrictions = airportsCount > 0 || airlinesCount > 0 || chargeCodesCount > 0;

        if (!hasRestrictions) {
          return (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Global Tenant Scope
            </span>
          );
        }

        return (
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {airportsCount > 0 && (
              <Tooltip title={`Airports: ${record.airportRestrictions?.join(', ')}`}>
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                  <Plane className="w-3 h-3" />
                  {airportsCount} Airport{airportsCount > 1 ? 's' : ''}
                </span>
              </Tooltip>
            )}
            {airlinesCount > 0 && (
              <Tooltip title={`Airlines: ${record.airlineRestrictions?.join(', ')}`}>
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-mono">
                  <Building2 className="w-3 h-3" />
                  {airlinesCount} Airline{airlinesCount > 1 ? 's' : ''}
                </span>
              </Tooltip>
            )}
            {chargeCodesCount > 0 && (
              <Tooltip title={`Charge Codes: ${record.chargeCodeRestrictions?.join(', ')}`}>
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-mono">
                  <Layers className="w-3 h-3" />
                  {chargeCodesCount} Code{chargeCodesCount > 1 ? 's' : ''}
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          icon={<Edit2 className="w-3.5 h-3.5" />}
          onClick={() => openEditModal(record)}
          data-testid={`edit-user-${record.id}`}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="user-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 m-0">User & Role Administration</h1>
            <p className="text-sm text-slate-500 m-0">
              Provision users, assign role authorities, and configure ABAC dimensional restrictions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void loadUsers()}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setCreateModalError(undefined);
              createForm.resetFields();
              setIsCreateModalOpen(true);
            }}
            data-testid="provision-user-button"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Provision User
          </Button>
        </div>
      </div>

      {/* Scope / Tenant Selector Banner for Platform Admins */}
      {isPlatform && tenants.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Platform Admin Scope Selector
              </span>
              <div className="text-sm font-semibold text-white">
                Managing users for tenant organization:
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={activeTenantId}
              onChange={val => setActiveTenantId(val)}
              showSearch
              optionFilterProp="label"
              className="w-64"
              data-testid="admin-tenant-selector"
              options={tenants.map(t => ({
                value: t.id,
                label: `${t.name} (${t.id}) — ${t.type}`,
              }))}
            />
          </div>
        </div>
      )}

      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load users"
          description={error}
          action={
            <Button size="small" onClick={() => void loadUsers()}>
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
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Filter Role:
            </span>
            <Select
              value={roleFilter}
              onChange={val => setRoleFilter(val)}
              className="w-48"
              size="small"
              data-testid="user-role-filter"
              options={[
                { value: 'ALL', label: 'All Roles' },
                ...allowedRoles.map(r => ({ value: r, label: r })),
              ]}
            />
          </div>

          <div className="w-full md:w-72">
            <Input
              prefix={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Search by ID, name, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              allowClear
              data-testid="user-search-input"
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: `No users found for tenant ${activeTenantId}` }}
        />
      </Card>

      {/* Provision User Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>Provision User — {activeTenantId}</span>
          </div>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        width={680}
        destroyOnClose
      >
        {createModalError && (
          <Alert
            type="error"
            showIcon
            message="Provisioning failed"
            description={createModalError}
            className="mb-4"
          />
        )}

        <Form<CreateUserFormValues>
          form={createForm}
          layout="vertical"
          onFinish={values => void handleCreateUser(values)}
          className="mt-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Form.Item
              name="id"
              label="User ID"
              extra="Unique identifier within this tenant."
              rules={[
                { required: true, message: 'Please enter a user ID' },
                { max: 50, message: 'ID cannot exceed 50 characters' },
              ]}
            >
              <Input placeholder="e.g. jdoe-dxb" data-testid="new-user-id-input" />
            </Form.Item>

            <Form.Item
              name="username"
              label="Full Name / Display Name"
              rules={[
                { required: true, message: 'Please enter a name' },
                { max: 50, message: 'Name cannot exceed 50 characters' },
              ]}
            >
              <Input placeholder="e.g. John Doe" data-testid="new-user-name-input" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter an email address' },
                { type: 'email', message: 'Please enter a valid email' },
                { max: 100, message: 'Email cannot exceed 100 characters' },
              ]}
              className="md:col-span-2"
            >
              <Input placeholder="jdoe@example.com" data-testid="new-user-email-input" />
            </Form.Item>
          </div>

          <Form.Item
            name="roles"
            label="Assigned Roles"
            extra="Select one or more authorized roles from the closed role vocabulary."
            rules={[{ required: true, message: 'Please assign at least one role' }]}
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="Select roles"
              data-testid="new-user-roles-select"
              options={allowedRoles.map(r => ({ value: r, label: r }))}
            />
          </Form.Item>

          <Divider className="my-4">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              ABAC Dimensional Restrictions (Optional)
            </span>
          </Divider>

          <p className="text-xs text-slate-500 mb-3">
            Leave restriction dimensions empty to grant unrestricted operational scope within the tenant.
          </p>

          <div className="space-y-4">
            <Form.Item
              name="airportRestrictions"
              label="Airport Hub Restrictions"
              extra="Limit user operational visibility to specified IATA airport hub codes."
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                loading={loadingReferenceData}
                placeholder="Select permitted airports (e.g. DXB, LHR)"
                data-testid="new-user-airports-select"
                optionFilterProp="label"
                options={airports.map(a => ({
                  value: a.iataCode,
                  label: `${a.iataCode} — ${a.name}`,
                }))}
              />
            </Form.Item>

            {activeTenantType !== 'AIRLINE' ? (
              <Form.Item
                name="airlineRestrictions"
                label="Airline Carrier Restrictions"
                extra="Limit ground-handler user visibility to specific customer airlines."
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  loading={loadingReferenceData}
                  placeholder="Select permitted airlines (e.g. EK, LH)"
                  data-testid="new-user-airlines-select"
                  optionFilterProp="label"
                  options={airlines.map(a => ({
                    value: a.iataCode,
                    label: `${a.iataCode} — ${a.name}`,
                  }))}
                />
              </Form.Item>
            ) : (
              <Alert
                type="info"
                showIcon
                message="Implicit Airline Scope"
                description="Airline users are automatically and strictly restricted to their own airline carrier."
                className="mb-4"
              />
            )}

            <Form.Item
              name="chargeCodeRestrictions"
              label="Charge Code Restrictions"
              extra="Limit user operations to specific IATA 25 standard charge codes."
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                loading={loadingReferenceData}
                placeholder="Select permitted charge codes (e.g. BAGGAGE, RAMP)"
                data-testid="new-user-chargecodes-select"
                optionFilterProp="label"
                options={chargeCodes.map(c => ({
                  value: c.code,
                  label: `${c.code} — ${c.displayName}`,
                }))}
              />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              data-testid="submit-new-user-button"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Provision User
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <Edit2 className="w-5 h-5 text-blue-600" />
            <span>Edit User: {editingUser?.id}</span>
          </div>
        }
        open={Boolean(editingUser)}
        onCancel={() => setEditingUser(null)}
        footer={null}
        width={680}
        destroyOnClose
      >
        {editModalError && (
          <Alert
            type="error"
            showIcon
            message="Update failed"
            description={editModalError}
            className="mb-4"
          />
        )}

        <Form<EditUserFormValues>
          form={editForm}
          layout="vertical"
          onFinish={values => void handleUpdateUser(values)}
          className="mt-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Form.Item
              name="username"
              label="Full Name / Display Name"
              rules={[
                { required: true, message: 'Please enter a name' },
                { max: 50, message: 'Name cannot exceed 50 characters' },
              ]}
            >
              <Input placeholder="e.g. John Doe" data-testid="edit-user-name-input" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter an email address' },
                { type: 'email', message: 'Please enter a valid email' },
                { max: 100, message: 'Email cannot exceed 100 characters' },
              ]}
            >
              <Input placeholder="jdoe@example.com" data-testid="edit-user-email-input" />
            </Form.Item>
          </div>

          <Form.Item
            name="roles"
            label="Assigned Roles"
            rules={[{ required: true, message: 'Please assign at least one role' }]}
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="Select roles"
              data-testid="edit-user-roles-select"
              options={allowedRoles.map(r => ({ value: r, label: r }))}
            />
          </Form.Item>

          <Divider className="my-4">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              ABAC Dimensional Restrictions (Optional)
            </span>
          </Divider>

          <div className="space-y-4">
            <Form.Item
              name="airportRestrictions"
              label="Airport Hub Restrictions"
              extra="Limit user operational visibility to specified IATA airport hub codes."
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                loading={loadingReferenceData}
                placeholder="Select permitted airports"
                data-testid="edit-user-airports-select"
                optionFilterProp="label"
                options={airports.map(a => ({
                  value: a.iataCode,
                  label: `${a.iataCode} — ${a.name}`,
                }))}
              />
            </Form.Item>

            {activeTenantType !== 'AIRLINE' && (
              <Form.Item
                name="airlineRestrictions"
                label="Airline Carrier Restrictions"
                extra="Limit ground-handler user visibility to specific customer airlines."
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  loading={loadingReferenceData}
                  placeholder="Select permitted airlines"
                  data-testid="edit-user-airlines-select"
                  optionFilterProp="label"
                  options={airlines.map(a => ({
                    value: a.iataCode,
                    label: `${a.iataCode} — ${a.name}`,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item
              name="chargeCodeRestrictions"
              label="Charge Code Restrictions"
              extra="Limit user operations to specific IATA standard charge codes."
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                loading={loadingReferenceData}
                placeholder="Select permitted charge codes"
                data-testid="edit-user-chargecodes-select"
                optionFilterProp="label"
                options={chargeCodes.map(c => ({
                  value: c.code,
                  label: `${c.code} — ${c.displayName}`,
                }))}
              />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={updating}
              data-testid="submit-edit-user-button"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
