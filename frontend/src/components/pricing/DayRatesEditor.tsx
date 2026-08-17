import React, { useState } from 'react';
import { Form, Input, Modal } from 'antd';
import { Calendar, Sparkles, Copy } from 'lucide-react';
import type { FormInstance } from 'antd';
import type { DayOfWeekName } from './types';

interface DayRatesEditorProps {
  fieldIndex: number;
  form: FormInstance;
}

const DAYS: { key: DayOfWeekName; label: string; short: string; isWeekend?: boolean }[] = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat', isWeekend: true },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun', isWeekend: true },
];

export const DayRatesEditor: React.FC<DayRatesEditorProps> = ({ fieldIndex, form }) => {
  const [flatRateModal, setFlatRateModal] = useState(false);
  const [flatRateVal, setFlatRateVal] = useState('50.00');
  const [splitWeekdayVal, setSplitWeekdayVal] = useState('50.00');
  const [splitWeekendVal, setSplitWeekendVal] = useState('75.00');
  const [splitModal, setSplitModal] = useState(false);

  const applyFlatRate = (rate: string) => {
    const numericRate = parseFloat(rate) || 0;
    const currentServices = form.getFieldValue('services') || [];
    const currentService = currentServices[fieldIndex] || {};

    const dayRates: Record<string, number> = {};
    DAYS.forEach((d) => {
      dayRates[d.key] = numericRate;
    });

    currentServices[fieldIndex] = {
      ...currentService,
      dayRates,
    };
    form.setFieldsValue({ services: currentServices });
    setFlatRateModal(false);
  };

  const applyWeekdayWeekendSplit = (weekdayRate: string, weekendRate: string) => {
    const wRate = parseFloat(weekdayRate) || 0;
    const weRate = parseFloat(weekendRate) || 0;
    const currentServices = form.getFieldValue('services') || [];
    const currentService = currentServices[fieldIndex] || {};

    const dayRates: Record<string, number> = {};
    DAYS.forEach((d) => {
      dayRates[d.key] = d.isWeekend ? weRate : wRate;
    });

    currentServices[fieldIndex] = {
      ...currentService,
      dayRates,
    };
    form.setFieldsValue({ services: currentServices });
    setSplitModal(false);
  };

  return (
    <div className="p-4 bg-slate-900/[0.02] border border-slate-200/80 rounded-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 m-0 tracking-tight">Day-of-Week Rates (PF-06)</h4>
            <p className="text-[11px] text-slate-500 m-0">
              Set dedicated unit rates for each day of the week (Monday through Sunday).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500" /> Presets:
          </span>
          <button
            type="button"
            id={`services_${fieldIndex}_flat_rate_preset_btn`}
            onClick={() => setFlatRateModal(true)}
            className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Copy className="w-2.5 h-2.5 text-emerald-500" /> Same Rate All Days
          </button>
          <button
            type="button"
            id={`services_${fieldIndex}_split_rate_preset_btn`}
            onClick={() => setSplitModal(true)}
            className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5 text-blue-500" /> Weekday / Weekend Split
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {DAYS.map((day) => (
          <div
            key={day.key}
            className={`p-2.5 rounded-xl border ${
              day.isWeekend
                ? 'bg-amber-50/40 border-amber-200/80'
                : 'bg-white border-slate-200/90'
            } shadow-2xs space-y-1.5`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-bold tracking-tight uppercase ${
                  day.isWeekend ? 'text-amber-800' : 'text-slate-700'
                }`}
              >
                {day.short}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                  day.isWeekend
                    ? 'bg-amber-100/80 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {day.isWeekend ? 'W/E' : 'W/D'}
              </span>
            </div>

            <Form.Item
              name={[fieldIndex, 'dayRates', day.key]}
              rules={[
                { required: true, message: 'Required' },
                {
                  validator: async (_, val) => {
                    if (val === null || val === undefined || val === '') return Promise.resolve();
                    const num = Number(val);
                    if (isNaN(num) || num < 0) {
                      return Promise.reject(new Error('≥ 0'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              className="!mb-0"
            >
              <Input
                id={`services_${fieldIndex}_dayRates_${day.key}`}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="!text-xs !rounded-lg !font-mono text-center !p-1.5"
              />
            </Form.Item>
          </div>
        ))}
      </div>

      {/* Modal: Flat Rate Helper */}
      <Modal
        title={<span className="text-sm font-bold text-slate-900">Set Uniform Rate For All 7 Days</span>}
        open={flatRateModal}
        onCancel={() => setFlatRateModal(false)}
        onOk={() => applyFlatRate(flatRateVal)}
        okText="Apply to All Days"
        className="[&_.ant-modal-content]:!rounded-2xl"
      >
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-600 m-0">
            Enter the unit rate to apply to every day of the week (Monday through Sunday):
          </p>
          <Input
            id="flat-rate-preset-input"
            type="number"
            min={0}
            step="0.01"
            value={flatRateVal}
            onChange={(e) => setFlatRateVal(e.target.value)}
            prefix={<span className="text-xs text-slate-400 font-mono">$</span>}
            className="!rounded-lg !font-mono text-sm"
          />
        </div>
      </Modal>

      {/* Modal: Weekday / Weekend Split Helper */}
      <Modal
        title={<span className="text-sm font-bold text-slate-900">Weekday / Weekend Split Preset</span>}
        open={splitModal}
        onCancel={() => setSplitModal(false)}
        onOk={() => applyWeekdayWeekendSplit(splitWeekdayVal, splitWeekendVal)}
        okText="Apply Split Rates"
        className="[&_.ant-modal-content]:!rounded-2xl"
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Weekday Rate (Monday – Friday)
            </label>
            <Input
              id="split-weekday-rate-input"
              type="number"
              min={0}
              step="0.01"
              value={splitWeekdayVal}
              onChange={(e) => setSplitWeekdayVal(e.target.value)}
              prefix={<span className="text-xs text-slate-400 font-mono">$</span>}
              className="!rounded-lg !font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Weekend Rate (Saturday – Sunday)
            </label>
            <Input
              id="split-weekend-rate-input"
              type="number"
              min={0}
              step="0.01"
              value={splitWeekendVal}
              onChange={(e) => setSplitWeekendVal(e.target.value)}
              prefix={<span className="text-xs text-slate-400 font-mono">$</span>}
              className="!rounded-lg !font-mono text-sm"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default DayRatesEditor;
