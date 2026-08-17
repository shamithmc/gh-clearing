-- V32__seed_platform_tenant.sql
-- Seed the default Platform Admin tenant for system owners
INSERT INTO tenants (id, name, type, status) VALUES
('PLATFORM', 'Platform Administration', 'PLATFORM_ADMIN', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
