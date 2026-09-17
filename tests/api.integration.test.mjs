import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 5000}`;
const request = (path, options) => fetch(`${baseUrl}${path}`, options);

async function waitForBatch(batchId, condition, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await request(`/batches/${batchId}`);
    const body = await response.json();
    if (condition(body.data)) return body.data;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Batch ${batchId} did not reach the expected state`);
}

test("health endpoint responds", async () => {
  const response = await request("/health");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
});

test("batch APIs create and retrieve a simulation batch", async () => {
  const create = await request("/batches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ count: 2 }),
  });
  assert.equal(create.status, 201);
  const created = await create.json();
  const batchId = created.data.batchId;
  assert.equal(created.data.total, 2);

  const batch = await request(`/batches/${batchId}`);
  assert.equal(batch.status, 200);
  assert.equal((await batch.json()).data.total, 2);

  const items = await request(`/batches/${batchId}/items`);
  assert.equal(items.status, 200);
  assert.equal((await items.json()).data.items.length, 2);

  const stream = await request(`/batches/${batchId}/events`);
  assert.equal(stream.status, 200);
  assert.match(stream.headers.get("content-type") ?? "", /text\/event-stream/);
  await stream.body?.cancel();

  const finalized = await waitForBatch(batchId, (data) => data.completed + data.failed === data.total);
  assert.equal(finalized.completed + finalized.failed, 2);
});

test("invalid simulation input returns the standard validation response", async () => {
  const response = await request("/batches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ count: 0 }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("CSV URL-health processing records failures and supports same-item retry", async () => {
  const form = new FormData();
  // Port 1 is deliberately closed: it gives a deterministic, fast connection failure.
  form.set("file", new Blob(["url\nhttp://127.0.0.1:1\n"], { type: "text/csv" }), "urls.csv");
  const create = await request("/batches/url-health", { method: "POST", body: form });
  assert.equal(create.status, 201);
  const batchId = (await create.json()).data.batchId;

  await waitForBatch(batchId, (data) => data.failed === 1);
  const itemResponse = await request(`/batches/${batchId}/items`);
  const item = (await itemResponse.json()).data.items[0];
  assert.equal(item.status, "FAILED");

  const retry = await request(`/job-items/${item.id}/retry`, { method: "POST" });
  assert.equal(retry.status, 202);
  assert.equal((await retry.json()).success, true);
});
