const http = require('http');
const fs = require('fs');
const path = require('path');

http.get('http://localhost:5000/api/game/routes', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.routes.forEach(r => {
      console.log(`Route ${r.routeId}: ${r.clues.length} clues`);
      r.clues.forEach(c => {
        console.log(`  Step ${c.step}: token="${c.qrToken}", hasQrImage=${!!(c.qrImageBase64)}`);
      });
    });
  });
});
