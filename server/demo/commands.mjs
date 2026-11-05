import {initial,migrate,credit,begin,resolve,beginWithdrawal,resolveWithdrawal,loadSample} from '../../shared/demoLedger.ts';
import {submitOutgoing,transitionOutgoing,processOutgoing,quote,payoutConfig} from '../../shared/outgoing.ts';
const assets=['USD','GBP','EUR','USDC','USDT'];
const idPattern=/^[a-zA-Z0-9_-]{1,128}$/;
export function assertId(id){if(typeof id!=='string'||!idPattern.test(id))throw new Error('Invalid transaction reference.');}
function positive(n){if(!Number.isSafeInteger(n)||n<=0||n>1e15)throw new Error('Enter a supported positive amount.');}
function asset(a){if(!assets.includes(a))throw new Error('Unsupported asset.');}
export function validateLedger(state){
 if(!state||typeof state!=='object')throw new Error('Invalid ledger.');
 for(const a of assets)if(!Number.isSafeInteger(state.balances?.[a])||state.balances[a]<0||state.balances[a]>1e15)throw new Error('Balance exceeds supported range.');
 for(const list of ['deposits','plans','transfers','withdrawals','outgoing','activity']){if(!Array.isArray(state[list])||state[list].length>10000)throw new Error('Invalid ledger records.');const seen=new Set();for(const r of state[list]){assertId(r.id);if(seen.has(r.id))throw new Error('Duplicate record.');seen.add(r.id);}}
 for(const p of state.plans){asset(p.asset);if(!['flexible','locked'].includes(p.kind)||!Number.isSafeInteger(p.principal)||p.principal<0||!Number.isSafeInteger(p.earnings)||p.earnings<0)throw new Error('Invalid savings record.');}
 return state;
}
export function seedDemo(legacy){return validateLedger(legacy?migrate(legacy):initial());}
export function applyCommand(state,c,now=Date.now()){
 if(!c||typeof c.type!=='string')throw new Error('Invalid ledger command.');
 // Recover due spending reservations after reload/server restart. They never
 // credit a provider balance; all outcomes here are simulated demo results.
 state=processOutgoing(state,now);
 const date=new Date(now).toISOString();let next;
 switch(c.type){
 case 'deposit': {const d=c.deposit;asset(d?.asset);assertId(d?.id);positive(d?.amount);const existing=state.deposits.find(x=>x.id===d.id);if(existing&&(existing.asset!==d.asset||existing.amount!==d.amount))throw new Error('IDEMPOTENCY_CONFLICT');next=credit(state,{id:d.id,asset:d.asset,amount:d.amount,date});break;}
 case 'savings-begin': {const t=c.transfer;assertId(t?.id);const v=t?.terms;asset(v?.asset);positive(v?.principal);assertId(v?.source);if(!['flexible','locked'].includes(v.kind)||![30,90,180].includes(v.days)||!['upfront','maturity'].includes(v.payout)||!['success','failed','pending'].includes(t.result))throw new Error('Invalid savings terms.');
 const deposit=state.deposits.find(d=>d.id===v.source);const basis=deposit?deposit.amount:state.balances[v.asset];
 if(deposit&&deposit.asset!==v.asset)throw new Error('Deposit asset mismatch.');
 next=begin(state,{id:t.id,status:'pending',result:t.result,terms:{asset:v.asset,principal:v.principal,kind:v.kind,days:v.days,payout:v.payout,source:v.source,basis,targetPlanId:v.targetPlanId}});break;}
 case 'savings-resolve': assertId(c.id);next=resolve(state,c.id,date);break;
 case 'withdraw-begin': {const w=c.withdrawal;assertId(w?.id);assertId(w?.planId);positive(w?.amount);next=beginWithdrawal(state,{id:w.id,planId:w.planId,amount:w.amount,status:'pending'});break;}
 case 'withdraw-resolve': assertId(c.id);next=resolveWithdrawal(state,c.id);break;
 case 'outgoing-submit': {const t=c.transaction;asset(t?.asset);assertId(t?.id);positive(t?.amount);if(!['bank','crypto'].includes(t.kind)||!['success','failed','pending'].includes(t.outcome))throw new Error('Invalid transfer.');const d=t.destination;if(!d||['name','bank','account','routing'].some(k=>typeof d[k]!=='string'||d[k].length>256))throw new Error('Invalid destination.');
 const q=quote(t.asset,t.kind,t.currency,t.amount);next=submitOutgoing(state,{id:t.id,source:'demo',asset:t.asset,kind:t.kind,amount:t.amount,...q,currency:t.currency,destination:d,network:t.kind==='crypto'?payoutConfig.network:undefined,status:'submitting',outcome:t.outcome,date,updated:date,due:now+700});break;}
 case 'outgoing-transition':assertId(c.id);if(!['completed','failed','reversed'].includes(c.status))throw new Error('Invalid status transition.');next=transitionOutgoing(state,c.id,c.status);break;
 case 'process':next=state;break;
 case 'sample-plan':next=loadSample(state);break;
 case 'test-balance':asset(c.asset);if(!Number.isSafeInteger(c.amount)||c.amount<0)throw new Error('Invalid sample balance.');next={...state,balances:{...state.balances,[c.asset]:c.amount}};break;
 default:throw new Error('Unsupported demo command.');
 }
 return validateLedger(next);
}
export function postings(before,after){const rows=[];for(const a of assets){const spending=after.balances[a]-before.balances[a];const principal=s=>s.plans.filter(p=>p.asset===a).reduce((n,p)=>n+p.principal,0);const savings=principal(after)-principal(before);if(spending)rows.push({asset:a,bucket:'spending',delta:spending});if(savings)rows.push({asset:a,bucket:'savings',delta:savings});if(spending+savings)rows.push({asset:a,bucket:'sample-clearing',delta:-spending-savings});}return rows;}
