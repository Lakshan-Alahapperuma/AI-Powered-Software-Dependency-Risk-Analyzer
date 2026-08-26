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

## Deploying the backend to Railway

Create a Railway service from this repository. The root `railway.json` builds
and starts the Spring Boot application from `backend/`. Add a PostgreSQL
service, then configure these backend variables using the database service
values:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://HOST:PORT/DATABASE
SPRING_DATASOURCE_USERNAME=USERNAME
SPRING_DATASOURCE_PASSWORD=PASSWORD
```

Railway provides a dynamic `PORT` value automatically. After the backend is
deployed, set the Vercel `VITE_API_URL` variable to the Railway public URL.
