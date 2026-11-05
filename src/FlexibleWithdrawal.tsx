import { productName } from './productCopy';
import { useRef, useState } from 'react';
import { Sheet } from './AccountSheet';
import { AccountIcon } from './AccountStack';
import { accountBalance, accountById } from './accounts';
import { beginWithdrawal, interestFor, money, precision, resolveWithdrawal, transact, units, useLedger, value, type Plan } from './savingsStore';
export function FlexibleWithdrawal({ planId, pendingId, onClose }: { planId: string; pendingId?: string; onClose: () => void }) {
  const ledger = useLedger();
  const plan = ledger.plans.find(p => p.id === planId)!;
  const [step,setStep] = useState(pendingId ? 'pending' : 'amount');
  const [input,setInput] = useState('');
  const [id,setId] = useState(pendingId ?? '');
  const [error,setError] = useState('');
  const busy=useRef(false);
  const amount=units(Number(input),plan.asset);
  const valid=/^\d+(\.\d+)?$/.test(input) && (input.split('.')[1]?.length ?? 0) <= precision(plan.asset) && Number.isSafeInteger(amount) && amount>0 && amount<=plan.principal;
  const request=ledger.withdrawals.find(w=>w.id===id);
  function check(key:string) { try {const state=transact(s=>resolveWithdrawal(s,key)); const result=state.withdrawals.find(w=>w.id===key)!; setStep(result.status==='confirmed'?'success':'error');setError(result.error??'');} catch {setStep('pending');setError('Could not verify the result. Check this withdrawal before submitting another.');} finally {busy.current=false;} }
  function confirm() {if(busy.current)return;busy.current=true;const key=crypto.randomUUID();try {transact(s=>beginWithdrawal(s,{id:key,planId,amount,status:'pending'}));setId(key);setStep('processing');window.setTimeout(()=>check(key),700);}catch(e){busy.current=false;setError(e instanceof Error?e.message:'Unable to save the withdrawal.');setStep('error');}}
  const title=step==='amount'?'Withdraw savings':step==='review'?'Review withdrawal':step==='success'?'Money ready to spend':step==='processing'?'Moving your money':step==='pending'?'Withdrawal pending':'Withdrawal unsuccessful';
  return <Sheet title={title} onClose={onClose}><p className="sheet-subtitle">Transfer to spending · {plan.asset}</p>{error && <p className="savings-error" role="alert">{productName(error)}</p>}
    {step==='amount' && <><p className="savings-note">Available withdrawal balance: {money(plan.principal,plan.asset)}</p><label className="savings-field">Amount ({plan.asset})<input autoComplete="off" inputMode="decimal" value={input} onChange={e=>setInput(e.target.value)}/></label>{input && !valid && <p className="savings-error">Enter a positive amount no greater than your savings, with up to {precision(plan.asset)} decimals.</p>}<button className="edit-amount" onClick={()=>setInput(String(value(plan.principal,plan.asset)))}>Withdraw all</button><button className="deposit-primary" disabled={!valid} onClick={()=>setStep('review')}>Review withdrawal</button><button className="edit-amount" onClick={onClose}>Cancel</button></>}
    {step==='review' && <><div className="deposit-account-badge"><AccountIcon code={plan.asset}/>{accountById(plan.asset).name}</div><dl className="savings-rows"><div><dt>Withdrawal amount</dt><dd>{money(amount,plan.asset)}</dd></div><div><dt>Fee</dt><dd>{money(0,plan.asset)}</dd></div><div><dt>Final amount received</dt><dd>{money(amount,plan.asset)}</dd></div><div><dt>Principal remaining</dt><dd>{money(plan.principal-amount,plan.asset)}</dd></div></dl><p className="savings-note">Withdrawn principal stops contributing to future earnings.</p><button className="deposit-primary" onClick={confirm}>Confirm withdrawal</button><button className="edit-amount" onClick={()=>setStep('amount')}>Edit amount</button><button className="edit-amount" onClick={onClose}>Cancel</button></>}
    {step==='processing' && <p role="status" className="savings-note">Processing your withdrawal… You can leave and check its status in Savings.</p>}
    {step==='pending' && <button className="deposit-primary" onClick={()=>check(id)}>Check withdrawal status</button>}
    {step==='error' && <button className="deposit-primary" onClick={()=>{setError('');setStep('amount');}}>Adjust amount</button>}
    {step==='success' && <><div className="savings-success" aria-hidden="true">✓</div><div className="review-hero"><strong>{money(request!.amount,plan.asset)}</strong></div><p className="savings-note">Credited to your {accountById(plan.asset).name}.</p><button className="deposit-primary" onClick={onClose}>Done</button></>}
  </Sheet>;
}
export function PlanDetails({plan,onWithdraw,onFund}:{plan:Plan;onWithdraw:()=>void;onFund:()=>void}) {
 const row=(label:string,amount:number)=><div><dt>{label}</dt><dd title={money(amount,plan.asset)}>{accountBalance(accountById(plan.asset),value(amount,plan.asset))}</dd></div>;
 return <><dl className="savings-rows">{row('Saved principal',plan.principal)}{row('Earnings credited',plan.earnings)}<div><dt>Illustrative rate</dt><dd>{plan.rate}% · {plan.kind==='locked'?'fixed term':'variable'}</dd></div><div><dt>Interest payout</dt><dd>{plan.kind==='flexible'?'Monthly to spending':plan.payout==='upfront'?'Upfront (already credited)':'At maturity'}</dd></div>{plan.kind==='locked' ? <>{plan.payout==='upfront'?<>{row('Interest paid upfront',plan.earnings)}{row('Principal unlocking at maturity',plan.principal)}</>:<>{row('Calculated interest due',plan.interest)}{row('Principal at maturity',plan.principal)}{row('Total at maturity',plan.principal+plan.interest)}</>}<div><dt>Maturity (UTC)</dt><dd>{new Date(plan.maturity!).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</dd></div></>:row('Estimated next 30 days',interestFor(plan.principal,plan.rate,30))}<div><dt>Withdrawal terms</dt><dd>{plan.kind==='locked'?'No early withdrawal':'Instant · zero fee'}</dd></div></dl><p className="savings-note">Simple interest = principal × annual rate × days / 365. {plan.kind==='locked'?`${plan.days}-day term. `:''}{plan.payout==='upfront' && plan.kind==='locked'?'Interest was paid once. Only principal unlocks at maturity. ':''}Earnings are calculated on saved principal.</p>{plan.kind==='flexible' && <><button className="deposit-primary" disabled={plan.principal===0} onClick={onWithdraw}>Withdraw</button><button className="edit-amount" onClick={onFund}>Add money to this plan</button></>}</>;
}
