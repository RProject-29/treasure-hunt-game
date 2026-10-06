const http = require('http');
const fs = require('fs');
const path = require('path');

const desktopDir = 'C:\\Users\\LENOVO\\Desktop';
const qrImageDir = path.join(desktopDir, 'Treasure_Hunt_QR_Codes_V2');
const htmlFilePath = path.join(desktopDir, 'PRINTABLE_TREASURE_HUNT_QRS.html');

http.get('http://localhost:5000/api/game/routes', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const json = JSON.parse(data);
    const routes = json.routes;

    // Ensure output directories exist on Desktop
    if (!fs.existsSync(qrImageDir)) {
      fs.mkdirSync(qrImageDir, { recursive: true });
    }

    const canvas = require('canvas');
    const qrcode = require('qrcode');

    // Function to generate crisp center-badged QR buffer if missing
    async function getQrImageBase64(token) {
      const cvs = canvas.createCanvas(400, 400);
      await qrcode.toCanvas(cvs, token, {
        errorCorrectionLevel: 'H',
        version: 5, // Force higher density
        width: 400,
        margin: 2
      });
      const ctx = cvs.getContext('2d');
      
      // Very compact center badge
      ctx.font = 'bold 20px Arial';
      const textWidth = ctx.measureText(token).width + 16;
      const textHeight = 32;
      const x = (400 - textWidth) / 2;
      const y = (400 - textHeight) / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, textWidth, textHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, textWidth, textHeight);

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(token, 200, 200);

      return cvs.toDataURL('image/png');
    }

    let allCardsHtml = '';

    for (const r of routes) {
      const routeSubDir = path.join(qrImageDir, `Route_${r.routeId}`);
      if (!fs.existsSync(routeSubDir)) {
        fs.mkdirSync(routeSubDir, { recursive: true });
      }

      allCardsHtml += `<div class="route-section">
        <h2 class="route-header">🏴‍榨 ROUTE ${r.routeId} CHECKPOINT QR CODES</h2>
        <div class="cards-grid">`;

      for (const c of r.clues) {
        const token = (c.qrToken || (c.step === 6 ? `R${r.routeId}-FINAL` : `R${r.routeId}-CP${c.step}`)).trim();
        let qrImage = c.qrImageBase64;
        
        if (!qrImage || qrImage.length < 100) {
          qrImage = await getQrImageBase64(token);
        }

        // Save PNG file
        const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");
        const fileName = `Checkpoint_${c.step}_${token.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        const filePath = path.join(routeSubDir, fileName);
        fs.writeFileSync(filePath, base64Data, 'base64');
        console.log(`Saved PNG: ${filePath}`);

        // Add Card to HTML
        allCardsHtml += `
          <div class="qr-card">
            <div class="card-badge">ROUTE ${r.routeId}</div>
            <div class="card-title">CHECKPOINT ${c.step} ${c.step === 6 ? '(FINAL)' : ''}</div>
            <div class="qr-img-wrapper">
              <img src="${qrImage}" alt="${token}" />
            </div>
            <div class="token-container">
              <span class="token-label">SECRET ID / CODE:</span>
              <span class="token-code">${token}</span>
            </div>
            ${c.text ? `<div class="clue-preview">Clue Preview: "${c.text.trim()}"</div>` : ''}
          </div>
        `;
      }

      allCardsHtml += `</div></div><div class="page-break"></div>`;
    }

    // Full Printable HTML Template
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Treasure Hunt - All Printable QR Code Cards</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;600;800&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      padding: 2rem;
    }
    
    .no-print-bar {
      position: sticky;
      top: 0;
      background: #1e293b;
      padding: 1rem 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border: 2px solid #eab308;
      z-index: 100;
    }
    .print-btn {
      background: #eab308;
      color: #0f172a;
      border: none;
      padding: 0.8rem 2rem;
      font-size: 1.1rem;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(234, 179, 8, 0.4);
      transition: transform 0.2s;
    }
    .print-btn:hover { transform: scale(1.05); }

    .route-section {
      margin-bottom: 3rem;
    }
    .route-header {
      font-family: 'Cinzel', serif;
      font-size: 2rem;
      color: #fde047;
      text-align: center;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px dashed #ca8a04;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 2rem;
      justify-items: center;
    }

    .qr-card {
      background: #ffffff;
      color: #0f172a;
      width: 330px;
      padding: 1.5rem;
      border-radius: 16px;
      border: 4px solid #78350f;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      text-align: center;
      position: relative;
      page-break-inside: avoid;
    }
    .card-badge {
      background: #78350f;
      color: #fef3c7;
      font-size: 0.85rem;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 20px;
      display: inline-block;
      margin-bottom: 0.5rem;
      letter-spacing: 1px;
    }
    .card-title {
      font-family: 'Cinzel', serif;
      font-size: 1.6rem;
      font-weight: 800;
      color: #451a03;
      margin-bottom: 1rem;
    }
    .qr-img-wrapper {
      background: #f8fafc;
      padding: 10px;
      border-radius: 12px;
      border: 2px solid #cbd5e1;
      display: inline-block;
      margin-bottom: 1rem;
    }
    .qr-img-wrapper img {
      width: 230px;
      height: 230px;
      display: block;
    }
    .token-container {
      background: #f1f5f9;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }
    .token-label {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 700;
    }
    .token-code {
      font-size: 1.3rem;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 1.5px;
      font-family: monospace;
    }
    .clue-preview {
      margin-top: 0.8rem;
      font-size: 0.8rem;
      font-style: italic;
      color: #475569;
      background: #fef3c7;
      padding: 0.4rem;
      border-radius: 6px;
    }

    .page-break { page-break-after: always; }

    @media print {
      body { background: white; color: black; padding: 0; }
      .no-print-bar { display: none !important; }
      .route-header { color: #0f172a; border-bottom: 2px solid #0f172a; }
      .cards-grid { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
      .qr-card { border: 3px solid #000; box-shadow: none; width: 100%; max-width: 320px; }
      .card-badge { background: #000; color: #fff; }
      .card-title { color: #000; }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div>
      <h2 style="color: #fde047; font-size: 1.4rem;">🏴‍☠️ Printable Treasure Hunt QR Cards</h2>
      <p style="color: #94a3b8; font-size: 0.9rem;">Routes A, B, C | Checkpoints 1 to 6</p>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ CLICK TO PRINT ALL QR CARDS</button>
  </div>

  ${allCardsHtml}

</body>
</html>`;

    fs.writeFileSync(htmlFilePath, fullHtml, 'utf8');
    console.log(`\n✅ Successfully generated printable HTML file on Desktop:\n${htmlFilePath}`);
  });
});
