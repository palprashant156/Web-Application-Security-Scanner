import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ScannerEngine } from '@webguard/scanner';
import { connectDB } from './db/connection';
import { Scan } from './models/Scan';
import { FindingModel } from './models/Finding';
import { Target } from './models/Target';

const app = express();
const port = process.env.PORT || 3001;

// Self-Audit: Secure headers
app.use(helmet());

// Self-Audit: Rate limiting to prevent scan abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

const scanner = new ScannerEngine();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'webguard-api', message: 'Backend is running!' });
});

/**
 * List historical scans
 */
app.get('/api/scans', async (req, res) => {
  try {
    const scans = await Scan.find().sort({ createdAt: -1 }).limit(20);
    // Convert Mongoose documents to raw objects and rename _id to id for the frontend
    const formattedScans = scans.map(s => ({
      ...s.toObject(),
      id: s._id.toString()
    }));
    res.json(formattedScans);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch scans' });
  }
});

/**
 * Start a new scan
 */
app.post('/api/scans', async (req, res) => {
  const { targetUrl } = req.body;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'targetUrl is required and must be a string' });
  }

  try {
    // 1. Ensure Target exists
    let targetDoc = await Target.findOne({ url: targetUrl });
    if (!targetDoc) {
      targetDoc = await Target.create({ url: targetUrl });
    }

    // 2. Create Scan record
    const scanDoc = await Scan.create({
      target: targetUrl,
      targetId: targetDoc._id,
      status: 'RUNNING',
      startedAt: new Date(),
    });

    // 3. Run scan asynchronously
    runScanAsync(scanDoc._id.toString(), targetUrl);

    res.status(202).json({ id: scanDoc._id.toString(), message: 'Scan started' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

/**
 * Retrieve scan status (without full findings to save bandwidth if just polling)
 */
app.get('/api/scans/:id', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    
    res.json({
      ...scan.toObject(),
      id: scan._id.toString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Invalid scan ID' });
  }
});

/**
 * Retrieve scan findings
 */
app.get('/api/scans/:id/findings', async (req, res) => {
  try {
    const findings = await FindingModel.find({ scanId: req.params.id });
    res.json(findings.map(f => ({
      ...f.toObject(),
      id: f._id.toString() // Front-end shared type expects `id`
    })));
  } catch (error: any) {
    res.status(500).json({ error: 'Invalid scan ID' });
  }
});

// Global map to track active scans and their cancellation tokens
const activeScans = new Map<string, { isCancelled: boolean }>();

/**
 * Cancel an active scan
 */
app.post('/api/scans/:id/cancel', async (req, res) => {
  const scanId = req.params.id;
  try {
    const scan = await Scan.findById(scanId);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    if (scan.status !== 'RUNNING') return res.status(400).json({ error: 'Scan is not running' });

    const token = activeScans.get(scanId);
    if (token) {
      token.isCancelled = true;
    }

    scan.status = 'CANCELLED';
    scan.completedAt = new Date();
    await scan.save();

    res.json({ message: 'Scan cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to cancel scan' });
  }
});

async function runScanAsync(scanId: string, targetUrl: string) {
  try {
    const scan = await Scan.findById(scanId);
    if (!scan) return;

    // Create cancellation token
    const cancellationToken = { isCancelled: false };
    activeScans.set(scanId, cancellationToken);

    // Run full scanner engine (Crawler -> Passive -> Active)
    const scanResult = await scanner.runFullScan(targetUrl, cancellationToken);
    
    // Remove from active scans
    activeScans.delete(scanId);

    // If cancelled during execution, don't overwrite the status if the cancel endpoint already did
    const latestScan = await Scan.findById(scanId);
    if (latestScan?.status === 'CANCELLED' || cancellationToken.isCancelled) {
      if (latestScan && latestScan.status !== 'CANCELLED') {
         latestScan.status = 'CANCELLED';
         latestScan.completedAt = new Date();
         await latestScan.save();
      }
      return;
    }

    const rawFindings = scanResult.findings;
    
    // Compute severity summary
    const summary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    
    // Save findings to DB
    for (const finding of rawFindings) {
      summary[finding.severity]++;
      await FindingModel.create({
        ...finding,
        scanId: scan._id // Add relational link
      });
    }

    // Calculate a basic score (100 - penalties)
    const score = Math.max(0, 100 - (summary.CRITICAL * 20 + summary.HIGH * 10 + summary.MEDIUM * 5 + summary.LOW * 1));

    // Update scan status
    scan.status = 'COMPLETED';
    scan.completedAt = new Date();
    scan.severitySummary = summary;
    scan.score = score;
    scan.requestStatistics = {
      totalRequests: scanResult.stats.requestsMade
    };
    // Let's also attach crawler stats dynamically for the frontend
    (scan as any).crawlerStats = scanResult.stats; 
    
    await scan.save();

  } catch (error: any) {
    activeScans.delete(scanId);
    console.error(`Scan failed for ${targetUrl}:`, error);
    await Scan.findByIdAndUpdate(scanId, {
      status: 'FAILED',
      error: error.message,
      completedAt: new Date()
    });
  }
}

app.listen(port, () => {
  console.log(`[server]: API is running at http://localhost:${port}`);
});
