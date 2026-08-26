# Dependency Risk Analyzer

This repository is organized into the following major application areas:

- `frontend/` — React + TypeScript user interface
- `backend/` — Spring Boot API and domain services
- `ai-service/` — FastAPI service for risk analysis and intelligent insights
- `database/` — database schemas, migrations, and seed data
- `docs/` — architecture, API, and deployment documentation
- `docker/` — containerization configuration

## Deploying the frontend to Vercel

The Vercel project should be created from the repository root. The root
`vercel.json` builds the Vite application in `frontend/` and serves its
`frontend/dist` output.

The Spring Boot backend cannot run on Vercel as a static Vite deployment. Host
the backend separately, then add this Vercel environment variable:

```text
VITE_API_URL=https://your-backend.example.com
```

Redeploy after setting the variable. For local development, leave it unset so
the Vite proxy continues forwarding `/api` requests to `localhost:8080`.
