import React from 'react';
import { Button, Card, Typography, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const ContractsList: React.FC = () => {
  const navigate = useNavigate();

  const columns = [
    { title: 'Airline', dataIndex: 'airline', key: 'airline' },
    { title: 'Airport', dataIndex: 'airport', key: 'airport' },
    { title: 'Valid From', dataIndex: 'validFrom', key: 'validFrom' },
    { title: 'Valid To', dataIndex: 'validTo', key: 'validTo' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'APPROVED') color = 'success';
        if (status === 'PENDING_APPROVAL') color = 'warning';
        if (status === 'DRAFT') color = 'processing';
        return <Tag color={color}>{status}</Tag>;
      }
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Contracts</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/contracts/new')}>
          Create Contract
        </Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={[]} locale={{ emptyText: 'No contracts found' }} />
      </Card>
    </div>
  );
};

export default ContractsList;
