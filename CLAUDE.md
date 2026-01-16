# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**auto-copy** is a web-based copywriting tool for designers and marketing teams to generate creatives and post text for info products, powered by a self-hosted Ollama LLM.

## Tech Stack

- **Backend:** Python 3.11+ with FastAPI
- **Frontend:** React 18 + Vite + TypeScript
- **Database:** SQLite with SQLAlchemy ORM
- **LLM:** Ollama (local)
- **Styling:** Tailwind CSS

## Development Commands

### Backend

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Prerequisites

- Python 3.11+
- Node.js 18+
- Ollama installed and running locally with a model (e.g., `ollama run llama3.2`)

## Architecture

```
auto-copy/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry + template seeding
│   │   ├── config.py            # Settings (Ollama URL, DB path)
│   │   ├── database.py          # SQLite async connection
│   │   ├── models/              # SQLAlchemy models (Generation, Template)
│   │   ├── routers/             # API endpoints (generate, templates, history)
│   │   ├── services/            # Ollama API client
│   │   └── schemas/             # Pydantic schemas
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Home, History pages
│   │   ├── api/                 # API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── CLAUDE.md
```

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Generate copy (streaming SSE) |
| POST | `/api/generate/sync` | Generate copy (non-streaming) |
| GET | `/api/templates` | List all templates |
| POST | `/api/templates` | Create custom template |
| GET | `/api/history` | List generation history |
| POST | `/api/history/{id}/favorite` | Toggle favorite |
| DELETE | `/api/history/{id}` | Delete history item |

## Environment Variables

Create a `.env` file in the `backend/` directory:

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL=sqlite+aiosqlite:///./auto_copy.db
```
