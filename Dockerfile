FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Initialize database, fix passwords, reset JWT, verify JWT, clean duplicates, and start the application
CMD ["sh", "-c", "npm run init-railway-db && npm run fix-passwords && npm run reset-jwt && npm run verify-jwt && npm run clean-duplicates && npm run migrate-shifts && npm start"] 