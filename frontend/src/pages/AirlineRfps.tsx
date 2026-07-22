import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Empty, Form, Input, message, Row, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import type { Dayjs } from 'dayjs';
import { SendOutlined } from '@ant-design/icons';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { RangePicker } = DatePicker;
const { Paragraph, Text, Title } = Typography;

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ChargeCodeOption {
  code: string;
  displayName: string;
}

interface Rfp {
  id: string;
  airlineId: string;
  airportCode: string;
  serviceType: string;
  requirements: string;
  desiredStartDate: string;
  desiredEndDate: string;
  status: string;
  eligibleGroundHandlerIds: string[];
  createdAt: string;
}

interface RfpFormValues {
  airportCode: string;
  serviceType: string;
  requirements: string;
  contractPeriod: [Dayjs, Dayjs];
}

const AirlineRfps: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [form] = Form.useForm<RfpFormValues>();
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [chargeCodes, setChargeCodes] = useState<ChargeCodeOption[]>([]);
  const [rfps, setRfps] = useState<Rfp[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string>();

  const loadRfps = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/rfps', { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit RFP management.'
          : 'RFPs could not be loaded.');
      }
      setRfps(await response.json());
    } catch (requestError) {
      setRfps([]);
      setError(requestError instanceof Error ? requestError.message : 'RFPs could not be loaded.');
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
    loadRfps();
  }, [headers, loadRfps]);

  const publishRfp = async (values: RfpFormValues) => {
    setPublishing(true);
    try {
      const response = await fetch('/api/rfps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          airportCode: values.airportCode,
          serviceType: values.serviceType,
          requirements: values.requirements,
          desiredStartDate: values.contractPeriod[0].format('YYYY-MM-DD'),
          desiredEndDate: values.contractPeriod[1].format('YYYY-MM-DD'),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit this RFP.'
          : payload.message || 'The RFP could not be published.');
      }
      const created: Rfp = await response.json();
      message.success(`RFP published to ${created.eligibleGroundHandlerIds.length} eligible ground handler(s)`);
      form.resetFields();
      await loadRfps();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : 'The RFP could not be published.');
    } finally {
      setPublishing(false);
    }
  };

  const columns: TableColumnsType<Rfp> = [
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Service', dataIndex: 'serviceType', key: 'serviceType' },
    {
      title: 'Desired Contract Period',
      key: 'period',
      render: (_, rfp) => `${rfp.desiredStartDate} to ${rfp.desiredEndDate}`,
    },
    {
      title: 'Eligible Suppliers',
      dataIndex: 'eligibleGroundHandlerIds',
      key: 'eligibleGroundHandlerIds',
      render: ids => <Text>{ids.length}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => <Tag color="processing">{status}</Tag>,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>Requests for Proposal</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Publish service requirements to ground handlers configured for your airline and selected airport.
        </Paragraph>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <Card title="Create RFP">
        <Form<RfpFormValues> form={form} layout="vertical" onFinish={publishRfp}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="airportCode" label="Airport" rules={[{ required: true, message: 'Select an airport' }]}>
                <Select
                  data-testid="rfp-airport"
                  aria-label="RFP airport"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select airport"
                  options={airports.map(airport => ({
                    value: airport.iataCode,
                    label: `${airport.iataCode} - ${airport.name}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="serviceType" label="Service type" rules={[{ required: true, message: 'Select a service type' }]}>
                <Select
                  data-testid="rfp-service"
                  aria-label="RFP service type"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select service"
                  options={chargeCodes.map(chargeCode => ({
                    value: chargeCode.code,
                    label: `${chargeCode.code} - ${chargeCode.displayName}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="contractPeriod"
            label="Desired contract period"
            rules={[{ required: true, message: 'Select the desired contract period' }]}
          >
            <RangePicker data-testid="rfp-period" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="requirements"
            label="Requirements"
            rules={[
              { required: true, message: 'Describe the service requirements' },
              { max: 4000, message: 'Requirements cannot exceed 4000 characters' },
            ]}
          >
            <Input.TextArea
              data-testid="rfp-requirements"
              rows={5}
              showCount
              maxLength={4000}
              placeholder="Describe volumes, operating hours, service levels, equipment, and other requirements"
            />
          </Form.Item>

          <Button
            data-testid="publish-rfp"
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={publishing}
          >
            Publish RFP
          </Button>
        </Form>
      </Card>

      <Card title="My Published RFPs" styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={rfps}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No RFPs published yet" /> }}
            expandable={{
              expandedRowRender: rfp => <Paragraph style={{ margin: 0 }}>{rfp.requirements}</Paragraph>,
            }}
          />
        </Spin>
      </Card>
    </Space>
  );
};

export default AirlineRfps;
