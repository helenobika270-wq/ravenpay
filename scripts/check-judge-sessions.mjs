import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../server/demo/database.mjs';
import {handleDemoRequest} from '../server/demo/service.mjs';
import {demoBeneficiary} from '../shared/outgoing.ts';

const remote=process.argv.includes('--remote');
if(remote&&(!process.env.DEMO_DATABASE_URL||!process.env.DEMO_DATABASE_AUTH_TOKEN))throw new Error('Remote demo database configuration required.');
const db=await openDatabase(remote?{...process.env,VERCEL:'1'}:{DEMO_SQLITE_PATH:'.data/judges-'+randomUUID()+'.sqlite'});
const judgeCount=remote?3:12;
const origin='https://ravenpay.invalid';
async function http(cookie,body){const r=await handleDemoRequest(new Request(origin+'/api/demo',{method:body?'POST':'GET',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),()=>db,{VERCEL:'1'});return {r,data:await r.json()};}
async function create(){const {r,data}=await http(null,{type:'session'});assert.equal(r.status,200);const header=r.headers.get('set-cookie');assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Strict/);assert.match(header,/Secure/);return {cookie:header.split(';')[0],opening:data.state};}
async function write(judge,command,requestId=randomUUID()){const result=await http(judge.cookie,{command,requestId});assert.equal(result.r.status,200,JSON.stringify(result.data));return result.data.state;}
async function read(judge){const result=await http(judge.cookie);assert.equal(result.r.status,200);return result.data.state;}
async function waitPending(judge){await new Promise(r=>setTimeout(r,750));await read(judge);}
try{
 const judges=await Promise.all(Array.from({length:judgeCount},create));assert.equal(new Set(judges.map(j=>j.cookie)).size,judgeCount);
 await Promise.all(judges.map((j,i)=>write(j,{type:'deposit',deposit:{id:'same-reference-for-different-judges',asset:'USDT',amount:(i+1)*1000000}},'same-request-reference')));
 for(const [i,j]of judges.entries()){const s=await read(j);assert.equal(s.balances.USDT,(i+1)*1000000);assert.equal(s.deposits.length,1);assert.equal(s.activity.length,1);assert.equal(s.balances.USD,j.opening.balances.USD);}
 const j=judges[0],other=judges[1];const otherBefore=await read(other);
 for(const asset of ['USD','GBP','EUR','USDC','USDT']){
  const amount=asset==='USDC'||asset==='USDT'?10000000:10000;
  const command={type:'deposit',deposit:{id:'deposit-'+asset,asset,amount}};
  await Promise.all([write(j,command,'deposit-'+asset),write(j,command,'deposit-'+asset)]);
  assert.equal((await read(j)).deposits.filter(d=>d.id==='deposit-'+asset).length,1);
 }
 for(const [kind,payout,id]of [['flexible','maturity','flex'],['locked','upfront','locked-upfront'],['locked','maturity','locked-maturity']]){
  await write(j,{type:'savings-begin',transfer:{id,result:'success',terms:{asset:'USDC',principal:1000000,kind,days:90,payout,source:'funding-'+id,basis:1}}});
  const s=await write(j,{type:'savings-resolve',id});const p=s.plans.find(p=>p.id===id);assert.equal(p.principal,1000000);assert.equal(p.earnings,payout==='upfront'?p.interest:0);assert.equal(!!p.maturity,kind==='locked');
 }
 const locked=await http(j.cookie,{command:{type:'withdraw-begin',withdrawal:{id:'illegal-locked',planId:'locked-maturity',amount:1}},requestId:'illegal-locked'});assert.equal(locked.r.status,400);
 for(const [id,amount]of [['partial',250000],['full',750000]]){await write(j,{type:'withdraw-begin',withdrawal:{id,planId:'flex',amount}});await write(j,{type:'withdraw-resolve',id});}
 assert.equal((await read(j)).plans.find(p=>p.id==='flex').principal,0);
 const routes=[['USD','USD'],['GBP','GBP'],['EUR','EUR'],...['USD','GBP','EUR','USDC','USDT'].map(a=>[a,'NGN'])];
 for(const [asset,currency]of routes){const id='bank-'+asset+'-'+currency;const amount=asset==='USDC'||asset==='USDT'?1000000:100;const t={id,asset,kind:'bank',currency,amount,destination:demoBeneficiary(currency),outcome:'pending'};await write(j,{type:'outgoing-submit',transaction:t});await waitPending(j);await write(j,{type:'outgoing-transition',id,status:'completed'});assert.equal((await read(j)).outgoing.find(t=>t.id===id).status,'completed');}
 for(const asset of ['USDC','USDT']){const id='send-'+asset;await write(j,{type:'outgoing-submit',transaction:{id,asset,kind:'crypto',currency:asset,amount:1000000,destination:{name:'',bank:'',routing:'',account:'DEMO-'+asset+'-RECIPIENT-NOT-FOR-PAYMENTS'},outcome:'pending'}});await waitPending(j);const reserved=(await read(j)).balances[asset];await write(j,{type:'outgoing-transition',id,status:'completed'});assert.equal((await read(j)).balances[asset],reserved);await write(j,{type:'outgoing-transition',id,status:'reversed'});const refunded=(await read(j)).balances[asset];await write(j,{type:'outgoing-transition',id,status:'reversed'});assert.equal((await read(j)).balances[asset],refunded);}
 await write(j,{type:'test-balance',asset:'USD',amount:300});
 const send=id=>http(j.cookie,{command:{type:'outgoing-submit',transaction:{id,asset:'USD',kind:'bank',currency:'USD',amount:150,destination:demoBeneficiary('USD'),outcome:'pending'}},requestId:id});
 const racing=await Promise.all([send('race-a'),send('race-b')]);assert.equal(racing.filter(x=>x.r.status===200).length,1);assert.equal(racing.filter(x=>x.r.status===400).length,1);assert.equal((await read(j)).balances.USD,50);
 await waitPending(j);const failed=(await read(j)).outgoing.find(t=>t.id==='race-a'||t.id==='race-b');await write(j,{type:'outgoing-transition',id:failed.id,status:'failed'});assert.equal((await read(j)).balances.USD,300);
 const before=await read(j);const resumed=await http(j.cookie,{type:'session',legacy:j.opening});assert.deepEqual(resumed.data.state,before);assert.deepEqual(await read(other),otherBefore);
 const spoof=await http(j.cookie,{command:{type:'deposit',deposit:{id:'own-only',asset:'EUR',amount:1},account_id:'another-judge'},requestId:'own-only'});assert.equal(spoof.r.status,200);assert.deepEqual(await read(other),otherBefore);
 assert.equal((await http(null)).r.status,401);assert.equal((await http('raven_demo_session=invalid')).r.status,401);
 console.log(`Judge-session HTTP handler checks passed (${remote?'remote Turso':'local SQLite'}): ${judgeCount} isolated concurrent sessions; five-asset deposits; all 8 bank routes; both token sends; flexible/locked payout paths; locked withdrawal denied; partial/full flexible withdrawals; duplicate requests; concurrent overspend protection; refunds; refresh/session resume; forged account selector ignored. No provider requests.`);
}finally{db.close();}
