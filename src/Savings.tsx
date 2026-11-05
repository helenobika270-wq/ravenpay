import { productName } from './productCopy';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AccountSheet } from './AccountSheet';
import { FlexibleWithdrawal, PlanDetails } from './FlexibleWithdrawal';
import { AccountIcon } from './AccountStack';
import { accounts, type AccountId } from './accounts';
import { annualRate, begin, credit, loadSample, interestFor, maturityDate, money, precision, rates, resolve, splitUnits, transact, units, useLedger, value, type Deposit, type Duration, type Plan, type Terms } from './savingsStore';
import './savings.css';
const dateLabel = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
function Rows({ children }: { children: ReactNode }) { return <dl className="savings-rows">{children}</dl>; }
function Row({ label, children }: { label: string; children: ReactNode }) { return <div><dt>{label}</dt><dd>{children}</dd></div>; }
export function Savings({ receipt, onHome, initialKind }: { initialKind?: 'flexible'|'locked'; receipt: Deposit | null; onHome: () => void }) {
  const ledger = useLedger();
  const [step, setStep] = useState(receipt ? 'split' : initialKind ? 'start' : 'overview');
  const [asset, setAsset] = useState<AccountId>(receipt?.asset ?? 'USD');
  const [basis, setBasis] = useState(receipt?.amount ?? ledger.balances.USD);
  const [source, setSource] = useState(receipt?.id ?? crypto.randomUUID());
  const [fromDeposit, setFromDeposit] = useState(!!receipt);
  const [saved, setSaved] = useState(0);
  const [kind, setKind] = useState<'flexible' | 'locked'>(initialKind ?? 'flexible');
  const [days, setDays] = useState<Duration>(30);
  const [payout, setPayout] = useState<'upfront' | 'maturity'>('maturity');
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<'success' | 'failed' | 'pending'>('success');
  const [transferId, setTransferId] = useState<string | null>(null);
  const [detailRecord, setDetail] = useState<Plan | null>(null);
  const detail = ledger.plans.find(p => p.id === detailRecord?.id) ?? detailRecord;
  const [chooseAsset,setChooseAsset] = useState(false);
  const [withdrawal,setWithdrawal] = useState<{planId:string;pendingId?:string}|null>(null);
  const [targetPlanId,setTargetPlanId] = useState<string|undefined>();
  const [simAmount, setSimAmount] = useState('100');
  const busy = useRef(false);
  const simSubmitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  const terms: Terms = { asset, principal: saved, kind, days, payout, source, basis, targetPlanId };
  const rate = annualRate(terms);
  const interest = interestFor(saved, rate, kind === 'locked' ? days : 30);
  const percent = basis ? saved / basis * 100 : 0;
  const transfer = ledger.transfers.find(t => t.id === transferId);
  const maturity = maturityDate(new Date().toISOString(), days);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }, [step]);
  function go(next: string) { if (next === 'simulate') { simSubmitting.current = false; setTargetPlanId(undefined); } setError(''); setStep(next); }
  function start() { setTargetPlanId(undefined); setSaved(0); setSource(crypto.randomUUID()); setFromDeposit(false); setBasis(ledger.balances[asset]); setAck(false); go('start'); }
  function changeAsset(id: AccountId) { setAsset(id); setBasis(ledger.balances[id]); setSaved(0); }
  function fail(e: unknown) { setError(e instanceof Error ? e.message : 'Could not save this change. Check your balance before trying again.'); }
  function check(id: string) {
    try { const next = transact(s => resolve(s, id)); const t = next.transfers.find(t => t.id === id); setTransferId(id); go(t?.status === 'confirmed' ? 'success' : 'result'); }
    catch (e) { fail(e); } finally { busy.current = false; }
  }
  function confirm() {
    if (busy.current) return;
    busy.current = true;
    const id = crypto.randomUUID();
    try {
      transact(s => begin(s, { id, terms, status: 'pending', result }));
      setTransferId(id); go('processing');
      window.setTimeout(() => { if (result === 'pending') { busy.current = false; setStep('result'); } else check(id); }, reduced ? 100 : 850);
    } catch (e) { busy.current = false; fail(e); }
  }
  function simulate() {
    if (simSubmitting.current) return;
    const amount = units(Number(simAmount), asset);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > units(100000, asset)) { setError('Enter an amount between zero and 100,000, greater than zero.'); return; }
    const deposit: Deposit = { id: crypto.randomUUID(), amount, asset, date: new Date().toISOString() };
    try { simSubmitting.current = true; transact(s => credit(s, deposit)); setBasis(amount); setSaved(0); setSource(deposit.id); setFromDeposit(true); go('received'); } catch (e) { simSubmitting.current = false; fail(e); }
  }
  const title = ({ overview: 'Savings', start: 'Start saving', simulate: 'Add sample funds', received: 'Deposit received', split: 'How much would you like to save?', plan: 'Choose a savings plan', details: kind === 'locked' ? 'Make time for your goals' : 'Room for what matters', review: 'Review your savings', processing: 'Setting money aside', result: transfer?.status === 'failed' ? 'Transfer unsuccessful' : 'Transfer pending', success: 'Your savings are set.', detail: detail?.kind === 'locked' ? 'Locked savings' : 'Flexible savings' } as Record<string, string>)[step];
  const primary = (label: string, action: () => void, disabled = false) => <motion.button className="deposit-primary" disabled={disabled} whileTap={reduced ? {} : { scale: .98 }} onClick={action}>{label}</motion.button>;
  const termsCopy = <p className="savings-note">Simple interest = principal × annual rate × days / 365, rounded to {precision(asset)} decimals. No compounding or guaranteed returns.</p>;
  return <section className="savings-screen">
    <div className="savings-top"><button aria-label="Back to home" onClick={onHome}>←</button></div>
    <motion.div key={step} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .2 }}>
    <h1 ref={heading} tabIndex={-1}>{title}</h1>
    {error && <p role="alert" className="savings-error">{productName(error)}</p>}
    {step === 'overview' && <>
      <p className="savings-intro">A little today. More possibilities tomorrow.</p>
      {accounts.map(a => { const plans = ledger.plans.filter(p => p.asset === a.code); return plans.length ? <div className="savings-card" key={a.code}><div className="savings-account"><AccountIcon code={a.code}/><strong>{a.code} savings</strong></div><Rows><Row label="Saved principal">{money(plans.reduce((n,p) => n+p.principal,0),a.code)}</Row><Row label="Earnings credited">{money(plans.reduce((n,p) => n+p.earnings,0),a.code)}</Row></Rows>{plans.map(p => <button className="savings-plan-link" key={p.id} onClick={() => {setDetail(p);go('detail');}}><span>{p.kind === 'locked' ? 'Locked' : 'Flexible'} savings<small>{p.maturity ? `Matures ${dateLabel(p.maturity)}` : 'No fixed end date'}</small></span><span>{money(p.principal,p.asset)} ›</span></button>)}</div> : null; })}
      {!ledger.plans.length && <div className="savings-empty"><span aria-hidden="true">✧</span><h2>Make space for your future</h2><p>Your savings will appear here, separate from everyday spending.</p></div>}
      {ledger.withdrawals.filter(w=>w.status==='pending').map(w=><div className="savings-card" key={w.id}><p className="savings-note">Withdrawal pending. Check before submitting another.</p><button className="deposit-primary" onClick={()=>setWithdrawal({planId:w.planId,pendingId:w.id})}>Check withdrawal status</button></div>)}
      {ledger.transfers.filter(t => t.status === 'pending').map(t => <div className="savings-card" key={t.id}><strong>Transfer pending · {money(t.terms.principal,t.terms.asset)}</strong><p className="savings-note">Outcome not yet shown. Check this transfer before creating another.</p>{primary('Check transfer status',() => check(t.id))}</div>)}
      {ledger.deposits.filter(d => !ledger.transfers.some(t => t.terms.source === d.id && t.status !== 'failed')).slice(-3).reverse().map(d => <button className="savings-plan-link" key={d.id} onClick={() => {setTargetPlanId(undefined);setAsset(d.asset);setBasis(d.amount);setSource(d.id);setFromDeposit(true);setSaved(0);go('split');}}><span>Received {money(d.amount,d.asset)}<small>Deposit received · Optional allocation</small></span><span>Split ›</span></button>)}
      {primary(ledger.plans.length ? 'Add to savings' : 'Start saving',start)}<button className="edit-amount" onClick={() => go('simulate')}>Add sample funds</button><button className="edit-amount" disabled={ledger.plans.some(p=>p.id==='demo-usdt-90-day-sample-v1')} onClick={()=>{try {transact(loadSample);} catch(e){fail(e);}}}>Add sample funds to locked plan</button><p className="savings-note">1,000 USDT · 90 days · Illustrative rate: 12% annually. Interest payable at maturity.</p>
    </>}
    {(step === 'start' || step === 'simulate') && <><p className="savings-intro">{step === 'start' ? 'Choose an account. Funds stay available until you confirm.' : 'Choose the account and amount to add.'}</p><div className="savings-field"><span>Account</span><button className="savings-account-select" aria-haspopup="dialog" aria-label="Choose savings account" onClick={()=>setChooseAsset(true)}><AccountIcon code={asset}/><span>{accounts.find(a=>a.code===asset)!.name}</span><span aria-hidden="true">⌄</span></button></div><p className="savings-note">Available: {money(ledger.balances[asset],asset)}</p>{step === 'simulate' ? <><label className="savings-field">Deposit amount ({asset})<input inputMode="decimal" value={simAmount} onChange={e => setSimAmount(e.target.value)}/></label>{primary('Add sample funds',simulate)}</> : primary('Choose amount',() => {setBasis(ledger.balances[asset]);go('split');},ledger.balances[asset] <= 0)}<button className="edit-amount" onClick={() => go('overview')}>Back to savings</button></>}
    {step === 'received' && <><div className="review-hero"><strong>{money(basis,asset)}</strong></div><p className="savings-intro">Keep it ready to spend or set some aside.</p>{primary('Split my money',() => go('split'))}<button className="edit-amount" onClick={onHome}>Keep all for spending</button></>}
    {step === 'split' && <>
      <p className="savings-intro">{fromDeposit ? 'Only this deposit' : 'Your chosen spending balance'} · {money(basis,asset)}</p>
      <div className="savings-card allocation-card"><div className="savings-account"><AccountIcon code={asset}/><span>{asset}</span></div><div className="allocation-value">{money(saved,asset)}</div><p>Set aside for savings</p><label className="sr-only" htmlFor="saving-range">Savings percentage slider</label><input id="saving-range" type="range" min="0" max="100" step="0.01" value={percent} onChange={e => setSaved(splitUnits(basis,Number(e.target.value)))}/><div className="savings-chips">{[0,25,50,75,100].map(n => <motion.button whileTap={reduced ? {} : {scale:.95}} key={n} aria-pressed={saved === splitUnits(basis,n)} onClick={() => setSaved(splitUnits(basis,n))}>{n}%</motion.button>)}</div></div>
      <div className="allocation-inputs"><label className="savings-field">Savings (%)<input aria-label="Savings percentage" type="number" min="0" max="100" step="0.01" value={Number(percent.toFixed(4))} onChange={e => setSaved(splitUnits(basis,Number(e.target.value)))}/></label><label className="savings-field">Savings ({asset})<input aria-label="Savings amount" type="number" min="0" max={value(basis,asset)} step={1 / 10 ** precision(asset)} value={value(saved,asset)} onChange={e => setSaved(Math.min(basis,Math.max(0,units(Number(e.target.value),asset))))}/></label></div>
      <Rows><Row label={`Savings · ${Number(percent.toFixed(4))}%`}>{money(saved,asset)}</Row><Row label={`Available to spend · ${Number((100-percent).toFixed(4))}%`}>{money(basis-saved,asset)}</Row></Rows>
      <p className="savings-note">{saved === basis && fromDeposit ? 'The entire new deposit will be saved. Your existing spending funds remain unchanged.' : 'Choosing an amount does not move money. You can leave at any time before confirmation.'}</p>
      {primary(saved ? 'Choose savings plan' : 'Keep all for spending',() => saved ? go('plan') : onHome(),!Number.isFinite(saved))}
    </>}
    {step === 'plan' && <><p className="savings-intro">Compare plans · Illustrative rate</p>{(['flexible','locked'] as const).filter(k=>!targetPlanId||k==='flexible').map(k => <button className="savings-card savings-choice" aria-pressed={kind === k} key={k} onClick={() => {setKind(k);setAck(false);}}><strong>{k === 'flexible' ? 'Flexible savings' : 'Locked savings'} <span>{kind === k ? '✓' : '○'}</span></strong><p>{k === 'flexible' ? 'Set money aside without a fixed end date.' : 'Set money aside until a date you choose.'}</p><small>{k === 'flexible' ? '2% annually · variable · monthly payout. Withdraw within 1 business day; no fee.' : 'Annual rates: 30 days · 3%, 90 days · 4%, 180 days · 5%. Fixed for the selected term.'}</small></button>)}{primary('Continue',() => go('details'))}<button className="edit-amount" onClick={() => go('split')}>Edit allocation</button></>}
    {step === 'details' && <>
      {kind === 'locked' ? <><p className="savings-intro">Choose your term · Illustrative rate</p><div className="savings-chips durations">{([30,90,180] as const).map(d => <button key={d} aria-pressed={days === d} onClick={() => {setDays(d);setAck(false);}}>{d} days<small>{rates.locked[d]}% annually</small><small>{dateLabel(maturityDate(new Date().toISOString(),d))}</small></button>)}</div><fieldset className="savings-payout"><legend>Interest payout</legend>{(['upfront','maturity'] as const).map(p => <label key={p}><input type="radio" name="payout" checked={payout === p} onChange={() => setPayout(p)}/>{p === 'upfront' ? 'Upfront' : 'At maturity'}</label>)}</fieldset><Rows><Row label="Saved principal">{money(saved,asset)}</Row><Row label="Estimated interest">{money(interest,asset)}</Row><Row label="Maturity (UTC)">{dateLabel(maturity)}</Row></Rows><p className="savings-note">{payout === 'upfront' ? 'Upfront interest is credited to your spending wallet. The principal stays locked.' : 'At maturity, the principal and interest are due separately. '}</p><label className="savings-ack"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/><span>I understand the principal stays locked until maturity. Early withdrawals are not supported for this plan. Fees: zero.</span></label></> : <><div className="review-hero"><span>Illustrative rate</span><strong>2%</strong></div><Rows><Row label="Rate">Variable, not guaranteed</Row><Row label="Calculation">Daily simple accrual, actual/365</Row><Row label="Crediting">Monthly to spending</Row><Row label="Withdrawals">Within 1 business day</Row><Row label="Fees">Zero</Row><Row label="Estimated 30-day interest">{money(interest,asset)}</Row></Rows><p className="savings-note">No maturity date. Earnings are calculated on saved principal.</p></>}
      {termsCopy}{primary('Continue to review',() => go('review'),kind === 'locked' && !ack)}<button className="edit-amount" onClick={() => go('plan')}>Back to plans</button>
    </>}
    {step === 'review' && <><p className="savings-intro">A clear plan before you commit.</p><Rows><Row label={fromDeposit ? 'Deposit amount' : 'Allocation basis'}>{money(basis,asset)}</Row><Row label="Keep for spending">{money(basis-saved,asset)}</Row><Row label="Amount to save">{money(saved,asset)}</Row><Row label="Asset">{asset} · no conversion</Row><Row label="Savings type">{kind === 'locked' ? 'Locked' : 'Flexible'}</Row><Row label="Illustrative rate">{rate}% · {kind === 'locked' ? 'fixed term' : 'variable'}</Row><Row label="Interest payout">{kind === 'flexible' ? 'Monthly to spending' : payout === 'upfront' ? 'Upfront to spending' : 'At maturity'}</Row><Row label={kind === 'locked' ? 'Estimated interest' : 'Estimated 30-day interest'}>{money(interest,asset)}</Row>{kind === 'locked' && <Row label="Maturity (UTC)">{dateLabel(maturity)}</Row>}<Row label="Fees">{money(0,asset)}</Row></Rows>{termsCopy}<details className="savings-demo-controls"><summary>Advanced options</summary><fieldset className="demo-outcomes"><legend>Transfer outcome</legend>{(['success','failed','pending'] as const).map(outcome=><label key={outcome}><input type="radio" name="outcome" checked={result===outcome} onChange={()=>setResult(outcome)}/>{outcome==='success'?'Success':outcome==='failed'?'Fail without moving funds':'Pending until status check'}</label>)}</fieldset><button onClick={() => {try {transact(s => ({...s,balances:{...s.balances,[asset]:Math.max(0,saved-1)}}));} catch(e){fail(e);}}}>Set balance below savings amount</button></details>{primary('Confirm savings',confirm)}<button className="edit-amount" onClick={() => go('details')}>Edit plan details</button><button className="edit-amount" onClick={() => go('split')}>Edit savings amount</button></>}
    {step === 'processing' && <div className="savings-empty" role="status"><motion.span animate={reduced ? {} : {rotate:360}} transition={{repeat:Infinity,duration:1.5,ease:'linear'}}>◌</motion.span><p>Moving money to savings…</p><small>Safe to leave. Check pending transfers in Savings.</small></div>}
    {step === 'result' && <><p className="savings-intro">{(transfer?.error ? productName(transfer.error) : undefined) ?? 'The result is not confirmed yet. Do not submit another transfer. Check the existing transfer first.'}</p>{transfer?.status === 'failed' ? primary('Adjust savings amount',() => go('split')) : primary('Check transfer status',() => transferId && check(transferId))}<button className="edit-amount" onClick={() => go('overview')}>View savings</button></>}
    {step === 'success' && <><div className="savings-success" aria-hidden="true">✓</div><div className="review-hero"><strong>{transfer ? money(transfer.terms.principal,transfer.terms.asset) : ''}</strong></div><p className="savings-intro">Moved from spending to savings.</p>{primary('View savings',() => go('overview'))}<button className="edit-amount" onClick={onHome}>Back to home</button></>}
    {step === 'detail' && detail && <><PlanDetails plan={detail} onWithdraw={()=>setWithdrawal({planId:detail.id})} onFund={()=>{setTargetPlanId(detail.id);setAsset(detail.asset);setBasis(ledger.balances[detail.asset]);setSaved(0);setKind('flexible');setFromDeposit(false);setSource(crypto.randomUUID());go('split');}}/>{primary('Back to savings',()=>go('overview'))}</>}
    </motion.div>
    <AnimatePresence>{chooseAsset && <AccountSheet mode="selector" selected={asset} balances={Object.fromEntries(accounts.map(a=>[a.code,value(ledger.balances[a.code],a.code)])) as Record<AccountId,number>} onSelect={id=>{changeAsset(id);setChooseAsset(false);}} onClose={()=>setChooseAsset(false)}/>}</AnimatePresence>
    <AnimatePresence>{withdrawal && <FlexibleWithdrawal planId={withdrawal.planId} pendingId={withdrawal.pendingId} onClose={()=>setWithdrawal(null)}/>}</AnimatePresence>
  </section>;
}
