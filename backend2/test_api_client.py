#!/usr/bin/env python3
"""
Test client for the Threat Intelligence API
"""
import requests
import json
from datetime import datetime

def test_top_20_cves_endpoint():
    """Test the top 20 CVEs endpoint"""
    
    api_url = "http://localhost:8001"
    endpoint = "/cves/top20"
    
    print("🔍 Testing Top 20 Critical CVEs API Endpoint")
    print("=" * 60)
    print(f"URL: {api_url}{endpoint}")
    
    try:
        response = requests.get(f"{api_url}{endpoint}", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ API Request Successful!")
            print(f"Status: {data.get('status')}")
            print(f"Collection Time: {data.get('collection_time')}")
            print(f"Total CVEs Processed: {data.get('total_cves_processed')}")
            print(f"Critical CVEs Found: {data.get('critical_cves_found')}")
            
            # Show criteria
            criteria = data.get('criteria', {})
            print(f"\n📋 Filtering Criteria:")
            print(f"  CVSS Threshold: {criteria.get('cvss_score_threshold')}")
            print(f"  Time Period: {criteria.get('time_period')}")
            print(f"  Sources: {', '.join(criteria.get('sources', []))}")
            
            # Show sources
            sources = data.get('sources', [])
            if sources:
                print(f"\n🌐 Data Sources:")
                for source in sources:
                    print(f"  • {source.get('source')}: {source.get('threats_found')} CVEs")
            
            # Show CVEs
            cves = data.get('top_20_critical_cves', [])
            if cves:
                print(f"\n🚨 Top {len(cves)} Critical CVEs:")
                print("-" * 60)
                for i, cve in enumerate(cves, 1):
                    print(f"{i:2d}. {cve.get('cve_id', 'N/A')} (CVSS: {cve.get('cvss_score', 'N/A')})")
                    print(f"    Source: {cve.get('source', 'N/A')}")
                    print(f"    Published: {cve.get('published_date', 'N/A')}")
                    print(f"    In News: {cve.get('in_news', False)}")
                    if cve.get('has_known_exploit'):
                        print(f"    🔥 Known Exploit: Yes")
                    print(f"    URL: {cve.get('source_url', 'N/A')}")
                    print()
            
            # Save response to file for inspection
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"api_response_top20_cves_{timestamp}.json"
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            print(f"💾 Response saved to: {filename}")
            return True
            
        else:
            print(f"❌ API Request Failed!")
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error!")
        print("   Make sure the API server is running:")
        print("   python start_api.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_other_endpoints():
    """Test other API endpoints"""
    
    api_url = "http://localhost:8001"
    endpoints = [
        "/",
        "/health",
        "/statistics"
    ]
    
    print(f"\n🔧 Testing Other API Endpoints")
    print("-" * 40)
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{api_url}{endpoint}", timeout=10)
            status_icon = "✅" if response.status_code == 200 else "❌"
            print(f"{status_icon} {endpoint}: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint}: Error - {e}")

if __name__ == "__main__":
    print("🧪 Threat Intelligence API Test Client")
    print("=" * 60)
    
    # Test main endpoint
    success = test_top_20_cves_endpoint()
    
    if success:
        # Test other endpoints
        test_other_endpoints()
    
    print(f"\n{'='*60}")
    print("📖 API Documentation available at: http://localhost:8001/docs")
    print("🔗 Interactive API testing at: http://localhost:8001/redoc")