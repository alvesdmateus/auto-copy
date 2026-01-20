# auto-copy

A web-based copywriting tool for designers and marketing teams to generate creatives and post text for info products, powered by a self-hosted Ollama LLM.

## Tech Stack

- **Backend:** Python 3.11+ with FastAPI
- **Frontend:** React 18 + Vite + TypeScript
- **Database:** SQLite with SQLAlchemy ORM
- **LLM:** Ollama (local)
- **Styling:** Tailwind CSS

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for Ollama)

### 1. Start Ollama with Docker

```bash
# Start the Ollama container
docker compose up -d

# Pull the default model (first time only)
docker exec auto-copy-ollama ollama pull llama3.2

# Verify Ollama is running
curl http://localhost:11434
```

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the App

Visit http://localhost:5173 in your browser.

## Docker Commands

```bash
docker compose up -d      # Start Ollama
docker compose down       # Stop Ollama
docker compose logs -f    # View logs
```

## Environment Variables

Create a `.env` file in the `backend/` directory (see `backend/.env.example`):

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL=sqlite+aiosqlite:///./auto_copy.db
```

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for the interactive API documentation.
