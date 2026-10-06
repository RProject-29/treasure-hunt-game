const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Route = require('./models/Route');
const { createCanvas, loadImage } = require('canvas');
require('dotenv').config();

const DESKTOP_DIR = path.join(require('os').homedir(), 'Desktop', 'Treasure_Hunt_QRs_Labeled');

async function generateWithLabels() {
  if (!fs.existsSync(DESKTOP_DIR)) {
    fs.mkdirSync(DESKTOP_DIR);
  }

  const routesConfig = [
    { id: 'A', prefix: 'ROUTE_A' },
    { id: 'B', prefix: 'ROUTE_B' },
    { id: 'C', prefix: 'ROUTE_C' }
  ];

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/treasure-hunt');

  // Let's generate the Final Treasure image first to reuse its base64
  let finalTreasureBase64 = '';
  
  // 1. Generate Final Treasure Image
  const finalToken = 'FINAL_TREASURE_QR';
  const finalQrBuffer = await qrcode.toBuffer(finalToken, { width: 400, margin: 2 });
  const finalQrImage = await loadImage(finalQrBuffer);
  const finalCanvas = createCanvas(400, 480);
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.fillStyle = '#ffffff';
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  finalCtx.drawImage(finalQrImage, 0, 0);
  finalCtx.fillStyle = '#000000';
  finalCtx.font = 'bold 22px Arial';
  finalCtx.textAlign = 'center';
  finalCtx.fillText('FINAL TREASURE (ALL ROUTES)', 200, 440);
  
  const finalBuffer = finalCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(DESKTOP_DIR, 'FINAL_TREASURE.png'), finalBuffer);
  finalTreasureBase64 = 'data:image/png;base64,' + finalBuffer.toString('base64');

  // 2. Generate Route-specific images and update DB
  for (const rc of routesConfig) {
    const routeDoc = await Route.findOne({ routeId: rc.id });
    if (!routeDoc) continue;
    
    for (let i = 1; i <= 6; i++) {
      let isFinal = i === 6;
      let token = isFinal ? finalToken : `${rc.prefix}_QR_${i}`;
      
      const clue = routeDoc.clues.find(c => c.step === i);
      if (clue) {
        clue.qrToken = token;
      }

      if (isFinal) {
        if (clue) clue.qrImageBase64 = finalTreasureBase64;
      } else {
        let filename = `Route_${rc.id}_QR_${i}.png`;
        let labelText = `ROUTE ${rc.id} - CHECKPOINT ${i}`;

        const qrBuffer = await qrcode.toBuffer(token, { width: 400, margin: 2 });
        const qrImage = await loadImage(qrBuffer);

        const canvas = createCanvas(400, 480);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(qrImage, 0, 0);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, 200, 440);

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(path.join(DESKTOP_DIR, filename), buffer);

        if (clue) {
          clue.qrImageBase64 = 'data:image/png;base64,' + buffer.toString('base64');
        }
      }
    }
    
    await routeDoc.save();
  }
  
  mongoose.connection.close();
  console.log('Successfully generated 16 Labeled QR Codes!');
  console.log('Saved to:', DESKTOP_DIR);
}

generateWithLabels();
