# Use official Node.js LTS image
FROM node:18-alpine

# set working directory
WORKDIR /app

# copy package manifests
COPY package*.json ./

# install deps (prefer npm ci if lock exists, fallback to npm install)
RUN npm ci --omit=dev || npm install --production

# copy app source
COPY . .

# environment
ENV PORT=3000
EXPOSE 3000

# start app
CMD ["node", "index.js"]
