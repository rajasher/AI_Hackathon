# Daily Updates API

This document explains how to call the API endpoints for the daily updates application. The server runs on `http://localhost:8090`.

## API Endpoints

You can use a command-line tool like `curl` or an API client like Postman to interact with the endpoints.

### 1. Create an Update

To create a new update, send a `POST` request to `/api/updates` with the update details in the JSON body.

- **Method**: `POST`
- **URL**: `http://localhost:8090/api/updates`
- **Headers**: `Content-Type: application/json`

**Example `curl` command:**

```bash
curl -X POST http://localhost:8090/api/updates \
-H "Content-Type: application/json" \
-d '{
    "title": "EOD Report",
    "description": "Finished feature-abc and started on feature-xyz.",
    "status": "IN_PROGRESS",
    "priority": "MEDIUM",
    "subtasks": [
        {
            "title": "Complete feature-abc",
            "status": "COMPLETED",
            "output": "Pull request raised and approved.",
            "completedAt": "2023-10-27T16:30:00"
        },
        {
            "title": "Begin feature-xyz",
            "status": "STARTED",
            "output": "Initial project setup is done."
        }
    ]
}'
```

The API will respond with the newly created update object, including its generated `id` and `createdAt` timestamp.

### 2. Get All Updates

To retrieve a list of all updates, send a `GET` request to `/api/updates`.

- **Method**: `GET`
- **URL**: `http://localhost:8090/api/updates`

**Example `curl` command:**

```bash
curl -X GET http://localhost:8090/api/updates
```

### 3. Get a Specific Update by ID

To get a single update by its unique ID, send a `GET` request to `/api/updates/{id}`, replacing `{id}` with the actual ID of the update.

- **Method**: `GET`
- **URL**: `http://localhost:8090/api/updates/{id}`

**Example `curl` command (to get the update with ID 1):**

```bash
curl -X GET http://localhost:8090/api/updates/1
```

### 4. Delete an Update

To delete an update by its unique ID, send a `DELETE` request to `/api/updates/{id}`.

- **Method**: `DELETE`
- **URL**: `http://localhost:8090/api/updates/{id}`

**Example `curl` command (to delete the update with ID 1):**

```bash
curl -X DELETE http://localhost:8090/api/updates/1
```

If the deletion is successful, the API will respond with a `204 No Content` status.
