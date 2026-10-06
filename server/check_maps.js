const http = require('http');

http.get('http://localhost:5000/api/game/routes', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.routes.forEach(r => {
      console.log('Route', r.routeId);
      r.clues.forEach(c => {
        console.log(`  Step ${c.step}: qrToken="${c.qrToken}", hasMap=${!!(c.mapImageBase64 || c.mapImageUrl)}, text="${c.text}"`);
      });
    });
  });
});
