
const db = require('../lib/db');

async function migrate() {
  console.log('Migrating pppoe_users table...');
  try {
    await db.run("ALTER TABLE pppoe_users ADD COLUMN expiration_date DATETIME");
    console.log('Added expiration_date');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error(e.message);
  }

  try {
    await db.run("ALTER TABLE pppoe_users ADD COLUMN expiration_action TEXT DEFAULT 'disable'");
    console.log('Added expiration_action');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error(e.message);
  }

  try {
    await db.run("ALTER TABLE pppoe_users ADD COLUMN redirect_url TEXT");
    console.log('Added redirect_url');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error(e.message);
  }
  
  console.log('Migration done.');
}

migrate();
