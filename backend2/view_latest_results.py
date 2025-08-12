#!/usr/bin/env python3
"""
View Latest Threat Intelligence Results
Simple script to view the most recent JSON export
"""
import json
import glob
import os
from datetime import datetime

def view_latest_results():
    """View the latest threat intelligence results from JSON export"""
    
    # Find the latest export file
    export_files = glob.glob("threat_intelligence_export_*.json")
    if not export_files:
        print("❌ No export files found.")
        print("   Run: python scheduled_threat_collector.py once")
        return
    
    # Get the most recent file
    latest_file = max(export_files, key=os.path.getctime)
    
    try:
        with open(latest_file, 'r') as f:
            data = json.load(f)
        
        print("🛡️  LATEST THREAT INTELLIGENCE RESULTS")
        print("=" * 60)
        print(f"📁 File: {latest_file}")
        print(f"🕐 Collection Time: {data.get('collection_timestamp', 'Unknown')}")
        
        # Collection summary
        results = data.get('collection_results', {})
        print(f"\n📊 Collection Summary:")
        print(f"  Status: {results.get('status', 'Unknown')}")
        print(f"  Searches performed: {results.get('searches_performed', 0)}")
        print(f"  Threats found: {results.get('threats_found', 0)}")
        print(f"  Threats stored: {results.get('threats_stored', 0)}")
        
        # Database statistics
        db_stats = data.get('database_stats', {})
        print(f"\n📈 Database Statistics:")
        print(f"  Total threats: {db_stats.get('total_threats', 0)}")
        print(f"  Severity distribution: {db_stats.get('severity_distribution', {})}")
        print(f"  Threat types: {db_stats.get('threat_type_distribution', {})}")
        
        # Show threats
        threats = data.get('threats', [])
        if threats:
            print(f"\n🚨 ALL THREATS ({len(threats)} found):")
            print("-" * 60)
            
            # Group by severity
            severity_groups = {}
            cve_2025_threats = []
            
            for threat in threats:
                severity = threat.get('severity', 'unknown')
                if severity not in severity_groups:
                    severity_groups[severity] = []
                severity_groups[severity].append(threat)
                
                # Check for 2025 CVEs
                if threat.get('cve_ids'):
                    for cve_id in threat['cve_ids']:
                        if '2025' in cve_id:
                            cve_2025_threats.append(threat)
                            break
            
            # Show by severity
            severity_order = ['critical', 'high', 'medium', 'low']
            for severity in severity_order:
                if severity in severity_groups:
                    emoji = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢'}[severity]
                    print(f"\n{emoji} {severity.upper()} SEVERITY ({len(severity_groups[severity])} threats):")
                    
                    for threat in severity_groups[severity][:5]:  # Show first 5
                        title = threat.get('title', 'Unknown')
                        cve_info = f" [CVEs: {', '.join(threat.get('cve_ids', []))}]" if threat.get('cve_ids') else ""
                        print(f"  • {title}{cve_info}")
            
            # Show 2025 CVE vulnerabilities specifically
            if cve_2025_threats:
                print(f"\n🛡️  2025 CVE VULNERABILITIES ({len(cve_2025_threats)} found):")
                print("-" * 50)
                
                for threat in cve_2025_threats:
                    print(f"\n🔒 {threat.get('title', 'Unknown')}")
                    print(f"   CVE IDs: {', '.join(threat.get('cve_ids', []))}")
                    print(f"   Severity: {threat.get('severity', 'unknown')}")
                    print(f"   Confidence: {threat.get('confidence_score', 'unknown')}")
                    desc = threat.get('description', '')
                    if desc:
                        print(f"   Description: {desc[:100]}...")
            else:
                print(f"\n⚠️  No 2025 CVE vulnerabilities found in this collection.")
        
        else:
            print(f"\n⚠️  No threats found in export file.")
    
    except Exception as e:
        print(f"❌ Error reading {latest_file}: {e}")

if __name__ == "__main__":
    view_latest_results()