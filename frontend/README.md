# ClickHouse Operations Panel - Frontend

Frontend application for ClickHouse Operations Panel.

## Technology Stack

- React 18
- TypeScript
- Vite
- React Router
- Axios

## Development

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`

## Build

```bash
cd frontend
npm run build
```

The built files will be in the `dist/` directory.

## Docker

Build and run with Docker:

```bash
docker-compose -f docker-compose.dev.yml up frontend
```

Or build the image manually:

```bash
cd frontend
docker build -f build/docker/Dockerfile.frontend -t frontend-dev .
```

## API Integration

The frontend is configured to proxy API requests to the backend server at `http://localhost:8080`.
Make sure the backend is running before starting the frontend.

