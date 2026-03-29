# Rescue Chat

A WIP real-time messaging application built with FastAPI and React. Features WebSocket-based chat, presence tracking, and voice-ready architecture.

## Features

- Real-time messaging via WebSockets
- Server and channel management
- Online/offline presence tracking
- JWT authentication with refresh tokens
- Scalable architecture with Redis pub/sub
- Cursor-based message pagination

## Tech Stack

**Backend**
- FastAPI + Python 3.12
- PostgreSQL + SQLAlchemy (async)
- Alembic migrations
- Redis pub/sub
- WebSockets

**Frontend**
- React + Vite
- Zustand state management
- shadcn/ui components
- Tailwind CSS

**Infrastructure**
- Docker + Docker Compose
- Nginx (production)

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Development

1. Clone the repository:
```bash
git clone https://github.com/sypai1337/rescue-chat.git
cd rescue-chat
```

2. Create `.env` file in the root directory(see env.example)

3. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

4. Open your browser:
   - Frontend: http://localhost:5173
   - Backend API docs: http://localhost:8000/docs

### Production

1. Create `.env` file in the root directory(see env.example)


2. Start the production environment:
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

3. Open http://localhost

## Project Structure
```
rescue-chat/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # FastAPI routers
│   │   ├── core/               # Config, security, dependencies
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── websockets/         # WebSocket handlers and manager
│   ├── alembic/                # Database migrations
│   └── tests/                  # pytest tests
└── frontend/
    └── src/
        ├── api/                # Axios instance
        ├── components/         # React components
        ├── hooks/              # Custom hooks
        ├── pages/              # Page components
        └── store/              # Zustand stores
```

## API Documentation

Available at http://localhost:8000/docs when running the development environment.

## Running Tests
```bash
cd backend
pytest tests/ -v
```