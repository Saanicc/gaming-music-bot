# Docker Setup

This document describes how to build and run the Gaming Discord Bot with Docker Compose, including MongoDB.

---

## Docker Setup

This project can be run using Docker. You can build the bot image manually using npm scripts.

### 1️⃣ Build the Docker Image Manually

The following npm scripts are available:

```bash
# Build the Docker image locally
npm run docker-build

# Save the image as a tarball (optional)
npm run docker-save

# Build production: compile, build, and save
npm run build-prod
```

> After building, the image `gaming-music-bot:latest` will be available locally for Compose.

---

### 2️⃣ Run Docker Compose

Make sure you have a `.env` file with the following variables:

```env
# Discord bot
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-client-id
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
YOUTUBE_COOKIE=your-youtube-cookie

# Mongo DB
MONGO_INITDB_DATABASE=musicbotdb                # Change if you want
MONGO_URI=mongodb://mongodb:27017/musicbotdb    # Authentication disabled by default
```

#### Use pre-built image

```bash
docker compose up -d
```

> Make sure the image `gaming-music-bot:latest` exists locally (built via npm script).

#### Example docker-compose.yml

```yaml
services:
  gaming-music-bot:
    image: gaming-music-bot:latest
    container_name: gaming-music-bot
    restart: unless-stopped
    env_file: ./.env
    depends_on:
      - mongodb
    networks:
      - default
    # Optional: add custom network if desired
    # networks:
    #   custom_network:
    #     ipv4_address: 192.168.x.x

  mongodb:
    image: mongodb/mongodb-community-server:8.0.15-ubi8
    container_name: mongodb
    restart: unless-stopped
    env_file: ./.env
    volumes:
      - ./db:/data/db
    networks:
      - default
    # Optional: add network settings manually if desired
    # networks:
    #   custom_network:
    #     ipv4_address: 192.168.x.x

networks:
  default:
    driver: bridge
```

---

### 3️⃣ MongoDB Service

- The bot connects using the hostname `mongodb` (Docker internal DNS).
- Authentication is disabled for simplicity.

---

### 5️⃣ Common Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

---

### Quick Start Summary

1. Build the image:

```bash
npm run docker-build
```

2. Start the bot + MongoDB:

```bash
docker compose up -d
```

4. Stop containers when done:

```bash
docker compose down
```
