# Packaging Consultants API

Express and MongoDB API for site settings and dynamic header navigation.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The default database URL is `mongodb://127.0.0.1:27017/packaging-consultant`. The API automatically creates the primary `site` settings document with the reference navigation the first time it is requested. Existing pre-PDF seed data is migrated once to the exact Packaging Services labels and routes, while later admin edits remain untouched.

## Routes

- `GET /api/health`
- `GET /api/settings/navigation`
- `GET /api/admin/settings/current`
- `PUT /api/admin/settings/current`
- `GET /api/admin/settings`
- `POST /api/admin/settings`
- `GET /api/admin/settings/:id`
- `PUT /api/admin/settings/:id`
- `PATCH /api/admin/settings/:id`
- `DELETE /api/admin/settings/:id`

Each `topNavigation` item contains `label`, `link`, and an optional `children` array. Every child contains `label` and `link`.

## Verification

```bash
npm run check
npm test
API_BASE_URL=http://127.0.0.1:5050 npm run verify:api
```

`verify:api` expects the API to already be running. It restores the primary navigation after testing and removes the temporary CRUD record.
