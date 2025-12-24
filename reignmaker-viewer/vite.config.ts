import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Track running simulations
const runningSimulations = new Map<string, any>()

// Plugin to serve simulation data via API
function simulationApiPlugin() {
  return {
    name: 'simulation-api',
    configureServer(server: any) {
      // API to run a new simulation
      server.middlewares.use('/api/run-simulation', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        let body = ''
        req.on('data', (chunk: any) => {
          body += chunk.toString()
        })

        req.on('end', () => {
          try {
            const params = JSON.parse(body)
            const turns = params.turns || 15

            console.log(`Starting simulation with ${turns} turns...`)
            console.log(`Working directory: ${__dirname}`)

            const simDir = join(__dirname, '../../reignmaker-sim')
            console.log(`Simulation directory: ${simDir}`)

            // Use node directly with npm's cli script
            const nodePath = process.execPath
            const npmScript = process.env.NVM_BIN
              ? join(process.env.NVM_BIN, '../lib/node_modules/npm/bin/npm-cli.js')
              : '/usr/local/lib/node_modules/npm/bin/npm-cli.js'

            console.log(`Using node at: ${nodePath}`)
            console.log(`Using npm script at: ${npmScript}`)

            let simProcess
            try {
              simProcess = spawn(nodePath, [npmScript, 'run', 'simulate', '--', `--turns=${turns}`], {
                cwd: simDir,
                env: { ...process.env },
                stdio: ['ignore', 'pipe', 'pipe']
              })
            } catch (spawnError) {
              console.error('Failed to spawn simulation process:', spawnError)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Failed to spawn simulation process' }))
              return
            }

            const runId = `sim-${Date.now()}`
            const logs: string[] = []

            simProcess.on('error', (error) => {
              console.error('Simulation process error:', error)
              const sim = runningSimulations.get(runId)
              if (sim) {
                sim.status = 'failed'
                sim.logs.push(`ERROR: ${error.message}`)
              }
            })

            simProcess.stdout?.on('data', (data) => {
              const output = data.toString()
              console.log(output)
              logs.push(output)
            })

            simProcess.stderr?.on('data', (data) => {
              const output = data.toString()
              console.error(output)
              logs.push(`ERROR: ${output}`)
            })

            simProcess.on('close', (code) => {
              console.log(`Simulation process exited with code ${code}`)
              const sim = runningSimulations.get(runId)
              if (sim) {
                sim.status = code === 0 ? 'completed' : 'failed'
                sim.exitCode = code
              }
            })

            runningSimulations.set(runId, {
              process: simProcess,
              status: 'running',
              logs,
              startTime: Date.now(),
              params
            })

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ runId, status: 'started' }))
          } catch (error) {
            console.error('Error starting simulation:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to start simulation' }))
          }
        })
      })

      // API to check simulation status
      server.middlewares.use('/api/simulation-status', (req: any, res: any, next: any) => {
        const match = req.url.match(/\/([^/]+)$/)
        if (!match) {
          next()
          return
        }

        const runId = match[1]
        const sim = runningSimulations.get(runId)

        if (!sim) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Simulation not found' }))
          return
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          status: sim.status,
          logs: sim.logs.slice(-50), // Last 50 log lines
          exitCode: sim.exitCode,
          runtime: Date.now() - sim.startTime
        }))
      })

      server.middlewares.use('/api/simulations', (req: any, res: any, next: any) => {
        const resultsDir = join(__dirname, '../../reignmaker-sim/results')

        console.log(`[API] Request URL: ${req.url}`)
        console.log(`[API] Results dir: ${resultsDir}`)
        console.log(`[API] Results dir exists: ${existsSync(resultsDir)}`)

        // List all simulations
        if (req.url === '/' || req.url === '') {
          try {
            if (!existsSync(resultsDir)) {
              console.log('[API] Results directory does not exist!')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify([]))
              return
            }

            const dirs = readdirSync(resultsDir, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('simulation'))
              .map(dirent => dirent.name)
              .sort()

            console.log(`[API] Found simulation directories:`, dirs)

            const simulations = dirs.map(dir => {
              const summaryPath = join(resultsDir, dir, 'summary.json')
              if (existsSync(summaryPath)) {
                const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'))
                return {
                  id: dir,
                  path: dir,
                  config: summary.config,
                  totalTurns: summary.summary.totalTurns,
                  collapsed: summary.summary.collapsed
                }
              }
              return null
            }).filter(Boolean)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(simulations))
          } catch (error) {
            console.error('Error listing simulations:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to list simulations' }))
          }
          return
        }

        // Serve specific simulation files
        const match = req.url.match(/^\/([^/]+)\/(.+)$/)
        if (match) {
          const [, simId, filePath] = match
          const fullPath = join(resultsDir, simId, filePath)

          try {
            if (existsSync(fullPath)) {
              const content = readFileSync(fullPath, 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(content)
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'File not found' }))
            }
          } catch (error) {
            console.error('Error reading file:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to read file' }))
          }
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), simulationApiPlugin()],
  server: {
    fs: {
      // Allow serving files from the reignmaker-sim directory
      allow: ['..']
    }
  }
})
