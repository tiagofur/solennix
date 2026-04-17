# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (using package.lock if available)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
# We need VITE_API_URL at build time for the SPA to know where the backend is
# This can be overridden or set via args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

# Final stage: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
