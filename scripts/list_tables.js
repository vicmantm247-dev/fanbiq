(async()=>{
  try{
    const url = process.env.DATABASE_URL;
    if(!url){ console.error('No DATABASE_URL in env'); process.exit(1); }
    const postgres = require('postgres');
    const sql = postgres(url,{max:1});
    const rows = await sql`select schemaname, tablename from pg_tables where schemaname in ('public','drizzle') order by schemaname, tablename`;
    console.log(JSON.stringify(rows, null, 2));
    await sql.end();
  }catch(e){ console.error(e); process.exit(1); }
})();
