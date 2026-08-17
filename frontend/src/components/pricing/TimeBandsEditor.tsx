import React from 'react';
import { Form, Input, Tooltip } from 'antd';
import { Plus, Trash2, Clock, Sparkles, Moon, Sun } from 'lucide-react';
import type { FormInstance } from 'antd';

interface TimeBandsEditorProps {
  fieldIndex: number;
  form: FormInstance;
}

export const TimeBandsEditor: React.FC<TimeBandsEditorProps> = ({ fieldIndex, form }) => {
  const applyPreset = (preset: 'dayNight' | 'threeShifts') => {
    const currentServices = form.getFieldValue('services') || [];
    const currentService = currentServices[fieldIndex] || {};

    let presetBands = [];
    if (preset === 'dayNight') {
      presetBands = [
        { start: '06:00', end: '22:00', rate: 100.0 },
        { start: '22:00', end: '06:00', rate: 150.0 },
      ];
    } else {
      presetBands = [
        { start: '06:00', end: '14:00', rate: 90.0 },
        { start: '14:00', end: '22:00', rate: 110.0 },
        { start: '22:00', end: '06:00', rate: 160.0 },
      ];
    }

    currentServices[fieldIndex] = {
      ...currentService,
      timeBands: presetBands,
    };
    form.setFieldsValue({ services: currentServices });
  };

  return (
    <div className="p-4 bg-slate-900/[0.02] border border-slate-200/80 rounded-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 m-0 tracking-tight">Time-of-Day Bands (PF-05)</h4>
            <p className="text-[11px] text-slate-500 m-0">
              Flight operation time triggers corresponding band rate. Supports overnight periods (e.g. 22:00 to 06:00).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('dayNight')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-amber-400 hover:text-amber-700 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Sun className="w-2.5 h-2.5 text-amber-500" /> Day/Night (06:00-22:00, 22:00-06:00)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('threeShifts')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-amber-400 hover:text-amber-700 text-slate-700 rounded text-[10px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Moon className="w-2.5 h-2.5 text-indigo-500" /> 3-Shift Bands
          </button>
        </div>
      </div>

      <Form.List
        name={[fieldIndex, 'timeBands']}
        rules={[
          {
            validator: async (_, timeBands) => {
              if (!timeBands || timeBands.length === 0) {
                return Promise.reject(new Error('At least one time band is required'));
              }
              const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
              for (let i = 0; i < timeBands.length; i++) {
                const band = timeBands[i];
                if (!band) continue;
                if (!band.start || !timeRegex.test(band.start)) {
                  return Promise.reject(new Error(`Band #${i + 1} start time must be in HH:mm format (e.g. 06:00)`));
                }
                if (!band.end || !timeRegex.test(band.end)) {
                  return Promise.reject(new Error(`Band #${i + 1} end time must be in HH:mm format (e.g. 22:00)`));
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
              <div className="col-span-3">Start Time (HH:mm)</div>
              <div className="col-span-3">End Time (HH:mm)</div>
              <div className="col-span-4">Rate per Unit</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {fields.map(({ key, name, ...restField }, idx) => {
              const services = form.getFieldValue('services') || [];
              const bandValues = services[fieldIndex]?.timeBands?.[name] || {};
              const isOvernight =
                bandValues.start && bandValues.end && bandValues.end < bandValues.start;

              return (
                <div
                  key={key}
                  className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="col-span-1 text-xs font-semibold text-slate-500 pl-1">
                    {idx + 1}
                  </div>

                  <div className="col-span-3">
                    <Form.Item
                      {...restField}
                      name={[name, 'start']}
                      rules={[
                        { required: true, message: 'Start time required' },
                        {
                          pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
                          message: 'HH:mm format',
                        },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        id={`services_${fieldIndex}_timeBands_${name}_start`}
                        placeholder="06:00"
                        maxLength={5}
                        className="!text-xs !rounded-lg !font-mono"
                      />
                    </Form.Item>
                  </div>

                  <div className="col-span-3">
                    <Form.Item
                      {...restField}
                      name={[name, 'end']}
                      rules={[
                        { required: true, message: 'End time required' },
                        {
                          pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
                          message: 'HH:mm format',
                        },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        id={`services_${fieldIndex}_timeBands_${name}_end`}
                        placeholder="22:00"
                        maxLength={5}
                        className="!text-xs !rounded-lg !font-mono"
                      />
                    </Form.Item>
                  </div>

                  <div className="col-span-4 flex items-center gap-2">
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
                      className="!mb-0 flex-1"
                    >
                      <Input
                        id={`services_${fieldIndex}_timeBands_${name}_rate`}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="100.00"
                        className="!text-xs !rounded-lg !font-mono"
                      />
                    </Form.Item>

                    {isOvernight && (
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-semibold whitespace-nowrap">
                        Overnight
                      </span>
                    )}
                  </div>

                  <div className="col-span-1 flex justify-end pr-1">
                    <Tooltip title="Remove time band">
                      <button
                        type="button"
                        id={`services_${fieldIndex}_timeBands_${name}_delete`}
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
                id={`services_${fieldIndex}_add_time_band_btn`}
                onClick={() => add({ start: '00:00', end: '23:59', rate: '' })}
                className="px-3 py-1.5 border border-dashed border-amber-400 hover:border-amber-600 bg-amber-50/40 hover:bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Time Band
              </button>

              <div className="text-[11px] text-slate-500">
                Format: 24-hour time HH:mm (e.g. 06:00 to 22:00, or overnight 22:00 to 06:00)
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
export default TimeBandsEditor;
