#!/usr/bin/env python3
"""
Scheduled Threat Intelligence Collector
Runs autonomous threat hunting on a schedule
"""
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any
from threat_intelligence_agent import ThreatIntelligenceAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ScheduledThreatCollector:
    """Scheduler for autonomous threat intelligence collection"""
    
    def __init__(self, interval_hours: int = 6):
        self.interval_hours = interval_hours
        self.running = False
        self.last_run_time = None
        self.agent = None
    
    async def start_scheduled_collection(self):
        """Start the scheduled collection loop"""
        logger.info(f"Starting scheduled threat collection (every {self.interval_hours} hours)")
        self.running = True
        
        while self.running:
            try:
                await self.run_collection_cycle()
                
                # Calculate next run time
                next_run = datetime.now() + timedelta(hours=self.interval_hours)
                logger.info(f"Next collection scheduled for: {next_run}")
                
                # Sleep until next run
                sleep_seconds = self.interval_hours * 3600
                await asyncio.sleep(sleep_seconds)
                
            except Exception as e:
                logger.error(f"Error in scheduled collection: {e}")
                # Wait 1 hour before retrying on error
                await asyncio.sleep(3600)
    
    async def run_collection_cycle(self) -> Dict[str, Any]:
        """Run a single collection cycle"""
        logger.info("Starting threat intelligence collection cycle")
        self.last_run_time = datetime.now()
        
        async with ThreatIntelligenceAgent() as agent:
            self.agent = agent
            
            # Run autonomous threat hunting
            result = await agent.autonomous_threat_hunting()
            
            # Log results
            logger.info(f"Collection completed - Status: {result.get('status')}")
            logger.info(f"Sources processed: {result.get('sources_processed', 0)}")
            logger.info(f"Threats found: {result.get('threats_found', 0)}")
            logger.info(f"Threats stored: {result.get('threats_stored', 0)}")
            
            return result
    
    def stop_collection(self):
        """Stop the scheduled collection"""
        logger.info("Stopping scheduled threat collection")
        self.running = False
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current status of the scheduler"""
        return {
            "running": self.running,
            "interval_hours": self.interval_hours,
            "last_run_time": self.last_run_time.isoformat() if self.last_run_time else None,
            "next_run_time": (self.last_run_time + timedelta(hours=self.interval_hours)).isoformat() if self.last_run_time else None
        }

async def run_once():
    """Run threat collection once (for testing)"""
    print("🔄 Running One-Time Threat Collection")
    print("=" * 50)
    
    async with ThreatIntelligenceAgent() as agent:
        result = await agent.autonomous_threat_hunting()
        
        print(f"\n📊 Collection Results:")
        print(f"Status: {result.get('status')}")
        print(f"Sources processed: {result.get('sources_processed', 0)}")
        print(f"Threats found: {result.get('threats_found', 0)}")
        print(f"Threats stored: {result.get('threats_stored', 0)}")
        
        if result.get('processed_sources'):
            print(f"\n🌐 Sources Processed:")
            for source in result['processed_sources']:
                print(f"  • {source['url']} → {source['threats_found']} threats")
        
        # Show database content
        stats = await agent.get_threat_statistics()
        print(f"\n📈 Database Statistics:")
        print(f"Total threats: {stats['database_stats']['total_threats']}")
        
        if stats['recent_threats']:
            print(f"\n🚨 Latest Threats:")
            for threat in stats['recent_threats'][:3]:
                print(f"  • {threat['title']} [{threat['severity']}]")
                print(f"    Source: {threat['source']}")
        
        # Export results to JSON automatically
        if stats['database_stats']['total_threats'] > 0:
            all_threats = await agent.search_threat_database("", None, None)
            export_data = {
                "collection_timestamp": datetime.now().isoformat(),
                "collection_results": result,
                "database_stats": stats['database_stats'],
                "threats": all_threats
            }
            
            filename = f"threat_intelligence_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(filename, 'w') as f:
                json.dump(export_data, f, indent=2, default=str)
            
            print(f"\n💾 Exported {len(all_threats)} threats to: {filename}")
        
        return result

async def start_scheduler(hours: int = 6):
    """Start the scheduler for continuous collection"""
    print(f"🕐 Starting Scheduled Collection (every {hours} hours)")
    print("Press Ctrl+C to stop")
    print("=" * 50)
    
    collector = ScheduledThreatCollector(interval_hours=hours)
    
    try:
        await collector.start_scheduled_collection()
    except KeyboardInterrupt:
        print("\n⏹️ Stopping scheduler...")
        collector.stop_collection()

async def main():
    """Main function - choose mode"""
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "schedule":
            hours = int(sys.argv[2]) if len(sys.argv) > 2 else 6
            await start_scheduler(hours)
        elif sys.argv[1] == "once":
            await run_once()
        else:
            print("Usage: python scheduled_threat_collector.py [once|schedule] [hours]")
    else:
        # Default: run once
        await run_once()

if __name__ == "__main__":
    asyncio.run(main())