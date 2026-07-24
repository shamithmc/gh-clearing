import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSimulatedUserId, unrestrictedUserId } from '../utils/simulatedAuth';
import AirlineBilledAmountsPanel from './AirlineBilledAmountsPanel';
import AirlineExpectedBillingPanel from './AirlineExpectedBillingPanel';
import AirlineContractExpiryPanel from './AirlineContractExpiryPanel';
import AirlineCurrentFootprintPanel from './AirlineCurrentFootprintPanel';
import { 
  FileText, 
  Receipt, 
  Scale, 
  ArrowRight, 
  ShieldCheck, 
  Plane
} from 'lucide-react';

const workspaceItems = [
  {
    title: 'Contracts',
    description: 'View supplier contracts, rate cards, and follow contract review activity.',
    path: '/airline/contracts',
    icon: <FileText className="w-6 h-6 text-blue-600" />,
    availability: 'Read-only contract access',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    title: 'Invoices',
    description: 'Review dispatched invoices, IATA XML documents, and payment status.',
    path: '/airline/invoices',
    icon: <Receipt className="w-6 h-6 text-emerald-600" />,
    availability: 'Dispatched invoice access',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    title: 'Disputes',
    description: 'Track operational invoice queries and line-level SLA dispute resolution.',
    path: '/disputes',
    icon: <Scale className="w-6 h-6 text-purple-600" />,
    availability: 'Line-item SLA audit clearance',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
  },
];

const AirlineDashboard: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = localStorage.getItem('simTenantType') === 'AIRLINE'
    ? localStorage.getItem('simTenantId') || 'EK'
    : 'EK';

  useEffect(() => {
    localStorage.setItem('simTenantId', tenantId);
    localStorage.setItem('simTenantType', 'AIRLINE');
    setSimulatedUserId(unrestrictedUserId(tenantId));
  }, [tenantId]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                  Airline Workspace
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                  {tenantId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0">
                Your airline and dimensional access are applied automatically
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium text-slate-700">Airline dimensional access applied automatically</span>
        </div>
      </div>

      {/* Workspace Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workspaceItems.map((item) => (
          <div 
            key={item.title}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {item.icon}
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${item.badgeClass}`}>
                  {item.availability}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 m-0">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-1 m-0">{item.description}</p>
              </div>
            </div>

            <button
              onClick={() => navigate(item.path)}
              className="w-full inline-flex items-center justify-between px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              <span>Open {item.title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Analytics Panels */}
      <div className="space-y-6">
        <AirlineBilledAmountsPanel />
        <AirlineExpectedBillingPanel />
        <AirlineContractExpiryPanel />
        <AirlineCurrentFootprintPanel />
      </div>

    </div>
  );
};

export default AirlineDashboard;
