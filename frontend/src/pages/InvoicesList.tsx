import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Table, Select, Modal, Input, message, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, scopedUserId, setSimulatedUserId, simulatedAuthHeaders, unrestrictedUserId } from '../utils/simulatedAuth';
import { isWorkOsAuthenticated } from '../auth/workosAuth';
import { 
  FilePlus, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Download, 
  Building2, 
  ShieldCheck, 
  DollarSign, 
  Filter, 
  Search, 
  CreditCard, 
  FileText, 
  AlertCircle, 
  Clock,
  ArrowRight,
  Layers,
  Scale,
  Check,
  FileCheck,
  RefreshCw,
  UserCheck,
  Globe,
  Pencil
} from 'lucide-react';

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

interface InvoiceDispatchStatus {
  status: 'QUEUED' | 'GENERATING' | 'FAILED' | 'DELIVERED';
  lastError?: string;
}

const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

const InvoicesList: React.FC = () => {
  const usingWorkOs = isWorkOsAuthenticated();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [simTenantId, setSimTenantId] = useState<string>(localStorage.getItem('simTenantId') || 'SWISSPORT');
  const [simTenantType, setSimTenantType] = useState<string>(localStorage.getItem('simTenantType') || 'GROUND_HANDLER');
  const [simUserId, setSimUserId] = useState<string>(() => getSimulatedUserId(localStorage.getItem('simTenantId') || 'SWISSPORT'));
  
  // Filter & Search states
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states for requesting modifications
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [modificationComments, setModificationComments] = useState('');
  const [dispatchingInvoiceIds, setDispatchingInvoiceIds] = useState<Set<string>>(new Set());

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

  const waitForDispatch = async (id: string): Promise<void> => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const response = await fetch(`/api/invoices/${id}/dispatch`, {
        headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
      });
      if (!response.ok) {
        throw new Error((await response.text()) || 'Unable to read dispatch status');
      }

      const dispatch = await response.json() as InvoiceDispatchStatus;
      if (dispatch.status === 'DELIVERED') return;
      if (dispatch.status === 'FAILED') {
        throw new Error(dispatch.lastError || 'Invoice dispatch failed');
      }
      await wait(500);
    }
    throw new Error('Invoice dispatch is still processing. Refresh to check its status.');
  };

  const handleStatusChange = async (id: string, status: string, comments?: string) => {
    let url = `/api/invoices/${id}/status?status=${status}`;
    if (comments) {
      url += `&comments=${encodeURIComponent(comments)}`;
    }

    if (status === 'SENT') {
      setDispatchingInvoiceIds(current => new Set(current).add(id));
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: simulatedAuthHeaders(simTenantId, simTenantType, simUserId)
      });
      if (!response.ok) {
        throw new Error((await response.text()) || 'Failed to update status');
      }

      if (status === 'SENT') {
        message.info('Invoice dispatch queued');
        await waitForDispatch(id);
      }

      await fetchInvoices();
      message.success(`Invoice status updated to ${status}`);
      setIsModalVisible(false);
      setModificationComments('');
      setSelectedInvoiceId(null);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Server error occurred';
      message.error(detail);
      fetchInvoices();
    } finally {
      if (status === 'SENT') {
        setDispatchingInvoiceIds(current => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    }
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

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const totalVol = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
    const paidVol = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pendingInvoices = invoices.filter(inv => ['DRAFT', 'FINALIZED', 'SENT', 'MODIFICATION_REQUESTED', 'APPROVED'].includes(inv.status));
    const pendingVol = pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const disputedInvoices = invoices.filter(inv => inv.status === 'DISPUTED');
    const disputedVol = disputedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    return {
      totalCount,
      totalVol,
      paidCount: paidInvoices.length,
      paidVol,
      pendingCount: pendingInvoices.length,
      pendingVol,
      disputedCount: disputedInvoices.length,
      disputedVol
    };
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      const q = searchText.toLowerCase().trim();
      const matchesSearch = !q || 
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q) ||
        inv.airportCode.toLowerCase().includes(q) ||
        inv.airlineId.toLowerCase().includes(q) ||
        inv.supplierId.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [invoices, statusFilter, searchText]);

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PAID
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            APPROVED
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            Submitted to Airline
          </span>
        );
      case 'FINALIZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 shadow-xs">
            <FileCheck className="w-3.5 h-3.5 text-sky-600" />
            Finalized
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Draft
          </span>
        );
      case 'MODIFICATION_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Mod Requested
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Disputed / Audit
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const columns = [
    { 
      title: 'INVOICE REF & NO', 
      dataIndex: 'invoiceNumber', 
      key: 'invoiceNumber',
      render: (invoiceNumber: string, record: Invoice) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900 tracking-tight hover:text-blue-600 transition-colors">
              {invoiceNumber}
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 tracking-tight flex items-center gap-1">
            <span className="text-slate-400">ID:</span> {record.id.substring(0, 12)}...
          </span>
        </div>
      )
    },
    { 
      title: 'OPERATIONAL PARTIES', 
      key: 'parties',
      render: (_: any, record: Invoice) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
            {record.supplierId}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
            {record.airlineId}
          </span>
        </div>
      )
    },
    { 
      title: 'ICAO HUB', 
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
      title: 'BILLING TIMELINE', 
      key: 'dates',
      render: (_: any, record: Invoice) => (
        <div className="flex flex-col text-xs font-mono text-slate-600 gap-0.5">
          <span><span className="text-slate-400">Issued:</span> {record.issueDate}</span>
          <span><span className="text-slate-400">Due:</span> <span className="font-semibold text-slate-700">{record.dueDate}</span></span>
        </div>
      )
    },
    { 
      title: 'LEDGER TOTAL', 
      dataIndex: 'totalAmount', 
      key: 'totalAmount', 
      align: 'right' as const,
      render: (amount: number, record: Invoice) => (
        <div className="text-right">
          <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
            {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-xs font-semibold text-slate-500 ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
            {record.currency}
          </span>
        </div>
      ) 
    },
    { 
      title: 'STATUS', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => renderStatusBadge(status)
    },
    {
      title: 'OPERATIONAL ACTIONS',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: Invoice) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {simTenantType === 'GROUND_HANDLER' && (record.status === 'DRAFT' || record.status === 'MODIFICATION_REQUESTED') && (
            <>
              <Button 
                id={`invoice-${record.id}-edit-btn`}
                data-testid="edit-invoice-btn"
                size="small"
                className="!bg-slate-100 hover:!bg-slate-200 !border-slate-300 !text-slate-800 !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                onClick={() => navigate(`/invoices/${record.id}/edit`)}
              >
                <Pencil className="w-3 h-3 text-slate-600" />
                Edit
              </Button>
              <Button 
                id={`invoice-${record.id}-finalize-btn`}
                data-testid="finalize-invoice-btn"
                size="small" 
                type="primary"
                className="!bg-slate-900 hover:!bg-slate-800 !border-slate-900 !text-white !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7 focus:ring-2 focus:ring-slate-900/30"
                onClick={() => handleStatusChange(record.id, 'FINALIZED')}
              >
                <FileCheck className="w-3.5 h-3.5" />
                Finalize
              </Button>
            </>
          )}
          {simTenantType === 'GROUND_HANDLER' && record.status === 'FINALIZED' && (
            <>
              <Button 
                id={`invoice-${record.id}-approve-btn`}
                size="small" 
                type="primary" 
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                onClick={() => handleStatusChange(record.id, 'APPROVED')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </Button>
              <Button 
                id={`invoice-${record.id}-req-mod-btn`}
                size="small" 
                danger 
                className="!bg-rose-50 hover:!bg-rose-100 !text-rose-700 !border-rose-200 !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                onClick={() => showModificationModal(record.id)}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Req Mod
              </Button>
            </>
          )}
          {simTenantType === 'GROUND_HANDLER' && record.status === 'APPROVED' && (
            <Button 
              id={`invoice-${record.id}-send-btn`}
              size="small" 
              loading={dispatchingInvoiceIds.has(record.id)}
              disabled={dispatchingInvoiceIds.has(record.id)}
              className="!bg-blue-50 hover:!bg-blue-100 !text-blue-700 !border-blue-200 !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
              onClick={() => handleStatusChange(record.id, 'SENT')}
            >
              <Send className="w-3.5 h-3.5" />
              Send to Airline
            </Button>
          )}
          {simTenantType === 'GROUND_HANDLER' && (record.status === 'SENT' || record.status === 'DISPUTED') && (
            <Button 
              size="small" 
              type="primary" 
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
              onClick={() => handleStatusChange(record.id, 'PAID')}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Mark Paid
            </Button>
          )}
          {simTenantType === 'AIRLINE' && record.status === 'SENT' && (
            <>
              <Button 
                size="small" 
                type="primary" 
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                onClick={() => handleStatusChange(record.id, 'PAID')}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Pay Invoice
              </Button>
              <Button 
                id={`invoice-${record.id}-dispute-btn`}
                size="small" 
                danger 
                className="!bg-rose-600 hover:!bg-rose-700 !text-white !border-rose-600 !font-medium !text-xs !inline-flex !items-center !gap-1 !rounded-md !px-2.5 !h-7"
                onClick={() => {
                  setSelectedInvoice(record);
                  const initialLineItemsDisputes: { [key: string]: { selected: boolean; category: string; comment: string } } = {};
                  record.lineItems.forEach(item => {
                    initialLineItemsDisputes[item.id] = { selected: false, category: 'OPERATIONAL_DATA_MISMATCH', comment: '' };
                  });
                  setDisputedLineItems(initialLineItemsDisputes);
                  setIsDisputeModalVisible(true);
                }}
              >
                <Scale className="w-3.5 h-3.5" />
                Dispute
              </Button>
            </>
          )}
          {(record.status === 'SENT' || record.status === 'PAID' || record.status === 'DISPUTED') && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-0.5">
              <Tooltip title="Download GHCP invoice XML data file">
                <Button
                  size="small"
                  className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !border-slate-300 !font-mono !text-[11px] !font-semibold !inline-flex !items-center !gap-1 !rounded-md !px-2 !h-7"
                  onClick={() => handleDownload(record, 'xml')}
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  XML
                </Button>
              </Tooltip>
              <Tooltip title="Download PDF printable invoice">
                <Button
                  size="small"
                  className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !border-slate-300 !font-mono !text-[11px] !font-semibold !inline-flex !items-center !gap-1 !rounded-md !px-2 !h-7"
                  onClick={() => handleDownload(record, 'pdf')}
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  PDF
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
      )
    }
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

  const expandedRowRender = (record: Invoice) => {
    const itemColumns = [
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
        title: 'SECTOR', 
        key: 'sector', 
        render: ((_: any, r: InvoiceLineItem) => (
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded tracking-tight">
            {r.origin}-{r.destination}
          </span>
        )) as any 
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
        title: 'FORMULA TYPE', 
        dataIndex: 'formulaType', 
        key: 'formulaType',
        render: (type: string) => (
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded">
            {type}
          </span>
        )
      },
      { 
        title: 'QUANTITY DRIVERS', 
        dataIndex: 'quantityDrivers', 
        key: 'quantityDrivers',
        render: (qd: string) => {
          try {
            const parsed = typeof qd === 'string' ? JSON.parse(qd) : qd;
            return (
              <span className="font-mono text-xs text-slate-600 bg-white p-1 rounded border border-slate-200">
                {Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ')}
              </span>
            );
          } catch {
            return <span className="font-mono text-xs text-slate-400">{qd}</span>;
          }
        }
      },
      { 
        title: 'AMOUNT', 
        dataIndex: 'calculatedAmount', 
        key: 'calculatedAmount',
        align: 'right' as const,
        render: (amt: number) => (
          <span className="font-mono text-xs font-bold text-slate-900">
            {record.currency} {amt.toFixed(2)}
          </span>
        )
      },
      {
        title: 'DISPUTE STATUS',
        key: 'disputeStatus',
        render: ((_: any, r: InvoiceLineItem) => r.disputed ? (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full w-fit">
              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
              {r.disputeCategory?.replace(/_/g, ' ')}
            </span>
            {r.disputeComment && (
              <span className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-200">
                "{r.disputeComment}"
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 font-mono inline-flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-500" /> Operational Verified
          </span>
        )) as any
      }
    ];

    return (
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-inner space-y-3">
        {record.comments && (() => {
          const config = getInvoiceCommentsConfig(record.status);
          return (
            <div className={`p-3 border rounded-lg flex items-start gap-2.5 text-xs shadow-2xs ${config.containerClass}`}>
              {config.icon}
              <div>
                <strong className={`font-semibold ${config.titleClass}`}>{config.title}:</strong>
                <p className={`mt-0.5 ${config.textClass}`}>{record.comments}</p>
              </div>
            </div>
          );
        })()}
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
              Turnaround Flight Line Items ({record.lineItems.length})
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Invoice Currency: <strong className="text-slate-800 font-bold">{record.currency}</strong>
          </span>
        </div>
        <Table 
          columns={itemColumns} 
          dataSource={record.lineItems} 
          pagination={false} 
          rowKey="id" 
          size="small"
          className="[&_.ant-table-thead_th]:!bg-slate-100/90 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-[11px] [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-2 [&_.ant-table-tbody_td]:!border-slate-200/60 rounded-lg overflow-hidden border border-slate-200"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Ground Handling Invoices & Settlements
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Multi-currency aviation billing clearance</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Flight-level SLA verification</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>IATA AHM560 compliant</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            className="!inline-flex !items-center !gap-2 !bg-white hover:!bg-slate-50 !text-slate-700 !border-slate-300 !font-medium !text-xs !rounded-lg !px-3.5 !py-2 !h-9 shadow-xs"
            onClick={fetchInvoices}
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Data
          </Button>

          {simTenantType === 'GROUND_HANDLER' && (
            <Button 
              id="create-invoice-btn"
              type="primary" 
              className="!inline-flex !items-center !gap-2 !bg-blue-600 hover:!bg-blue-700 !text-white !font-semibold !text-xs !rounded-lg !px-4 !py-2 !h-9 shadow-xs focus:ring-2 focus:ring-blue-500/30"
              onClick={() => navigate('/invoices/new')}
            >
              <FilePlus className="w-4 h-4" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{metrics.totalCount}</span>
              <span className="text-xs font-mono font-semibold text-slate-500">
                (${metrics.totalVol.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Active invoice register</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Settled / Paid</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-600">{metrics.paidCount}</span>
              <span className="text-xs font-mono font-semibold text-emerald-700">
                (${metrics.paidVol.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <span className="text-[11px] text-emerald-600/80 mt-1 block">Cleared payouts</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Pending Action</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-blue-600">{metrics.pendingCount}</span>
              <span className="text-xs font-mono font-semibold text-blue-700">
                (${metrics.pendingVol.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <span className="text-[11px] text-blue-600/80 mt-1 block">Draft & Verification pipeline</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">In Dispute</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-rose-600">{metrics.disputedCount}</span>
              <span className="text-xs font-mono font-semibold text-rose-700">
                (${metrics.disputedVol.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <span className="text-[11px] text-rose-600/80 mt-1 block">Operational data mismatch</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Operational Scope & Simulator Toolbar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-blue-400 rounded-lg border border-slate-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Enterprise Access Scope</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                  {simTenantType}
                </span>
              </div>
              <p className="text-xs text-slate-300 m-0">
                {usingWorkOs ? 'Scope enforced from the authenticated WorkOS identity' : 'Simulating active user persona credentials and clearance policies'}
              </p>
            </div>
          </div>

          {!usingWorkOs && <div className="flex flex-wrap items-center gap-4">
            <div id="tenant-select-container" className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">Simulate Tenant:</span>
              <Select 
                id="tenant-select"
                value={simTenantId} 
                className="w-52 [&_.ant-select-selector]:!bg-slate-900 [&_.ant-select-selector]:!border-slate-700 [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-xs" 
                onChange={handleTenantChange}
              >
                <Option value="SWISSPORT">Swissport (Ground Handler)</Option>
                <Option value="EK">Emirates (Airline)</Option>
              </Select>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">Access Scope:</span>
              <Select 
                value={simUserId} 
                className="w-56 [&_.ant-select-selector]:!bg-slate-900 [&_.ant-select-selector]:!border-slate-700 [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-xs" 
                onChange={handlePersonaChange}
              >
                <Option value={unrestrictedUserId(simTenantId)}>Unrestricted Global Access</Option>
                <Option value={scopedUserId(simTenantId)}>DXB / EK / BAGGAGE Scoped</Option>
              </Select>
            </div>
          </div>}

        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar / Controls */}
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search by invoice number, airport code, supplier, or airline..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="!pl-9 !pr-3 !py-1.5 !text-xs !rounded-lg !border-slate-300 focus:!border-blue-500 focus:!ring-2 focus:!ring-blue-500/20"
                allowClear
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Filter Status:</span>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-44 [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-slate-300"
              >
                <Option value="ALL">All Statuses ({invoices.length})</Option>
                <Option value="DRAFT">Draft</Option>
                <Option value="FINALIZED">Finalized</Option>
                <Option value="APPROVED">Approved</Option>
                <Option value="SENT">Sent to Airline</Option>
                <Option value="PAID">Paid / Settled</Option>
                <Option value="MODIFICATION_REQUESTED">Mod Requested</Option>
                <Option value="DISPUTED">Disputed</Option>
              </Select>
            </div>
          </div>
        </div>

        {/* AntD Table */}
        <Table 
          columns={columns} 
          dataSource={filteredInvoices} 
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true, className: "px-4 py-2" }}
          rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer"}
          className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!uppercase [&_.ant-table-thead_th]:!tracking-wider [&_.ant-table-tbody_td]:!py-3 [&_.ant-table-tbody_td]:!text-xs [&_.ant-table-tbody_td]:!border-slate-100"
          expandable={{ 
            expandedRowRender, 
            defaultExpandedRowKeys: [] 
          }}
          locale={{ 
            emptyText: (
              <div className="py-12 text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600 m-0">No matching invoices found</p>
                <p className="text-xs text-slate-400 m-0">Try adjusting your status filter or search parameters</p>
              </div>
            ) 
          }} 
        />
      </div>

      {/* Modal: Request Invoice Modification */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-200 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-base">Request Invoice Modification</span>
          </div>
        }
        open={isModalVisible}
        onOk={() => selectedInvoiceId && handleStatusChange(selectedInvoiceId, 'MODIFICATION_REQUESTED', modificationComments)}
        onCancel={() => {
          setIsModalVisible(false);
          setModificationComments('');
          setSelectedInvoiceId(null);
        }}
        okText="Submit Modification Request"
        cancelText="Cancel"
        okButtonProps={{
          id: "submit-modification-btn",
          className: "!bg-amber-600 hover:!bg-amber-700 !border-amber-600 !text-white !font-semibold !text-xs !rounded-lg"
        }}
        cancelButtonProps={{
          className: "!border-slate-300 !text-slate-700 hover:!bg-slate-50 !text-xs !rounded-lg"
        }}
      >
        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-600 m-0">
            Please provide explicit reasons and feedback for requesting modifications to this ground handling invoice. The handler will be notified to review the line items.
          </p>
          <TextArea
            id="modification-comments-input"
            rows={4}
            value={modificationComments}
            onChange={(e) => setModificationComments(e.target.value)}
            placeholder="Specify missing flight operational data, rate discrepancy, or incorrect service charge..."
            className="!text-xs !rounded-lg !border-slate-300 focus:!border-amber-500 focus:!ring-2 focus:!ring-amber-500/20"
          />
        </div>
      </Modal>

      {/* Modal: Dispute Invoice */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-200 pb-3">
            <Scale className="w-5 h-5 text-rose-600" />
            <div>
              <span className="font-bold text-base">Dispute Invoice Line Items</span>
              <span className="font-mono text-xs text-rose-600 block">
                Ref: {selectedInvoice?.invoiceNumber} ({selectedInvoice?.currency})
              </span>
            </div>
          </div>
        }
        open={isDisputeModalVisible}
        width={850}
        onOk={handleDisputeSubmit}
        onCancel={() => {
          setIsDisputeModalVisible(false);
          setSelectedInvoice(null);
          setDisputedLineItems({});
        }}
        okText="Submit Operational Dispute"
        cancelText="Cancel"
        okButtonProps={{
          id: "submit-dispute-btn",
          className: "!bg-rose-600 hover:!bg-rose-700 !border-rose-600 !text-white !font-semibold !text-xs !rounded-lg"
        }}
        cancelButtonProps={{
          className: "!border-slate-300 !text-slate-700 hover:!bg-slate-50 !text-xs !rounded-lg"
        }}
      >
        <div className="py-3 space-y-4 max-h-[460px] overflow-y-auto pr-1">
          <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="m-0">
              Select specific turnaround flight service line items below to initiate an official audit dispute under IATA settlement rules.
            </p>
          </div>

          {selectedInvoice?.lineItems.map((item, index) => {
            const isChecked = disputedLineItems[item.id]?.selected || false;
            return (
              <div 
                key={item.id} 
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  isChecked 
                    ? 'border-rose-300 bg-rose-50/40 shadow-xs' 
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    id={`dispute-checkbox-${index}`}
                    type="checkbox"
                    checked={isChecked}
                    className="mt-1 w-4 h-4 accent-rose-600 rounded cursor-pointer"
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
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.flightNumber}
                        </span>
                        <span className="font-mono text-xs text-slate-500">({item.flightDate})</span>
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-200/60 px-1.5 py-0.5 rounded">
                          {item.origin}-{item.destination}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {item.calculatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedInvoice.currency}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 font-medium">
                      <span className="text-indigo-600 font-mono font-semibold mr-1">[{item.chargeCode}]</span>
                      {item.serviceName}
                    </div>

                    {isChecked && (
                      <div className="mt-3 pt-3 border-t border-rose-200/80 space-y-3 bg-white p-3 rounded-lg border">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Dispute Reason Category:</label>
                          <Select
                            value={disputedLineItems[item.id]?.category}
                            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
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
                            <Option value="OPERATIONAL_DATA_MISMATCH">Operational data mismatch (flight time / MTOW / payload)</Option>
                            <Option value="CONTRACT_RATE_FORMULA_MISMATCH">Contract rate / formula pricing mismatch</Option>
                            <Option value="EXCHANGE_RATE_MISMATCH">Currency exchange rate mismatch</Option>
                            <Option value="REFERENCED_FLIGHT_DOES_NOT_BELONG_TO_THE_AIRLINE">Referenced flight does not belong to airline</Option>
                            <Option value="MISCELLANEOUS">Miscellaneous / Service non-delivery</Option>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Dispute Explanation & Remarks:</label>
                          <TextArea
                            id={`dispute-comment-${index}`}
                            rows={2}
                            placeholder="Provide specific operational evidence or contract reference..."
                            value={disputedLineItems[item.id]?.comment}
                            className="!text-xs !rounded-lg !border-slate-300 focus:!border-rose-500 focus:!ring-2 focus:!ring-rose-500/20"
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default InvoicesList;
