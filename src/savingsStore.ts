import {useSyncExternalStore} from 'react';
import {initial,migrate,type Ledger} from '../shared/demoLedger';
export * from '../shared/demoLedger';
export const STORAGE_KEY='raven-demo-savings-v1';
const PENDING_KEY='raven-demo-pending-command-v1';
function cached():Ledger{try{const raw=localStorage.getItem(STORAGE_KEY);return raw?migrate(JSON.parse(raw)):initial();}catch{return initial();}}
let snapshot=cached();let version=-1;const listeners=new Set<()=>void>();
function publish(result:{state:Ledger;version:number}){if(result.version<version)return;snapshot=result.state;version=result.version;localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot));listeners.forEach(fn=>fn());}
async function request(body?:unknown){const response=await fetch('/api/demo',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});let data;try{data=await response.json();}catch{throw new Error('Persistent storage did not respond. Reload before retrying.');}if(!response.ok){const error=new Error(data.message||'Could not save this change.') as Error&{definitive?:boolean};error.definitive=response.status>=400&&response.status<500;throw error;}return data;}
async function flush(){const raw=localStorage.getItem(PENDING_KEY);if(!raw)return;try{publish(await request(JSON.parse(raw)));localStorage.removeItem(PENDING_KEY);}catch(e){if((e as Error&{definitive?:boolean}).definitive)localStorage.removeItem(PENDING_KEY);throw e;}}
let ready:Promise<void>|undefined;
function initialize(){return ready??=request({type:'session',legacy:snapshot}).then(async r=>{publish(r);await flush();}).catch(e=>{ready=undefined;throw e;});}
function command(before:Ledger,next:Ledger):unknown|null{
 const added=<T extends {id:string}>(old:T[],list:T[])=>list.find(x=>!old.some(y=>y.id===x.id));
 if(added(before.plans,next.plans)?.id==='demo-usdt-90-day-sample-v1')return{type:'sample-plan'};
 const deposit=added(before.deposits,next.deposits);if(deposit)return{type:'deposit',deposit};
 const transfer=added(before.transfers,next.transfers);if(transfer)return{type:'savings-begin',transfer};
 const withdrawal=added(before.withdrawals,next.withdrawals);if(withdrawal)return{type:'withdraw-begin',withdrawal};
 const outgoing=added(before.outgoing,next.outgoing);if(outgoing)return{type:'outgoing-submit',transaction:outgoing};
 const t=next.transfers.find(x=>before.transfers.find(y=>y.id===x.id)?.status!==x.status);if(t)return{type:'savings-resolve',id:t.id};
 const w=next.withdrawals.find(x=>before.withdrawals.find(y=>y.id===x.id)?.status!==x.status);if(w)return{type:'withdraw-resolve',id:w.id};
 const o=next.outgoing.find(x=>before.outgoing.find(y=>y.id===x.id)?.status!==x.status);if(o)return o.status==='pending'?{type:'process'}:{type:'outgoing-transition',id:o.id,status:o.status};
 for(const asset of Object.keys(before.balances) as (keyof Ledger['balances'])[])if(before.balances[asset]!==next.balances[asset])return{type:'test-balance',asset,amount:next.balances[asset]};
 return null;
}
let queue=Promise.resolve();
export function transact(update:(state:Ledger)=>Ledger):Promise<Ledger>{
 const result=queue.then(async()=>{await initialize();await flush();publish(await request());const c=command(snapshot,update(snapshot));if(!c)return snapshot;
 const body={command:c,requestId:crypto.randomUUID()};localStorage.setItem(PENDING_KEY,JSON.stringify(body));await flush();return snapshot;});queue=result.then(()=>{},()=>{});return result;
}
void initialize().catch(()=>{});
window.addEventListener('focus',()=>{void queue.then(async()=>{await initialize();publish(await request());}).catch(()=>{});});
export function useLedger(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>snapshot);}
