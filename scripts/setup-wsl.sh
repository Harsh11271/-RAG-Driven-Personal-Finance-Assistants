#!/bin/bash

# WSL Setup script for Finance Assistant
echo "🚀 Starting WSL environment setup..."

# 1. Update system
echo "📦 Updating system packages..."
sudo apt update

# 2. Install dependencies
echo "🛠️ Installing Python, Node.js, and build tools..."
sudo apt install -y python3-pip python3-venv nodejs npm git build-essential

# 3. Verify Docker access
if command -v docker &> /dev/null
then
    echo "✅ Docker detected. Please ensure 'WSL Integration' is enabled in Docker Desktop settings."
else
    echo "❌ Docker not detected. Please install Docker Desktop on Windows and enable WSL Integration."
fi

# 4. Setup Python Virtual Environment for Pathway
if [ -d "services/pathway-processor" ]; then
    echo "🐍 Setting up Pathway Processor environment..."
    cd services/pathway-processor
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    cd ../..
    echo "✅ Pathway environment ready."
fi

# 5. Install Node dependencies for main services
SERVICES=("api-gateway" "auth-service" "chat-service" "llm-service" "transaction-service" "compliance-service" "notification-service" "user-data-service")

for service in "${SERVICES[@]}"; do
    if [ -d "services/$service" ]; then
        echo "📦 Installing npm dependencies for $service..."
        cd "services/$service"
        npm install
        cd ../..
    fi
done

echo "🎉 WSL Setup Complete!"
echo "Next steps:"
echo "1. Run 'docker-compose up -d' for infrastructure."
echo "2. Start services as described in WSL_MIGRATION_GUIDE.md."
