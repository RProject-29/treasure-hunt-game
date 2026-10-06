async function testClue6() {
  // Login team "aaaa"
  const loginRes = await fetch('http://localhost:5000/api/game/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamCode: 'aaaa' })
  });
  const loginData = await loginRes.json();
  console.log('Login team:', loginData.team?.teamId, 'Checkpoint:', loginData.team?.currentCheckpoint);

  // Fetch clue for step 6
  const clueRes = await fetch(`http://localhost:5000/api/game/clue/aaaa?step=6`);
  const clueData = await clueRes.json();
  console.log('Clue step 6 response:');
  console.log('  success:', clueData.success);
  console.log('  isFinal:', clueData.isFinal);
  console.log('  unlockedMaps count:', clueData.unlockedMaps ? clueData.unlockedMaps.length : 0);
  console.log('  finalMapUrl length:', clueData.finalMapUrl ? clueData.finalMapUrl.length : 0);
  console.log('  clue text:', clueData.clue);
}
testClue6();
