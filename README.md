# Packaging Consultants USA | Express + MongoDB

See **../README.md** for complete configuration, SMTP settings, admin credentials, and verification. New API endpoints:

- `POST /api/contact`
- `GET /api/site-content`
- `GET /api/content/:group/:slug`
- `GET /api/admin/content-pages`
- `GET/PUT /api/admin/content/:group/:slug`
- `GET/PUT /api/admin/site-content`
- `GET /api/admin/contact-messages`
- `GET/PATCH /api/admin/contact-messages/:id`
- `POST /api/admin/contact-messages/:id/resend`
- `POST /api/admin/media` (1 image, max 10MB)
- `GET /api/media/:name`

Every `/api/admin/*` endpoint (except login) uses the existing JWT middleware. New Contact submission API does not require login; it is rate limited.
