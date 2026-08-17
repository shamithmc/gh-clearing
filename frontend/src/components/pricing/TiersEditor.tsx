import React from 'react';
import { Form, Input, Checkbox, Tooltip } from 'antd';
import { Plus, Trash2, Layers, AlertCircle, Sparkles } from 'lucide-react';
import type { FormInstance } from 'antd';

interface TiersEditorProps {
  fieldIndex: number;
  form: FormInstance;
  formulaType: 'PF-03' | 'PF-04';
}

export const TiersEditor: React.FC<TiersEditorProps> = ({ fieldIndex, form, formulaType }) => {
  const isIncremental = formulaType === 'PF-03';
  const title = isIncremental ? 'Incremental Volume Tiers' : 'All-Units Slab Bands';
  const subtitle = isIncremental
    ? 'Each quantity slice is billed at its corresponding tier rate (accumulative).'
    : 'The total flight volume qualifies for and is billed entirely at the matched slab rate.';

  const applyPreset = (presetType: 'volume3' | 'slab2') => {
    const currentServices = form.getFieldValue('services') || [];
    const currentService = currentServices[fieldIndex] || {};

    let presetTiers = [];
    if (presetType === 'volume3') {
      presetTiers = [
        { upto: 100, rate: 15.0, isTerminal: false },
        { upto: 500, rate: 12.0, isTerminal: false },
        { upto: null, rate: 8.5, isTerminal: true },
      ];
    } else {
      presetTiers = [
        { upto: 50, rate: 20.0, isTerminal: false },
        { upto: null, rate: 14.0, isTerminal: true },
      ];
    }

    currentServices[fieldIndex] = {
      ...currentService,
      tiers: presetTiers,
    };
    form.setFieldsValue({ services: currentServices });
  };

  return (
    <div className="p-4 bg-slate-900/[0.02] border border-slate-200/80 rounded-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 m-0 tracking-tight">{title}</h4>
            <p className="text-[11px] text-slate-500 m-0">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('volume3')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer"
          >
            3 Tiers (100 / 500 / ∞)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('slab2')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer"
          >
            2 Slabs (50 / ∞)
          </button>
        </div>
      </div>

      <Form.List
        name={[fieldIndex, 'tiers']}
        rules={[
          {
            validator: async (_, tiers) => {
              if (!tiers || tiers.length === 0) {
                return Promise.reject(new Error('At least one tier row is required'));
              }
              let prevUpto = -1;
              for (let i = 0; i < tiers.length; i++) {
                const tier = tiers[i];
                if (!tier) continue;
                const isTerminal = tier.isTerminal || tier.upto === null || tier.upto === '' || tier.upto === undefined;
                if (isTerminal) {
                  if (i !== tiers.length - 1) {
                    return Promise.reject(new Error(`Terminal tier (∞) must be the last row (Row #${i + 1})`));
                  }
                } else {
                  const numUpto = Number(tier.upto);
                  if (isNaN(numUpto) || numUpto <= 0) {
                    return Promise.reject(new Error(`Tier threshold in row #${i + 1} must be a positive number`));
                  }
                  if (numUpto <= prevUpto) {
                    return Promise.reject(new Error(`Tier thresholds must be strictly increasing (${numUpto} <= ${prevUpto})`));
                  }
                  prevUpto = numUpto;
                }
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        {(fields, { add, remove }, { errors }) => (
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider px-1">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Threshold Upper Bound (Upto)</div>
              <div className="col-span-4">Rate per Unit</div>
              <div className="col-span-2 text-center">Terminal (∞)</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {fields.map(({ key, name, ...restField }, idx) => {
              const services = form.getFieldValue('services') || [];
              const tierValues = services[fieldIndex]?.tiers?.[name] || {};
              const isTerminal = Boolean(tierValues.isTerminal || tierValues.upto === null);

              return (
                <div
                  key={key}
                  className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="col-span-1 text-xs font-semibold text-slate-500 pl-1">
                    {idx + 1}
                  </div>

                  <div className="col-span-4">
                    {isTerminal ? (
                      <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 flex items-center justify-between">
                        <span>Terminal (∞)</span>
                        <span className="text-[10px] text-slate-400 font-mono">No upper limit</span>
                      </div>
                    ) : (
                      <Form.Item
                        {...restField}
                        name={[name, 'upto']}
                        rules={[
                          {
                            required: !isTerminal,
                            message: 'Threshold required',
                          },
                          {
                            validator: async (_, val) => {
                              if (isTerminal || val === null || val === undefined || val === '') {
                                return Promise.resolve();
                              }
                              const num = Number(val);
                              if (isNaN(num) || num <= 0) {
                                return Promise.reject(new Error('Must be > 0'));
                              }
                              return Promise.resolve();
                            },
                          },
                        ]}
                        className="!mb-0"
                      >
                        <Input
                          id={`services_${fieldIndex}_tiers_${name}_upto`}
                          type="number"
                          min={1}
                          step="any"
                          placeholder="e.g. 100"
                          className="!text-xs !rounded-lg !font-mono"
                        />
                      </Form.Item>
                    )}
                  </div>

                  <div className="col-span-4">
                    <Form.Item
                      {...restField}
                      name={[name, 'rate']}
                      rules={[
                        { required: true, message: 'Rate required' },
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
                      className="!mb-0"
                    >
                      <Input
                        id={`services_${fieldIndex}_tiers_${name}_rate`}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Rate (e.g. 12.50)"
                        className="!text-xs !rounded-lg !font-mono"
                      />
                    </Form.Item>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <Form.Item
                      {...restField}
                      name={[name, 'isTerminal']}
                      valuePropName="checked"
                      className="!mb-0"
                    >
                      <Checkbox
                        id={`services_${fieldIndex}_tiers_${name}_isTerminal`}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          const current = form.getFieldValue('services') || [];
                          if (current[fieldIndex]?.tiers?.[name]) {
                            current[fieldIndex].tiers[name].isTerminal = isChecked;
                            if (isChecked) {
                              current[fieldIndex].tiers[name].upto = null;
                            }
                            form.setFieldsValue({ services: current });
                          }
                        }}
                      >
                        <span className="text-[11px] text-slate-600 font-medium">∞ Open</span>
                      </Checkbox>
                    </Form.Item>
                  </div>

                  <div className="col-span-1 flex justify-end pr-1">
                    <Tooltip title="Remove tier">
                      <button
                        type="button"
                        id={`services_${fieldIndex}_tiers_${name}_delete`}
                        onClick={() => remove(name)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                id={`services_${fieldIndex}_add_tier_btn`}
                onClick={() => add({ upto: '', rate: '', isTerminal: false })}
                className="px-3 py-1.5 border border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tier Row
              </button>

              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>Thresholds must be strictly increasing. Last tier can be ∞.</span>
              </div>
            </div>

            {errors && errors.length > 0 && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </Form.List>
    </div>
  );
};
export default TiersEditor;
