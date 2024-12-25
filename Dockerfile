# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies, but only production ones for the final image
RUN npm ci --only=production && \
    # Copy dev dependencies for build step
    npm ci

# Copy source code
COPY . .

# Build TypeScript files
RUN npm run build

# Production stage
FROM node:20-slim

ENV PORT=2567
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/build ./build

EXPOSE 2567

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:2567/__healthcheck', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Use non-root user for security
USER node

CMD [ "node", "build/index.js" ]