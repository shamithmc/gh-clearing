import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Table, Tag, Select, Space, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;
const { Option } = Select;

interface ServiceLine {
  chargeCode: string;
  serviceName: string;
  formulaType: string;
  quantityDriver: string;
  uom: string;
  taxCode: string;
  rateDetails: any;
}

interface Contract {
  id: string;
  groundHandlerId: string;
  airlineId: string;
  airportCode: string;
  startDate: string;
  endDate: string;
  status: string;
  currency: string;
  services: ServiceLine[];
}

const ContractsList: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    const url = statusFilter === 'ALL' ? '/api/contracts' : `/api/contracts?status=${statusFilter}`;
    fetch(url)
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setContracts(data))
      .catch(() => setContracts([]));
  }, [statusFilter]);

  const columns = [
    { title: 'Contract ID', dataIndex: 'id', key: 'id', render: (id: string) => id.substring(0, 8) + '...' },
    { title: 'Airline', dataIndex: 'airlineId', key: 'airlineId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'APPROVED') color = 'success';
        if (status === 'PENDING_APPROVAL') color = 'warning';
        if (status === 'DRAFT') color = 'processing';
        if (status === 'REVIEW_REQUESTED') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      }
    },
  ];

  const expandedRowRender = (record: Contract) => {
    const serviceColumns = [
      { title: 'Charge Code', dataIndex: 'chargeCode', key: 'chargeCode' },
      { title: 'Service Name', dataIndex: 'serviceName', key: 'serviceName' },
      { title: 'Formula', dataIndex: 'formulaType', key: 'formulaType' },
      { title: 'Driver', dataIndex: 'quantityDriver', key: 'quantityDriver' },
      { title: 'UoM', dataIndex: 'uom', key: 'uom' },
      { title: 'Tax Code', dataIndex: 'taxCode', key: 'taxCode' },
      { 
        title: 'Rates', 
        dataIndex: 'rateDetails', 
        key: 'rateDetails',
        render: (rates: any, sRecord: ServiceLine) => {
          if (sRecord.formulaType === 'PF-01' || sRecord.formulaType === 'PF-02' || sRecord.formulaType === 'PF-07') {
            return `Rate: ${rates.rate}`;
          }
          if (sRecord.formulaType === 'PF-03' || sRecord.formulaType === 'PF-04') {
            return (rates.tiers || []).map((t: any, idx: number) => (
              <div key={idx}>Up to: {t.upto || '∞'} ➔ Rate: {t.rate}</div>
            ));
          }
          return JSON.stringify(rates);
        }
      },
    ];

    return (
      <Table 
        columns={serviceColumns} 
        dataSource={record.services} 
        pagination={false} 
        rowKey="chargeCode" 
      />
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Contracts</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/contracts/new')}>
          Create Contract
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={24}>
            <Space>
              <span>Filter by Status:</span>
              <Select value={statusFilter} style={{ width: 200 }} onChange={setStatusFilter}>
                <Option value="ALL">All Statuses</Option>
                <Option value="DRAFT">DRAFT</Option>
                <Option value="PENDING_APPROVAL">PENDING_APPROVAL</Option>
                <Option value="APPROVED">APPROVED</Option>
                <Option value="REVIEW_REQUESTED">REVIEW_REQUESTED</Option>
                <Option value="EXPIRED">EXPIRED</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table 
          columns={columns} 
          dataSource={contracts} 
          rowKey="id"
          expandable={{ expandedRowRender, defaultExpandedRowKeys: [] }}
          locale={{ emptyText: 'No contracts found' }} 
        />
      </Card>
    </div>
  );
};

export default ContractsList;
