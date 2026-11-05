import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const pure=await import('../shared/demoLedger.ts');
const model=await import('../shared/outgoing.ts');
const memory=new Map();let testState=pure.initial();testState.balances.USDT=pure.units(300,'USDT');
const store={...pure,transact:update=>{testState=update(memory.has(pure.STORAGE_KEY)?JSON.parse(memory.get(pure.STORAGE_KEY)):testState);memory.set(pure.STORAGE_KEY,JSON.stringify(testState));return testState;}};
const {quote,demoBeneficiary,validBeneficiary,submitOutgoing,transitionOutgoing,processOutgoing}=model;
const initial=store.transact(s=>s);
const draft=(asset,kind='bank',currency=asset,outcome='success')=>{const amount=store.units(10,asset);return{id:asset+kind+currency,source:'demo',asset,kind,currency,amount,...quote(asset,kind,currency,amount),destination:kind==='bank'?demoBeneficiary(currency):{name:'',bank:'',routing:'',account:`DEMO-${asset}-RECIPIENT-NOT-FOR-PAYMENTS`},status:'submitting',outcome,date:new Date().toISOString(),updated:'',due:100};};
for(const asset of ['USD','GBP','EUR','USDC','USDT']) {
 for(const currency of ['NGN',...(['USD','GBP','EUR'].includes(asset)?[asset]:[])]) {
  const t=draft(asset,'bank',currency);let s=submitOutgoing(initial,t);
  assert.equal(s.balances[asset],initial.balances[asset]-t.total);
  assert.equal(submitOutgoing(s,t),s);
  for(const other of Object.keys(initial.balances)) if(other!==asset)assert.equal(s.balances[other],initial.balances[other]);
  const completed=processOutgoing(s,1000);assert.equal(completed.outgoing[0].status,'completed');assert.equal(completed.balances[asset],s.balances[asset]);
  const reversed=transitionOutgoing(completed,t.id,'reversed');assert.equal(reversed.balances[asset],initial.balances[asset]);assert.equal(transitionOutgoing(reversed,t.id,'reversed'),reversed);
  const failed=transitionOutgoing(s,t.id,'failed');assert.equal(failed.balances[asset],initial.balances[asset]);assert.equal(transitionOutgoing(failed,t.id,'failed'),failed);
  const max=initial.balances[asset]-t.fee;assert.equal(quote(asset,'bank',currency,max).total,initial.balances[asset]);
  assert.throws(()=>submitOutgoing({...initial,balances:{...initial.balances,[asset]:t.total-1}},t),/Insufficient/);
  assert.equal(s.activity.filter(a=>a.id===t.id).length,1);
  assert.deepEqual(s.plans,initial.plans);
 }
}
for(const asset of ['USDC','USDT']) {
 const t=draft(asset,'crypto',asset,'pending');let s=submitOutgoing(initial,t);s=processOutgoing(s,10000);assert.equal(s.outgoing[0].status,'pending');
 memory.set(store.STORAGE_KEY,JSON.stringify(s));const restored=store.transact(s=>s);assert.equal(restored.outgoing[0].status,'pending');assert.equal(restored.balances[asset],initial.balances[asset]-t.total);
 const complete=transitionOutgoing(restored,t.id,'completed');assert.equal(complete.balances[asset],restored.balances[asset]);
}
for(const c of ['USD','GBP','EUR','NGN']) {assert.ok(validBeneficiary(c,demoBeneficiary(c)));assert.equal(validBeneficiary(c,{name:'',bank:'',account:'bad',routing:''}),false);}
assert.equal(validBeneficiary('EUR',{...demoBeneficiary('EUR'),account:'DE00370400440532013000'}),false);
for(const input of ['0','-1','NaN','Infinity','1e4','1.0000001','1.2.3'])assert.equal(store.parseAmount(input,'USDT'),null);
assert.equal(quote('USDC','bank','NGN',1000000).received,149000);assert.equal(quote('USDT','bank','NGN',1000000).received,148500);
assert.throws(()=>quote('USDC','bank','USD',1000000));
console.log('Outgoing checks passed: all 8 bank routes, both token sends, Max/fees, reservation isolation, insufficient funds, idempotency, pending persistence, failure/reversal refunds, beneficiary validation and exact conversions.');
const failing=draft('GBP','bank','GBP','failed');const reserved=submitOutgoing(initial,failing);const released=processOutgoing(reserved,1000);assert.equal(released.outgoing[0].status,'failed');assert.equal(released.balances.GBP,initial.balances.GBP);assert.equal(processOutgoing(released,2000),released);
const full=draft('EUR');full.amount=initial.balances.EUR-full.fee;Object.assign(full,quote('EUR','bank','EUR',full.amount));const exhausted=submitOutgoing(initial,full);assert.equal(exhausted.balances.EUR,0);assert.throws(()=>submitOutgoing(exhausted,{...draft('EUR'),id:'another'}),/Insufficient/);
const old={...initial};delete old.outgoing;const migrated=store.migrate(old);assert.equal(migrated.outgoing.length,0);assert.equal(JSON.stringify(migrated.balances),JSON.stringify(old.balances));
console.log('Failure processing, reserved-fund reuse rejection and non-destructive migration passed.');
