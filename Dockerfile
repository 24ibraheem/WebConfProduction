# Multi-stage build: build frontend, install server deps, produce runtime image
FROM node:18-alpine AS builder
WORKDIR /app

# Copy root package.json if present (safe no-op if not)
COPY package*.json ./

# Install root deps if any (won't fail if none)
RUN if [ -f package.json ]; then npm ci --silent; fi

# Copy everything
COPY . .

# Build frontend (Vite) if package.json has a build script
RUN if npm run build --if-present; then echo "frontend built"; fi

# If server has its own package.json, install its deps
WORKDIR /app/server
RUN if [ -f package.json ]; then npm ci --production --silent; fi

# Runtime image
FROM node:18-alpine AS runtime
WORKDIR /app

# Copy server dependencies and code to root /app
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/config ./config
COPY --from=builder /app/server/models ./models
COPY --from=builder /app/server/utils ./utils
COPY --from=builder /app/server/server.js ./

# Copy built frontend (Vite 'dist') to /dist (where server.js expects it)
COPY --from=builder /app/dist /dist

ENV NODE_ENV=production
EXPOSE 3000

# Start server using npm start (which runs "node server.js")
CMD ["npm", "start"]
