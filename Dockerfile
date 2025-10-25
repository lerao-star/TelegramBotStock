# Use Node.js with Debian (needed for Chrome dependencies)
FROM node:18-bullseye-slim

# Install Chrome dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# set working directory
WORKDIR /app

# copy package manifests
COPY package*.json ./

# install deps (include dev for Puppeteer)
RUN npm ci || npm install

# copy app source
COPY . .

# environment
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH="/usr/bin/google-chrome"

EXPOSE 3000

# start app
CMD ["node", "index.js"]