FROM node:20-slim

WORKDIR /app

# Copy root workspace settings
COPY package*.json ./

# Copy dependencies and source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN npm ci

WORKDIR /app/apps/api
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
