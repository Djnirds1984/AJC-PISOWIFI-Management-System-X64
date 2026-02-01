const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const action = process.argv[2]; // 'up' or 'down'
const ifname = process.argv[3];

if (!action || !ifname) {
  console.error('Usage: node pppoe-hook.js <up|down> <ifname> [peername] [ip] [mac]');
  process.exit(1);
}

// Connect to DB
const pppoeDbPath = path.resolve(__dirname, '../pppoe.sqlite');
const db = new sqlite3.Database(pppoeDbPath);

const run = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

async function handleUp() {
  const username = process.argv[4];
  const ip = process.argv[5];
  const mac = process.argv[6] || null;

  if (!username || !ip) {
    console.error('Missing username or IP for up event');
    return;
  }

  try {
    // Upsert session
    await run(`INSERT OR REPLACE INTO pppoe_onlines (username, interface, ip, mac, started_at) 
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, 
               [username, ifname, ip, mac]);
    console.log(`[PPPoE-Hook] Registered session: ${username} on ${ifname} (${ip})`);
  } catch (e) {
    console.error(`[PPPoE-Hook] Error registering session:`, e.message);
  }
}

async function handleDown() {
  try {
    await run(`DELETE FROM pppoe_onlines WHERE interface = ?`, [ifname]);
    console.log(`[PPPoE-Hook] Removed session on ${ifname}`);
  } catch (e) {
    console.error(`[PPPoE-Hook] Error removing session:`, e.message);
  }
}

async function main() {
  try {
    if (action === 'up') {
      await handleUp();
    } else if (action === 'down') {
      await handleDown();
    }
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

main();
