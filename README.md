# shelly-mock-server
Simple mocking a shelly dimmer

## Requirements
- [Deno](https://deno.land/) runtime

## Running the Server

```bash
deno run --allow-net main.ts
```

The server will start on `http://localhost:8080`.

## Available Endpoints

### Set Light State
Set brightness and/or on/off state for a light.

```
GET /rpc/Light.Set?id=0&brightness=80
GET /rpc/Light.Set?id=0&on=true
GET /rpc/Light.Set?id=0&on=false
```

### Get Light Status
Get the current state of a light.

```
GET /rpc/Light.GetStatus?id=0
```

### Response Format
All endpoints return JSON responses:

```json
{
  "on": true,
  "brightness": 80
}
```

## Testing

Start the server first, then run the tests:

```bash
deno test --allow-net main_test.ts
```
