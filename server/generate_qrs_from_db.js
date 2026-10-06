const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Route = require('./models/Route');
require('dotenv').config();

const DESKTOP_DIR = path.join(require('os').homedir(), 'Desktop', 'Treasure_Hunt_QRs_Custom');

async function generate() {
  if (!fs.existsSync(DESKTOP_DIR)) {
    fs.mkdirSync(DESKTOP_DIR);
  }

  const htmlParts = [
    `<html>
      <head>
        <title>Treasure Hunt QR Codes for Print</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .grid { display: flex; flex-wrap: wrap; gap: 30px; justify-content: center; }
          .card { 
            border: 2px dashed #333; 
            padding: 20px; 
            width: 250px; 
            position: relative;
            text-align: center;
            background: #fff;
          }
          .label-top-right {
            position: absolute;
            top: 10px;
            right: 10px;
            font-weight: bold;
            font-size: 14px;
            color: white;
            background: red;
            padding: 4px 8px;
            border-radius: 4px;
          }
          img { width: 220px; height: 220px; margin-top: 20px; }
          .label-bottom {
            margin-top: 15px; 
            font-weight: bold;
            font-size: 16px;
            color: #333;
          }
          .token-text { font-size: 12px; color: #666; margin-top: 5px; word-break: break-all; }
          @media print {
            .card { page-break-inside: avoid; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align: center; margin-bottom: 30px;">Custom Treasure Hunt QR Codes (From Admin Panel)</h1>
        <p style="text-align: center; margin-bottom: 30px;">Cut along the dashed lines. These codes perfectly match what is saved in your Admin Dashboard.</p>
        <div class="grid">`
  ];

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/treasure-hunt');

  const routesConfig = ['A', 'B', 'C'];
  let generatedFinal = false;

  for (const routeId of routesConfig) {
    const routeDoc = await Route.findOne({ routeId });
    if (!routeDoc) continue;
    
    for (let i = 1; i <= 6; i++) {
      let isFinal = i === 6;
      
      const clue = routeDoc.clues.find(c => c.step === i);
      let token = (clue && clue.qrToken) ? clue.qrToken : `ROUTE_${routeId}_QR_${i}`;

      let filename = isFinal ? 'FINAL_TREASURE.png' : `Route_${routeId}_QR_${i}.png`;
      const imgPath = path.join(DESKTOP_DIR, filename);
      
      if (!isFinal || !generatedFinal) {
        await qrcode.toFile(imgPath, token, { width: 500, margin: 2 });
        
        let labelTopRight = isFinal ? 'FINAL TREASURE' : `ROUTE ${routeId} - QR ${i}`;
        let labelBottom = isFinal ? 'All Routes Finish Here' : `Step ${i} for Route ${routeId}`;
        
        const base64 = await qrcode.toDataURL(token, { width: 300, margin: 2 });
        htmlParts.push(`
          <div class="card">
            <div class="label-top-right">${labelTopRight}</div>
            <img src="${base64}" />
            <div class="label-bottom">${labelBottom}</div>
            <div class="token-text">Text: ${token}</div>
          </div>
        `);
        
        if (isFinal) {
          generatedFinal = true;
        }
      }
    }
  }

  htmlParts.push(`</div></body></html>`);
  
  const htmlPath = path.join(DESKTOP_DIR, 'Printable_QRs.html');
  fs.writeFileSync(htmlPath, htmlParts.join(''));
  
  mongoose.connection.close();
  console.log('Successfully generated Custom QR Codes matching Admin Panel!');
  console.log('Saved to:', DESKTOP_DIR);
}

generate();
