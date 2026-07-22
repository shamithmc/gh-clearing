import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Row, Select, Space, Spin, Tag, Typography } from 'antd';
import { SendOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getSimulatedUserId, simulatedAuthHeaders } from '../utils/simulatedAuth';

const { Paragraph, Text, Title } = Typography;

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
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ margin: 0 }}>Service Provider Marketplace</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Discover ground-handler capabilities by airport, region, and service, then begin a structured RFP.
        </Paragraph>
      </div>

      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Select
              data-testid="marketplace-region"
              aria-label="Marketplace region"
              allowClear
              style={{ width: '100%' }}
              placeholder="All regions"
              value={region}
              options={regions.map(value => ({ value, label: value }))}
              onChange={setRegion}
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              data-testid="marketplace-airport"
              aria-label="Marketplace airport"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="All airports"
              value={airportCode}
              options={airports.map(airport => ({
                value: airport.iataCode,
                label: `${airport.iataCode} - ${airport.name}`,
              }))}
              onChange={setAirportCode}
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              data-testid="marketplace-service"
              aria-label="Marketplace service"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="All services"
              value={serviceType}
              options={chargeCodes.map(chargeCode => ({
                value: chargeCode.code,
                label: `${chargeCode.code} - ${chargeCode.displayName}`,
              }))}
              onChange={setServiceType}
            />
          </Col>
        </Row>
      </Card>

      {error && <Alert type="error" showIcon message={error} />}

      <Spin spinning={loading}>
        {offerings.length === 0 && !loading ? (
          <Empty description="No service providers match the selected filters" />
        ) : (
          <Row gutter={[16, 16]} data-testid="marketplace-results">
            {offerings.map(offering => (
              <Col xs={24} md={12} xl={8} key={offering.id}>
                <Card
                  title={<Space><ShopOutlined /><span>{offering.supplierId}</span></Space>}
                  extra={<Tag color="blue">{offering.region}</Tag>}
                  actions={[
                    <Button
                      key="rfp"
                      data-testid={`initiate-rfp-${offering.id}`}
                      type="link"
                      icon={<SendOutlined />}
                      onClick={() => navigate(`/airline/rfps?airportCode=${offering.airportCode}&serviceType=${offering.serviceType}`)}
                    >
                      Initiate RFP
                    </Button>,
                  ]}
                >
                  <Space direction="vertical" size={10}>
                    <Text strong>{offering.airportCode} - {offering.airportName}, {offering.country}</Text>
                    <Tag>{offering.serviceType} - {offering.serviceName}</Tag>
                    <Paragraph style={{ margin: 0 }}>{offering.description}</Paragraph>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </Space>
  );
};

export default Marketplace;
