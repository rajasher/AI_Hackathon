"""
FastAPI application for the Threat Intelligence Agent
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import logging
from datetime import datetime

from threat_intelligence_agent import SimpleThreatAgentContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Threat Intelligence Agent API",
    description="API for analyzing threat intelligence from various websites",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class CollectionRequest(BaseModel):
    urls: List[str]
    ai_instructions: Optional[str] = None
    run_in_background: bool = False

class CollectionResponse(BaseModel):
    status: str
    message: str
    websites_processed: int
    sources_checked: List[str]
    analysis_results: List[Dict[str, Any]]

class SearchRequest(BaseModel):
    query: str

class CVERequest(BaseModel):
    cve_id: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    database_stats: Dict[str, Any]

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "Threat Intelligence Agent API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with database statistics"""
    try:
        async with SimpleThreatAgentContext() as agent:
            stats = await agent.get_threat_statistics()
            return HealthResponse(
                status="healthy",
                timestamp=datetime.now().isoformat(),
                version="1.0.0",
                database_stats=stats["database_stats"]
            )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.post("/autonomous-hunt")
async def autonomous_threat_hunting(background_tasks: BackgroundTasks, run_in_background: bool = False):
    """Trigger autonomous threat hunting using real web search"""
    try:
        if run_in_background:
            # Run hunting in background
            background_tasks.add_task(autonomous_hunt_background)
            return {
                "status": "success",
                "message": "Autonomous threat hunting started in background"
            }
        else:
            # Run hunting synchronously
            async with SimpleThreatAgentContext() as agent:
                result = await agent.autonomous_threat_hunting()
                return {
                    "status": result["status"],
                    "message": f"Autonomous hunt completed: {result['threats_stored']} new threats found",
                    "collection_time": result["collection_time"],
                    "searches_performed": result["searches_performed"],
                    "threats_found": result["threats_found"],
                    "threats_stored": result["threats_stored"],
                    "processed_searches": result["processed_searches"]
                }
                
    except Exception as e:
        logger.error(f"Failed to run autonomous threat hunting: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to run autonomous threat hunting: {str(e)}"
        )

async def autonomous_hunt_background():
    """Background task for autonomous threat hunting"""
    try:
        async with SimpleThreatAgentContext() as agent:
            result = await agent.autonomous_threat_hunting()
            logger.info(f"Background autonomous hunt completed: {result['threats_stored']} threats stored")
    except Exception as e:
        logger.error(f"Background autonomous hunt failed: {e}")

@app.post("/collect", response_model=CollectionResponse)
async def collect_threat_intelligence(
    request: CollectionRequest,
    background_tasks: BackgroundTasks
):
    """Legacy endpoint - now redirects to autonomous hunting"""
    try:
        # Since we now use real web search, redirect to autonomous hunting
        return await autonomous_threat_hunting(background_tasks, request.run_in_background)
                
    except Exception as e:
        logger.error(f"Failed to collect threat intelligence: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to collect threat intelligence: {str(e)}"
        )

async def collect_threat_intelligence_background(urls: List[str], ai_instructions: Optional[str]):
    """Background task for collecting threat intelligence"""
    try:
        async with ThreatIntelligenceAgent() as agent:
            await agent.collect_threat_intelligence_from_urls(urls, ai_instructions)
            logger.info(f"Background threat intelligence collection completed for {len(urls)} URLs")
    except Exception as e:
        logger.error(f"Background threat intelligence collection failed: {e}")

@app.get("/summary")
async def get_threat_summary():
    """Get a summary of current threats"""
    try:
        async with SimpleThreatAgentContext() as agent:
            summary = await agent.get_threat_statistics()
            return {
                "status": "success",
                "summary": summary
            }
    except Exception as e:
        logger.error(f"Failed to get threat summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get threat summary: {str(e)}")

