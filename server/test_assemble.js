async function testAssemble() {
  for (const r of ['A', 'B', 'C']) {
    const res = await fetch('http://localhost:5000/api/game/assemble-final-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId: r })
    });
    const d = await res.json();
    console.log(`Route ${r} Assembly Result:`, d.success, d.message || '');
  }
}
testAssemble();
