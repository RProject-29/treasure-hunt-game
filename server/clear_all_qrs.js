const mongoose = require('mongoose');
const Route = require('./models/Route');
require('dotenv').config();

async function clearAllQRs() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/treasure-hunt';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Direct MongoDB update using $set positional operator for arrays
    const result = await Route.updateMany(
      {},
      { 
        $set: { 
          "clues.$[].qrToken": "", 
          "clues.$[].qrImageBase64": "" 
        } 
      }
    );

    console.log('Update result:', result);

    const routes = await Route.find();
    for (const r of routes) {
      console.log(`Route ${r.routeId}:`);
      for (const c of r.clues) {
        console.log(`  Step ${c.step}: qrToken="${c.qrToken}", qrImageBase64 length=${c.qrImageBase64 ? c.qrImageBase64.length : 0}`);
      }
    }

    console.log('🎉 Successfully cleared all QR codes in MongoDB!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing QR codes:', err);
    if (mongoose.connection) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

clearAllQRs();