@app.post("/search")
async def search_threats(request: SearchRequest):
    """Search threats by query"""
    try:
        async with SimpleThreatAgentContext() as agent:
            results = await agent.search_threat_database(request.query)
            return {
                "status": "success",
                "query": request.query,
                "results": results,
                "count": len(results)
            }
    except Exception as e:
        logger.error(f"Failed to search threats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search threats: {str(e)}")

@app.post("/cve")
async def get_cve_analysis(request: CVERequest):
    """Get detailed analysis for a specific CVE - search for CVE in database"""
    try:
        async with SimpleThreatAgentContext() as agent:
            results = await agent.search_threat_database(request.cve_id)
            cve_threats = [r for r in results if request.cve_id in ' '.join(r.get('cve_ids', []))]
            
            return {
                "status": "success",
                "cve_id": request.cve_id,
                "threats_found": len(cve_threats),
                "threats": cve_threats
            }
    except Exception as e:
        logger.error(f"Failed to get CVE analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get CVE analysis: {str(e)}")

@app.get("/threats/recent")
async def get_recent_threats(days: int = 7):
    """Get threats from the last N days"""
    try:
        async with SimpleThreatAgentContext() as agent:
            # Get all threats and filter recent ones
            results = await agent.search_threat_database("")
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_threats = [
                t for t in results 
                if datetime.fromisoformat(t['published_date'].replace('Z', '+00:00')) > cutoff_date
            ]
            
            return {
                "status": "success",
                "days": days,
                "threats": recent_threats,
                "count": len(recent_threats)
            }
    except Exception as e:
        logger.error(f"Failed to get recent threats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recent threats: {str(e)}")

@app.get("/threats/by-severity/{severity}")
async def get_threats_by_severity(severity: str):
    """Get threats filtered by severity"""
    try:
        async with SimpleThreatAgentContext() as agent:
            results = await agent.search_threat_database("", severity_filter=severity)
            return {
                "status": "success",
                "severity": severity,
                "threats": results,
                "count": len(results)
            }
    except Exception as e:
        logger.error(f"Failed to get threats by severity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get threats by severity: {str(e)}")

@app.get("/threats/by-type/{threat_type}")
async def get_threats_by_type(threat_type: str):
    """Get threats filtered by type"""
    try:
        async with SimpleThreatAgentContext() as agent:
            results = await agent.search_threat_database("", threat_type_filter=threat_type)
            return {
                "status": "success",
                "threat_type": threat_type,
                "threats": results,
                "count": len(results)
            }
    except Exception as e:
        logger.error(f"Failed to get threats by type: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get threats by type: {str(e)}")

@app.get("/statistics")
async def get_statistics():
    """Get comprehensive database statistics"""
    try:
        async with SimpleThreatAgentContext() as agent:
            stats = await agent.get_threat_statistics()
            return {
                "status": "success",
                "statistics": stats
            }
    except Exception as e:
        logger.error(f"Failed to get statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@app.get("/cves/top20")
async def get_top_20_critical_cves():
    """
    Get top 20 critical CVEs from NIST NVD and CISA KEV
    
    Returns the most critical vulnerabilities published on 2025-07-20 with:
    - CVSS score >= 9.7
    - From authoritative sources (NIST NVD, CISA KEV)
    - Known exploited vulnerabilities marked
    - News coverage information
    
    Response includes:
    - List of top 20 CVEs with details
    - Collection metadata and criteria
    - Source information
    """
    try:
        async with SimpleThreatAgentContext() as agent:
            result = await agent.get_top_20_critical_cves()
            
            if result.get("status") == "success":
                return {
                    "status": "success",
                    "collection_time": result.get("collection_time"),
                    "total_cves_processed": result.get("total_cves_processed"),
                    "critical_cves_found": result.get("critical_cves_found"),
                    "top_20_critical_cves": result.get("top_20_critical_cves"),
                    "criteria": result.get("criteria"),
                    "sources": result.get("processed_sources", [])
                }
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"CVE collection failed: {result.get('error', 'Unknown error')}"
                )
                
    except Exception as e:
        logger.error(f"Failed to get top 20 critical CVEs: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get top 20 critical CVEs: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 