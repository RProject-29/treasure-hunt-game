async function checkLive() {
  const r = await fetch('http://localhost:5000/api/game/routes');
  const d = await r.json();
  for (const route of d.routes) {
    console.log(`Route ${route.routeId}:`);
    for (const clue of route.clues) {
      console.log(`  Step ${clue.step}: qrToken="${clue.qrToken}", qrImageBase64Length=${clue.qrImageBase64 ? clue.qrImageBase64.length : 0}`);
    }
  }
}
checkLive();
