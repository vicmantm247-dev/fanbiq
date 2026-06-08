const { createClient } = require('@libsql/client');
(async () => {
  try {
    const client = createClient({ url: 'file:swiparr.db' });
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log(JSON.stringify(result, null, 2));
    await client.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
