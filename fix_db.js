const mongoose = require('mongoose');
const Route = require('./server/models/Route');
require('dotenv').config({ path: './server/.env' });

async function fixDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const routeC = await Route.findOne({ routeId: 'C' });
    if (routeC) {
      // Reset Route C's clues to empty
      routeC.name = 'Route C';
      routeC.routeDescription = 'This is the clue for Route C.';
      routeC.clues = [1, 2, 3, 4, 5, 6].map(step => ({ 
        step, text: '', qrToken: '', mapImageUrl: '', qrImageBase64: '', mapImageBase64: '' 
      }));
      await routeC.save();
      console.log('Route C has been reset!');
    } else {
      console.log('Route C not found.');
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
  }
}

fixDatabase();
