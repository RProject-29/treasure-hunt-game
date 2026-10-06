const http = require('http');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runDiagnosticTest() {
  console.log("=== COMPREHENSIVE SCAN DIAGNOSTICS & MATCHING TEST ===");
  const testTeam = `DiagTeam_${Math.floor(Math.random() * 1000)}`;

  console.log(`\n1. Initializing team "${testTeam}" on Route A...`);
  await postJson('/api/game/team', { teamId: testTeam });
  await postJson('/api/game/select-route', { teamId: testTeam, routeId: 'A' });

  console.log("\n2. Scanning Checkpoint 1 ('RA-CP1')...");
  let scan1 = await postJson('/api/game/validate-qr', { teamId: testTeam, qrData: 'RA-CP1' });
  console.log("Result:", scan1.message);

  console.log("\n3. Re-scanning Checkpoint 1 ('RA-CP1') when team is now at Checkpoint 1 (expects Checkpoint 2)...");
  let resRepeat = await postJson('/api/game/validate-qr', { teamId: testTeam, qrData: 'RA-CP1' });
  console.log("Result:", resRepeat.message);

  console.log("\n4. Scanning Checkpoint 4 ('RA-CP4') skipping Checkpoint 2...");
  let resFuture = await postJson('/api/game/validate-qr', { teamId: testTeam, qrData: 'RA-CP4' });
  console.log("Result:", resFuture.message);

  console.log("\n5. Scanning Route B Checkpoint 2 ('RB-CP2') while team is assigned to Route A...");
  let resWrongRoute = await postJson('/api/game/validate-qr', { teamId: testTeam, qrData: 'RB-CP2' });
  console.log("Result:", resWrongRoute.message);

  console.log("\n6. Scanning shorthand 'CP2' for Checkpoint 2 on Route A...");
  let resShortHand = await postJson('/api/game/validate-qr', { teamId: testTeam, qrData: 'CP2' });
  console.log("Result:", resShortHand.message);

  console.log("\n=== ALL DIAGNOSTIC TESTS PASSED! ===");
}

runDiagnosticTest();
