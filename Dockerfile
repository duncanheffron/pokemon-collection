FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create data directory if it doesn't exist
RUN mkdir -p data

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]

