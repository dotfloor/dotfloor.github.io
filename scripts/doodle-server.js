const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4001;
const DOODLE_DIR = path.join(__dirname, '../assets/doodles');

if (!fs.existsSync(DOODLE_DIR)) {
    fs.mkdirSync(DOODLE_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
    // Add CORS headers so the frontend browser can hit it locally
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/save_doodle') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { id, image_data } = data;
                
                if (!id || !image_data) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Missing id or image_data' }));
                    return;
                }

                // Remove the base64 preamble before saving
                const base64Data = image_data.replace(/^data:image\/\w+;base64,/, "");
                const outPath = path.join(DOODLE_DIR, `${id}.webp`);
                
                fs.writeFileSync(outPath, base64Data, 'base64');
                console.log(`[Doodle Server] Saved drawing to: ${outPath}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                console.error(e);
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/delete_doodle') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { id } = data;
                if (!id) return res.writeHead(400).end(JSON.stringify({ error: 'Missing id' }));
                
                const filePath = path.join(DOODLE_DIR, `${id}.webp`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[Doodle Server] Deleted drawing: ${filePath}`);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                console.error(e);
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

server.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`[Doodle Server] Up and running on port ${PORT}`);
    console.log(`===========================================`);
});
