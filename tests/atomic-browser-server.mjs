// Servidor SOMENTE de testes: PostgreSQL WASM isolado; nunca conecta ao Supabase.
import http from 'node:http';
import { databaseFixture } from './helpers/atomic-db-fixture.mjs';
const fixture=await databaseFixture();
await fixture.db.exec('UPDATE public.agenda_dinamica_metadata SET revision=10 WHERE id=1');
await fixture.activate();
let calls=0;
const server=http.createServer(async(req,res)=>{
  if (['http://127.0.0.1:3000','http://127.0.0.1:3001'].includes(req.headers.origin))
    res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.end();return;}
  try{
    if(req.url==='/stats'){
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({calls,snapshot:await fixture.load()}));return;
    }
    if(req.method!=='POST' || !['/rpc/agenda_snapshot_load','/rpc/agenda_snapshot_commit'].includes(req.url)){
      res.writeHead(404);res.end();return;
    }
    let body='';for await(const chunk of req)body+=chunk;
    const args=JSON.parse(body||'{}');
    let data;
    if(req.url==='/rpc/agenda_snapshot_load')data=await fixture.load();
    else{
      calls++;
      data=await fixture.commit(args.p_expected_revision,args.p_changes,args.p_context.commandId,undefined,
        Object.fromEntries(Object.entries(args.p_context).filter(([key])=>key!=='commandId')));
    }
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error:null}));
  }catch(error){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{code:error.code||'P0001',message:'Falha de fixture'}}));}
});
server.listen(3310,'127.0.0.1',()=>console.log('Fixture PostgreSQL local em 127.0.0.1:3310; revisão 10; não usa banco remoto.'));
async function stop(){server.close();await fixture.db.close();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
