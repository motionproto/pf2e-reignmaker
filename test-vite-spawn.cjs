const { spawn } = require('child_process');
const http = require('http');
const { join } = require('path');

console.log('Testing spawn from HTTP server context (simulating Vite middleware)');
console.log('Node version:', process.version);
console.log('Shell path:', process.env.SHELL);
console.log('/bin/sh exists:', require('fs').existsSync('/bin/sh'));

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/test-spawn') {
    console.log('\n=== POST /test-spawn received ===');

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', () => {
      try {
        console.log('Attempting to spawn npm with shell:true...');

        const simDir = join(__dirname, 'reignmaker-viewer');
        const proc = spawn('npm', ['--version'], {
          cwd: simDir,
          shell: true,
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe']
        });

        console.log('Spawn called successfully, pid:', proc.pid);

        proc.on('error', (error) => {
          console.error('Process error event:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        });

        proc.stdout?.on('data', (data) => {
          console.log('stdout:', data.toString().trim());
        });

        proc.stderr?.on('data', (data) => {
          console.error('stderr:', data.toString().trim());
        });

        proc.on('close', (code) => {
          console.log('Process exited with code:', code);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, exitCode: code }));
        });

      } catch (error) {
        console.error('Caught exception:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3333, () => {
  console.log('Test server listening on http://localhost:3333');
  console.log('Send POST to http://localhost:3333/test-spawn to test spawn');
  console.log('\nRun: curl -X POST http://localhost:3333/test-spawn');
});

// Keep server running
setTimeout(() => {
  console.log('\nClosing server...');
  server.close();
}, 30000);
