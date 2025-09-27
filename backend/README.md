# Backend Docker Setup

This directory contains the Docker setup for the Order Protocol backend application.

## Quick Start

### Using Docker Compose (Recommended)
```bash
# Start the backend with MongoDB
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop the services
docker-compose down
```

### Using Docker Build Directly
```bash
# Build the image
docker build -t order-protocol-backend .

# Run with external MongoDB
docker run -d \
  --name order-protocol-backend \
  -p 5001:5001 \
  -e MONGODB_URI=mongodb://localhost:27017/orderprotocol \
  -e NODE_ENV=production \
  order-protocol-backend
```

## Environment Variables

Create a `.env` file with your configuration:

```bash
# Database
MONGODB_URI=mongodb://mongo:27017/orderprotocol

# Server
PORT=5001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000

# Blockchain
RPC_URL=https://testnet.evm.nodes.onflow.org
CONTRACT_ADDRESS=0x756523eDF6FfC690361Df3c61Ec3719F77e9Aa1a
RELAYER_PRIVATE_KEY=your_relayer_private_key

# RazorpayX (for payment verification)
RAZORPAYX_KEY_ID=your_key_id
RAZORPAYX_KEY_SECRET=your_key_secret
SKIP_RAZORPAY_VERIFICATION=true  # Set to false in production
```

## API Endpoints

- **Health Check**: `GET /health`
- **Orders**: `POST /api/orders`
- **Get Order**: `GET /api/orders/:orderId`
- **Accept Order**: `POST /api/orders/:orderId/accept`
- **Fulfill Order**: `POST /api/orders/:orderId/fulfill`

## Docker Image Details

- **Base Image**: `node:slim`
- **Working Directory**: `/app`
- **Exposed Port**: `5001`
- **Dependencies**: Automatically installed from `package.json`

## Development

For development with live reload:

```bash
# Install dependencies locally
npm install

# Start with nodemon
npm run dev

# Or use docker-compose with development override
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Services

### Backend
- **Port**: 5001
- **Environment**: Production
- **Dependencies**: MongoDB

### MongoDB
- **Version**: 7
- **Port**: 27017
- **Data**: Persisted in Docker volume `mongo_data`

## Troubleshooting

1. **Port already in use**: Change the port mapping in `docker-compose.yml`
2. **MongoDB connection issues**: Ensure MongoDB container is running
3. **Missing dependencies**: Rebuild the image with `docker-compose up --build`

## Commands

```bash
# Check container status
docker-compose ps

# View all logs
docker-compose logs

# Rebuild and restart
docker-compose up --build

# Clean up everything
docker-compose down -v
docker system prune
```