const qrcode = require('qrcode');
const mongoose = require('mongoose');
const Route = require('./models/Route');
require('dotenv').config();

async function injectImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/treasure-hunt');
    
    const routesConfig = [
      { id: 'A', prefix: 'ROUTE_A' },
      { id: 'B', prefix: 'ROUTE_B' },
      { id: 'C', prefix: 'ROUTE_C' }
    ];

    for (const rc of routesConfig) {
      const routeDoc = await Route.findOne({ routeId: rc.id });
      if (!routeDoc) continue;
      
      for (let i = 1; i <= 6; i++) {
        let isFinal = i === 6;
        let token = isFinal ? 'FINAL_TREASURE_QR' : `${rc.prefix}_QR_${i}`;
        
        // Generate the exact same Base64 we used for HTML
        const base64 = await qrcode.toDataURL(token, { width: 300, margin: 2 });
        
        const clue = routeDoc.clues.find(c => c.step === i);
        if (clue) {
          clue.qrImageBase64 = base64; // Set the visual image preview!
        }
      }
      await routeDoc.save();
    }
    
    mongoose.connection.close();
    console.log('Successfully injected visual QR images into the Admin Panel!');
  } catch(err) {
    console.error(err);
  }
}

injectImages();
