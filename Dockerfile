# This Dockerfile sets up a Node.js application with PM2 for process management.    
FROM node:18

# Set working directory
WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Copy package files and install dependencies
COPY package*.json ./
# Rebuild native dependencies for sqlite3
RUN npm install --build-from-source sqlite3
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application if needed (uncomment if you have a build step)
# RUN npm run build

# Create necessary directories and set permissions
RUN mkdir -p /usr/src/app/data && \
    chown -R node:node /usr/src/app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start the application with PM2
CMD ["node", "server.js"] 