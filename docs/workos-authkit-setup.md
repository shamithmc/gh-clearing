# WorkOS AuthKit setup

The application uses WorkOS AuthKit for browser authentication and Spring Security
resource-server validation. WorkOS is the identity and session provider; application
roles, tenant validation, and dimensional restrictions remain enforced by the
application and PostgreSQL.

## WorkOS staging application

1. Create a WorkOS staging application and enable the desired authentication methods.
2. Add `http://localhost:5173` and the Render application URL as redirect URIs.
3. Add `/login` on each origin as a sign-in endpoint.
4. Add both origins to the application's allowed CORS origins.
5. Enable multiple organization roles.
6. Create one WorkOS Organization for each application tenant. Set organization
   metadata `tenant_id` to the existing tenant key (for example `SWISSPORT` or `EK`)
   and `tenant_type` to `GROUND_HANDLER`, `AIRLINE`, or `PLATFORM_ADMIN`.

Configure this JWT template in Authentication > Features > JWT Template:

```json
{
  "tenant_id": "{{ organization.metadata.tenant_id }}",
  "tenant_type": "{{ organization.metadata.tenant_type }}",
  "email": {{ user.email }},
  "preferred_username": {{ user.email }}
}
```

WorkOS supplies `sub`, `client_id`, `org_id`, `role`/`roles`, and `permissions`.
Role slugs are normalized from kebab case to the application's upper snake case,
for example `invoice-reviewer` becomes `INVOICE_REVIEWER`. Only roles in the closed
application vocabulary are provisioned.

## Render variables

Set these variables on `gh-clearing-staging`:

- `WORKOS_CLIENT_ID`: the public WorkOS application client ID.
- `WORKOS_JWK_SET_URI`: `https://api.workos.com/sso/jwks/<WORKOS_CLIENT_ID>`.
- `WORKOS_ISSUER_URI`: `https://api.workos.com/`.
- `WORKOS_API_HOSTNAME`: `api.workos.com`.
- `WORKOS_FRONTEND_ENABLED`: `true`.

The WorkOS API key is not required for hosted browser authentication or JWT
verification. If server-side organization provisioning or webhooks are added later,
store the API key only as a Render secret.

## Local development and tests

The `dev` and `e2e` Spring profiles retain simulated authentication. To exercise
real AuthKit locally, configure the variables above and enable the staging-style
browser auth configuration.
