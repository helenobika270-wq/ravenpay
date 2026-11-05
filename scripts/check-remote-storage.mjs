import {randomUUID} from 'node:crypto';
import {openDatabase} from '../server/demo/database.mjs';
// Run only after configuring a dedicated demo database. Never contact Roqqu.
// No URL, token, account state, or raw driver error is logged.
if(!process.env.DEMO_DATABASE_URL||!process.env.DEMO_DATABASE_AUTH_TOKEN){
 console.log(JSON.stringify({status:'blocked',code:'REMOTE_DATABASE_CONFIGURATION_REQUIRED',message:'Configure the dedicated Turso/libSQL demo database privately first.'}));process.exitCode=1;
}else{
 let db;
 try{
  db=await openDatabase({...process.env,VERCEL:'1'});
  const marker='readiness-'+randomUUID();
  // Roll back a probe row, verifying write permission without creating a demo account.
  const rollback=new Error('READINESS_ROLLBACK');
  try{await db.transaction(async tx=>{await tx.execute({sql:'INSERT INTO demo_accounts(id,session_hash,state,created_at) VALUES(?,?,?,?)',args:[marker,marker,'{}',new Date().toISOString()]});throw rollback;});}catch(e){if(e!==rollback)throw e;}
  const count=await db.transaction(async tx=>(await tx.execute({sql:'SELECT count(*) AS n FROM demo_accounts WHERE id=?',args:[marker]})).rows[0].n);
  if(Number(count)!==0)throw new Error('ROLLBACK_FAILED');
  console.log(JSON.stringify({status:'ready',remote:true,schemaReady:true,writeAndRollbackVerified:true}));
 }catch{console.log(JSON.stringify({status:'error',code:'REMOTE_STORAGE_CHECK_FAILED',message:'Could not verify remote storage. Check its URL, token permissions and availability privately.'}));process.exitCode=1;}
 finally{db?.close();}
}
