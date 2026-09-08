import React from 'react';
import { Form, Input, Select } from 'antd';
import { Network, Sparkles } from 'lucide-react';
import type { FormInstance } from 'antd';
import { STANDARD_QUANTITY_DRIVERS } from './types';

interface CompoundDriverEditorProps {
  fieldIndex: number;
  form: FormInstance;
}

export const CompoundDriverEditor: React.FC<CompoundDriverEditorProps> = ({ fieldIndex, form }) => {
  const applyPreset = (drivers: string[]) => {
    const currentServices = form.getFieldValue('services') || [];
    const currentService = currentServices[fieldIndex] || {};

    currentServices[fieldIndex] = {
      ...currentService,
      compoundDrivers: drivers,
      quantityDriver: drivers.join(','),
    };
    form.setFieldsValue({ services: currentServices });
  };

  return (
    <div className="p-4 bg-slate-900/[0.02] border border-slate-200/80 rounded-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 m-0 tracking-tight">
              Compound Multi-Driver Setup (PF-02)
            </h4>
            <p className="text-[11px] text-slate-500 m-0">
              Evaluates formula as <span className="font-mono text-purple-700 font-semibold">Rate × Driver_1 × Driver_2 × ...</span> Requires at least 2 distinct quantity drivers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-500" /> Quick Combos:
          </span>
          <button
            type="button"
            onClick={() => applyPreset(['passengers', 'bags'])}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-purple-400 hover:text-purple-700 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer"
          >
            passengers × bags
          </button>
          <button
            type="button"
            onClick={() => applyPreset(['aircraft_movements', 'cargo_kg'])}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-purple-400 hover:text-purple-700 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer"
          >
            movements × cargo_kg
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Form.Item
            name={[fieldIndex, 'compoundDrivers']}
            label={<span className="text-xs font-semibold text-slate-700">Quantity Drivers (Minimum 2)</span>}
            rules={[
              {
                validator: async (_, val) => {
                  if (!val || !Array.isArray(val) || val.length < 2) {
                    return Promise.reject(new Error('PF-02 requires at least 2 quantity drivers'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select
              id={`services_${fieldIndex}_compoundDrivers`}
              mode="tags"
              placeholder="Select or type quantity driver keys"
              options={STANDARD_QUANTITY_DRIVERS}
              onChange={(values: string[]) => {
                const currentServices = form.getFieldValue('services') || [];
                if (currentServices[fieldIndex]) {
                  currentServices[fieldIndex].quantityDriver = values.join(',');
                  form.setFieldsValue({ services: currentServices });
                }
              }}
              className="w-full [&_.ant-select-selector]:!text-xs [&_.ant-select-selector]:!rounded-lg"
            />
          </Form.Item>
        </div>

        <div>
          <Form.Item
            name={[fieldIndex, 'rate']}
            label={<span className="text-xs font-semibold text-slate-700">Compound Base Rate</span>}
            rules={[
              { required: true, message: 'Base rate required' },
              {
                validator: async (_, val) => {
                  if (val === null || val === undefined || val === '') return Promise.resolve();
                  const num = Number(val);
                  if (isNaN(num) || num < 0) {
                    return Promise.reject(new Error('Rate must be ≥ 0'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              id={`services_${fieldIndex}_rate`}
              type="number"
              min={0}
              step="0.001"
              placeholder="e.g. 1.25"
              className="!text-xs !rounded-lg !font-mono"
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );
};
export default CompoundDriverEditor;
