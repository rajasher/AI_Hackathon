# AI Agent API

A Python FastAPI backend that receives user queries, processes them through an AI agent, and returns intelligent responses.

## Features

- **FastAPI-based REST API** with automatic OpenAPI documentation
- **Multiple AI Provider Support**: OpenAI, Anthropic Claude, Google Gemini, Ollama, or Mock responses
- **Session Management**: Maintains conversation history for continuity
- **CORS Support**: Ready for frontend integration
- **Health Check Endpoints**: Monitor API status
- **Comprehensive Error Handling**: Graceful error responses
- **Logging**: Detailed request/response logging

## Quick Start

### 1. Installation

```bash
# Clone or navigate to the project directory
cd backend2

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Create a `.env` file in the project root:

```bash
# AI Provider Configuration
AI_PROVIDER=mock  # Options: mock, openai, anthropic, gemini, ollama
AI_MODEL=gpt-3.5-turbo  # Model name (provider-specific)
AI_API_KEY=your_api_key_here  # Required for cloud providers

# Optional: Ollama configuration (if using local LLM)
OLLAMA_URL=http://localhost:11434
```

### 3. Run the API

```bash
# Start the development server
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health status

### Query Processing
- `POST /query` - Main endpoint for processing user queries
- `POST /chat` - Simplified chat endpoint

## API Usage Examples

### Basic Query

```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Hello, how can you help me today?"
  }'
```

### Query with Session Management

```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is machine learning?",
    "user_id": "user123",
    "session_id": "session456"
  }'
```

### Chat Endpoint

```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain quantum computing",
    "session_id": "session789"
  }'
```

## Request/Response Format

### Query Request
```json
{
  "query": "Your question here",
  "user_id": "optional_user_id",
  "session_id": "optional_session_id"
}
```

### Query Response
```json
{
  "response": "AI agent's response",
  "query": "Original user query",
  "user_id": "user_id",
  "session_id": "session_id",
  "processing_time": 1.23
}
```

## AI Provider Setup

### OpenAI
1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Uncomment OpenAI dependency in `requirements.txt`
3. Set environment variables:
   ```bash
   AI_PROVIDER=openai
   AI_MODEL=gpt-3.5-turbo
   AI_API_KEY=your_openai_api_key
   ```

### Anthropic Claude
1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Uncomment Anthropic dependency in `requirements.txt`
3. Set environment variables:
   ```bash
   AI_PROVIDER=anthropic
   AI_MODEL=claude-3-sonnet-20240229
   AI_API_KEY=your_anthropic_api_key
   ```

### Google Gemini
1. Get API key from [Google AI Studio](https://makersuite.google.com/)
2. Uncomment Gemini dependency in `requirements.txt`
3. Set environment variables:
   ```bash
   AI_PROVIDER=gemini
   AI_MODEL=gemini-pro
   AI_API_KEY=your_google_api_key
   ```

### Ollama (Local LLM)
1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama2`
3. Uncomment aiohttp dependency in `requirements.txt`
4. Set environment variables:
   ```bash
   AI_PROVIDER=ollama
   AI_MODEL=llama2
   OLLAMA_URL=http://localhost:11434
   ```

## Development

### Interactive API Documentation

FastAPI automatically generates interactive API documentation:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### Project Structure

```
backend2/
├── main.py              # FastAPI application and endpoints
├── ai_agent.py          # AI agent service with provider integrations
├── requirements.txt     # Python dependencies
├── README.md           # This file
└── .env                # Environment variables (create this)
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AI_PROVIDER` | AI provider to use | `mock` | No |
| `AI_MODEL` | Model name for the provider | `gpt-3.5-turbo` | No |
| `AI_API_KEY` | API key for cloud providers | None | Yes (for cloud providers) |
| `OLLAMA_URL` | Ollama server URL | `http://localhost:11434` | No |

## Production Deployment

### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using Gunicorn

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UnicornWorker --bind 0.0.0.0:8000
```

## Error Handling

The API includes comprehensive error handling:
- **400 Bad Request**: Invalid or empty queries
- **500 Internal Server Error**: AI provider errors or system issues
- All errors include descriptive messages

## Session Management

The API maintains conversation history per session:
- Use `session_id` to maintain context across multiple queries
- History is kept in memory (last 10 exchanges per session)
- For production, consider using Redis or a database for persistence

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).