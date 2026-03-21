# Cron Job Setup

## Vercel Cron (recommended)
Add to `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/run-workflows", "schedule": "*/15 * * * *" }]
}
```

## Environment variables required
- `CRON_SECRET` — secret token for cron authorization
- `NEXT_PUBLIC_SITE_URL` — base URL for review links (e.g., https://unitpro.ar)
- `EVOLUTION_API_URL` — WhatsApp Evolution API URL
- `EVOLUTION_API_KEY` — WhatsApp Evolution API key

## Manual trigger (testing)
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://unitpro.ar/api/cron/run-workflows
```
