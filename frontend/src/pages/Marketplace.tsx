import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Select, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';
import { 
  ShoppingBag, 
  Send, 
  Filter, 
  Building2, 
  RefreshCw,
  Layers
} from 'lucide-react';

interface AirportOption {
  iataCode: string;
  name: string;
  region: string;
}

interface ChargeCodeOption {
  code: string;
  displayName: string;
}

interface ServiceOffering {
  id: string;
  supplierId: string;
  airportCode: string;
  airportName: string;
  country: string;
  region: string;
  serviceType: string;
  serviceName: string;
  description: string;
}

const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = localStorage.getItem('simTenantId') || 'EK';
  const userId = getSimulatedUserId(tenantId);
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'AIRLINE', userId),
    [tenantId, userId],
  );
  const [offerings, setOfferings] = useState<ServiceOffering[]>([]);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [chargeCodes, setChargeCodes] = useState<ChargeCodeOption[]>([]);
  const [airportCode, setAirportCode] = useState<string>();
  const [region, setRegion] = useState<string>();
  const [serviceType, setServiceType] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadOfferings = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams();
    if (airportCode) params.set('airportCode', airportCode);
    if (region) params.set('region', region);
    if (serviceType) params.set('serviceType', serviceType);
    try {
      const response = await fetch(`/api/marketplace/offerings?${params.toString()}`, { headers });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Your role does not permit marketplace access.'
          : 'Marketplace offerings could not be loaded.');
      }
      setOfferings(await response.json());
    } catch (requestError) {
      setOfferings([]);
      setError(requestError instanceof Error ? requestError.message : 'Marketplace offerings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [airportCode, headers, region, serviceType]);

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

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const regions = [...new Set(airports.map(airport => airport.region))].sort();

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Service Provider Marketplace
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5 m-0 flex items-center gap-2">
                <span>Discover ground-handler capabilities by station hub</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Initiate structured procurement RFPs</span>
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={loadOfferings}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg px-3.5 py-2 h-9 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh Offerings
        </button>
      </div>

      {error && <Alert type="error" showIcon message={error} className="rounded-xl border-rose-200 bg-rose-50" />}

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Capabilities</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            data-testid="marketplace-region"
            aria-label="Marketplace region"
            allowClear
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All regions"
            value={region}
            options={regions.map(value => ({ value, label: value }))}
            onChange={setRegion}
          />

          <Select
            data-testid="marketplace-airport"
            aria-label="Marketplace airport"
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All airports"
            value={airportCode}
            options={airports.map(airport => ({
              value: airport.iataCode,
              label: `${airport.iataCode} - ${airport.name}`,
            }))}
            onChange={setAirportCode}
          />

          <Select
            data-testid="marketplace-service"
            aria-label="Marketplace service"
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            placeholder="All services"
            value={serviceType}
            options={chargeCodes.map(chargeCode => ({
              value: chargeCode.code,
              label: `${chargeCode.code} - ${chargeCode.displayName}`,
            }))}
            onChange={setServiceType}
          />
        </div>
      </div>

      {/* Marketplace Cards Grid */}
      <Spin spinning={loading}>
        {offerings.length === 0 && !loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 m-0">No service providers match the selected filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="marketplace-results">
            {offerings.map(offering => (
              <div 
                key={offering.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-sm text-slate-900">{offering.supplierId}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                      {offering.region}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-800">
                      {offering.airportCode} - {offering.airportName}, {offering.country}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      <Layers className="w-3 h-3 text-indigo-500" />
                      {offering.serviceType} — {offering.serviceName}
                    </div>
                    <p className="text-xs text-slate-600 m-0 pt-1 leading-relaxed">{offering.description}</p>
                  </div>
                </div>

                <button
                  data-testid={`initiate-rfp-${offering.id}`}
                  onClick={() => navigate(`/airline/rfps?airportCode=${offering.airportCode}&serviceType=${offering.serviceType}`)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Initiate RFP
                </button>
              </div>
            ))}
          </div>
        )}
      </Spin>

    </div>
  );
};

export default Marketplace;
