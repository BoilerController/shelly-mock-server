// Test file for Shelly Mock Server

const BASE_URL = "http://localhost:8080";

function assertEquals<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} but got ${actual}`);
  }
}

function assertExists<T>(value: T): void {
  if (value === undefined || value === null) {
    throw new Error(`Expected value to exist but got ${value}`);
  }
}

Deno.test("Light.GetStatus returns initial state", async () => {
  const response = await fetch(`${BASE_URL}/rpc/Light.GetStatus?id=0`);
  assertEquals(response.status, 200);
  const data = await response.json();
  assertExists(data.on);
  assertExists(data.brightness !== undefined);
});

Deno.test("Light.Set brightness persists", async () => {
  const response = await fetch(`${BASE_URL}/rpc/Light.Set?id=0&brightness=75`);
  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(data.brightness, 75);
  
  // Verify persistence
  const statusResponse = await fetch(`${BASE_URL}/rpc/Light.GetStatus?id=0`);
  const statusData = await statusResponse.json();
  assertEquals(statusData.brightness, 75);
});

Deno.test("Light.Set on=true persists", async () => {
  const response = await fetch(`${BASE_URL}/rpc/Light.Set?id=0&on=true`);
  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(data.on, true);
  
  // Verify persistence
  const statusResponse = await fetch(`${BASE_URL}/rpc/Light.GetStatus?id=0`);
  const statusData = await statusResponse.json();
  assertEquals(statusData.on, true);
});

Deno.test("Light.Set on=false persists", async () => {
  const response = await fetch(`${BASE_URL}/rpc/Light.Set?id=0&on=false`);
  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(data.on, false);
  
  // Verify persistence
  const statusResponse = await fetch(`${BASE_URL}/rpc/Light.GetStatus?id=0`);
  const statusData = await statusResponse.json();
  assertEquals(statusData.on, false);
});

Deno.test("Light.GetStatus returns 404 for unknown light id", async () => {
  const response = await fetch(`${BASE_URL}/rpc/Light.GetStatus?id=999`);
  assertEquals(response.status, 404);
  await response.text();
});

Deno.test("Light.Set returns 404 for unknown light id", async () => {
  const response = await fetch(`${BASE_URL}/rpc/Light.Set?id=999&on=true`);
  assertEquals(response.status, 404);
  await response.text();
});

Deno.test("Light.GetStatus returns 400 when id is missing", async () => {
  const response = await fetch(`${BASE_URL}/rpc/Light.GetStatus`);
  assertEquals(response.status, 400);
  await response.text();
});

Deno.test("Unknown endpoint returns 404", async () => {
  const response = await fetch(`${BASE_URL}/unknown`);
  assertEquals(response.status, 404);
  await response.text();
});
