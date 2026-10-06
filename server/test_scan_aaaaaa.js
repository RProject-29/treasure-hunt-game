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

async function testScan() {
  console.log("Validating QR 'RA-CP1' for team 'aaaaaa' (Checkpoint 0)...");
  let res = await postJson('/api/game/validate-qr', { teamId: 'aaaaaa', qrData: 'RA-CP1' });
  console.log("Response:", res);

  console.log("\nFetching clue info for step 2 after scan...");
  let clueRes = await new Promise(resolve => {
    http.get('http://localhost:5000/api/game/clue/aaaaaa?step=2', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });
  console.log("Clue response for step 2:", {
    checkpoint: clueRes.checkpoint,
    unlockedMapsLength: clueRes.unlockedMaps ? clueRes.unlockedMaps.length : 0,
    currentMapUrlLength: clueRes.currentMapUrl ? clueRes.currentMapUrl.length : 0
  });
}

testScan();
