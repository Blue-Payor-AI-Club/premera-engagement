// Starts the real API (from ../premera-engagement-api) on a throwaway database for the
// browser tests, and copies its console to a log file so tests can read the sign-in codes
// the console mail transport prints. Run with cwd = the API folder and -r ts-node/register.
const fs = require('node:fs')
const path = require('node:path')

const dir = process.env.E2E_DIR
for (const f of ['e2e.db', 'e2e.db-wal', 'e2e.db-shm', 'api.log']) fs.rmSync(path.join(dir, f), { force: true })
process.env.DB_PATH = path.join(dir, 'e2e.db')

const log = fs.createWriteStream(path.join(dir, 'api.log'), { flags: 'a' })
for (const level of ['log', 'info', 'warn', 'error']) {
  const original = console[level].bind(console)
  console[level] = (...args) => {
    log.write(args.map(String).join(' ') + '\n')
    original(...args)
  }
}

require(path.join(process.cwd(), 'src', 'index.ts'))
