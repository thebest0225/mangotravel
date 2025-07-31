
#!/bin/bash

# External server startup script
echo "Starting MangoTravel on external server..."

# Load environment variables from .env.production
if [ -f .env.production ]; then
    echo "Loading environment variables from .env.production..."
    export $(grep -v '^#' .env.production | xargs)
else
    echo "Warning: .env.production file not found"
fi

# Override or set default values
export NODE_ENV=production
export PORT=${PORT:-8888}

# Set default values if environment variables are not provided
export SESSION_SECRET=${SESSION_SECRET:-"mangogo-travel-production-secret-$(date +%s)"}

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not set. Please check your .env.production file."
    exit 1
fi

echo "Environment variables loaded successfully"
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..." # Show only first 30 chars for security

# Build the application
echo "Building application..."
npm run build

# Start the application
echo "Starting server on port $PORT..."
npm start
