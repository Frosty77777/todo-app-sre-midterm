# ── Stage 1: install dependencies ────────────────────────────────
FROM node:20-alpine AS builder
 
WORKDIR /app
 
# Copy package files first — Docker caches this layer separately
# so npm ci only re-runs when package.json actually change
COPY package*.json ./
RUN npm ci --only=production
 
# ── Stage 2: lean production image ───────────────────────────────
FROM node:20-alpine
 
WORKDIR /app
 
# Copy installed modules from builder
COPY --from=builder /app/node_modules ./node_modules
 
# Copy your full backend source tree:
#   Server.js, models/, controllers/, routes/, middleware/
COPY . .
 
# Non-root user for container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
 
EXPOSE 5000
 
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1
 
CMD ["node", "Server.js"]
 