import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Typography, Table, Tag, Select, Space, Row, Col, Modal, Input, message } from 'antd';
import { PlusOutlined, CheckCircleOutlined, ExclamationCircleOutlined, SendOutlined, DownloadOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, scopedUserId, setSimulatedUserId, simulatedAuthHeaders, unrestrictedUserId } from '../utils/simulatedAuth';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface InvoiceLineItem {
  id: string;
  flightDate: string;
  flightNumber: string;
  aircraftReg: string;
  origin: string;
  destination: string;
  chargeCode: string;
  serviceName: string;
  formulaType: string;
  quantityDrivers: string;
  calculatedAmount: number;
  disputed?: boolean;
  disputeCategory?: string;
  disputeComment?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  airlineId: string;
  airportCode: string;
  currency: string;
  exchangeRate: number;
  issueDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  comments?: string;
  lineItems: InvoiceLineItem[];
}

const InvoicesList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [simTenantId, setSimTenantId] = useState<string>(localStorage.getItem('simTenantId') || 'SWISSPORT');
  const [simTenantType, setSimTenantType] = useState<string>(localStorage.getItem('simTenantType') || 'GROUND_HANDLER');
  const [simUserId, setSimUserId] = useState<string>(() => getSimulatedUserId(localStorage.getItem('simTenantId') || 'SWISSPORT'));
  
  // Modal states for requesting modifications
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [modificationComments, setModificationComments] = useState('');

  // Dispute modal states
  const [isDisputeModalVisible, setIsDisputeModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [disputedLineItems, setDisputedLineItems] = useState<{ [key: string]: { selected: boolean; category: string; comment: string } }>({});

  const navigate = useNavigate();

  const fetchInvoices = useCallback(() => {
    fetch('/api/invoices', {
      headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
    })
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setInvoices(data))
      .catch(() => setInvoices([]));
  }, [simTenantId, simTenantType, simUserId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleTenantChange = (value: string) => {
    const userId = unrestrictedUserId(value);
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
    setSimUserId(userId);
    setSimulatedUserId(userId);
  };

  const handlePersonaChange = (userId: string) => {
    setSimUserId(userId);
    setSimulatedUserId(userId);
  };

  const handleStatusChange = (id: string, status: string, comments?: string) => {
    let url = `/api/invoices/${id}/status?status=${status}`;
    if (comments) {
      url += `&comments=${encodeURIComponent(comments)}`;
    }

    fetch(url, {
      method: 'PUT',
      headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
    })
      .then(async res => {
        if (res.ok) {
          message.success(`Invoice status updated to ${status}`);
          fetchInvoices();
          setIsModalVisible(false);
          setModificationComments('');
          setSelectedInvoiceId(null);
        } else {
          const errText = await res.text();
          message.error(errText || 'Failed to update status');
        }
      })
      .catch(() => message.error('Server error occurred'));
  };

  const handleDisputeSubmit = () => {
    if (!selectedInvoice) return;

    const payloadItems = Object.keys(disputedLineItems)
      .filter(itemId => disputedLineItems[itemId].selected)
      .map(itemId => ({
        lineItemId: itemId,
        category: disputedLineItems[itemId].category,
        comment: disputedLineItems[itemId].comment
      }));

    if (payloadItems.length === 0) {
      message.error('Please select at least one line item to dispute');
      return;
    }

    fetch(`/api/invoices/${selectedInvoice.id}/dispute`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...simulatedAuthHeaders(simTenantId, simTenantType, simUserId),
      },
      body: JSON.stringify({ lineItems: payloadItems })
    })
      .then(async res => {
        if (res.ok) {
          message.success('Invoice disputed successfully');
          fetchInvoices();
          setIsDisputeModalVisible(false);
          setSelectedInvoice(null);
          setDisputedLineItems({});
        } else {
          const errText = await res.text();
          message.error(errText || 'Failed to submit dispute');
        }
      })
      .catch(() => message.error('Server error occurred'));
  };

  const showModificationModal = (id: string) => {
    setSelectedInvoiceId(id);
    setIsModalVisible(true);
  };

  const handleDownload = async (record: Invoice, format: 'xml' | 'pdf') => {
    try {
      const response = await fetch(`/api/invoices/${record.id}/${format}`, {
        headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
      });
      if (!response.ok) {
        message.error(`Unable to download ${format.toUpperCase()} invoice`);
        return;
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `invoice-${record.invoiceNumber}.${format}`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      message.error(`Unable to download ${format.toUpperCase()} invoice`);
    }
  };

  const columns = [
    { title: 'Invoice ID', dataIndex: 'id', key: 'id', render: (id: string) => id.substring(0, 8) + '...' },
    { title: 'Invoice Number', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId' },
    { title: 'Airline', dataIndex: 'airlineId', key: 'airlineId' },
    { title: 'Airport', dataIndex: 'airportCode', key: 'airportCode' },
    { title: 'Issue Date', dataIndex: 'issueDate', key: 'issueDate' },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate' },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount: number, record: Invoice) => `${amount.toFixed(2)} ${record.currency}` },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'PAID') color = 'success';
        if (status === 'APPROVED') color = 'success';
        if (status === 'SENT') color = 'blue';
        if (status === 'DRAFT') color = 'processing';
        if (status === 'FINALIZED') color = 'cyan';
        if (status === 'MODIFICATION_REQUESTED') color = 'warning';
        if (status === 'DISPUTED') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Invoice) => (
        <Space size="middle">
          {simTenantType === 'GROUND_HANDLER' && (record.status === 'DRAFT' || record.status === 'MODIFICATION_REQUESTED') && (
            <Button size="small" type="primary" onClick={() => handleStatusChange(record.id, 'FINALIZED')}>
              Finalize
            </Button>
          )}
          {simTenantType === 'GROUND_HANDLER' && record.status === 'FINALIZED' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(record.id, 'APPROVED')}>
                Approve
              </Button>
              <Button size="small" danger icon={<ExclamationCircleOutlined />} onClick={() => showModificationModal(record.id)}>
                Request Modification
              </Button>
            </>
          )}
          {simTenantType === 'GROUND_HANDLER' && record.status === 'APPROVED' && (
            <Button size="small" type="dashed" icon={<SendOutlined />} onClick={() => handleStatusChange(record.id, 'SENT')}>
              Send to Airline
            </Button>
          )}
          {simTenantType === 'GROUND_HANDLER' && (record.status === 'SENT' || record.status === 'DISPUTED') && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(record.id, 'PAID')}>
              Mark as Paid
            </Button>
          )}
          {simTenantType === 'AIRLINE' && record.status === 'SENT' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(record.id, 'PAID')}>
                Pay
              </Button>
              <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => {
                setSelectedInvoice(record);
                const initialLineItemsDisputes: { [key: string]: { selected: boolean; category: string; comment: string } } = {};
                record.lineItems.forEach(item => {
                  initialLineItemsDisputes[item.id] = { selected: false, category: 'OPERATIONAL_DATA_MISMATCH', comment: '' };
                });
                setDisputedLineItems(initialLineItemsDisputes);
                setIsDisputeModalVisible(true);
              }}>
                Dispute
              </Button>
            </>
          )}
          {(record.status === 'SENT' || record.status === 'PAID' || record.status === 'DISPUTED') && (
            <>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record, 'xml')}
              >
                XML
              </Button>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record, 'pdf')}
              >
                PDF
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  const expandedRowRender = (record: Invoice) => {
    const itemColumns = [
      { title: 'Flight Date', dataIndex: 'flightDate', key: 'flightDate' },
      { title: 'Flight No', dataIndex: 'flightNumber', key: 'flightNumber' },
      { title: 'Aircraft Reg', dataIndex: 'aircraftReg', key: 'aircraftReg' },
      { title: 'Sector', key: 'sector', render: ((_: any, r: InvoiceLineItem) => `${r.origin}-${r.destination}`) as any },
      { title: 'Charge Code', dataIndex: 'chargeCode', key: 'chargeCode' },
      { title: 'Service Name', dataIndex: 'serviceName', key: 'serviceName' },
      { title: 'Quantity/Drivers', dataIndex: 'quantityDrivers', key: 'quantityDrivers' },
      { title: 'Calculated Amount', dataIndex: 'calculatedAmount', key: 'calculatedAmount', render: (amount: number) => amount.toFixed(2) },
      {
        title: 'Dispute Status',
        key: 'disputeStatus',
        render: ((_: any, r: InvoiceLineItem) => r.disputed ? (
          <Space direction="vertical" size={2}>
            <Tag color="red">{r.disputeCategory?.replace(/_/g, ' ')}</Tag>
            {r.disputeComment && <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{r.disputeComment}</span>}
          </Space>
        ) : null) as any
      }
    ];

    return (
      <div>
        {record.comments && (
          <div style={{ marginBottom: 12, padding: 12, backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4 }}>
            <strong>Modification Request Feedback:</strong> {record.comments}
          </div>
        )}
        <Table 
          columns={itemColumns} 
          dataSource={record.lineItems} 
          pagination={false} 
          rowKey="id" 
        />
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Invoices</Title>
        {simTenantType === 'GROUND_HANDLER' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
            Create Invoice
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={24} style={{ textAlign: 'right' }}>
            <Space wrap>
              <span>Simulate Tenant User:</span>
              <Select value={simTenantId} style={{ width: 220 }} onChange={handleTenantChange}>
                <Option value="SWISSPORT">Swissport (Ground Handler)</Option>
                <Option value="EK">Emirates (Airline)</Option>
              </Select>
              <span>Access Scope:</span>
              <Select value={simUserId} style={{ width: 250 }} onChange={handlePersonaChange}>
                <Option value={unrestrictedUserId(simTenantId)}>Unrestricted</Option>
                <Option value={scopedUserId(simTenantId)}>DXB / EK / BAGGAGE only</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table 
          columns={columns} 
          dataSource={invoices} 
          rowKey="id"
          expandable={{ expandedRowRender, defaultExpandedRowKeys: [] }}
          locale={{ emptyText: 'No invoices found' }} 
        />
      </Card>

      <Modal
        title="Request Invoice Modification"
        open={isModalVisible}
        onOk={() => selectedInvoiceId && handleStatusChange(selectedInvoiceId, 'MODIFICATION_REQUESTED', modificationComments)}
        onCancel={() => {
          setIsModalVisible(false);
          setModificationComments('');
          setSelectedInvoiceId(null);
        }}
        okText="Submit Request"
        cancelText="Cancel"
      >
        <div style={{ marginBottom: 16 }}>
          <p>Please enter details/reasons for requesting modification of this invoice:</p>
          <TextArea
            rows={4}
            value={modificationComments}
            onChange={(e) => setModificationComments(e.target.value)}
            placeholder="Type comments/reasons here..."
          />
        </div>
      </Modal>

      <Modal
        title={`Dispute Invoice ${selectedInvoice?.invoiceNumber}`}
        open={isDisputeModalVisible}
        width={800}
        onOk={handleDisputeSubmit}
        onCancel={() => {
          setIsDisputeModalVisible(false);
          setSelectedInvoice(null);
          setDisputedLineItems({});
        }}
        okText="Submit Dispute"
        cancelText="Cancel"
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }}>
          <p>Select the line items you wish to dispute and provide details:</p>
          {selectedInvoice?.lineItems.map(item => {
            const isChecked = disputedLineItems[item.id]?.selected || false;
            return (
              <Card key={item.id} size="small" style={{ marginBottom: 12, border: isChecked ? '1px solid #ff4d4f' : '1px solid #f0f0f0' }}>
                <Row gutter={16} align="middle">
                  <Col span={2}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                      onChange={e => {
                        setDisputedLineItems(prev => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            selected: e.target.checked
                          }
                        }));
                      }}
                    />
                  </Col>
                  <Col span={22}>
                    <div>
                      <strong>{item.flightNumber}</strong> ({item.flightDate}) | {item.origin}-{item.destination} | {item.serviceName}
                    </div>
                    <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                      Amount: {item.calculatedAmount.toFixed(2)} {selectedInvoice.currency}
                    </div>

                    {isChecked && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: 'block', marginBottom: 4 }}><strong>Dispute Category:</strong></label>
                          <Select
                            value={disputedLineItems[item.id]?.category}
                            style={{ width: '100%' }}
                            onChange={val => {
                              setDisputedLineItems(prev => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  category: val
                                }
                              }));
                            }}
                          >
                            <Option value="OPERATIONAL_DATA_MISMATCH">Operational data mismatch</Option>
                            <Option value="CONTRACT_RATE_FORMULA_MISMATCH">Contract rate/formula mismatch</Option>
                            <Option value="EXCHANGE_RATE_MISMATCH">Exchange rate mismatch</Option>
                            <Option value="REFERENCED_FLIGHT_DOES_NOT_BELONG_TO_THE_AIRLINE">Referenced flight does not belong to the airline</Option>
                            <Option value="MISCELLANEOUS">Miscellaneous</Option>
                          </Select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4 }}><strong>Reason / Comments:</strong></label>
                          <TextArea
                            rows={2}
                            placeholder="Provide details of the dispute..."
                            value={disputedLineItems[item.id]?.comment}
                            onChange={e => {
                              setDisputedLineItems(prev => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  comment: e.target.value
                                }
                              }));
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default InvoicesList;
