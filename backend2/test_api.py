import pytest
import asyncio
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_endpoint():
    """Test the root health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "AI Agent API is running"
    assert response.json()["status"] == "healthy"

def test_health_endpoint():
    """Test the detailed health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["service"] == "AI Agent API"

def test_query_endpoint():
    """Test the main query endpoint"""
    test_query = {
        "query_input": "Hello, how are you?",
        "user_id": "test_user",
        "session_id": "test_session"
    }
    
    response = client.post("/query", json=test_query)
    assert response.status_code == 200
    
    data = response.json()
    assert "response" in data
    assert "query_input" in data
    assert "processing_time" in data
    assert data["query_input"] == test_query["query_input"]
    assert data["user_id"] == test_query["user_id"]
    assert data["session_id"] == test_query["session_id"]

def test_chat_endpoint():
    """Test the chat endpoint (removed from main.py)"""
    # This endpoint was removed, so we'll test the query endpoint instead
    test_message = {
        "query_input": "What is artificial intelligence?",
        "session_id": "chat_session"
    }
    
    response = client.post("/query", json=test_message)
    assert response.status_code == 200
    
    data = response.json()
    assert "response" in data
    assert isinstance(data["response"], str)

def test_empty_query():
    """Test handling of empty queries"""
    empty_query = {"query_input": ""}
    
    response = client.post("/query", json=empty_query)
    assert response.status_code == 400
    assert "Query cannot be empty" in response.json()["detail"]

def test_missing_query():
    """Test handling of missing query field"""
    response = client.post("/query", json={})
    assert response.status_code == 422  # Validation error

def test_query_with_whitespace_only():
    """Test handling of queries with only whitespace"""
    whitespace_query = {"query_input": "   "}
    
    response = client.post("/query", json=whitespace_query)
    assert response.status_code == 400
    assert "Query cannot be empty" in response.json()["detail"]

if __name__ == "__main__":
    pytest.main([__file__])