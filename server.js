/**
 * FloodSense - Production Node.js Backend Server & Real-Time Event Stream
 * Provides HTTP Static File Server, REST APIs, & SSE Real-time Simulation Engine
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Global In-Memory Simulation State
const systemState = {
    globalRainfallMultiplier: 1.0,
    rainfallTrend: "RISING",
    blockedEdgeIds: [],
    adminBlockedRoadIds: [],
    pumpOverrides: {},
    citizenReports: [],
    lastUpdated: new Date().toISOString()
};

// SSE Connected Client Response Streams
const sseClients = new Set();

// MIME Types Mapping
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

/**
 * Broadcast Real-Time SSE Event to All Connected Browser Windows
 */
function broadcastStateUpdate() {
    systemState.lastUpdated = new Date().toISOString();
    const payload = `data: ${JSON.stringify({ type: 'STATE_UPDATE', ...systemState })}\n\n`;
    sseClients.forEach(res => res.write(payload));
}

// HTTP Server Logic
const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 1. API Endpoint: GET /api/state
    if (pathname === '/api/state' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(systemState));
        return;
    }

    // 2. API Endpoint: POST /api/state (Simulation Trigger)
    if (pathname === '/api/state' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data.globalRainfallMultiplier !== undefined) systemState.globalRainfallMultiplier = data.globalRainfallMultiplier;
                if (data.blockedEdgeIds) systemState.blockedEdgeIds = data.blockedEdgeIds;
                if (data.adminBlockedRoadIds) systemState.adminBlockedRoadIds = data.adminBlockedRoadIds;
                if (data.pumpOverrides) systemState.pumpOverrides = data.pumpOverrides;

                broadcastStateUpdate();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, state: systemState }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
        });
        return;
    }

    // 3. API Endpoint: GET /api/events (Server-Sent Events Stream)
    if (pathname === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ...systemState })}\n\n`);
        sseClients.add(res);

        req.on('close', () => {
            sseClients.delete(res);
        });
        return;
    }

    // 4. Static File Server
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // Prevent Directory Traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Fallback to index.html for SPA routes
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (fallbackErr, fallbackContent) => {
                    if (fallbackErr) {
                        res.writeHead(404);
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(fallbackContent);
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// Start Server
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🌊 FloodSense Urban Flood Nowcasting Server Running!`);
    console.log(`   Local URL: http://localhost:${PORT}`);
    console.log(`   System Time: ${new Date().toISOString()}`);
    console.log(`=======================================================`);
});
