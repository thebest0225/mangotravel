
#!/bin/bash

# External server startup script
echo "Starting MangoTravel on external server..."

# Load production environment variables
export NODE_ENV=production
export PORT=8888

# Set default values if environment variables are not provided
export SESSION_SECRET=${SESSION_SECRET:-"mangogo-travel-production-secret-$(date +%s)"}

# Build the application
echo "Building application..."
npm run build

# Start the application
echo "Starting server on port 8888..."
npm start
