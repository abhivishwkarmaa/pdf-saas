FROM node:20-slim

# Install background document and video conversion packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libreoffice \
    ghostscript \
    tesseract-ocr \
    qpdf \
    poppler-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace settings
COPY package*.json ./

# Copy dependency packages
COPY packages/ ./packages/
COPY worker/ ./worker/

# Install workspace dependencies and generate Prisma Client
RUN npm ci
RUN npx prisma generate --schema worker/prisma/schema.prisma

WORKDIR /app/worker
RUN npm run build

CMD ["npm", "start"]
