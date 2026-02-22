# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package.json from ROOT (workspace) and APP
# (Assuming you use workspaces, if not, adjust paths)
COPY web/package.json web/package-lock.json ./web/

WORKDIR /app/web

# Install dependencies (from root so shared deps work)
RUN npm install

WORKDIR /app
# Copy Source Code
COPY shared ./shared
COPY ./web ./web

# Build
WORKDIR /app/web
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
# Copy build artifacts from previous stage
COPY --from=builder /app/web/dist /usr/share/nginx/html
# (Optional) Add custom nginx.conf if you use React Router
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]