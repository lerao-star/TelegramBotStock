# Dockerfile for indo-stock-bot
# Uses Debian slim + Node. Installs system libs Puppeteer/Chromium needs.

FROM node:20-bullseye-slim

# Install necessary packages for Puppeteer/Chromium
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    gnupg \
  && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package manifests and install dependencies
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Set sensible defaults
ENV NODE_ENV=production
ENV PUPPETEER_HEADLESS=1
ENV TZ=Asia/Jakarta

# If you prefer to use the system Chromium (to avoid puppeteer's download),
# uncomment the following lines to install Chromium via apt and skip the
# puppeteer chromium download. Note: this increases image size.
# RUN apt-get update && apt-get install -y chromium && rm -rf /var/lib/apt/lists/*
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Bot does not expose an HTTP port; it uses Telegram polling.
# Start the bot
CMD ["node", "index.js"]
