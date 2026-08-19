import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, message, Popconfirm, Select, Spin, Table, Tooltip, Modal, Input } from 'antd';
const { Option } = Select;
import type { TableColumnsType } from 'antd';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import { 
  CreditCard, 
  CheckCircle2, 
  Download, 
  Globe, 
  Filter, 
  FileText, 
  Clock, 
  Scale, 
  RefreshCw, 
  Layers,
  Send,
  Check,
  AlertTriangle
} from 'lucide-react';

interface InvoiceLineItem {
  id: string;
  flightDate: string;
  flightNumber: string;
  aircraftReg: string;
  origin: string;
  destination: string;
  chargeCode: string;
  serviceName: string;
  quantityDrivers: string;
  calculatedAmount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  airlineId: string;
  airportCode: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'SENT' | 'PAID' | 'DISPUTED';
  totalAmount: number;
  comments?: string;
  lineItems: InvoiceLineItem[];
}

interface AirportOption {
  iataCode: string;
  name: string;
}

interface ChargeCodeOption {
  code: string;
  displayName: string;
}

const AirlineInvoices: React.FC = () => {
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [chargeCodes, setChargeCodes] = useState<ChargeCodeOption[]>([]);
  const [airportCode, setAirportCode] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [status, setStatus] = useState<Invoice['status']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeInvoiceTarget, setDisputeInvoiceTarget] = useState<Invoice | null>(null);
  const [disputeCategory, setDisputeCategory] = useState<string>('OPERATIONAL_DATA_MISMATCH');
  const [disputeComment, setDisputeComment] = useState<string>('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

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
  }, [headers]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams();
    if (airportCode) params.set('airportCode', airportCode);
    if (serviceType) params.set('serviceType', serviceType);
    if (status) params.set('status', status);
    try {
      const query = params.toString();
      const response = await fetch(`/api/invoices${query ? `?${query}` : ''}`, { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit invoice viewing.'
          : 'Invoices could not be loaded.');
      }
      setInvoices(await response.json());
    } catch (requestError) {
      setInvoices([]);
      setError(requestError instanceof Error ? requestError.message : 'Invoices could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, headers, serviceType, status]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const downloadDocument = async (invoice: Invoice, format: 'xml' | 'pdf') => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/${format}`, { headers });
      if (!response.ok) throw new Error();
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `invoice-${invoice.invoiceNumber}.${format}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      message.error(`Unable to download ${format.toUpperCase()} invoice`);
    }
  };

  const markAsPaid = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/status?status=PAID`, {
        method: 'PUT',
        headers,
      });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role or access scope does not permit payment updates.'
          : 'The invoice could not be marked as paid.');
      }
      message.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
      await loadInvoices();
    } catch (requestError) {
      message.error(requestError instanceof Error
        ? requestError.message
        : 'The invoice could not be marked as paid.');
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeInvoiceTarget) return;
    if (!disputeComment.trim()) {
      message.warning('Please enter a dispute comment explaining the reason.');
      return;
    }

    setSubmittingDispute(true);
    try {
      const lineItemReqs = disputeInvoiceTarget.lineItems && disputeInvoiceTarget.lineItems.length > 0
        ? disputeInvoiceTarget.lineItems.map(item => ({
            lineItemId: item.id,
            category: disputeCategory,
            comment: disputeComment.trim()
          }))
        : [{
            lineItemId: 'li-1',
            category: disputeCategory,
            comment: disputeComment.trim()
          }];

      const res = await fetch(`/api/disputes/invoice/${disputeInvoiceTarget.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          lineItems: lineItemReqs
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to raise dispute');
      }

      message.success(`Dispute raised on invoice ${disputeInvoiceTarget.invoiceNumber}`);
      setDisputeModalVisible(false);
      setDisputeComment('');
      await loadInvoices();
    } catch (err: any) {
      message.error(err.message || 'Error raising dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const totalVol = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
    const paidVol = paidInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const sentInvoices = invoices.filter(inv => inv.status === 'SENT');
    const sentVol = sentInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const disputedInvoices = invoices.filter(inv => inv.status === 'DISPUTED');
    const disputedVol = disputedInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    return {
      totalCount,
      totalVol,
      paidCount: paidInvoices.length,
      paidVol,
      sentCount: sentInvoices.length,
      sentVol,
      disputedCount: disputedInvoices.length,
      disputedVol
    };
  }, [invoices]);

  const renderStatusBadge = (statusVal: Invoice['status']) => {
    switch (statusVal) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PAID
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs animate-pulse">
            <Scale className="w-3.5 h-3.5 text-rose-600" />
            Disputed / Audit
          </span>
        );
      case 'SENT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            Dispatched to Airline
          </span>
        );
    }
  };

  const columns: TableColumnsType<Invoice> = [
    { 
      title: 'INVOICE NUMBER', 
      dataIndex: 'invoiceNumber', 
      key: 'invoiceNumber',
      render: (invoiceNumber: string) => (
        <span className="font-mono text-sm font-bold text-slate-900 tracking-tight hover:text-blue-600 transition-colors">
          {invoiceNumber}
        </span>
      )
    },
    { 
      title: 'SUPPLIER HANDLER', 
      dataIndex: 'supplierId', 
      key: 'supplierId',
      render: (supplierId: string) => (
        <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
          {supplierId}
        </span>
      )
    },
    { 
      title: 'ICAO / IATA HUB', 
      dataIndex: 'airportCode', 
      key: 'airportCode',
      render: (airportCode: string) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded tracking-wider inline-flex items-center gap-1">
          <Globe className="w-3 h-3 text-slate-500" />
          {airportCode}
        </span>
      )
    },
    { 
      title: 'ISSUE DATE', 
      dataIndex: 'issueDate', 
      key: 'issueDate',
      render: (date: string) => <span className="font-mono text-xs text-slate-600">{date}</span>
    },
    { 
      title: 'DUE DATE', 
      dataIndex: 'dueDate', 
      key: 'dueDate',
      render: (date: string) => <span className="font-mono text-xs font-semibold text-slate-700">{date}</span>
    },
    {
      title: 'TOTAL AMOUNT',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (amount, invoice) => (
        <div className="text-right">
          <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
            {Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-xs font-semibold text-slate-500 ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
            {invoice.currency}
          </span>
        </div>
      ),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (value: Invoice['status']) => renderStatusBadge(value),
    },
    {
      title: 'DOCUMENTS',
      key: 'documents',
      render: (_, invoice) => (
        <div className="flex items-center gap-1.5">
          <Tooltip title="Download GHCP invoice XML format">
            <Button
              size="small"
              aria-label={`Download XML ${invoice.invoiceNumber}`}
              className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !border-slate-300 !font-mono !text-[11px] !font-semibold !inline-flex !items-center !gap-1 !rounded-md !px-2 !h-7"
              onClick={() => downloadDocument(invoice, 'xml')}
            >
              <Download className="w-3 h-3 text-slate-500" />
              XML
            </Button>
          </Tooltip>
          <Tooltip title="Download PDF printable invoice">
            <Button
              size="small"
              aria-label={`Download PDF ${invoice.invoiceNumber}`}
              className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !border-slate-300 !font-mono !text-[11px] !font-semibold !inline-flex !items-center !gap-1 !rounded-md !px-2 !h-7"
              onClick={() => downloadDocument(invoice, 'pdf')}
            >
              <Download className="w-3 h-3 text-slate-500" />
              PDF
            </Button>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'ACTIONS & PAYMENT CLEARANCE',
      key: 'payment',
      align: 'right' as const,
      render: (_, invoice) => (
        <div className="flex items-center justify-end gap-2">
          {invoice.status === 'SENT' && (
            <Button
              size="small"
              danger
              icon={<Scale className="w-3.5 h-3.5" />}
              className="!bg-rose-50 hover:!bg-rose-100 !text-rose-700 !border-rose-300 !font-semibold !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7 cursor-pointer"
              onClick={() => {
                setDisputeInvoiceTarget(invoice);
                setDisputeModalVisible(true);
              }}
            >
              Raise Dispute
            </Button>
          )}

          {invoice.status === 'SENT' || invoice.status === 'DISPUTED' ? (
            <Popconfirm
              title="Confirm Payout Clearance"
              description="Mark invoice as paid? This status update is immediately visible to the supplier."
              okText="Mark Paid"
              cancelText="Cancel"
              onConfirm={() => markAsPaid(invoice)}
              okButtonProps={{ className: "!bg-emerald-600 hover:!bg-emerald-700 !text-white !text-xs" }}
            >
              <Button 
                type="primary" 
                size="small"
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-3 !h-7"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark as Paid
              </Button>
            </Popconfirm>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Paid
            </span>
          )}
        </div>
      ),
    },
  ];

  const getInvoiceCommentsConfig = (status: string) => {
    switch (status) {
      case 'MODIFICATION_REQUESTED':
        return {
          title: 'Modification Request Feedback',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
          containerClass: 'bg-amber-50 border-amber-200/90 text-amber-900',
          titleClass: 'text-amber-950',
          textClass: 'text-amber-900',
        };
      case 'DISPUTED':
        return {
          title: 'Dispute & Audit Remarks',
          icon: <Scale className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
          containerClass: 'bg-rose-50 border-rose-200/90 text-rose-900',
          titleClass: 'text-rose-950',
          textClass: 'text-rose-900',
        };
      case 'APPROVED':
        return {
          title: 'Approval Remarks',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
          containerClass: 'bg-emerald-50/80 border-emerald-200/90 text-emerald-900',
          titleClass: 'text-emerald-950',
          textClass: 'text-emerald-900',
        };
      case 'SENT':
        return {
          title: 'Dispatch & Delivery Remarks',
          icon: <Send className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
          containerClass: 'bg-blue-50/80 border-blue-200/90 text-blue-900',
          titleClass: 'text-blue-950',
          textClass: 'text-blue-900',
        };
      case 'PAID':
        return {
          title: 'Payment & Settlement Remarks',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
          containerClass: 'bg-emerald-50/80 border-emerald-200/90 text-emerald-900',
          titleClass: 'text-emerald-950',
          textClass: 'text-emerald-900',
        };
      case 'DRAFT':
      case 'FINALIZED':
      default:
        return {
          title: 'Invoice Remarks & Notes',
          icon: <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />,
          containerClass: 'bg-slate-100/90 border-slate-200 text-slate-800',
          titleClass: 'text-slate-900',
          textClass: 'text-slate-700',
        };
    }
  };

  const lineColumns: TableColumnsType<InvoiceLineItem> = [
    { 
      title: 'FLIGHT DATE', 
      dataIndex: 'flightDate', 
      key: 'flightDate',
      render: (date: string) => <span className="font-mono text-xs text-slate-600">{date}</span>
    },
    { 
      title: 'FLIGHT NO', 
      dataIndex: 'flightNumber', 
      key: 'flightNumber',
      render: (fn: string) => (
        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200/90 shadow-2xs">
          {fn}
        </span>
      )
    },
    { 
      title: 'AIRCRAFT REG', 
      dataIndex: 'aircraftReg', 
      key: 'aircraftReg',
      render: (reg: string) => (
        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-medium">
          {reg}
        </span>
      )
    },
    { 
      title: 'CHARGE CODE', 
      dataIndex: 'chargeCode', 
      key: 'chargeCode',
      render: (code: string) => (
        <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
          {code}
        </span>
      )
    },
    { 
      title: 'SERVICE DESCRIPTION', 
      dataIndex: 'serviceName', 
      key: 'serviceName',
      render: (name: string) => <span className="text-xs font-medium text-slate-800">{name}</span>
    },
    {
      title: 'SECTOR',
      key: 'sector',
      render: (_, item) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded tracking-tight">
          {item.origin}–{item.destination}
        </span>
      ),
    },
    {
      title: 'AMOUNT',
      dataIndex: 'calculatedAmount',
      key: 'calculatedAmount',
      align: 'right' as const,
      render: value => (
        <span className="font-mono text-xs font-bold text-slate-900 text-right">
          {Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                  My Invoices & Dispatched Billing
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Airline Portal ({tenantId})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Invoices dispatched directly to {tenantId}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Tenant & dimensional scope enforced automatically</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            className="!inline-flex !items-center !gap-2 !bg-white hover:!bg-slate-50 !text-slate-700 !border-slate-300 !font-medium !text-xs !rounded-lg !px-3.5 !py-2 !h-9 shadow-xs"
            onClick={loadInvoices}
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Data
          </Button>
        </div>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Summary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Dispatched</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{metrics.totalCount}</span>
              <span className="text-xs font-mono font-semibold text-slate-500">
                (${metrics.totalVol.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Invoices received from handlers</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Cleared / Paid</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-600">{metrics.paidCount}</span>
              <span className="text-xs font-mono font-semibold text-emerald-700">
                (${metrics.paidVol.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <span className="text-[11px] text-emerald-600/80 mt-1 block">Settled invoice payouts</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Awaiting Payment</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-blue-600">{metrics.sentCount}</span>
              <span className="text-xs font-mono font-semibold text-blue-700">
                (${metrics.sentVol.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <span className="text-[11px] text-blue-600/80 mt-1 block">Pending approval & payout</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Under Audit / Dispute</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-rose-600">{metrics.disputedCount}</span>
              <span className="text-xs font-mono font-semibold text-rose-700">
                (${metrics.disputedVol.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <span className="text-[11px] text-rose-600/80 mt-1 block">Operational SLA mismatch</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Invoices</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Station / Airport Hub</label>
            <Select
              data-testid="invoice-airport-filter"
              aria-label="Invoice airport filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All airports"
              value={airportCode}
              onChange={setAirportCode}
              className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-slate-300"
              options={airports.map(airport => ({
                value: airport.iataCode,
                label: `${airport.iataCode} — ${airport.name}`,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Service / Charge Type</label>
            <Select
              data-testid="invoice-service-filter"
              aria-label="Invoice service type filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All service types"
              value={serviceType}
              onChange={setServiceType}
              className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-slate-300"
              options={chargeCodes.map(chargeCode => ({
                value: chargeCode.code,
                label: `${chargeCode.code} — ${chargeCode.displayName}`,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dispatched Status</label>
            <Select
              data-testid="invoice-status-filter"
              aria-label="Invoice status filter"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All dispatched statuses"
              value={status}
              onChange={setStatus}
              className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-slate-300"
              options={['SENT', 'PAID', 'DISPUTED'].map(value => ({ value, label: value }))}
            />
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={invoices}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, className: "px-4 py-2" }}
            rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer"}
            className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!text-xs [&_.ant-table-tbody_td]:!border-slate-100"
            locale={{ 
              emptyText: (
                <div className="py-12 text-center space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600 m-0">No dispatched invoices match your access and filters</p>
                  <p className="text-xs text-slate-400 m-0">Adjust station code or status filters to view records</p>
                </div>
              ) 
            }}
            expandable={{
              expandedRowRender: invoice => (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-inner space-y-3">
                  {invoice.comments && (() => {
                    const config = getInvoiceCommentsConfig(invoice.status);
                    return (
                      <div className={`p-3 border rounded-lg flex items-start gap-2.5 text-xs shadow-2xs ${config.containerClass}`}>
                        {config.icon}
                        <div>
                          <strong className={`font-semibold ${config.titleClass}`}>{config.title}:</strong>
                          <p className={`mt-0.5 ${config.textClass}`}>{invoice.comments}</p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between px-1 pb-1">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                        Turnaround Flight Line Items ({invoice.lineItems.length})
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      Invoice Currency: <strong className="text-slate-800 font-bold">{invoice.currency}</strong>
                    </span>
                  </div>
                  <Table
                    columns={lineColumns}
                    dataSource={invoice.lineItems}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    className="[&_.ant-table-thead_th]:!bg-slate-100/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-2 [&_.ant-table-tbody_td]:!border-slate-200/60 rounded-lg overflow-hidden border border-slate-200"
                  />
                </div>
              ),
            }}
          />
        </Spin>
      </div>

      {/* Raise Dispute Modal */}
      <Modal
        open={disputeModalVisible}
        onCancel={() => setDisputeModalVisible(false)}
        onOk={handleRaiseDispute}
        confirmLoading={submittingDispute}
        okText="Submit Dispute"
        okButtonProps={{ className: '!bg-rose-600 hover:!bg-rose-700 !text-white !text-xs !font-bold' }}
        cancelButtonProps={{ className: '!text-xs' }}
        title={
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 pr-6">
            <Scale className="w-5 h-5 text-rose-600" />
            <span className="font-extrabold text-slate-900 text-sm">
              Raise Dispute on Invoice #{disputeInvoiceTarget?.invoiceNumber}
            </span>
          </div>
        }
      >
        <div className="space-y-4 pt-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Dispute Reason Category:</label>
            <Select
              value={disputeCategory}
              onChange={(val) => setDisputeCategory(val)}
              className="w-full text-xs"
            >
              <Option value="OPERATIONAL_DATA_MISMATCH">Operational data mismatch</Option>
              <Option value="CONTRACT_RATE_FORMULA_MISMATCH">Contract rate/formula mismatch</Option>
              <Option value="EXCHANGE_RATE_MISMATCH">Exchange rate mismatch</Option>
              <Option value="REFERENCED_FLIGHT_DOES_NOT_BELONG_TO_THE_AIRLINE">Referenced flight does not belong to airline</Option>
              <Option value="MISCELLANEOUS">Miscellaneous</Option>
            </Select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Dispute Explanation & Comments:</label>
            <Input.TextArea
              rows={3}
              placeholder="Provide detailed justification for the dispute..."
              value={disputeComment}
              onChange={(e) => setDisputeComment(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default AirlineInvoices;
