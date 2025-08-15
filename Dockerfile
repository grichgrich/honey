FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . ./

# Expose ports
EXPOSE 8001
EXPOSE 5001

# Start backend and frontend
CMD node server.js