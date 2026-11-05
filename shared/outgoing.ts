import type { AccountId } from '../src/accounts.ts';
import { precision, units, type Ledger } from './demoLedger.ts';
export type PayoutCurrency = 'USD'|'GBP'|'EUR'|'NGN';
export type Outcome = 'success'|'pending'|'failed';
export type Outgoing = { id:string; source:'demo'; asset:AccountId; kind:'bank'|'crypto'; amount:number; fee:number; total:number; received:number; currency:AccountId|'NGN'; rate:number; destination:Beneficiary; network?:string; status:'submitting'|'pending'|'completed'|'failed'|'reversed'; outcome:Outcome; date:string; updated:string; due:number };
export type Beneficiary = { name:string; bank:string; account:string; routing:string };
// Illustrative fixtures only, independently configured for each asset. Never live quotes.
export const payoutConfig = {
  ngnRates: {USD:1500,GBP:1900,EUR:1650,USDC:1490,USDT:1485},
  bankFees: {USD:1,GBP:1,EUR:1,USDC:1.25,USDT:1.5},
  cryptoFees: {USDC:.5,USDT:1}, network:'Simulated network',
  banks:['Demo Access Bank','Demo First Bank','Demo Zenith Bank'],
} as const;
export function quote(asset:AccountId,kind:'bank'|'crypto',currency:AccountId|'NGN',amount:number) {
  if(kind==='crypto' && asset!=='USDC' && asset!=='USDT') throw new Error('Choose a token wallet.');
  if(kind==='bank' && currency!=='NGN' && (currency!==asset || asset==='USDC'||asset==='USDT')) throw new Error('Choose an available demo payout currency.');
  const fee=units(kind==='crypto'?payoutConfig.cryptoFees[asset as 'USDC'|'USDT']:payoutConfig.bankFees[asset],asset);
  const rate=currency==='NGN'?payoutConfig.ngnRates[asset]:1;
  const scale=10**precision(asset);
  const received=Number((BigInt(amount)*BigInt(Math.round(rate*100))+BigInt(scale/2))/BigInt(scale));
  return {fee,total:amount+fee,rate,received:currency==='NGN'?received:amount};
}
export function validBeneficiary(currency:AccountId|'NGN',b:Beneficiary) {
  if(currency==='NGN') return payoutConfig.banks.includes(b.bank as typeof payoutConfig.banks[number]) && /^\d{10}$/.test(b.account);
  if(b.name.trim().length<2) return false;
  if(currency==='USD') return b.bank.trim().length>=2 && /^\d{9}$/.test(b.routing) && /^\d{4,17}$/.test(b.account);
  if(currency==='GBP') return /^\d{6}$/.test(b.routing.replace(/[- ]/g,'')) && /^\d{8}$/.test(b.account);
  const iban=b.account.replace(/\s/g,'').toUpperCase();
  if(!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const lengths:Record<string,number>={DE:22,FR:27,ES:24,NL:18,IE:22,IT:27,BE:16,AT:20,PT:25,FI:18,LU:20,GR:27,MT:31,CY:28,EE:20,LV:21,LT:20,SI:19,SK:24,HR:21};
  if(lengths[iban.slice(0,2)]!==iban.length) return false;
  let remainder=0;
  for(const c of iban.slice(4)+iban.slice(0,4)) for(const digit of /[A-Z]/.test(c)?String(c.charCodeAt(0)-55):c) remainder=(remainder*10+Number(digit))%97;
  return remainder===1;
}
export const demoBeneficiary=(currency:AccountId|'NGN'):Beneficiary=>({name:'Raven Demo',bank:currency==='NGN'?payoutConfig.banks[0]:'Demo Bank',account:currency==='NGN'?'0123456789':currency==='USD'?'000123456789':currency==='GBP'?'12345678':'DE89370400440532013000',routing:currency==='USD'?'021000021':'123456'});
export function validRecipient(address:string) {return /^DEMO-(USDC|USDT)-RECIPIENT-NOT-FOR-PAYMENTS$/.test(address)||(/^[\x21-\x7e]{8,160}$/.test(address));}
export function submitOutgoing(state:Ledger,t:Outgoing):Ledger {
  if(state.outgoing.some(x=>x.id===t.id)) return state;
  if(t.source!=='demo'||t.status!=='submitting'||!Number.isSafeInteger(t.amount)||t.amount<=0) throw new Error('Enter a valid amount.');
  const q=quote(t.asset,t.kind,t.currency,t.amount);
  if(t.kind==='bank'?!validBeneficiary(t.currency,t.destination):!validRecipient(t.destination.account)) throw new Error('Check destination details. Format checks do not verify ownership.');
  if(t.total!==q.total||t.fee!==q.fee||t.rate!==q.rate||t.received!==q.received||!Number.isSafeInteger(t.total)||!Number.isSafeInteger(t.received)) throw new Error('Quote changed. Review the amount again.');
  if(state.balances[t.asset]<t.total) throw new Error('Insufficient available balance including fees. Adjust your amount.');
  return {...state,balances:{...state.balances,[t.asset]:state.balances[t.asset]-t.total},outgoing:[t,...state.outgoing],activity:[{id:t.id,title:t.kind==='bank'?'Bank withdrawal':`Sent ${t.asset}`,asset:t.asset,amount:t.total,kind:'outgoing'},...state.activity]};
}
export function transitionOutgoing(state:Ledger,id:string,status:Outgoing['status']):Ledger {
  const t=state.outgoing.find(x=>x.id===id);if(!t)return state;
  const allowed=t.status==='submitting'?['pending','failed']:t.status==='pending'?['completed','failed']:t.status==='completed'?['reversed']:[];
  if(!allowed.includes(status))return state;
  // Demo policy: failures and reversals refund principal and all fees exactly once.
  const refund=status==='failed'||status==='reversed';
  if(refund&&!Number.isSafeInteger(state.balances[t.asset]+t.total))throw new Error('Balance exceeds supported precision.');
  return {...state,balances:refund?{...state.balances,[t.asset]:state.balances[t.asset]+t.total}:state.balances,outgoing:state.outgoing.map(x=>x.id===id?{...x,status,updated:new Date().toISOString()}:x)};
}
export function processOutgoing(state:Ledger,now=Date.now()):Ledger {
  let next=state;
  for(const t of state.outgoing) {
    if(t.status==='submitting'&&now>=t.due) next=transitionOutgoing(next,t.id,'pending');
    const current=next.outgoing.find(x=>x.id===t.id)!;
    if(current.status==='pending'&&now>=t.due+650&&t.outcome!=='pending') next=transitionOutgoing(next,t.id,t.outcome==='failed'?'failed':'completed');
  }
  return next;
}
