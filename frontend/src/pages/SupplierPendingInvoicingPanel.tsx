import React, { useEffect, useState } from 'react';
import { Alert, Empty, Spin, Table } from 'antd';
import axios from 'axios';
import { Clock3 } from 'lucide-react';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

interface PendingItem {
  operationalFlightId: string;
  flightNumber: string;
  flightDate: string;
  billingDueDate: string;
  airlineId: string;
  airportCode: string;
  serviceType: string;
  billingFrequency: string;
  currency: string;
  pendingAmount: number;
}

interface PendingResponse {
  summaries: { currency: string; totalPending: number; itemCount: number }[];
  byAirline: { key: string; currency: string; totalPending: number; itemCount: number }[];
  byAirport: { key: string; currency: string; totalPending: number; itemCount: number }[];
  items: PendingItem[];
}

interface Props {
  airlineId?: string;
  airportCode?: string;
  startDate?: string;
  endDate?: string;
}

const SupplierPendingInvoicingPanel: React.FC<Props> = ({ airlineId, airportCode, startDate, endDate }) => {
  const [data, setData] = useState<PendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const tenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const tenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
  const userId = getSimulatedUserId(tenantId);

  useEffect(() => {
    setLoading(true);
    setError(false);
    axios.get('/api/dashboard/pending-invoicing', {
      headers: simulatedAuthHeaders(tenantId, tenantType, userId),
      params: { airlineId, airportCode, startDate, endDate },
    }).then(response => setData(response.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tenantId, tenantType, userId, airlineId, airportCode, startDate, endDate]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden" data-testid="pending-invoicing">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 m-0">Pending Invoicing</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1 mb-0">Due flight services not yet linked to an invoice</p>
      </div>
      {loading ? <div className="p-10 text-center"><Spin /></div> : error ?
        <div className="p-5"><Alert type="error" message="Pending invoicing could not be loaded" /></div> : data && <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5" data-testid="pending-summaries">
            {data.summaries.map(summary => <div key={summary.currency} className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <div className="text-xs font-bold text-amber-700">{summary.currency}</div>
              <div className="font-mono text-xl font-bold text-slate-900">{summary.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-slate-500">{summary.itemCount} due services</div>
            </div>)}
            {data.summaries.length === 0 && <Empty description="No due uninvoiced services" />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 pb-5 text-xs">
            <Breakdown title="By airline" rows={data.byAirline} />
            <Breakdown title="By airport" rows={data.byAirport} />
          </div>
          <Table rowKey={row => `${row.operationalFlightId}-${row.serviceType}`} dataSource={data.items} pagination={{ pageSize: 10 }} size="small"
            locale={{ emptyText: <Empty description="No pending flight services" /> }}
            columns={[
              { title: 'Flight', dataIndex: 'flightNumber' },
              { title: 'Flight date', dataIndex: 'flightDate' },
              { title: 'Due', dataIndex: 'billingDueDate' },
              { title: 'Airline', dataIndex: 'airlineId' },
              { title: 'Airport', dataIndex: 'airportCode' },
              { title: 'Service', dataIndex: 'serviceType' },
              { title: 'Frequency', dataIndex: 'billingFrequency' },
              { title: 'Pending', render: (_, row) => `${row.currency} ${row.pendingAmount.toFixed(2)}` },
            ]} />
        </>}
    </section>
  );
};

const Breakdown = ({ title, rows }: { title: string; rows: PendingResponse['byAirline'] }) => <div>
  <div className="font-bold text-slate-700 mb-2">{title}</div>
  <div className="space-y-1">{rows.map(row => <div key={`${row.key}-${row.currency}`} className="flex justify-between rounded bg-slate-50 px-3 py-2">
    <span>{row.key} · {row.itemCount}</span><span className="font-mono font-bold">{row.currency} {row.totalPending.toFixed(2)}</span>
  </div>)}</div>
</div>;

export default SupplierPendingInvoicingPanel;
