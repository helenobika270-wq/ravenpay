import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {database} from './database.mjs';
import {seedDemo,applyCommand,assertId,postings} from './commands.mjs';
import {resolve,resolveWithdrawal} from '../../shared/demoLedger.ts';
import {processOutgoing} from '../../shared/outgoing.ts';
const hash=s=>createHash('sha256').update(s).digest('hex');
const execute=(tx,sql,args=[])=>tx.execute({sql,args});
function recover(state,now){let next=processOutgoing(state,now);for(const t of next.transfers)if(t.status==='pending'&&t.result!=='pending'&&t.due&&t.due<=now)next=resolve(next,t.id,new Date(now).toISOString());for(const w of next.withdrawals)if(w.status==='pending'&&w.due&&w.due<=now)next=resolveWithdrawal(next,w.id);return next;}
async function persist(tx,account,state,key,before){
 const version=Number(account.version)+1;
 await execute(tx,'UPDATE demo_accounts SET state=?,version=? WHERE id=?',[JSON.stringify(state),version,account.id]);
 for(const p of postings(before,state))await execute(tx,'INSERT INTO demo_postings(account_id,request_id,asset,bucket,delta) VALUES(?,?,?,?,?)',[account.id,key,p.asset,p.bucket,p.delta]);
 return {state,version,source:'demo'};
}
export async function createSession(db,legacy){const token=randomBytes(32).toString('base64url');const id=randomUUID();const state=seedDemo(legacy);await db.transaction(async tx=>{await execute(tx,'INSERT INTO demo_accounts(id,session_hash,state,created_at) VALUES(?,?,?,?)',[id,hash(token),JSON.stringify(state),new Date().toISOString()]);for(const p of postings(seedDemo(),state))await execute(tx,'INSERT INTO demo_postings(account_id,request_id,asset,bucket,delta) VALUES(?,?,?,?,?)',[id,'legacy-import',p.asset,p.bucket,p.delta]);});return {token,state,version:0,source:'demo'};}
export async function ledgerOperation(db,token,command,requestId){
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('UNAUTHORIZED');
 return db.transaction(async tx=>{
 const account=(await execute(tx,'SELECT * FROM demo_accounts WHERE session_hash=?',[hash(token)])).rows[0];if(!account||Date.now()-new Date(account.created_at).getTime()>30*86400000)throw new Error('UNAUTHORIZED');
 let before=JSON.parse(account.state);let state=recover(before,Date.now());
 if(!command){if(JSON.stringify(state)!==JSON.stringify(before))return persist(tx,account,state,'recovery-'+randomUUID(),before);return {state,version:Number(account.version),source:'demo'};}
 assertId(requestId);const payloadHash=hash(JSON.stringify(command));const existing=(await execute(tx,'SELECT payload_hash FROM demo_commands WHERE account_id=? AND request_id=?',[account.id,requestId])).rows[0];
 if(existing){if(existing.payload_hash!==payloadHash)throw new Error('IDEMPOTENCY_CONFLICT');return {state:before,version:Number(account.version),source:'demo',replayed:true};}
 state=applyCommand(state,command);
 const now=Date.now();if(command.type==='savings-begin')state={...state,transfers:state.transfers.map(t=>t.id===command.transfer.id&&!t.due?{...t,due:now+700}:t)};
 if(command.type==='withdraw-begin')state={...state,withdrawals:state.withdrawals.map(w=>w.id===command.withdrawal.id&&!w.due?{...w,due:now+700}:w)};
 const result=await persist(tx,account,state,requestId,before);
 await execute(tx,'INSERT INTO demo_commands(account_id,request_id,payload_hash,result,created_at) VALUES(?,?,?,?,?)',[account.id,requestId,payloadHash,JSON.stringify({version:result.version}),new Date().toISOString()]);return result;
 });
}
export async function handleDemoRequest(request,dbProvider=database,env=process.env){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 try{
 const url=new URL(request.url);const origin=request.headers.get('origin');if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')return Response.json({message:'Cross-site request denied.'},{status:403,headers});
 if(!['GET','POST'].includes(request.method))return Response.json({message:'Method not allowed.'},{status:405,headers:{...headers,Allow:'GET, POST'}});
 const token=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith('raven_demo_session='))?.slice('raven_demo_session='.length);
 let body;if(request.method==='POST'){if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({message:'JSON required.'},{status:415,headers});const text=await request.text();if(text.length>2000000)return Response.json({message:'Request too large.'},{status:413,headers});try{body=JSON.parse(text);}catch{return Response.json({message:'Invalid JSON.'},{status:400,headers});}}
 const db=await dbProvider();
 if(body?.type==='session'){
 if(token){try{return Response.json(await ledgerOperation(db,token),{headers});}catch(e){if(e.message!=='UNAUTHORIZED')throw e;}}
 // Each capability cookie owns one isolated demo account, never a provider account.
 const result=await createSession(db,body.legacy);const secure=url.protocol==='https:'||!!env.VERCEL;const {token:secret,...payload}=result;
 return Response.json(payload,{headers:{...headers,'Set-Cookie':`raven_demo_session=${secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure?'; Secure':''}`}});
 }
 if(!token)return Response.json({message:'Session required.'},{status:401,headers});
 return Response.json(await ledgerOperation(db,token,request.method==='POST'?body.command:undefined,body?.requestId),{headers});
 }catch(e){const message=e instanceof Error?e.message:'';if(message==='UNAUTHORIZED')return Response.json({message:'Session expired. Reload to reconnect.'},{status:401,headers});if(message==='IDEMPOTENCY_CONFLICT')return Response.json({message:'This request reference has already been used for different data.'},{status:409,headers});const storage=/DATABASE|SQLITE|SQL_|libsql|fetch|connect|timeout|locked/i.test(message);const validation=!storage&&/Invalid|supported|amount|balance|asset|fund|Deposit|deposit|plan|savings|transfer|Choose|Check|Quote|reference|Duplicate/i.test(message);return Response.json({message:validation?message:'Persistent storage is unavailable. No success is confirmed. Reconnect before retrying.'},{status:validation?400:503,headers});}
}
