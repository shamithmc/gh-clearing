import React from 'react';
import { Tag } from 'antd';
import {
  Layers,
  Clock,
  Calendar,
  Plane,
  Coins,
  Network,
  Calculator,
  ShieldCheck,
} from 'lucide-react';
import type { DayOfWeekName } from './types';

interface FormulaReviewCardProps {
  index: number;
  service: any;
  currency: string;
}

const FORMULA_META: Record<
  string,
  { label: string; tagColor: string; icon: React.ReactNode; desc: string }
> = {
  'PF-01': {
    label: 'PF-01: Unit Rate',
    tagColor: 'blue',
    icon: <Coins className="w-3.5 h-3.5" />,
    desc: 'Flat rate multiplied by single operational quantity driver',
  },
  'PF-02': {
    label: 'PF-02: Compound Unit Rate',
    tagColor: 'purple',
    icon: <Network className="w-3.5 h-3.5" />,
    desc: 'Compound rate evaluated across multiple operational quantity drivers',
  },
  'PF-03': {
    label: 'PF-03: Incremental Tiered Volume',
    tagColor: 'cyan',
    icon: <Layers className="w-3.5 h-3.5" />,
    desc: 'Tiered pricing per quantity band (accumulative tier calculations)',
  },
  'PF-04': {
    label: 'PF-04: All-Units Slab Rate',
    tagColor: 'geekblue',
    icon: <Layers className="w-3.5 h-3.5" />,
    desc: 'Entire quantity repriced at the triggered slab threshold rate',
  },
  'PF-05': {
    label: 'PF-05: Time Band Rate',
    tagColor: 'gold',
    icon: <Clock className="w-3.5 h-3.5" />,
    desc: 'Dynamic rate triggered by operation time-of-day (HH:mm)',
  },
  'PF-06': {
    label: 'PF-06: Day-of-Week Rate',
    tagColor: 'green',
    icon: <Calendar className="w-3.5 h-3.5" />,
    desc: 'Scheduled rates varying by day of the week',
  },
  'PF-07': {
    label: 'PF-07: MTOW Aircraft Weight',
    tagColor: 'magenta',
    icon: <Plane className="w-3.5 h-3.5" />,
    desc: 'Rate per metric tonne calculated against aircraft tail MTOW registry',
  },
};

const DAY_ORDER: { key: DayOfWeekName; label: string; short: string }[] = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
];

