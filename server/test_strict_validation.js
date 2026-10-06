async function testStrictValidation() {
  const teamId = 'StrictTestTeam_' + Math.floor(Math.random() * 10000);
  
  // Create team
  await fetch('http://localhost:5000/api/game/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId })
  });

  // Select Route A
  await fetch('http://localhost:5000/api/game/select-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, routeId: 'A' })
  });

  console.log('Testing team:', teamId);

  // TEST 1: Send WRONG QR TOKEN ("WRONG_ID")
  const wrongRes = await fetch('http://localhost:5000/api/game/validate-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, qrData: 'WRONG_ID' })
  });
  const wrongData = await wrongRes.json();
  console.log('\n--- TEST 1: Sending WRONG ID "WRONG_ID" ---');
  console.log('Response success:', wrongData.success);
  console.log('Response message:', wrongData.message);

  // TEST 2: Send PARTIAL token ("ROUTE_A")
  const partialRes = await fetch('http://localhost:5000/api/game/validate-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, qrData: 'ROUTE_A' })
  });
  const partialData = await partialRes.json();
  console.log('\n--- TEST 2: Sending PARTIAL ID "ROUTE_A" ---');
  console.log('Response success:', partialData.success);
  console.log('Response message:', partialData.message);

  // TEST 3: Send EXACT MATCHING ID ("ROUTE_A_CP1")
  const exactRes = await fetch('http://localhost:5000/api/game/validate-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, qrData: 'ROUTE_A_CP1' })
  });
  const exactData = await exactRes.json();
  console.log('\n--- TEST 3: Sending EXACT ID "ROUTE_A_CP1" ---');
  console.log('Response success:', exactData.success);
  console.log('Response message:', exactData.message);
  console.log('New Checkpoint:', exactData.newCheckpoint);
}
testStrictValidation();
