"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const API_ROOT = path.join(__dirname, "..");
let server;
let baseUrl;
let tempDir;

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zentriq-duplicate-batch-"));

  server = spawn(process.execPath, ["src/index.js"], {
    cwd: API_ROOT,
    env: {
      ...process.env,
      PORT: "0",
      DB_FILE: path.join(tempDir, "test.db"),
      CHAIN_MODE: "stub",
      OCR_MODE: "stub"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";

  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`API did not start in time.\n${output}`));
    }, 15000);

    const inspect = () => {
      const match = output.match(/Server listening on port (\d+)/);
      if (!match) return;

      clearTimeout(timer);
      resolve(Number(match[1]));
    };

    server.stdout.on("data", (chunk) => {
      output += chunk.toString();
      inspect();
    });

    server.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    server.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`API exited with code ${code}.\n${output}`));
    });
  });

  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  if (server && !server.killed) {
    server.kill("SIGTERM");
  }

  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

async function request(pathname, { method = "GET", token, body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const data = await response.json();
  return { response, data };
}

async function login(username) {
  const { response, data } = await request("/api/login", {
    method: "POST",
    body: { username }
  });

  assert.equal(response.status, 200);
  return data.token;
}

test("duplicate batch is blocked after a pack moves through the lifecycle and alerts the regulator", async () => {
  const manufacturer = await login("zenocare");
  const pharmacy = await login("mlimani");
  const regulator = await login("regulator");

  const batchNo = `DUP-${Date.now()}`;

  const created = await request("/api/batches", {
    method: "POST",
    token: manufacturer,
    body: {
      productName: "Duplicate Test 500mg",
      batchNo,
      expiry: "2027-12-31",
      quantity: 1
    }
  });

  assert.equal(created.response.status, 201);
  const serial = created.data.serials[0];
  assert.match(serial, /^[0-9A-Z]{16}$/);

  const transferred = await request("/api/custody/transfer", {
    method: "POST",
    token: manufacturer,
    body: {
      serials: [serial],
      toActorId: 3
    }
  });
  assert.equal(transferred.response.status, 200);

  const dispensed = await request("/api/dispense", {
    method: "POST",
    token: pharmacy,
    body: { serial }
  });
  assert.equal(dispensed.response.status, 200);

  const duplicate = await request("/api/batches", {
    method: "POST",
    token: manufacturer,
    body: {
      productName: "Attempted Second Batch",
      batchNo: `  ${batchNo.toLowerCase()}  `,
      expiry: "2028-01-31",
      quantity: 1
    }
  });

  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.data.error, "duplicate_batch");
  assert.match(duplicate.data.message, /already registered/);
  assert.match(duplicate.data.message, /regulator alert feed was notified/);
  assert.equal(duplicate.data.existingBatch.batchNo, batchNo);

  const alerts = await request("/api/alerts", { token: regulator });
  assert.equal(alerts.response.status, 200);

  const alert = alerts.data.find(
    (item) => item.type === "duplicate_batch" && item.details.includes(batchNo)
  );

  assert.ok(alert, "the regulator alert feed should contain the duplicate");
  assert.equal(alert.serial, serial);

  const verified = await request(`/api/verify/${serial}`);
  assert.equal(verified.response.status, 200);
  assert.ok(
    verified.data.flags.some((flag) =>
      /duplicate batch registration attempt was blocked/i.test(flag)
    )
  );
});
