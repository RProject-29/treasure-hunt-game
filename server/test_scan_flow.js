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

async function testFlow() {
  console.log("1. Logging in as TestTeam99...");
  let loginRes = await postJson('/api/game/login', { teamCode: 'TestTeam99' });
  console.log("Login result:", loginRes);

  console.log("2. Selecting Route A...");
  let routeRes = await postJson('/api/game/select-route', { teamId: 'TestTeam99', routeId: 'A' });
  console.log("Select route result:", routeRes);

  console.log("3. Validating QR 'RA-CP1' for Checkpoint 1...");
  let scan1 = await postJson('/api/game/validate-qr', { teamId: 'TestTeam99', qrData: 'RA-CP1' });
  console.log("Scan 1 result:", scan1);
}

testFlow();
