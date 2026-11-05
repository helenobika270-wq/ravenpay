import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openDatabase} from '../server/demo/database.mjs';
import {createSession,ledgerOperation} from '../server/demo/service.mjs';
const digest=state=>createHash('sha256').update(JSON.stringify(state)).digest('hex');
let db;
try{
 if(!process.env.DEMO_DATABASE_URL||!process.env.DEMO_DATABASE_AUTH_TOKEN)throw new Error('REMOTE_CONFIGURATION_REQUIRED');
 db=await openDatabase({...process.env,VERCEL:'1'});
 const session=await createSession(db);
 const requestId=randomUUID();
 const command={type:'deposit',deposit:{id:randomUUID(),asset:'USD',amount:123}};
 const saved=await ledgerOperation(db,session.token,command,requestId);
 db.close();db=undefined;
 // Inherit server environment; pass the test session through stdin, never argv/logs.
 const script=`import{openDatabase}from'./server/demo/database.mjs';import{ledgerOperation}from'./server/demo/service.mjs';import{createHash}from'node:crypto';let db;try{let input='';for await(const part of process.stdin)input+=part;const p=JSON.parse(input);db=await openDatabase({...process.env,VERCEL:'1'});const restored=await ledgerOperation(db,p.token);const replay=await ledgerOperation(db,p.token,p.command,p.requestId);console.log(JSON.stringify({digest:createHash('sha256').update(JSON.stringify(restored.state)).digest('hex'),version:restored.version,replayed:replay.replayed,replayVersion:replay.version}));}catch{console.error('Remote persistence child check failed.');process.exitCode=1;}finally{db?.close();}`;
 const output=execFileSync(process.execPath,['--input-type=module','-e',script],{input:JSON.stringify({token:session.token,command,requestId}),encoding:'utf8',timeout:60000,stdio:['pipe','pipe','pipe']});
 const restored=JSON.parse(output);assert.equal(restored.digest,digest(saved.state));assert.equal(restored.version,saved.version);assert.equal(restored.replayed,true);assert.equal(restored.replayVersion,saved.version);
 console.log(JSON.stringify({status:'passed',remote:true,newServerProcess:true,exactStateRestored:true,duplicateDepositPrevented:true}));
}catch{console.log(JSON.stringify({status:'failed',code:'REMOTE_PERSISTENCE_CHECK_FAILED',message:'Remote restart verification failed; no secrets or raw database errors displayed.'}));process.exitCode=1;}
finally{db?.close();}
