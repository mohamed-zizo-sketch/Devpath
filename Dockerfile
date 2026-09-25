# DEVPATH Production Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port (Render/Railway automatically sets PORT env)
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
