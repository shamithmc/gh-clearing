import React from 'react';
import { Form, Input } from 'antd';
import { Plane, ShieldCheck } from 'lucide-react';
import type { FormInstance } from 'antd';

interface MtowEditorProps {
  fieldIndex: number;
  form: FormInstance;
}

export const MtowEditor: React.FC<MtowEditorProps> = ({ fieldIndex }) => {
  return (
    <div className="p-4 bg-slate-900/[0.02] border border-slate-200/80 rounded-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
        <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
          <Plane className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800 m-0 tracking-tight">
            MTOW-Based Aircraft Weight Pricing (PF-07)
          </h4>
          <p className="text-[11px] text-slate-500 m-0">
            Formula calculates charges as <span className="font-mono text-sky-800 font-semibold">Rate × Aircraft MTOW (Metric Tonnes)</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <Form.Item
          name={[fieldIndex, 'rate']}
          label={<span className="text-xs font-semibold text-slate-700">Rate per Metric Tonne MTOW</span>}
          rules={[
            { required: true, message: 'Rate per tonne required' },
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
            step="0.01"
            placeholder="e.g. 4.75"
            suffix={<span className="text-xs text-slate-400 font-medium">/ tonne</span>}
            className="!text-xs !rounded-lg !font-mono"
          />
        </Form.Item>

        <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl text-[11px] text-sky-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-sky-950">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>MTOW Resolution & Invariant Guard (INV-05)</span>
          </div>
          <p className="text-sky-800 leading-relaxed m-0">
            Operational billing queries the Tail ID against the MTOW Reference Registry. If not found, it falls back to the Aircraft Type default weight. If both are unmapped, billing safely fails closed.
          </p>
        </div>
      </div>
    </div>
  );
};
export default MtowEditor;
