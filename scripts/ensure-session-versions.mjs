import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL must be set');
}

const client = postgres(url);

async function ensureSessionVersions() {
  try {
    console.log('Ensuring all NativeUsers have sessionVersion...');
    
    // First, set any NULL sessionVersion to 1
    const result = await client.unsafe(
      `UPDATE "NativeUser" SET "sessionVersion" = 1 WHERE "sessionVersion" IS NULL`
    );
    
    console.log(`Updated ${result.count} users with NULL sessionVersion`);
    
    // Verify all users have sessionVersion
    const allUsers = await client`
      SELECT id, "sessionVersion", username FROM "NativeUser"
    `;
    
    console.log(`Total NativeUsers: ${allUsers.length}`);
    
    const withoutVersion = allUsers.filter((u) => u.sessionVersion == null);
    if (withoutVersion.length > 0) {
      console.warn(`WARNING: ${withoutVersion.length} users still missing sessionVersion:`, 
        withoutVersion.map((u) => ({ id: u.id, username: u.username })));
    } else {
      console.log('✓ All users have sessionVersion set');
    }
    
    console.log('Session version check complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

ensureSessionVersions().finally(() => client.end());
