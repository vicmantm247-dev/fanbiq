const postgres = require('postgres');
require('dotenv').config();

(async () => {
  const client = postgres(process.env.DATABASE_URL);
  try {
    const result = await client.unsafe('SELECT to_regclass(\'public."FlickInteraction"\') as interaction, to_regclass(\'public."FlickPersonalizationProfile"\') as profile');
    console.log(JSON.stringify(result[0], null, 2));
  } finally {
    await client.end();
  }
})();
