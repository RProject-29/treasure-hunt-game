const http = require('http');

http.get('http://localhost:5000/api/game/teams', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log("Teams count:", json.teams ? json.teams.length : 0);
    if (json.teams) {
      json.teams.forEach(t => console.log(`TeamId: "${t.teamId}", Route: ${t.selectedRoute}, Checkpoint: ${t.currentCheckpoint}`));
    }
  });
});