export const FormulaReviewCard: React.FC<FormulaReviewCardProps> = ({
  index,
  service,
  currency,
}) => {
  const meta = FORMULA_META[service.formulaType] || {
    label: service.formulaType || 'Unknown Formula',
    tagColor: 'default',
    icon: <Calculator className="w-3.5 h-3.5" />,
    desc: 'Custom formula configuration',
  };

  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return '-';
    return `${currency} ${num.toFixed(2)}`;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
            {index + 1}
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 m-0 tracking-tight">
              {service.serviceName || `Service Line #${index + 1}`}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold rounded">
                {service.chargeCode}
              </span>
              <span className="text-[11px] text-slate-400">•</span>
              <span className="text-[11px] text-slate-500">
                Driver: <strong className="text-slate-700">{service.quantityDriver || '-'}</strong> ({service.uom || '-'})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tag color={meta.tagColor} className="!m-0 !px-2.5 !py-1 !text-xs !font-semibold !rounded-lg inline-flex items-center gap-1.5">
            {meta.icon}
            <span>{meta.label}</span>
          </Tag>
        </div>
      </div>

      {/* Structured Formula Breakdown */}
      <div className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-blue-600" />
          <span>Configured Rate Structure</span>
        </div>

        {/* PF-01: Flat Unit Rate */}
        {service.formulaType === 'PF-01' && (
          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-600">
              Base Unit Rate per <strong className="text-slate-900">{service.uom || 'Unit'}</strong>:
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {formatCurrency(service.rate)} / {service.uom || 'unit'}
            </div>
          </div>
        )}

        {/* PF-02: Compound Multi-Driver */}
        {service.formulaType === 'PF-02' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-600">Base Compound Rate:</div>
              <div className="text-sm font-bold text-purple-700 font-mono">
                {formatCurrency(service.rate)}
              </div>
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
              <span>Multiplication Drivers:</span>
              {(service.quantityDriver ? service.quantityDriver.split(',') : []).map((d: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-mono font-semibold rounded-md"
                >
                  {d.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PF-03 / PF-04: Tiers Table */}
        {(service.formulaType === 'PF-03' || service.formulaType === 'PF-04') && (
          <div className="space-y-2">
            <div className="text-xs text-slate-600 font-medium">
              {service.formulaType === 'PF-03' ? 'Incremental Tiers' : 'All-Units Slabs'}:
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2 pl-3">Tier #</th>
                    <th className="p-2">
                      {service.formulaType === 'PF-03' ? 'Quantity Range' : 'Volume Threshold'}
                    </th>
                    <th className="p-2 pr-3 text-right">Applicable Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(service.tiers || []).map((tier: any, i: number) => {
                    const isTerminal = tier.isTerminal || tier.upto === null || tier.upto === '';
                    const prevUpto = i > 0 ? service.tiers[i - 1].upto : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2 pl-3 font-semibold text-slate-500">Tier {i + 1}</td>
                        <td className="p-2 font-mono">
                          {service.formulaType === 'PF-03' ? (
                            isTerminal ? (
                              <span>&gt; {prevUpto} (Open ∞)</span>
                            ) : (
                              <span>{prevUpto} – {tier.upto} {service.uom}</span>
                            )
                          ) : isTerminal ? (
                            <span>&gt; {prevUpto} (Open ∞)</span>
                          ) : (
                            <span>≤ {tier.upto} {service.uom}</span>
                          )}
                        </td>
                        <td className="p-2 pr-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(tier.rate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PF-05: Time Bands */}
        {service.formulaType === 'PF-05' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-600 font-medium">Configured Time Bands:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(service.timeBands || []).map((tb: any, i: number) => {
                const isOvernight = tb.start && tb.end && tb.end < tb.start;
                return (
                  <div
                    key={i}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {tb.start} – {tb.end}
                      </span>
                      {isOvernight && (
                        <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[10px] rounded font-semibold">
                          Overnight
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900">
                      {formatCurrency(tb.rate)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PF-06: Day Rates */}
        {service.formulaType === 'PF-06' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-600 font-medium">Day-of-Week Schedule:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              {DAY_ORDER.map((d) => {
                const rate = service.dayRates ? service.dayRates[d.key] : service.rate;
                return (
                  <div
                    key={d.key}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-center space-y-0.5"
                  >
                    <div className="text-[10px] font-bold text-slate-500 uppercase">{d.short}</div>
                    <div className="text-xs font-mono font-bold text-emerald-700">
                      {formatCurrency(rate)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PF-07: MTOW Rate */}
        {service.formulaType === 'PF-07' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-600">Rate per Metric Tonne MTOW:</div>
              <div className="text-sm font-bold text-sky-800 font-mono">
                {formatCurrency(service.rate)} / Tonne
              </div>
            </div>
            <div className="p-2.5 bg-sky-50/70 border border-sky-200/80 rounded-lg text-[11px] text-sky-900 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Tail Registry lookup enforced with Aircraft Type fallback (INV-05).</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <div>
          Tax Code: <strong className="text-slate-700">{service.taxCode || 'None (VAT-0)'}</strong>
        </div>
        <div>
          Billing Frequency:{' '}
          <strong className="text-slate-700">{service.billingFrequency || 'FLIGHT_MOVEMENT'}</strong>
        </div>
      </div>
    </div>
  );
};
export default FormulaReviewCard;
