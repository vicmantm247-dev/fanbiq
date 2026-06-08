(async ()=>{
  try{
    const r = await fetch('http://localhost:3000/api/search/users?query=test');
    console.log('STATUS', r.status);
    const t = await r.text();
    console.log(t);
  }catch(e){
    console.error('ERROR', e);
    process.exit(1);
  }
})();
