import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL must be set');
}

const client = postgres(url);

const migrationsToApply = [
  '0002_add_follows.sql',
  '0003_create_follow.sql',
  '0004_add_notifications.sql',
  '0005_add_flick_personalization.sql',
  '0006_add_verification_attempts.sql',
  '0007_add_native_user_session_version.sql',
];

async function applyMigrations() {
  try {
    console.log('Applying missing migrations...');
    
    for (const migrationFile of migrationsToApply) {
      const filePath = path.join(__dirname, '..', 'src', 'db', 'migrations', migrationFile);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`Applying ${migrationFile}...`);
      
      try {
        // Execute the entire migration file as one batch to preserve PL/pgSQL blocks
        await client.unsafe(sql);
        console.log(`  ✓ ${migrationFile} applied`);
      } catch (error) {
        // Check if it's a non-critical error (already exists, etc.)
        if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate key') || error.message.includes('NOTICE'))) {
          console.log(`  - ${migrationFile}: Already applied (partial apply, continuing...)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('All migrations applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigrations().finally(() => client.end());
