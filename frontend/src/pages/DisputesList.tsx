import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Select, Button, Input, Tabs } from 'antd';
import { 
  Scale, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle
} from 'lucide-react';
import DisputeDetailModal, { DisputeItem } from './DisputeDetailModal';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Option } = Select;

const DisputesList: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [selectedAirline, setSelectedAirline] = useState<string | undefined>();
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>();
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const tenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const tenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
  const userId = getSimulatedUserId(tenantId);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/disputes', {
        headers: simulatedAuthHeaders(tenantId, tenantType, userId),
      });
      if (res.ok) {
        const data = await res.json();
        setDisputes(data || []);
      } else {
        setDisputes([]);
      }
    } catch (err) {
      console.error(err);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [tenantId, tenantType, userId]);

  // Metric Computations (SDR1 / ADR1)
  const totalDisputedAmount = disputes.reduce((sum, d) => sum + (d.disputedAmount || 0), 0);
  const totalCreditNoteAmount = disputes.reduce((sum, d) => sum + (d.creditNoteAmount || 0), 0);
  const openDisputesCount = disputes.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW' || d.status === 'RESPONDED').length;
  const resolvedDisputesCount = disputes.filter(d => d.status === 'ACCEPTED' || d.status === 'RESOLVED').length;

  const filteredDisputes = disputes.filter(d => {
    if (activeTab === 'OPEN' && !(d.status === 'OPEN' || d.status === 'UNDER_REVIEW')) return false;
    if (activeTab === 'RESPONDED' && d.status !== 'RESPONDED') return false;
    if (activeTab === 'RESOLVED' && !(d.status === 'ACCEPTED' || d.status === 'RESOLVED')) return false;
    if (selectedAirline && d.airlineId !== selectedAirline) return false;
    if (selectedAirport && d.airportCode !== selectedAirport) return false;
    if (searchText) {
      const query = searchText.toLowerCase();
      const matchNumber = d.disputeNumber?.toLowerCase().includes(query);
      const matchInvoice = d.invoiceNumber?.toLowerCase().includes(query);
      return matchNumber || matchInvoice;
    }
    return true;
  });

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'OPEN': return <Tag color="orange" className="font-semibold">OPEN</Tag>;
      case 'UNDER_REVIEW': return <Tag color="blue" className="font-semibold">UNDER REVIEW</Tag>;
      case 'RESPONDED': return <Tag color="purple" className="font-semibold">RESPONDED</Tag>;
      case 'ACCEPTED':
      case 'RESOLVED': return <Tag color="green" className="font-semibold">ACCEPTED / RESOLVED</Tag>;
      case 'REJECTED': return <Tag color="red" className="font-semibold">REJECTED</Tag>;
      case 'ESCALATED': return <Tag color="magenta" className="font-semibold">ESCALATED</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Dispute Number',
      dataIndex: 'disputeNumber',
      key: 'disputeNumber',
      render: (text: string, record: DisputeItem) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs">{text}</span>
          <span className="text-[10px] text-slate-400 block font-mono">Invoice #{record.invoiceNumber}</span>
        </div>
      )
    },
    {
      title: 'Scope (Airline / Station)',
      key: 'scope',
      render: (_: any, record: DisputeItem) => (
        <span className="text-xs font-semibold text-slate-800 font-mono">
          {record.airlineId} • {record.airportCode}
        </span>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => (
        <span className="text-xs font-medium text-slate-700">{cat ? cat.replace(/_/g, ' ') : 'N/A'}</span>
      )
    },
    {
      title: 'Disputed Amount',
      dataIndex: 'disputedAmount',
      key: 'disputedAmount',
      render: (val: number) => (
        <span className="font-mono font-bold text-xs text-red-600">
          ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      title: 'Credit Note Issued',
      dataIndex: 'creditNoteAmount',
      key: 'creditNoteAmount',
      render: (val: number) => (
        <span className="font-mono font-bold text-xs text-emerald-600">
          ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: DisputeItem) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setSelectedDispute(record);
            setModalVisible(true);
          }}
          className="text-blue-600 font-semibold text-xs p-0"
        >
          View Thread & Act
        </Button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 text-amber-400 rounded-2xl shadow-xs shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
              Dispute Management Workspace
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
              Structured SLA & line-item dispute workflow, credit note generation, and settlement tracking
            </p>
          </div>
        </div>

        <span className="px-3 py-1 text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 rounded-xl shadow-xs w-fit shrink-0">
          {tenantId} ({tenantType === 'GROUND_HANDLER' ? 'Ground Handler' : 'Airline'})
        </span>
      </div>

      {/* Metrics Summary Cards (SDR1 / ADR1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!rounded-2xl border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Disputed Exposure</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            ${totalDisputedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Across all open & closed items</span>
        </Card>

        <Card className="!rounded-2xl border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Credit Notes Auto-Issued</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-2">
            ${totalCreditNoteAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">IATA IS-XML compliant credits</span>
        </Card>

        <Card className="!rounded-2xl border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Disputes Queue</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {openDisputesCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Awaiting response or review</span>
        </Card>

        <Card className="!rounded-2xl border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Resolved Disputes</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {resolvedDisputesCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Accepted or settled items</span>
        </Card>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Input 
            prefix={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Search by dispute or invoice number..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-72 text-xs rounded-xl"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Select
              placeholder="All Airlines"
              allowClear
              value={selectedAirline}
              onChange={(val) => setSelectedAirline(val)}
              className="w-36 text-xs"
            >
              <Option value="EK">Emirates (EK)</Option>
              <Option value="LH">Lufthansa (LH)</Option>
              <Option value="QF">Qantas (QF)</Option>
            </Select>

            <Select
              placeholder="All Stations"
              allowClear
              value={selectedAirport}
              onChange={(val) => setSelectedAirport(val)}
              className="w-36 text-xs"
            >
              <Option value="DXB">Dubai (DXB)</Option>
              <Option value="LHR">London (LHR)</Option>
              <Option value="SYD">Sydney (SYD)</Option>
            </Select>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key)}
          className="[&_.ant-tabs-nav]:!m-0 text-xs font-semibold"
          items={[
            { key: 'ALL', label: `All Disputes (${disputes.length})` },
            { key: 'OPEN', label: `Open (${openDisputesCount})` },
            { key: 'RESPONDED', label: 'Responded' },
            { key: 'RESOLVED', label: `Resolved (${resolvedDisputesCount})` }
          ]}
        />

        {/* Disputes Table */}
        <Table 
          columns={columns}
          dataSource={filteredDisputes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-tbody_td]:!text-xs"
        />
      </div>

      {/* Resolution Thread Modal */}
      <DisputeDetailModal 
        visible={modalVisible}
        dispute={selectedDispute}
        onClose={() => setModalVisible(false)}
        onRefresh={fetchDisputes}
      />
    </div>
  );
};

export default DisputesList;
