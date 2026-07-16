import React, { useState } from 'react';
import { Card, Steps, Button, Form, Input, Select, DatePicker, message, Row, Col, Typography, Divider } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ContractWizard: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const next = () => {
    form.validateFields().then(() => {
      setCurrent(current + 1);
    });
  };

  const prev = () => setCurrent(current - 1);

  const onFinish = (values: any) => {
    const payload = {
      airlineId: values.airlineId,
      airportCode: values.airportCode,
      startDate: values.dateRange[0].format('YYYY-MM-DD'),
      endDate: values.dateRange[1].format('YYYY-MM-DD'),
      currency: values.currency,
      services: (values.services || []).map((s: any) => ({
        chargeCode: s.chargeCode,
        serviceName: s.serviceName,
        formulaType: s.formulaType,
        quantityDriver: s.quantityDriver,
        uom: s.uom,
        taxCode: s.taxCode,
        rateDetails: buildRateDetails(s)
      }))
    };

    fetch('/api/contracts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real app, attach JWT here
      },
      body: JSON.stringify(payload)
    }).then(res => {
      if (res.ok) {
        message.success('Contract drafted successfully!');
        navigate('/contracts');
      } else {
        message.error('Failed to create contract.');
      }
    });
  };

  const buildRateDetails = (service: any) => {
    switch (service.formulaType) {
      case 'PF-01':
      case 'PF-02':
      case 'PF-07':
        return { rate: service.rate };
      case 'PF-03':
      case 'PF-04':
        return { tiers: service.tiers };
      case 'PF-05':
        return { timeBands: service.timeBands };
      case 'PF-06':
        return { dayRates: service.dayRates };
      default:
        return {};
    }
  };

  return (
    <div>
      <Title level={3}>Create New Contract</Title>
      <Card>
        <Steps current={current} items={[
          { title: 'Header Details' },
          { title: 'Service Lines' },
          { title: 'Review & Submit' }
        ]} style={{ marginBottom: 24 }} />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          
          {/* STEP 1: Header */}
          <div style={{ display: current === 0 ? 'block' : 'none' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="airlineId" label="Airline" rules={[{ required: true }]}>
                  <Select placeholder="Select Airline">
                    <Option value="EK">Emirates (EK)</Option>
                    <Option value="LH">Lufthansa (LH)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="airportCode" label="Airport" rules={[{ required: true }]}>
                  <Select placeholder="Select Airport">
                    <Option value="DXB">DXB - Dubai</Option>
                    <Option value="FRA">FRA - Frankfurt</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dateRange" label="Validity Period" rules={[{ required: true }]}>
                  <RangePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
                  <Select placeholder="Select Currency">
                    <Option value="USD">USD</Option>
                    <Option value="EUR">EUR</Option>
                    <Option value="AED">AED</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* STEP 2: Service Lines */}
          <div style={{ display: current === 1 ? 'block' : 'none' }}>
            <Form.List name="services">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card key={key} size="small" style={{ marginBottom: 16 }} title={`Service ${name + 1}`} extra={<MinusCircleOutlined onClick={() => remove(name)} />}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'chargeCode']} label="Charge Code" rules={[{ required: true }]}>
                            <Select placeholder="Select Code">
                              <Option value="BAGGAGE">BAGGAGE</Option>
                              <Option value="PASSENGER_HANDLING">PASSENGER_HANDLING</Option>
                              <Option value="DEICING">DEICING</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'serviceName']} label="Service Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g. Standard Bag Handling" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'formulaType']} label="Pricing Formula" rules={[{ required: true }]}>
                            <Select placeholder="Select Formula">
                              <Option value="PF-01">PF-01 (Unit Rate)</Option>
                              <Option value="PF-02">PF-02 (Compound Unit Rate)</Option>
                              <Option value="PF-03">PF-03 (Slab Incremental)</Option>
                              <Option value="PF-04">PF-04 (Slab All-Units)</Option>
                              <Option value="PF-05">PF-05 (Time-Based)</Option>
                              <Option value="PF-06">PF-06 (Day-Based)</Option>
                              <Option value="PF-07">PF-07 (MTOW-Based)</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'quantityDriver']} label="Quantity Driver" rules={[{ required: true }]}>
                            <Input placeholder="e.g. bags" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'uom']} label="Unit of Measure" rules={[{ required: true }]}>
                            <Input placeholder="e.g. EA, KG" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...restField} name={[name, 'taxCode']} label="Tax Code">
                            <Input placeholder="e.g. VAT-0" />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* Dynamic Formula Fields */}
                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => {
                          const prev = prevValues.services?.[name]?.formulaType;
                          const curr = currentValues.services?.[name]?.formulaType;
                          return prev !== curr;
                        }}
                      >
                        {({ getFieldValue }) => {
                          const formula = getFieldValue(['services', name, 'formulaType']);
                          if (!formula) return null;

                          return (
                            <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px', marginTop: '16px' }}>
                              <Title level={5}>Rate Details ({formula})</Title>
                              
                              {(formula === 'PF-01' || formula === 'PF-02' || formula === 'PF-07') && (
                                <Form.Item {...restField} name={[name, 'rate']} label="Base Rate" rules={[{ required: true }]}>
                                  <Input type="number" step="0.01" />
                                </Form.Item>
                              )}

                              {(formula === 'PF-03' || formula === 'PF-04') && (
                                <Form.List name={[name, 'tiers']}>
                                  {(tierFields, { add: addTier, remove: removeTier }) => (
                                    <>
                                      {tierFields.map((tierField) => (
                                        <Row key={tierField.key} gutter={16}>
                                          <Col span={10}>
                                            <Form.Item {...tierField} name={[tierField.name, 'upto']} label="Up To">
                                              <Input type="number" placeholder="Leave empty for infinity" />
                                            </Form.Item>
                                          </Col>
                                          <Col span={10}>
                                            <Form.Item {...tierField} name={[tierField.name, 'rate']} label="Rate" rules={[{ required: true }]}>
                                              <Input type="number" step="0.01" />
                                            </Form.Item>
                                          </Col>
                                          <Col span={4}>
                                            <MinusCircleOutlined onClick={() => removeTier(tierField.name)} style={{ marginTop: 35 }} />
                                          </Col>
                                        </Row>
                                      ))}
                                      <Button type="dashed" onClick={() => addTier()} block icon={<PlusOutlined />}>
                                        Add Tier
                                      </Button>
                                    </>
                                  )}
                                </Form.List>
                              )}

                              {/* PF-05 Time Bands, PF-06 Day Rates can follow a similar dynamic pattern... */}
                            </div>
                          );
                        }}
                      </Form.Item>

                    </Card>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Service Line
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </div>

          {/* STEP 3: Review */}
          <div style={{ display: current === 2 ? 'block' : 'none' }}>
            <p>Please review your contract details before submitting.</p>
            {/* Display summary values here in a real app */}
          </div>

          <Divider />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {current > 0 && <Button onClick={prev}>Previous</Button>}
            {current < 2 && <Button type="primary" onClick={next}>Next</Button>}
            {current === 2 && <Button type="primary" htmlType="submit">Submit Contract</Button>}
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ContractWizard;
