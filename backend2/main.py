from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from typing import Optional
import asyncio
from ai_agent import AIAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Agent API",
    description="API endpoint that processes user queries through an AI agent",
    version="1.0.0"
)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Agent
ai_agent = AIAgent()

# Request/Response models
class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class QueryResponse(BaseModel):
    response: str
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    processing_time: float

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "AI Agent API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Agent API",
        "version": "1.0.0"
    }

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """
    Main endpoint that receives user queries and processes them through the AI agent
    
    Args:
        request: QueryRequest containing the user's query and optional metadata
        
    Returns:
        QueryResponse with the AI agent's response and metadata
    """
    import time
    start_time = time.time()
    
    try:
        logger.info(f"Processing query: {request.query[:100]}...")
        
        # Validate input
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Process query through AI agent
        agent_response = await ai_agent.process_query(
            query=request.query,
            user_id=request.user_id,
            session_id=request.session_id
        )
        
        processing_time = time.time() - start_time
        
        logger.info(f"Query processed successfully in {processing_time:.2f}s")
        
        return QueryResponse(
            response=agent_response,
            query=request.query,
            user_id=request.user_id,
            session_id=request.session_id,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/chat")
async def chat_endpoint(request: QueryRequest):
    """
    Alternative chat endpoint with simplified response format
    """
    try:
        logger.info(f"Processing chat message: {request.query[:100]}...")
        
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Process query through AI agent
        response = await ai_agent.process_query(
            query=request.query,
            user_id=request.user_id,
            session_id=request.session_id
        )
        
        return {"message": response}
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")