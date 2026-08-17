import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Result, Select, Spin } from 'antd';
import { Save, Settings2 } from 'lucide-react';
import { simulatedAuthHeaders } from '../utils/simulatedAuth';
import { canManageSupplierConfiguration } from '../utils/supplierConfigurationAccess';

interface SupplierConfigurationResponse {
  tenantId: string;
  emailIds?: string | null;
  invoiceBackdatingDays: number;
  regionalClassification?: string | null;
  enabledAirlines?: string[] | null;
  enabledAirports?: string[] | null;
}

interface ConfigurationValues {
  emailIds?: string;
  invoiceBackdatingDays: number;
  regionalClassification?: string;
  enabledAirlines: string[];
  enabledAirports: string[];
}

interface AirlineOption {
  iataCode: string;
  name: string;
}

interface AirportOption {
  iataCode: string;
  name: string;
}

const responseMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json() as { detail?: string; message?: string };
    return body.detail ?? body.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const SupplierConfiguration: React.FC = () => {
  const allowed = canManageSupplierConfiguration();
  const tenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';
  const headers = useMemo(
    () => simulatedAuthHeaders(tenantId, 'GROUND_HANDLER'),
    [tenantId],
  );
  const [form] = Form.useForm<ConfigurationValues>();
  const [configuration, setConfiguration] = useState<SupplierConfigurationResponse>();
  const [airlines, setAirlines] = useState<AirlineOption[]>([]);
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [loading, setLoading] = useState(allowed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const [configurationResponse, airlinesResponse, airportsResponse] = await Promise.all([
        fetch(`/api/tenants/${encodeURIComponent(tenantId)}/configuration`, { headers }),
        fetch('/api/reference/airlines', { headers }),
        fetch('/api/reference/airports', { headers }),
      ]);
      const failed = [configurationResponse, airlinesResponse, airportsResponse]
        .find(response => !response.ok);
      if (failed) throw new Error(await responseMessage(failed));

      const loadedConfiguration = await configurationResponse.json() as SupplierConfigurationResponse;
      setConfiguration(loadedConfiguration);
      setAirlines(await airlinesResponse.json() as AirlineOption[]);
      setAirports(await airportsResponse.json() as AirportOption[]);
      form.setFieldsValue({
        emailIds: loadedConfiguration.emailIds ?? undefined,
        invoiceBackdatingDays: loadedConfiguration.invoiceBackdatingDays ?? 30,
        regionalClassification: loadedConfiguration.regionalClassification ?? undefined,
        enabledAirlines: loadedConfiguration.enabledAirlines ?? [],
        enabledAirports: loadedConfiguration.enabledAirports ?? [],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load supplier configuration');
    } finally {
      setLoading(false);
    }
  }, [form, headers, tenantId]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const save = async (values: ConfigurationValues) => {
    setSaving(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const response = await fetch(`/api/tenants/${encodeURIComponent(tenantId)}/configuration`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const updated = await response.json() as SupplierConfigurationResponse;
      setConfiguration(updated);
      setSuccess('Supplier configuration saved successfully.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save supplier configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return <Result status="403" title="Configuration access denied"
      subTitle="A ground-handler administrator role is required." />;
  }

  const hasNoEnabledScope = configuration
    && !(configuration.enabledAirlines?.length || configuration.enabledAirports?.length);

  return (
    <div className="max-w-5xl mx-auto space-y-5" data-testid="supplier-configuration-page">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-600 p-2.5 text-white"><Settings2 className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 m-0">Supplier Configuration</h1>
          <p className="text-sm text-slate-500 m-0">Manage invoice rules and the airlines and airports served by {tenantId}.</p>
        </div>
      </div>

      {error && <Alert type="error" showIcon message="Configuration request failed" description={error}
        action={<Button size="small" onClick={() => void load()}>Retry</Button>} />}
      {success && <Alert type="success" showIcon message={success} />}

      <Spin spinning={loading} tip="Loading supplier configuration">
        {!loading && configuration && hasNoEnabledScope && (
          <Alert type="info" showIcon message="No airlines or airports are enabled yet."
            description="Select the operating scope below and save the configuration." />
        )}

        {configuration && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Form<ConfigurationValues>
              form={form}
              layout="vertical"
              onFinish={values => void save(values)}
              requiredMark="optional"
            >
              <div className="grid grid-cols-1 gap-x-5 md:grid-cols-2">
                <Form.Item name="emailIds" label="Notification email IDs"
                  rules={[{ max: 255, message: 'Email IDs cannot exceed 255 characters' }]}
                  extra="Enter the configured delivery recipients using the tenant's existing email-list format.">
                  <Input data-testid="configuration-email-ids" maxLength={255} placeholder="billing@example.com" />
                </Form.Item>
                <Form.Item name="invoiceBackdatingDays" label="Invoice backdating allowance (days)"
                  rules={[{ required: true, message: 'Enter the backdating allowance' }, { type: 'number', min: 0, message: 'Backdating days cannot be negative' }]}>
                  <InputNumber data-testid="configuration-backdating-days" min={0} precision={0} className="!w-full" />
                </Form.Item>
                <Form.Item name="regionalClassification" label="Regional classification"
                  rules={[{ max: 50, message: 'Regional classification cannot exceed 50 characters' }]}>
                  <Input data-testid="configuration-region" maxLength={50} placeholder="Middle East" />
                </Form.Item>
                <Form.Item name="enabledAirlines" label="Enabled airlines">
                  <Select data-testid="configuration-airlines" mode="multiple" allowClear showSearch
                    optionFilterProp="label" placeholder="Select airlines"
                    options={airlines.map(airline => ({
                      value: airline.iataCode,
                      label: `${airline.iataCode} — ${airline.name}`,
                    }))} />
                </Form.Item>
                <Form.Item name="enabledAirports" label="Enabled airports" className="md:col-span-2">
                  <Select data-testid="configuration-airports" mode="multiple" allowClear showSearch
                    optionFilterProp="label" placeholder="Select airports"
                    options={airports.map(airport => ({
                      value: airport.iataCode,
                      label: `${airport.iataCode} — ${airport.name}`,
                    }))} />
                </Form.Item>
              </div>
              <div className="flex justify-end">
                <Button data-testid="save-configuration" type="primary" htmlType="submit"
                  loading={saving} icon={<Save className="w-4 h-4" />}>Save Configuration</Button>
              </div>
            </Form>
          </div>
        )}
      </Spin>
    </div>
  );
};

export default SupplierConfiguration;
