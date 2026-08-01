# Keycloak setup for staging

The staging SPA uses the authorization-code flow with PKCE. It is a public
browser client and must not have a client secret.

## Client

The Render Blueprint imports `keycloak/realm-gh-clearing.json`, which creates an
OpenID Connect client with the following configuration:

- Client ID: `gh-clearing-web`
- Client authentication: Off
- Standard flow: On
- Direct access grants: Off
- PKCE method: `S256`
- Valid redirect URIs: `https://gh-clearing-staging.onrender.com/*`
- Valid post-logout redirect URIs: `https://gh-clearing-staging.onrender.com/*`
- Web origins: `https://gh-clearing-staging.onrender.com`

## Token claims

Every application user needs these access-token claims:

- `tenant_id`: an existing tenant ID such as `EK` or `SWISSPORT`
- `tenant_type`: `AIRLINE`, `GROUND_HANDLER`, or `PLATFORM_ADMIN`

The imported client maps controlled Keycloak user attributes with those names.
Set both attributes on each user and do not let end users edit them. The backend accepts
application roles from the flat `roles` claim, realm roles, or roles assigned to
the `gh-clearing-web` client.

Example airline roles:

- `CONTRACT_VIEWER`
- `CONTRACT_REVIEWER`
- `INVOICE_REVIEWER`
- `INVOICE_DISPUTER`
- `RFP_RAISER`
- `MIS_VIEWER`
- `PAYMENT_UPDATER`

Example ground-handler roles:

- `ADMIN`
- `CONTRACT_ENTRY`
- `CONTRACT_APPROVER`
- `INVOICE_ENTRY`
- `INVOICE_APPROVER`
- `STATUS_UPDATER`
- `MIS_VIEWER`
- `RFP_MONITOR`
- `DISPUTE_HANDLER`
- `DISPUTE_APPROVER`

On first authenticated access, the backend provisions the trusted Keycloak
subject into the application `users` table with no dimensional restrictions.
Restrictions can then be managed in the application without changing the
Keycloak subject.

## Render variables

The Blueprint sets these on `gh-clearing-staging`:

- `KEYCLOAK_ISSUER_URI=https://gh-clearing-keycloak.onrender.com/realms/gh-clearing`
- `KEYCLOAK_JWK_SET_URI=https://gh-clearing-keycloak.onrender.com/realms/gh-clearing/protocol/openid-connect/certs`
- `KEYCLOAK_CLIENT_ID=gh-clearing-web`
- `KEYCLOAK_FRONTEND_ENABLED=true`

The issuer is reachable by both Render and users' browsers. During initial
Blueprint creation, set `KC_BOOTSTRAP_ADMIN_USERNAME` and
`KC_BOOTSTRAP_ADMIN_PASSWORD` as secret values for the Keycloak service. The
custom Keycloak entrypoint creates the isolated `keycloak` schema in the shared
database before starting the server.
