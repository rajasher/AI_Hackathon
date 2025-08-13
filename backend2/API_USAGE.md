# Threat Intelligence API Usage

## Top 20 Critical CVEs Endpoint

### Endpoint
```
GET /cves/top20
```

### Description
Returns the top 20 most critical CVEs from authoritative sources (NIST NVD and CISA KEV) published on 2025-07-20.

### Filtering Criteria
- **CVSS Score**: >= 9.7
- **Date**: 2025-07-20 (single day)
- **Sources**: NIST NVD and CISA Known Exploited Vulnerabilities
- **Additional Filters**: Known exploits and news coverage

### Response Format
```json
{
  "status": "success",
  "collection_time": "2025-07-20T...",
  "total_cves_processed": 1,
  "critical_cves_found": 1,
  "top_20_critical_cves": [
    {
      "cve_id": "CVE-2025-53770",
      "title": "KEV Critical: Microsoft SharePoint...",
      "description": "Microsoft SharePoint: Microsoft SharePoint Server...",
      "cvss_score": 9.5,
      "published_date": "2025-07-20",
      "source": "CISA KEV",
      "severity": "CRITICAL",
      "in_news": true,
      "has_known_exploit": true,
      "vendor_project": "Microsoft",
      "product": "SharePoint",
      "source_url": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
    }
  ],
  "criteria": {
    "cvss_score_threshold": 9.7,
    "time_period": "2025-07-20 (single day)",
    "sources": ["NIST NVD", "CISA KEV"],
    "additional_filters": ["Known exploits", "In news"]
  },
  "sources": [
    {
      "url": "https://services.nvd.nist.gov/rest/json/cves/2.0",
      "source": "NIST NVD",
      "threats_found": 0
    },
    {
      "url": "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      "source": "CISA KEV", 
      "threats_found": 1
    }
  ]
}
```

## Usage Examples

### cURL
```bash
curl -X GET "http://localhost:8001/cves/top20" \
     -H "accept: application/json"
```

### Python
```python
import requests

response = requests.get("http://localhost:8001/cves/top20")
data = response.json()

for cve in data["top_20_critical_cves"]:
    print(f"{cve['cve_id']}: CVSS {cve['cvss_score']} - {cve['source']}")
```

### JavaScript/Node.js
```javascript
fetch('http://localhost:8001/cves/top20')
  .then(response => response.json())
  .then(data => {
    console.log(`Found ${data.critical_cves_found} critical CVEs`);
    data.top_20_critical_cves.forEach(cve => {
      console.log(`${cve.cve_id}: CVSS ${cve.cvss_score}`);
    });
  });
```

## Starting the API Server

### Option 1: Direct
```bash
python threat_intelligence_api.py
```

### Option 2: Using start script
```bash
python start_api.py
```

### Option 3: With uvicorn
```bash
uvicorn threat_intelligence_api:app --host 0.0.0.0 --port 8001 --reload
```

## Testing the API

### Run test client
```bash
python test_api_client.py
```

### Access API Documentation
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Other Available Endpoints

- `GET /` - API status
- `GET /health` - Health check with database stats
- `GET /statistics` - Comprehensive statistics
- `POST /autonomous-hunt` - Trigger threat hunting
- `POST /search` - Search threats by query
- `GET /threats/recent` - Get recent threats
- `GET /threats/by-severity/{severity}` - Filter by severity
- `GET /threats/by-type/{type}` - Filter by threat type

## Response Status Codes

- `200` - Success
- `500` - Internal server error (check logs for details)

## Error Handling

All endpoints return structured error responses:
```json
{
  "detail": "Error description"
}
```