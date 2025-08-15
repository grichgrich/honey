FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
# Install with relaxed peer dep resolution for CI
RUN npm install --legacy-peer-deps

# Copy app source
COPY . ./

# Build frontend
RUN npm run build

# Expose ports
EXPOSE 8001

# Start backend and frontend
CMD node server.js