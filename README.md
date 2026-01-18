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
Get the current state of a light. The JSON structure matches a real Shelly dimmer, but `apower` is now derived from the brightness → wattage table. Temperature and voltage drift gently within realistic ranges, while `aenergy` stays at zero for boiler-controller testing.

```
GET /rpc/Light.GetStatus?id=0
```

Key fields:
- `apower`: dynamic value sampled from the brightness-driven wattage table.
- `current`: computed as `apower / voltage`.
- `temperature`: drifts between 30 °C and 50 °C.
- `voltage`: lightly fluctuates between 227 V and 235 V.

### Simulated P1 Meter
Stateful mock that lets Home Assistant (or any client) poll a reading endpoint while you adjust the scenario via a separate call.

```
GET /p1/reading
GET /p1/change-scenario?scenario=mixed_clouds
GET /p1/change-scenario?scenario=swinging_grid&negative=true
```

| Scenario key    | Description                                      | Expected range  |
| --------------- | ------------------------------------------------ | --------------- |
| `sunny_export`  | Steady export around −3 kW                       | −3.2 kW – −2.8 kW |
| `mixed_clouds`  | Cloud breaks causing swings between −4 kW and −1 kW | −4 kW – −1 kW   |
| `swinging_grid` | Similar pattern but between −2 kW and +0.5 kW    | −2 kW – 0.5 kW  |

Endpoint details:
- `/p1/reading`: returns the snapshot for the currently active scenario state.
- `/p1/change-scenario`: set the `scenario` query parameter to one of the keys above and optionally pass `negative=true` to force export. If `negative` is omitted the previous override remains.

Each `/p1/reading` also includes:
- `components.scenarioWatts`: the raw production/consumption from the scenario itself.
- `components.externalLoadWatts`: total consumption currently requested by the Shelly boiler(s), so brightness changes immediately impact your meter feed.

### Response Format
**Example `/rpc/Light.GetStatus`**

```json
{
  "id": 0,
  "source": "HTTP_in",
  "output": true,
  "brightness": 50,
  "temperature": {
    "tC": 37.8,
    "tF": 100.0
  },
  "aenergy": {
    "total": 0,
    "by_minute": [0, 0, 0],
    "minute_ts": 1764821000
  },
  "apower": 1412,
  "current": 6.11,
  "voltage": 231.2
}
```

**Example `/p1/reading` (truncated)**

```json
{
  "scenario": "mixed_clouds",
  "reading": {
    "watts": -1620,
    "direction": "exporting"
  },
  "components": {
    "scenarioWatts": -3005,
    "externalLoadWatts": 1390
  }
}
```

## Boiler load mapping

Shelly brightness dictates the mocked boiler draw. The values below originate from your measurements; intermediate percentages are linearly interpolated.

| % | Min (W) | Max (W) | % | Min (W) | Max (W) |
| - | ------- | ------- | - | ------- | ------- |
| 6 | 515 | 565 | 36 | 899 | 957 |
| 27 | 551 | 603 | 37 | 950 | 1003 |
| 28 | 584 | 625 | 38 | 991 | 1023 |
| 29 | 614 | 666 | 39 | 1065 | 1077 |
| 30 | 653 | 696 | 40 | 1071 | 1131 |
| 31 | 727 | 737 | 41 | 1080 | 1152 |
| 32 | 748 | 769 | 42 | 1143 | 1164 |
| 33 | 775 | 822 | 43 | 1184 | 1215 |
| 34 | 812 | 868 | 44 | 1212 | 1252 |
| 35 | 855 | 911 | 45 | 1251 | 1290 |

| % | Min (W) | Max (W) | % | Min (W) | Max (W) |
| - | ------- | ------- | - | ------- | ------- |
| 46 | 1275 | 1312 | 57 | 1155 | 1215 |
| 47 | 1308 | 1341 | 58 | 1180 | 1251 |
| 48 | 1330 | 1381 | 59 | 1228 | 1280 |
| 49 | 1358 | 1413 | 60 | 1270 | 1321 |
| 50 | 1393 | 1438 | 61 | 1296 | 1340 |
| 51 | 1411 | 1459 | 62 | 1320 | 1372 |
| 52 | 1433 | 1473 | 63 | 1348 | 1405 |
| 53 | 1469 | 1495 | 64 | 1386 | 1432 |
| 54 | 1481 | 1512 | 65 | 1410 | 1450 |
| 55 | 1509 | 1534 | 66 | 1430 | 1477 |
| 56 | 1529 | 1555 | 67 | 1465 | 1503 |

| % | Min (W) | Max (W) | Note |
| - | ------- | ------- | ---- |
| 68 | 1508 | 1532 | |
| 69 | 1511 | 1546 | |
| 70 | 1543 | 1566 | |
| 71 | 1546 | 1588 | |
| 72 | 1584 | 1605 | |
| 73 | 1591 | 1609 | |
| 74 | 1596 | 1614 | |
| 75 | 1631 | 1650 | Water refill point |
| 80 | 1644 | 1658 | |
| 85 | 1687 | 1695 | |
| 90 | 1705 | 1711 | |
| 95 | 1712 | 1716 | |
| 100 | 1719 | 1727 | |

## Testing

Start the server first, then run the tests:

```bash
deno test --allow-net main_test.ts
```
