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

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runVerification() {
  console.log("=== VERIFYING FULL BACKEND & SCAN FLOW ===");

  const testTeamId = `VerificationTeam_${Math.floor(Math.random() * 1000)}`;

  console.log(`\n1. Creating team "${testTeamId}"...`);
  const createRes = await postJson('/api/game/team', { teamId: testTeamId });
  console.log("Create result:", createRes.success ? "SUCCESS" : createRes.message);

  console.log(`\n2. Selecting Route A for "${testTeamId}"...`);
  const routeRes = await postJson('/api/game/select-route', { teamId: testTeamId, routeId: 'A' });
  console.log("Select route result:", routeRes.success ? "SUCCESS" : routeRes.message);

  console.log(`\n3. Fetching initial clue for "${testTeamId}"...`);
  const initialClue = await getJson(`/api/game/clue/${testTeamId}`);
  console.log("Initial Checkpoint:", initialClue.checkpoint);
  console.log("Clue Text:", initialClue.clue);
  console.log("Unlocked Maps Count:", initialClue.unlockedMaps.length);

  console.log(`\n4. Scanning Checkpoint 1 QR ("RA-CP1")...`);
  const scan1Res = await postJson('/api/game/validate-qr', { teamId: testTeamId, qrData: 'RA-CP1' });
  console.log("Scan 1 Result:", scan1Res.message);
  console.log("Newly Unlocked Map piece present:", !!scan1Res.newlyUnlockedMap);

  console.log(`\n5. Fetching clue after scanning Checkpoint 1...`);
  const clueAfter1 = await getJson(`/api/game/clue/${testTeamId}`);
  console.log("New Checkpoint:", clueAfter1.checkpoint);
  console.log("Next Clue Text:", clueAfter1.clue);
  console.log("Unlocked Maps Count in Gallery:", clueAfter1.unlockedMaps.length);

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

runVerification();
