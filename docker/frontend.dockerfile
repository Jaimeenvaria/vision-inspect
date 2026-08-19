# Stage 1: Build React Application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package descriptors and lockfiles
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ .

# Build application
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy built assets from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx config for client-side routing
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
