import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Typography, Table, Tag, Select, Space, Row, Col, message } from 'antd';
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
  
  // Simulated Tenant Role Selector (GROUND_HANDLER or AIRLINE)
  const [simTenantId, setSimTenantId] = useState<string>(localStorage.getItem('simTenantId') || 'SWISSPORT');
  const [simTenantType, setSimTenantType] = useState<string>(localStorage.getItem('simTenantType') || 'GROUND_HANDLER');
  
  const navigate = useNavigate();

  const fetchContracts = useCallback(() => {
    const url = statusFilter === 'ALL' ? '/api/contracts' : `/api/contracts?status=${statusFilter}`;
    fetch(url, {
      headers: {
        'X-Mock-Tenant-Id': simTenantId,
        'X-Mock-Tenant-Type': simTenantType,
      }
    })
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setContracts(data))
      .catch(() => setContracts([]));
  }, [statusFilter, simTenantId, simTenantType]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleStatusTransition = (contractId: string, newStatus: string) => {
    fetch(`/api/contracts/${contractId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': simTenantId,
        'X-Mock-Tenant-Type': simTenantType,
      },
      body: JSON.stringify({ status: newStatus }),
    })
    .then(res => {
      if (res.ok) {
        message.success(`Contract status updated to ${newStatus}`);
        fetchContracts();
      } else {
        res.json().then(data => message.error(data.message || 'Status update failed'));
      }
    })
    .catch(() => message.error('Status update failed'));
  };

  const handleTenantChange = (value: string) => {
    if (value === 'SWISSPORT') {
      setSimTenantId('SWISSPORT');
      setSimTenantType('GROUND_HANDLER');
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    } else {
      setSimTenantId('EK');
      setSimTenantType('AIRLINE');
      localStorage.setItem('simTenantId', 'EK');
      localStorage.setItem('simTenantType', 'AIRLINE');
    }
  };

  const columns = [
    { title: 'Contract ID', dataIndex: 'id', key: 'id', render: (id: string) => id.substring(0, 8) + '...' },
    { title: 'Ground Handler', dataIndex: 'groundHandlerId', key: 'groundHandlerId' },
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
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Contract) => {
        if (record.status === 'APPROVED' || record.status === 'EXPIRED') {
          return null;
        }
        if (simTenantType === 'GROUND_HANDLER') {
          if (record.status === 'DRAFT' || record.status === 'REVIEW_REQUESTED') {
            return (
              <Button type="primary" size="small" onClick={() => handleStatusTransition(record.id, 'PENDING_APPROVAL')}>
                Submit for Approval
              </Button>
            );
          }
        } else if (simTenantType === 'AIRLINE') {
          if (record.status === 'PENDING_APPROVAL') {
            return (
              <Space>
                <Button type="primary" danger size="small" onClick={() => handleStatusTransition(record.id, 'REVIEW_REQUESTED')}>
                  Reject / Review
                </Button>
                <Button type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} size="small" onClick={() => handleStatusTransition(record.id, 'APPROVED')}>
                  Approve
                </Button>
              </Space>
            );
          }
        }
        return null;
      }
    }
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
          <Col span={12}>
            <Space>
              <span>Filter by Status:</span>
              <Select value={statusFilter} style={{ width: 180 }} onChange={setStatusFilter}>
                <Option value="ALL">All Statuses</Option>
                <Option value="DRAFT">DRAFT</Option>
                <Option value="PENDING_APPROVAL">PENDING_APPROVAL</Option>
                <Option value="APPROVED">APPROVED</Option>
                <Option value="REVIEW_REQUESTED">REVIEW_REQUESTED</Option>
                <Option value="EXPIRED">EXPIRED</Option>
              </Select>
            </Space>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space>
              <span>Simulate Tenant User:</span>
              <Select value={simTenantId} style={{ width: 220 }} onChange={handleTenantChange}>
                <Option value="SWISSPORT">Swissport (Ground Handler)</Option>
                <Option value="EK">Emirates (Airline)</Option>
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
