
// Centralized runtime configuration for optional real Shelly device proxying.
// Set SHELLY_DEVICE_URL in your .env file or environment to forward RPC calls to a real device.
// Leave unset to continue using the in-memory mock implementation.
export const SHELLY_DEVICE_URL = Deno.env.get("SHELLY_DEVICE_URL") ?? "";
