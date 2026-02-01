const db = require('./lib/db');

async function resetPPPoEUsers() {
  try {
    console.log('[RESET] Starting PPPoE users reset...');
    
    // Delete all PPPoE users
    const result = await db.pppoeRun('DELETE FROM pppoe_users');
    console.log(`[RESET] Deleted all PPPoE users`);
    
    // Reset any auto-increment counters
    await db.pppoeRun('DELETE FROM sqlite_sequence WHERE name="pppoe_users"');
    console.log('[RESET] Reset auto-increment counter');
    
    console.log('[RESET] PPPoE users reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[RESET] Error during reset:', error.message);
    process.exit(1);
  }
}

// Run the reset
resetPPPoEUsers();