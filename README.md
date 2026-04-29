# To-Do App Microservices

Containerized to-do application built as a microservices system with centralized frontend routing, PostgreSQL, and monitoring.

## Services

- `frontend` (Nginx): serves UI and proxies API requests.
- `auth-service`: user registration/login with JWT.
- `product-service`: product catalog CRUD.
- `order-service`: order CRUD.
- `user-service`: user profile endpoints and Socket.IO chat.
- `postgres`: shared relational database.
- `prometheus`: metrics scraping.
- `grafana`: dashboards and visualization.

## Repository Layout

- `frontend/` - static frontend + `nginx.conf`.
- `auth-service/`, `product-service/`, `order-service/`, `user-service/` - Node.js APIs.
- `monitoring/` - Prometheus config and alert rules.
- `terraform/` - infrastructure provisioning templates.
- `docker-compose.yml` - local dev/validation stack.
- `docker-stack.yml` - Docker Swarm deployment stack.

## Setup Instructions (Local)

### Prerequisites

Install:

1. Docker Desktop (or Docker Engine + Compose plugin)
2. Git

Optional (for running services directly without Docker):

3. Node.js 18+ and npm

### 1) Clone and open project

```bash
git clone <your-repo-url>
cd to-do-app-main
```

### 2) Start the full stack

```bash
docker compose up -d --build
```

This command builds app images and starts all services in background mode.

### 3) Verify containers

```bash
docker compose ps
docker compose logs -f
```

### 4) Access applications

- Frontend: `http://localhost`
- Auth service health: `http://localhost:5001/health`
- Product service health: `http://localhost:5002/health`
- Order service health: `http://localhost:5003/health`
- User service health: `http://localhost:5004/health`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (default: `admin` / `admin123`)

### 5) Stop services

```bash
docker compose down
```

To also remove database volume:

```bash
docker compose down -v
```

## API Quick Check

- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- Products:
  - `GET /api/products`
- Orders:
  - `GET /api/orders`
- Users:
  - `GET /api/users`

Because Nginx in `frontend` only proxies configured paths, API calls from browser should be made via `http://localhost/api/...`.

## Monitoring

Each backend service exposes Prometheus metrics at `/metrics`. Prometheus scrape targets are defined in `monitoring/prometheus.yml`.

## Deployment

For production-style deployment options (Docker Swarm and Terraform-based infrastructure), see `DEPLOYMENT_GUIDE.md`.

## Notes

- Current stack uses PostgreSQL service host `postgres` inside Docker network.
- There is also a legacy `backend/` folder in the repository; current microservice deployment uses service folders listed above.
