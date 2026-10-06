const qrcode = require('qrcode');
const { createCanvas } = require('canvas');
const mongoose = require('mongoose');
const Route = require('./models/Route');
require('dotenv').config();

async function generateWithImages() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/treasure-hunt';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  const routesConfig = ['A', 'B', 'C'];
  
  for (const routeId of routesConfig) {
    const routeDoc = await Route.findOne({ routeId });
    if (!routeDoc) continue;
    
    for (let i = 1; i <= 6; i++) {
      const isFinal = (i === 6);
      const token = isFinal ? `R${routeId}-FINAL` : `R${routeId}-CP${i}`;
      const centerText = token; // Exact match so QR content and center badge text are 100% identical
      
      // 1. Generate QR code to canvas with high error correction (Level H = 30% recovery)
      const canvas = createCanvas(320, 320);
      await qrcode.toCanvas(canvas, token, {
        errorCorrectionLevel: 'H',
        width: 320,
        margin: 2
      });

      // 2. Draw center badge box and text
      const ctx = canvas.getContext('2d');
      const textWidth = Math.max(100, centerText.length * 15 + 24);
      const textHeight = 42;
      const x = (320 - textWidth) / 2;
      const y = (320 - textHeight) / 2;
      
      // White background box
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, textWidth, textHeight);
      
      // Black border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, textWidth, textHeight);
      
      // Center Text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerText, 160, 160);

      // 3. Get Base64 image string
      const base64 = canvas.toDataURL('image/png');

      // 4. Update clue in route
      const clue = routeDoc.clues.find(c => c.step === i);
      if (clue) {
        clue.qrToken = token;
        clue.qrImageBase64 = base64;
      }
    }
    
    await routeDoc.save();
    console.log(`✅ Updated Route ${routeId} with matching IDs & Center-Labeled QRs!`);
  }

  await mongoose.connection.close();
  console.log('🎉 All 18 Checkpoint QR codes created and saved to database!');
  process.exit(0);
}

generateWithImages();
