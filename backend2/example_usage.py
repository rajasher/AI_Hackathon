#!/usr/bin/env python3
"""
Example usage of the AI Agent API with get_updates tool
"""
import asyncio
import requests
import json

# API endpoint
API_BASE = "http://localhost:8000"

def test_basic_query():
    """Test a basic query without tool usage"""
    response = requests.post(f"{API_BASE}/query", json={
        "query_input": "Hello, how can you help me today?",
        "session_id": "demo_session_1"
    })
    
    print("=== Basic Query ===")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_weather_query():
    """Test a weather-related query that should trigger get_updates tool"""
    response = requests.post(f"{API_BASE}/query", json={
        "query_input": "What's the current weather like?",
        "session_id": "demo_session_2"
    })
    
    print("=== Weather Query (should use get_updates tool) ===")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_news_query():
    """Test a news-related query that should trigger get_updates tool"""
    response = requests.post(f"{API_BASE}/query", json={
        "query_input": "What are the latest news updates in technology?",
        "session_id": "demo_session_3"
    })
    
    print("=== News Query (should use get_updates tool) ===")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_conversation_context():
    """Test conversation context with multiple queries in the same session"""
    session_id = "demo_session_4"
    
    # First query
    response1 = requests.post(f"{API_BASE}/query", json={
        "query_input": "Can you get me updates about the stock market?",
        "session_id": session_id
    })
    
    print("=== First Query in Conversation ===")
    print(f"Response: {json.dumps(response1.json(), indent=2)}")
    print()
    
    # Follow-up query
    response2 = requests.post(f"{API_BASE}/query", json={
        "query_input": "What about the weather forecast?",
        "session_id": session_id
    })
    
    print("=== Follow-up Query in Same Session ===")
    print(f"Response: {json.dumps(response2.json(), indent=2)}")
    print()

def test_health_endpoints():
    """Test the health check endpoints"""
    print("=== Health Check Endpoints ===")
    
    # Basic health
    response = requests.get(f"{API_BASE}/")
    print(f"Root endpoint: {response.json()}")
    
    # Detailed health
    response = requests.get(f"{API_BASE}/health")
    print(f"Health endpoint: {response.json()}")
    print()

if __name__ == "__main__":
    print("Testing AI Agent API with get_updates tool")
    print("=" * 50)
    print()
    
    try:
        # Test health endpoints first
        test_health_endpoints()
        
        # Test various query types
        test_basic_query()
        test_weather_query()
        test_news_query()
        test_conversation_context()
        
        print("All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API.")
        print("Make sure the API is running on http://localhost:8000")
        print("Run: python main.py")
    except Exception as e:
        print(f"Error: {e}")