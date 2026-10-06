const express = require('express');
const Team = require('../models/Team');
const Route = require('../models/Route');

module.exports = function (io) {
  const router = express.Router();

  // ==========================================
  // ADMIN API: ROUTE CONFIGURATION
  // ==========================================

  // Get all routes
  router.get('/routes', async (req, res) => {
    try {
      let routes = await Route.find();
      // If routes don't exist, create default empty A, B, C
      if (routes.length === 0) {
        const defaultRoutes = ['A', 'B', 'C'].map(id => ({
          routeId: id,
          name: `Route ${id}`,
          routeDescription: `This is the clue for Route ${id}.`,
          clues: [1, 2, 3, 4, 5, 6].map(step => ({ step, text: '', qrToken: '', mapImageUrl: '', qrImageBase64: '', mapImageBase64: '' }))
        }));
        await Route.insertMany(defaultRoutes);
        routes = await Route.find();
      }
      res.json({ success: true, routes });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update a route
  router.post('/route', async (req, res) => {
    try {
      const { routeId, name, routeDescription, clues } = req.body;
      const route = await Route.findOneAndUpdate(
        { routeId },
        { name, routeDescription, clues },
        { new: true, upsert: true }
      );
      
      // Emit real-time update to all clients
      io.emit('routesUpdated', route);
      
      res.json({ success: true, route });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==========================================
  // ADMIN API: TEAM MANAGEMENT
  // ==========================================

  router.get('/teams', async (req, res) => {
    try {
      const teams = await Team.find();
      res.json({ success: true, teams });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/init-teams', async (req, res) => {
    try {
      for (let i = 1; i <= 10; i++) {
        const teamId = `Team ${i}`;
        const exists = await Team.findOne({ teamId });
        if (!exists) {
          await new Team({ teamId, teamName: teamId }).save();
        }
      }
      const teams = await Team.find();
      io.emit('teamsRefreshed', teams);
      res.json({ success: true, teams });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete('/team/:teamId', async (req, res) => {
    try {
      const { teamId } = req.params;
      await Team.deleteOne({ teamId });
      io.emit('teamDeleted', teamId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/team', async (req, res) => {
    try {
      const { teamId } = req.body;
      const exists = await Team.findOne({ teamId });
      if (exists) return res.status(400).json({ success: false, message: 'Team already exists' });

      const team = new Team({ teamId, teamName: teamId });
      await team.save();
      io.emit('teamUpdated', team);
      res.json({ success: true, team });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==========================================
  // PARTICIPANT API
  // ==========================================

  router.post('/accept-join', async (req, res) => {
    try {
      const { teamId } = req.body;
      const exists = await Team.findOne({ teamId });
      if (exists) return res.status(400).json({ success: false, message: 'Team already exists' });

      const team = new Team({ teamId, teamName: teamId });
      await team.save();
      io.emit('teamUpdated', team);
      io.emit('joinAccepted', { teamId });
      res.json({ success: true, team });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/reject-join', async (req, res) => {
    try {
      const { teamId } = req.body;
      io.emit('joinRejected', { teamId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { teamCode } = req.body;
      let team = await Team.findOne({ teamId: teamCode });

      if (!team) {
        // Try to find an empty, pre-generated team slot (no route chosen yet)
        // specifically looking for "Team X" default names to replace.
        team = await Team.findOne({ selectedRoute: null, currentCheckpoint: 0, teamId: /^Team \d+$/ });

        if (team) {
          team.teamId = teamCode;
          team.teamName = teamCode;
          await team.save();
          // Broadcast full refresh so the old "Team X" row disappears and is replaced
          io.emit('teamsRefreshed', await Team.find());
        } else {
          // Fallback if all 10 slots are full
          io.emit('joinRequest', { teamId: teamCode });
          return res.json({ success: false, pending: true, message: 'Join request sent to admin for approval.' });
        }
      }

      res.json({ success: true, team });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/select-route', async (req, res) => {
    try {
      const { teamId, routeId } = req.body;
      const team = await Team.findOne({ teamId });

      if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
      if (team.selectedRoute) return res.status(400).json({ success: false, message: 'Route already selected' });

      team.selectedRoute = routeId;
      team.startTime = new Date();
      await team.save();

      io.emit('teamUpdated', team);
      res.json({ success: true, team });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/clue/:teamId', async (req, res) => {
    try {
      const { teamId } = req.params;
      const team = await Team.findOne({ teamId });

      if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
      if (!team.selectedRoute) return res.status(400).json({ success: false, message: 'No route selected' });

      // Fetch the actual route configuration
      const route = await Route.findOne({ routeId: team.selectedRoute });
      if (!route) return res.status(404).json({ success: false, message: 'Route configuration missing' });

      // Identify the step we need (checkpoint + 1). Capped at 6.
      let targetStep = team.currentCheckpoint + 1;
      if (targetStep > 6) targetStep = 6;
      
      if (req.query.step) {
        const reqStep = parseInt(req.query.step, 10);
        if (reqStep > 0 && reqStep <= 6) {
          targetStep = reqStep;
        }
      }

      const currentClueConfig = route.clues.find(c => c.step === targetStep) || route.clues.find(c => c.step === 6);

      // Collect ONLY the map pieces unlocked up to currentCheckpoint (steps 1 to currentCheckpoint)
      const maxUnlockedStep = Math.min(team.currentCheckpoint, 5);
      const unlockedMaps = route.clues
        .filter(c => c.step >= 1 && c.step <= maxUnlockedStep && (c.mapImageBase64 || c.mapImageUrl))
        .map(c => c.mapImageBase64 || c.mapImageUrl);

      // Specific map piece for the currently viewed step
      const stepClueConfig = route.clues.find(c => c.step === targetStep);
      const currentMapUrl = (targetStep <= team.currentCheckpoint) 
        ? (stepClueConfig?.mapImageBase64 || stepClueConfig?.mapImageUrl || "") 
        : "";

      const isFinal = (team.currentCheckpoint >= 6);
      const finalStepConfig = route.clues.find(c => c.step === 6);
      const finalMapUrl = (isFinal && team.currentCheckpoint >= 6) 
        ? (finalStepConfig?.mapImageBase64 || finalStepConfig?.mapImageUrl || "") 
        : "";

      res.json({
        success: true,
        checkpoint: team.currentCheckpoint,
        route: team.selectedRoute,
        targetStep: targetStep,
        clue: currentClueConfig?.text || "You have completed the hunt! Please check in with the admins.",
        currentMapUrl: currentMapUrl,
        unlockedMaps: unlockedMaps,
        isFinal: isFinal,
        finalMapUrl: finalMapUrl
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/validate-qr', async (req, res) => {
    try {
      const { teamId, qrData } = req.body;
      const team = await Team.findOne({ teamId });

      if (!team) return res.status(404).json({ success: false, message: '❌ Team not found in database. Please log in again.' });
      if (team.currentCheckpoint >= 6) return res.status(400).json({ success: false, message: '🎉 You have already completed all checkpoints!' });

      const route = await Route.findOne({ routeId: team.selectedRoute });
      if (!route) return res.status(404).json({ success: false, message: `❌ Route ${team.selectedRoute} configuration is missing.` });

      // The step they MUST scan is (team.currentCheckpoint + 1)
      const currentStepNumber = team.currentCheckpoint + 1;
      const currentClueConfig = route.clues.find(c => c.step === currentStepNumber);

      if (!currentClueConfig) return res.status(400).json({ success: false, message: `⚠️ Missing configuration for Checkpoint ${currentStepNumber} on Route ${team.selectedRoute}.` });

      const defaultToken = currentStepNumber === 6 ? `R${team.selectedRoute}-FINAL` : `R${team.selectedRoute}-CP${currentStepNumber}`;
      const rawExpected = (currentClueConfig.qrToken || defaultToken).trim();
      const rawReceived = (qrData || "").trim();
      const expectedToken = rawExpected.toLowerCase();
      const receivedToken = rawReceived.toLowerCase();

      console.log(`[QR Validation] Team: "${teamId}", Route: ${team.selectedRoute}, Current CP: ${team.currentCheckpoint}, Step: ${currentStepNumber}`);
      console.log(`[QR Validation] Expected: "${expectedToken}", Received: "${receivedToken}"`);

      if (!receivedToken) {
        return res.status(400).json({ success: false, message: '❌ Please scan a valid QR code or enter an ID.' });
      }

      const cleanExp = expectedToken.replace(/[^a-z0-9]/g, '');
      const cleanRec = receivedToken.replace(/[^a-z0-9]/g, '');

      // Check matching algorithms:
      // 1. Exact match
      // 2. Clean alphanumeric match (ignores hyphens, spaces, capitalization)
      // 3. Substring match (scanned text contains expected token or vice versa)
      // 4. Standard Checkpoint code match (e.g. CP1, CHECKPOINT1, STEP1, RACP1 for step 1)
      const cpNumStr = `${currentStepNumber}`;
      const cpCode = `cp${cpNumStr}`;
      const routeCpCode = `${team.selectedRoute.toLowerCase()}${cpCode}`;
      const rRouteCpCode = `r${routeCpCode}`;

      const isMatch = (
        receivedToken === expectedToken ||
        cleanRec === cleanExp ||
        (expectedToken.length >= 2 && receivedToken.includes(expectedToken)) ||
        (cleanExp.length >= 2 && cleanRec.includes(cleanExp)) ||
        cleanRec === cpCode ||
        cleanRec === `checkpoint${cpNumStr}` ||
        cleanRec === `step${cpNumStr}` ||
        cleanRec === routeCpCode ||
        cleanRec === rRouteCpCode
      );

      if (!isMatch) {
        // DIAGNOSTIC SCAN ANALYSIS across all routes & steps
        const allRoutes = await Route.find();
        let diagnosticMsg = "";

        // Check if scanned token matches another step on the team's assigned route
        for (const clue of route.clues) {
          const tExp = (clue.qrToken || "").trim().toLowerCase();
          const tCleanExp = tExp.replace(/[^a-z0-9]/g, '');
          if (tExp && (receivedToken === tExp || cleanRec === tCleanExp || (tCleanExp.length >= 2 && cleanRec.includes(tCleanExp)))) {
            if (clue.step <= team.currentCheckpoint) {
              diagnosticMsg = `ℹ️ You already completed Checkpoint ${clue.step}! Your active target is Checkpoint ${currentStepNumber}.`;
            } else {
              diagnosticMsg = `⚠️ You scanned Checkpoint ${clue.step}, but you are currently on Checkpoint ${currentStepNumber}! Please complete Checkpoint ${currentStepNumber} first.`;
            }
            break;
          }
        }

        // Check if scanned token matches a different route
        if (!diagnosticMsg) {
          for (const otherRoute of allRoutes) {
            if (otherRoute.routeId !== team.selectedRoute) {
              for (const clue of otherRoute.clues) {
                const oExp = (clue.qrToken || "").trim().toLowerCase();
                const oCleanExp = oExp.replace(/[^a-z0-9]/g, '');
                if (oExp && (receivedToken === oExp || cleanRec === oCleanExp || (oCleanExp.length >= 2 && cleanRec.includes(oCleanExp)))) {
                  diagnosticMsg = `⚠️ This QR code belongs to Route ${otherRoute.routeId}! Your team is assigned to Route ${team.selectedRoute}.`;
                  break;
                }
              }
            }
            if (diagnosticMsg) break;
          }
        }

        if (!diagnosticMsg) {
          diagnosticMsg = `❌ Incorrect QR Code / ID ("${rawReceived}")! Does not match Checkpoint ${currentStepNumber} for Route ${team.selectedRoute}.`;
        }

        console.log(`❌ [VALIDATION FAILED] ${diagnosticMsg}`);
        return res.status(400).json({ success: false, message: diagnosticMsg });
      }

      // MATCH SUCCESS!
      const newlyUnlockedMap = currentClueConfig.mapImageBase64 || currentClueConfig.mapImageUrl || "";

      team.currentCheckpoint += 1;

      if (team.currentCheckpoint === 6) {
        team.isCompleted = true;
        team.completionTime = new Date();
      }

      await team.save();

      // Real-time broadcasts
      io.emit('teamUpdated', team);
      io.emit('qrScanned', {
        teamId: team.teamId,
        checkpoint: team.currentCheckpoint,
        route: team.selectedRoute,
        unlockedMap: newlyUnlockedMap,
        timestamp: new Date()
      });

      res.json({ 
        success: true, 
        message: `✅ Checkpoint ${currentStepNumber} Confirmed! Unlocked Map Piece ${currentStepNumber}!`, 
        newCheckpoint: team.currentCheckpoint, 
        newlyUnlockedMap 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Generate Center-Labeled QR Code image endpoint for Admin
  router.post('/generate-qr', async (req, res) => {
    try {
      const { token, label } = req.body;
      if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

      const qrcode = require('qrcode');
      const { createCanvas } = require('canvas');

      const centerText = label || token;

      // Generate QR code with Level 'H' error correction (30% recovery capacity)
      const canvas = createCanvas(320, 320);
      await qrcode.toCanvas(canvas, token, {
        errorCorrectionLevel: 'H',
        version: 5, // Force higher density to safely fit center logo
        width: 320,
        margin: 2
      });

      // Draw very compact center badge box
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 18px Arial';
      const textWidth = ctx.measureText(centerText).width + 14;
      const textHeight = 28;
      const x = (320 - textWidth) / 2;
      const y = (320 - textHeight) / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, textWidth, textHeight);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, textWidth, textHeight);

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerText, 160, 160);

      const qrImageBase64 = canvas.toDataURL('image/png');
      res.json({ success: true, qrImageBase64 });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Assemble and Stitch Maps 1 to 5 into a Final Combined Master Map for Checkpoint 6
  router.post('/assemble-final-map', async (req, res) => {
    try {
      const { routeId } = req.body;
      const route = await Route.findOne({ routeId });
      if (!route) return res.status(404).json({ success: false, message: 'Route not found' });

      const mapClues = route.clues.filter(c => c.step >= 1 && c.step <= 5 && (c.mapImageBase64 || c.mapImageUrl));
      const mapSources = mapClues.map(c => c.mapImageBase64 || c.mapImageUrl);

      if (mapSources.length === 0) {
        return res.status(400).json({ success: false, message: 'No map images uploaded for Checkpoints 1 to 5 yet!' });
      }

      const { createCanvas, loadImage } = require('canvas');
      const canvasWidth = 900;
      const canvasHeight = 600;
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // Parchment / Dark background
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Inner parchment background
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(15, 15, canvasWidth - 30, canvasHeight - 30);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6;
      ctx.strokeRect(15, 15, canvasWidth - 30, canvasHeight - 30);

      // Title Banner
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`MASTER TREASURE MAP - ROUTE ${routeId}`, canvasWidth / 2, 50);

      // Draw grid slots for 5 map pieces (3 columns x 2 rows)
      // Top row: 3 pieces (slots 0, 1, 2). Bottom row: 2 pieces (slots 3, 4 centered)
      const slotW = 260;
      const slotH = 220;
      const topY = 75;
      const bottomY = 320;

      const positions = [
        { x: 45, y: topY },       // Slot 1
        { x: 320, y: topY },      // Slot 2
        { x: 595, y: topY },      // Slot 3
        { x: 182, y: bottomY },   // Slot 4
        { x: 457, y: bottomY }    // Slot 5
      ];

      for (let i = 0; i < mapSources.length && i < 5; i++) {
        try {
          const img = await loadImage(mapSources[i]);
          const pos = positions[i];

          // Draw piece container box
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(pos.x - 4, pos.y - 4, slotW + 8, slotH + 8);
          ctx.drawImage(img, pos.x, pos.y, slotW, slotH);

          // Border for piece
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 3;
          ctx.strokeRect(pos.x, pos.y, slotW, slotH);

          // Label
          ctx.fillStyle = '#78350f';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(`PIECE #${i + 1}`, pos.x + 6, pos.y + 18);
        } catch (imgErr) {
          console.warn(`Failed to load image for piece ${i + 1}:`, imgErr.message);
        }
      }

      // Compass Rose in center bottom corner or watermark
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🏴‍☠️ COMPLETED TREASURE HUNT MAP 🏴‍☠️', canvasWidth / 2, canvasHeight - 25);

      const assembledBase64 = canvas.toDataURL('image/png');

      // Save as Checkpoint 6 map image in DB
      let finalClue = route.clues.find(c => c.step === 6);
      if (!finalClue) {
        finalClue = { step: 6, text: 'Final Treasure Destination!', qrToken: 'FINAL_TREASURE', mapImageBase64: assembledBase64 };
        route.clues.push(finalClue);
      } else {
        finalClue.mapImageBase64 = assembledBase64;
      }

      await route.save();

      res.json({ success: true, message: 'Successfully assembled and saved Final Map!', finalMapUrl: assembledBase64 });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};


