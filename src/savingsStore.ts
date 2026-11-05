import type { Outgoing } from './outgoingModel';
import { useSyncExternalStore } from 'react';
import { DEMO_BALANCES, type AccountId } from './accounts';
export const STORAGE_KEY = 'raven-demo-savings-v1';
export const precision = (asset: AccountId) => asset === 'USDC' || asset === 'USDT' ? 6 : 2;
export const units = (value: number, asset: AccountId) => Math.round(value * 10 ** precision(asset));
export const value = (amount: number, asset: AccountId) => amount / 10 ** precision(asset);
export const money = (amount: number, asset: AccountId) => `${value(amount, asset).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: precision(asset) })} ${asset}`;
// Parse decimal strings directly into minor units; never round user input.
export function parseAmount(input: string, asset: AccountId): number | null {
  if (!/^\d+(\.\d+)?$/.test(input)) return null;
  const [whole, fraction = ''] = input.split('.');
  if (fraction.length > precision(asset)) return null;
  const amount = Number(BigInt(whole) * 10n ** BigInt(precision(asset)) + BigInt(fraction.padEnd(precision(asset), '0')));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
export const splitUnits = (total: number, percent: number) => Math.round(total * Math.min(100, Math.max(0, percent)) / 100);
export const rates = { flexible: 2, locked: { 30: 3, 90: 4, 180: 5 } } as const;
export type Duration = 30 | 90 | 180;
export type Deposit = { id: string; asset: AccountId; amount: number; date: string };
export type Terms = { asset: AccountId; principal: number; kind: 'flexible' | 'locked'; days: Duration; payout: 'upfront' | 'maturity'; source: string; basis: number; targetPlanId?: string; demoRate?: number };
export type Plan = Terms & { id: string; rate: number; date: string; maturity?: string; interest: number; earnings: number };
export type Transfer = { id: string; terms: Terms; status: 'pending' | 'confirmed' | 'failed'; error?: string; result: 'success' | 'failed' | 'pending' };
export type Withdrawal = { id: string; planId: string; amount: number; status: 'pending' | 'confirmed' | 'failed'; error?: string };
export type Ledger = { outgoing: Outgoing[]; withdrawals: Withdrawal[]; balances: Record<AccountId, number>; deposits: Deposit[]; plans: Plan[]; transfers: Transfer[]; activity: { id: string; title: string; asset: AccountId; amount: number; kind: 'deposit' | 'internal' | 'earnings' | 'withdrawal' | 'outgoing' }[] };
const initial = (): Ledger => ({ balances: Object.fromEntries(Object.entries(DEMO_BALANCES).map(([id, n]) => [id, units(n, id as AccountId)])) as Ledger['balances'], outgoing: [], withdrawals: [], deposits: [], plans: [], transfers: [], activity: [] });
export const annualRate = (t: Terms) => t.demoRate ?? (t.kind === 'flexible' ? rates.flexible : rates.locked[t.days]);
export const interestFor = (principal: number, rate: number, days: number) => Math.round(principal * rate / 100 * days / 365);
export function maturityDate(date: string, days: number) { const d = new Date(date); d.setUTCDate(d.getUTCDate() + days); return d.toISOString(); }
export function credit(state: Ledger, deposit: Deposit): Ledger {
  if (state.deposits.some(d => d.id === deposit.id)) return state;
  if (!Number.isSafeInteger(state.balances[deposit.asset] + deposit.amount) || !Number.isSafeInteger(deposit.amount) || deposit.amount <= 0) throw new Error('Enter a valid deposit amount.');
  return { ...state, balances: { ...state.balances, [deposit.asset]: state.balances[deposit.asset] + deposit.amount }, deposits: [...state.deposits, deposit], activity: [{ id: deposit.id, title: 'Simulated deposit', asset: deposit.asset, amount: deposit.amount, kind: 'deposit' }, ...state.activity] };
}
export function begin(state: Ledger, transfer: Transfer): Ledger {
  if (state.transfers.some(t => t.id === transfer.id)) return state;
  if (state.transfers.some(t => t.terms.source === transfer.terms.source && t.status !== 'failed')) throw new Error('This allocation already has a transfer. Check its status in Savings.');
  const t = transfer.terms;
  if (t.targetPlanId && !state.plans.some(p => p.id === t.targetPlanId && p.kind === 'flexible' && p.asset === t.asset && t.kind === 'flexible')) throw new Error('This plan cannot be funded.');
  if (!Number.isSafeInteger(t.principal) || t.principal <= 0 || t.principal > t.basis) throw new Error('Choose a savings amount within the available allocation.');
  if (state.balances[t.asset] < t.principal) throw new Error(`Not enough available. You have ${money(state.balances[t.asset], t.asset)}. Adjust your savings amount.`);
  return { ...state, transfers: [...state.transfers, transfer] };
}
export function resolve(state: Ledger, id: string, date = new Date().toISOString()): Ledger {
  const transfer = state.transfers.find(t => t.id === id);
  if (!transfer || transfer.status !== 'pending') return state;
  const t = transfer.terms;
  const error = transfer.result === 'failed' ? 'The simulated transfer failed. No funds moved.' : state.balances[t.asset] < t.principal ? `Not enough available. You have ${money(state.balances[t.asset], t.asset)}. Adjust the savings amount.` : undefined;
  const transfers = state.transfers.map(item => item.id === id ? { ...item, status: error ? 'failed' as const : 'confirmed' as const, error } : item);
  if (error) return { ...state, transfers };
  const rate = annualRate(t);
  const interest = t.kind === 'locked' ? interestFor(t.principal, rate, t.days) : 0;
  const upfront = t.kind === 'locked' && t.payout === 'upfront' ? interest : 0;
  const plan: Plan = { ...t, id, date, rate, interest, earnings: upfront, maturity: t.kind === 'locked' ? maturityDate(date, t.days) : undefined };
  return { ...state, transfers, plans: t.targetPlanId ? state.plans.map(p => p.id === t.targetPlanId ? {...p, principal: p.principal + t.principal} : p) : [...state.plans, plan], balances: { ...state.balances, [t.asset]: state.balances[t.asset] - t.principal + upfront }, activity: [...(upfront ? [{ id: id + '-interest', title: 'Simulated upfront interest', asset: t.asset, amount: upfront, kind: 'earnings' as const }] : []), { id, title: `Transfer to ${t.kind} savings · Demo`, asset: t.asset, amount: t.principal, kind: 'internal' }, ...state.activity] };
}
export function migrate(state: Ledger): Ledger { return {...state, outgoing: state.outgoing ?? [], balances: {...state.balances, USDT: state.balances.USDT ?? 0}, withdrawals: state.withdrawals ?? []}; }
function read(): Ledger { const raw = localStorage.getItem(STORAGE_KEY); return raw ? migrate(JSON.parse(raw) as Ledger) : initial(); }
export function beginWithdrawal(state: Ledger, request: Withdrawal): Ledger {
  if (state.withdrawals.some(w => w.id === request.id)) return state;
  const plan = state.plans.find(p => p.id === request.planId);
  if (!plan || plan.kind !== 'flexible') throw new Error('Only Flexible savings can be withdrawn.');
  if (state.withdrawals.some(w => w.planId === plan.id && w.status === 'pending')) throw new Error('A withdrawal is pending. Check its status first.');
  if (!Number.isSafeInteger(request.amount) || request.amount <= 0 || request.amount > plan.principal) throw new Error('Enter an amount within your available savings balance.');
  return {...state, withdrawals: [...state.withdrawals,request]};
}
export function resolveWithdrawal(state: Ledger, id: string): Ledger {
  const request = state.withdrawals.find(w => w.id === id);
  if (!request || request.status !== 'pending') return state;
  const plan = state.plans.find(p => p.id === request.planId);
  const error = !plan || plan.kind !== 'flexible' || plan.principal < request.amount ? 'Savings balance changed. No funds moved. Adjust the amount.' : undefined;
  const withdrawals = state.withdrawals.map(w => w.id === id ? {...w,status:error ? 'failed' as const : 'confirmed' as const,error} : w);
  if (error || !plan) return {...state,withdrawals};
  return {...state,withdrawals,plans:state.plans.map(p=>p.id===plan.id?{...p,principal:p.principal-request.amount}:p),balances:{...state.balances,[plan.asset]:state.balances[plan.asset]+request.amount},activity:[{id,title:'Moved from flexible savings',asset:plan.asset,amount:request.amount,kind:'withdrawal'},...state.activity]};
}
export function loadSample(state: Ledger): Ledger {
  const id = 'demo-usdt-90-day-sample-v1';
  if (state.plans.some(p=>p.id===id)) return state;
  const amount = units(1000,'USDT');
  const funded = credit(state,{id:id+'-funding',asset:'USDT',amount,date:new Date().toISOString()});
  return resolve(begin(funded,{id,status:'pending',result:'success',terms:{asset:'USDT',principal:amount,basis:amount,kind:'locked',days:90,payout:'maturity',source:id+'-funding',demoRate:12}}),id);
}
let snapshot = read();
const listeners = new Set<() => void>();
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { snapshot = read(); listeners.forEach(fn => fn()); } });
export function transact(update: (state: Ledger) => Ledger) { const next = update(read()); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); snapshot = next; listeners.forEach(fn => fn()); return next; }
export function useLedger() { return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => snapshot); }
