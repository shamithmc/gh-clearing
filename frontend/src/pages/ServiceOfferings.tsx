import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Form, Input, message, Modal, Select, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import {
  Package,
  Plus,
  Trash2,
  RefreshCw,
  Globe,
  Layers,
  Building2,
  Pencil
} from 'lucide-react';

interface AirportOption {
  iataCode: string;
  name: string;
  region: string;
}

interface ChargeCodeOption {
  code: string;
  displayName: string;
}

interface ServiceOffering {
  id: string;
  supplierId: string;
  airportCode: string;
  airportName: string;
  country: string;
  region: string;
  serviceType: string;
  serviceName: string;
  description: string;
}

interface OfferingValues {
  airportCode: string;
  serviceType: string;
  description: string;
}

const ServiceOfferings: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'GROUND_HANDLER', userId),
    [tenantId, userId],
  );
  const [form] = Form.useForm<OfferingValues>();
  const [offerings, setOfferings] = useState<ServiceOffering[]>([]);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [chargeCodes, setChargeCodes] = useState<ChargeCodeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<ServiceOffering | null>(null);
  const [error, setError] = useState<string>();

  const loadOfferings = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/supplier/offerings', { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit service listing management.'
          : 'Service offerings could not be loaded.');
      }
      setOfferings(await response.json());
    } catch (requestError) {
      setOfferings([]);
      setError(requestError instanceof Error ? requestError.message : 'Service offerings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    Promise.all([
      fetch('/api/reference/airports', { headers }).then(response => response.ok ? response.json() : []),
      fetch('/api/reference/charge-codes', { headers }).then(response => response.ok ? response.json() : []),
    ]).then(([airportData, chargeCodeData]) => {
      setAirports(airportData);
      setChargeCodes(chargeCodeData);
    }).catch(() => {
      setAirports([]);
      setChargeCodes([]);
    });
    loadOfferings();
  }, [headers, loadOfferings]);

  const openCreateModal = () => {
    setEditingOffering(null);
    form.resetFields();
    setOpen(true);
  };

  const openEditModal = (offering: ServiceOffering) => {
    setEditingOffering(offering);
    form.setFieldsValue({
      airportCode: offering.airportCode,
      serviceType: offering.serviceType,
      description: offering.description,
    });
    setOpen(true);
  };

  const saveOffering = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const url = editingOffering
        ? `/api/supplier/offerings/${editingOffering.id}`
        : '/api/supplier/offerings';
      const method = editingOffering ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(response.status === 403
          ? 'The airport or service is outside your configured operating scope.'
          : payload.message || (editingOffering ? 'The service offering could not be updated.' : 'The service offering could not be published.'));
      }
      message.success(editingOffering ? 'Service offering updated successfully' : 'Service offering published to the marketplace');
      setOpen(false);
      setEditingOffering(null);
      form.resetFields();
      await loadOfferings();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : 'Failed to save service offering.');
    } finally {
      setSaving(false);
    }
  };

  const removeOffering = async (offering: ServiceOffering) => {
    const response = await fetch(`/api/supplier/offerings/${offering.id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      message.error('The service offering could not be removed.');
      return;
    }
    message.success('Service offering removed');
    await loadOfferings();
  };

  const columns: TableColumnsType<ServiceOffering> = [
    {
      title: 'STATION HUB',
      key: 'airport',
      render: (_, offering) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 inline-flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-500" />
            {offering.airportCode}
          </span>
          <span className="text-xs text-slate-600">{offering.airportName}</span>
        </div>
      ),
    },
    {
      title: 'REGION',
      dataIndex: 'region',
      key: 'region',
      render: (region: string) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          {region}
        </span>
      ),
    },
    {
      title: 'SERVICE',
      key: 'service',
      render: (_, offering) => (
        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
          <Layers className="w-3 h-3 text-indigo-500" />
          {offering.serviceType} — {offering.serviceName}
        </div>
      ),
    },
    {
      title: 'MARKETPLACE DESCRIPTION',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => (
        <span className="text-xs text-slate-600 leading-relaxed">{description}</span>
      ),
    },
    {
      title: 'ACTION',
      key: 'action',
      align: 'right' as const,
      render: (_, offering) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            data-testid={`edit-offering-${offering.id}`}
            onClick={() => openEditModal(offering)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            data-testid={`remove-offering-${offering.id}`}
            onClick={() => removeOffering(offering)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Service Offerings
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Publish the services you provide at configured operating airports for airline discovery</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Marketplace management</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOfferings}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Data
          </button>
          <button
            data-testid="add-service-offering"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg px-4 py-2 h-9 shadow-xs focus:ring-2 focus:ring-blue-500/30 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Offering
          </button>
        </div>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Offerings Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200/80">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Published Service Capabilities ({offerings.length})
          </span>
        </div>
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={offerings}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: (
              <div className="py-8 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600 m-0">No services listed in the marketplace</p>
              </div>
            )}}
            scroll={{ x: 800 }}
            className="[&_.ant-table-thead_th]:!bg-slate-50/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!border-slate-200/60"
          />
        </Spin>
      </div>

      {/* Publish / Edit Offering Modal */}
      <Modal
        title={editingOffering ? 'Edit Service Offering' : 'Publish Service Offering'}
        open={open}
        okText={editingOffering ? 'Save Changes' : 'Publish Offering'}
        confirmLoading={saving}
        onOk={saveOffering}
        onCancel={() => {
          setOpen(false);
          setEditingOffering(null);
          form.resetFields();
        }}
      >
        <Form<OfferingValues> form={form} layout="vertical" className="mt-5">
          <Form.Item name="airportCode" label={<span className="text-xs font-semibold text-slate-700">Operating Airport</span>} rules={[{ required: true, message: 'Select an airport' }]}>
            <Select
              data-testid="offering-airport"
              aria-label="Offering airport"
              showSearch
              optionFilterProp="label"
              placeholder="Select configured airport"
              className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
              options={airports.map(airport => ({
                value: airport.iataCode,
                label: `${airport.iataCode} - ${airport.name} (${airport.region})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="serviceType" label={<span className="text-xs font-semibold text-slate-700">Service</span>} rules={[{ required: true, message: 'Select a service' }]}>
            <Select
              data-testid="offering-service"
              aria-label="Offering service"
              showSearch
              optionFilterProp="label"
              placeholder="Select service"
              className="[&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
              options={chargeCodes.map(chargeCode => ({
                value: chargeCode.code,
                label: `${chargeCode.code} - ${chargeCode.displayName}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label={<span className="text-xs font-semibold text-slate-700">Offering Description</span>}
            rules={[
              { required: true, message: 'Describe the offering' },
              { max: 2000, message: 'Description cannot exceed 2000 characters' },
            ]}
          >
            <Input.TextArea
              data-testid="offering-description"
              rows={5}
              showCount
              maxLength={2000}
              placeholder="Describe capabilities, operating hours, equipment, and service strengths"
              className="!text-xs !rounded-lg"
            />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default ServiceOfferings;
