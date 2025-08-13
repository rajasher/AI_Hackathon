#!/usr/bin/env python3
"""
Start the Threat Intelligence API Server
"""
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting Threat Intelligence API Server...")
    print("📡 API will be available at: http://localhost:8001")
    print("📋 API Documentation: http://localhost:8001/docs")
    print("🔗 Top 20 CVEs Endpoint: http://localhost:8001/cves/top20")
    print("=" * 60)
    
    uvicorn.run(
        "threat_intelligence_api:app",  # Use import string instead of direct app object
        host="0.0.0.0", 
        port=8001,
        reload=True,
        log_level="info"
    )