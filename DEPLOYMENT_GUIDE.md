# Deployment Guide

This guide covers deployment paths available in this repository:

1. Docker Compose (single host)
2. Docker Swarm stack
3. Terraform provisioning for AWS EC2 host

## 1) Docker Compose Deployment (Single Host)

Use this for local production-like testing or a small single-server setup.

### Steps

```bash
docker compose up -d --build
docker compose ps
```

### Validate

- App: `http://<host-ip-or-domain>`
- Prometheus: `http://<host-ip-or-domain>:9090`
- Grafana: `http://<host-ip-or-domain>:3001`

### Rolling restart (single services)

```bash
docker compose up -d --build auth-service
docker compose up -d --build product-service
docker compose up -d --build order-service
docker compose up -d --build user-service
docker compose up -d --build frontend
```

### Shutdown

```bash
docker compose down
```

## 2) Docker Swarm Deployment

Use this when you need Swarm scheduling, replicas, and service-level updates.

The repo includes `docker-stack.yml` with overlays, deploy rules, and monitoring services.

### Prerequisites

- Docker Engine with Swarm support
- Node initialized as Swarm manager
- Images available to your nodes (local build for single-node Swarm, or registry for multi-node)

### Steps (single-node Swarm)

```bash
docker swarm init
docker build -t todo-frontend:latest ./frontend
docker build -t todo-backend:latest ./backend
docker stack deploy -c docker-stack.yml todoapp
```

### Operate stack

```bash
docker stack services todoapp
docker service ps todoapp_frontend
docker service ps todoapp_backend
docker service logs todoapp_backend
```

### Scale services

```bash
docker service scale todoapp_backend=3
```

### Remove stack

```bash
docker stack rm todoapp
```

## 3) Terraform + AWS EC2 Provisioning

Use Terraform configuration in `terraform/` to provision an EC2 instance and security group.

### Important

Current Terraform provider block is configured with mock credentials placeholders. Replace with secure, real AWS authentication before running in a real AWS account.

### Files

- `terraform/main.tf` - AWS provider, security group, EC2 instance
- `terraform/variables.tf` - required inputs like AMI and key pair
- `terraform/outputs.tf` - instance IP/DNS and security group outputs

### Configure variables

Create `terraform/terraform.tfvars`:

```hcl
project_name  = "todo-microservices"
aws_region    = "us-east-1"
instance_type = "t3.micro"
ubuntu_ami_id = "ami-xxxxxxxxxxxxxxxxx"
key_name      = "your-keypair-name"
```

### Deploy infra

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Get outputs

```bash
terraform output
```

After instance provisioning, SSH into the EC2 host, install Docker, copy the repository, and run Compose or Swarm deployment there.

## Production Readiness Checklist

Before production rollout:

- Replace default secrets (`JWT_SECRET`, database credentials, Grafana admin password).
- Restrict open ingress ports (`22`, `80`, `3001`, `9090`) to trusted ranges.
- Use TLS with a reverse proxy or load balancer.
- Use managed image registry and pinned image tags.
- Add backup policy for PostgreSQL volume.
- Validate Prometheus alert rules against active job names.

## Troubleshooting

- Service unhealthy: check `docker compose logs <service>`.
- DB connectivity failures: ensure PostgreSQL container is running and network alias is `postgres`.
- Missing metrics: verify each service `/metrics` endpoint and `monitoring/prometheus.yml` targets.
- Swarm service pending: verify node resources and image availability.
