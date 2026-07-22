import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Form, Input, message, Modal, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Title } = Typography;

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

  const createOffering = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const response = await fetch('/api/supplier/offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(response.status === 403
          ? 'The airport or service is outside your configured operating scope.'
          : payload.message || 'The service offering could not be published.');
      }
      message.success('Service offering published to the marketplace');
      setOpen(false);
      form.resetFields();
      await loadOfferings();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : 'The service offering could not be published.');
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
      title: 'Airport',
      key: 'airport',
      render: (_, offering) => `${offering.airportCode} - ${offering.airportName}`,
    },
    { title: 'Region', dataIndex: 'region', key: 'region', render: region => <Tag>{region}</Tag> },
    {
      title: 'Service',
      key: 'service',
      render: (_, offering) => `${offering.serviceType} - ${offering.serviceName}`,
    },
    { title: 'Marketplace description', dataIndex: 'description', key: 'description' },
    {
      title: 'Action',
      key: 'action',
      render: (_, offering) => (
        <Button
          data-testid={`remove-offering-${offering.id}`}
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => removeOffering(offering)}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Service Offerings</Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            Publish the services you provide at configured operating airports for airline discovery.
          </Paragraph>
        </div>
        <Button data-testid="add-service-offering" type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Offering
        </Button>
      </Space>

      {error && <Alert type="error" showIcon message={error} />}

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={offerings}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="No services listed in the marketplace" /> }}
          scroll={{ x: 800 }}
        />
      </Spin>

      <Modal
        title="Publish Service Offering"
        open={open}
        okText="Publish Offering"
        confirmLoading={saving}
        onOk={createOffering}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
      >
        <Form<OfferingValues> form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="airportCode" label="Operating airport" rules={[{ required: true, message: 'Select an airport' }]}>
            <Select
              data-testid="offering-airport"
              aria-label="Offering airport"
              showSearch
              optionFilterProp="label"
              placeholder="Select configured airport"
              options={airports.map(airport => ({
                value: airport.iataCode,
                label: `${airport.iataCode} - ${airport.name} (${airport.region})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="serviceType" label="Service" rules={[{ required: true, message: 'Select a service' }]}>
            <Select
              data-testid="offering-service"
              aria-label="Offering service"
              showSearch
              optionFilterProp="label"
              placeholder="Select service"
              options={chargeCodes.map(chargeCode => ({
                value: chargeCode.code,
                label: `${chargeCode.code} - ${chargeCode.displayName}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="Offering description"
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
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default ServiceOfferings;
