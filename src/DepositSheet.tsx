import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useAnimationControls, useDragControls, useReducedMotion } from 'motion/react';

export type DepositAccount = { code: string; symbol: string; flag: string };
export const formatMoney = (value: number, symbol: string) => symbol + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function AnimatedBalance({ value, symbol }: { value: number; symbol: string }) {
  const reduced = useReducedMotion();
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;
    setHighlight(true);
    const animation = animate(from, value, { duration: reduced ? 0 : .9, ease: [0.22, 1, 0.36, 1], onUpdate: setDisplay });
    const timer = window.setTimeout(() => setHighlight(false), reduced ? 300 : 1250);
    return () => { animation.stop(); window.clearTimeout(timer); };
  }, [value, reduced]);
  return <motion.span className="balance" style={{ fontSize: Math.min(32, 240 / (formatMoney(value, symbol).length * .62)) }} animate={{ color: highlight ? '#fb72fe' : '#f6f6f6' }} transition={{ duration: reduced ? 0 : .3 }}>{formatMoney(display, symbol)}</motion.span>;
}

function AccountBadge({ account }: { account: DepositAccount }) {
  return <span className="deposit-account-badge"><span className={account.code === 'USD' ? 'usd-flag' : 'currency-flag'}><img src={account.flag} width={18} height={18} alt=""/></span>{account.code} Account</span>;
}

export function DepositSheet({ account, onClose, onComplete, onConfirmed }: { account: DepositAccount; onClose: () => void; onComplete: (amount: number, split?: boolean) => void; onConfirmed: (amount: number) => void | Promise<void> }) {
  const [step, setStep] = useState<'amount' | 'review' | 'processing' | 'success'>('amount');
  const [creditError, setCreditError] = useState('');
  const confirmed = useRef(false);
  const confirmRef = useRef(onConfirmed);
  confirmRef.current = onConfirmed;
  const [input, setInput] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const amount = Math.round(Number(input) * 100) / 100;
  const valid = Number.isFinite(amount) && amount > 0 && amount <= 100000;
  const displayInput = !editingAmount && input && Number.isFinite(amount) ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : input;
  const reduced = useReducedMotion();
  const controls = useDragControls();
  const inputMotion = useAnimationControls();
  const sheet = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const settled = useRef(false);
  const finish = () => {
    if (step === 'processing') return;
    if (settled.current) return;
    settled.current = true;
    if (step === 'success') onComplete(amount);
    else onClose();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); finishRef.current(); }
      if (event.key !== 'Tab' || !sheet.current) return;
      const nodes = Array.from(sheet.current.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]')).filter(node => node.getClientRects().length > 0);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !nodes.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !nodes.includes(document.activeElement as HTMLElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); opener?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [step]);
  useEffect(() => {
    if (step !== 'processing') return;
    const timer = window.setTimeout(async () => { try { if (!confirmed.current) { await confirmRef.current(amount); confirmed.current = true; } setStep('success'); } catch { setCreditError('Could not save this deposit. Check your balance before trying again.'); setStep('review'); } }, 1150);
    return () => window.clearTimeout(timer);
  }, [step]);
  useEffect(() => {
    if (!reduced) void inputMotion.start({ scale: [0.985, 1], transition: { duration: .18 } });
  }, [input, reduced, inputMotion]);

  const transition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 320, damping: 34, mass: .85 };
  const contentMotion = { initial: { opacity: 0, y: reduced ? 0 : 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduced ? 0 : -6 }, transition: { duration: reduced ? 0 : .18 } };
  return createPortal(<motion.div className="deposit-modal-layer" initial="closed" animate="open" exit="closed">
    <motion.div className="deposit-backdrop" aria-hidden="true" onClick={finish} variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }} transition={{ duration: reduced ? 0 : .24 }}/>
    <motion.section ref={sheet} className="deposit-sheet" role="dialog" aria-modal="true" aria-label={step === 'amount' ? 'Add money' : step === 'review' ? 'Review deposit' : step === 'processing' ? 'Adding your money' : 'Money received'} layout="size"
      variants={{ closed: { y: reduced ? 0 : '110%', opacity: reduced ? 0 : 1 }, open: { y: 0, opacity: 1 } }} transition={transition}
      drag="y" dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: .02, bottom: .45 }} dragSnapToOrigin
      onDragEnd={(_, info) => { if (info.offset.y > 90 || (info.offset.y > 20 && info.velocity.y > 500)) finish(); }}>
      <div className="sheet-drag-zone" onPointerDown={event => controls.start(event)} aria-hidden="true"/>
      <div className="deposit-sheet-toolbar"><button className="sheet-close" aria-label="Close deposit" onClick={finish}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
      <AnimatePresence mode="popLayout" initial={false} onExitComplete={() => title.current?.focus({ preventScroll: true })}>
        {step === 'amount' && <motion.div key="amount" {...contentMotion} className="deposit-step">
          <h2 ref={title} tabIndex={-1}>Add money</h2><p className="sheet-subtitle">A little top-up. A world of possibilities.</p>
          <motion.div layoutId="deposit-destination"><AccountBadge account={account}/></motion.div>
          <form onSubmit={event => { event.preventDefault(); if (valid) { (document.activeElement as HTMLElement)?.blur(); setStep('review'); } }}>
            <label className="amount-label" htmlFor="deposit-amount">Amount to add</label>
            <motion.div className="amount-entry" animate={inputMotion}><motion.div className="amount-group" initial={false} animate={{ color: valid ? '#171717' : '#c3c3c3' }} transition={{ duration: reduced ? 0 : .18 }}><span aria-hidden="true">{account.symbol}</span><span className="amount-input-wrap"><span className="amount-measure" aria-hidden="true">{displayInput || '0.00'}</span><input id="deposit-amount" aria-describedby="deposit-limit" aria-label={`Amount in ${account.code}`} inputMode="decimal" autoComplete="off" placeholder="0.00" value={displayInput} onFocus={() => setEditingAmount(true)} onBlur={() => setEditingAmount(false)} onChange={event => { const next = event.target.value.replace(/,/g, ''); if (/^\d{0,6}(\.\d{0,2})?$/.test(next)) setInput(next); }}/></span></motion.div></motion.div>
            <p id="deposit-limit" className={`amount-hint ${amount > 100000 ? 'amount-error' : ''}`}>{amount > 100000 ? `Enter up to ${formatMoney(100000, account.symbol)}.` : 'Choose an amount, or enter your own.'}</p>
            <div className="amount-chips">{[50, 100, 250, 500].map(value => <motion.button type="button" key={value} aria-pressed={amount === value} onClick={() => setInput(value.toFixed(2))} initial={false} animate={{ backgroundColor: amount === value ? '#fce4fc' : '#f6f6f6', borderColor: amount === value ? '#f3a3f4' : '#eaeaea', color: amount === value ? '#8b388e' : '#525252', scale: 1 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }} whileHover={{ backgroundColor: amount === value ? '#fbdcfb' : '#f1edf1' }} whileTap={reduced ? {} : { scale: .96 }}>{account.symbol}{value}</motion.button>)}</div>
            <motion.button className="deposit-primary" type="submit" disabled={!valid} initial={false} animate={{ backgroundColor: valid ? '#fb72fe' : '#ededed', color: valid ? '#171717' : '#a2a2a2' }} transition={{ duration: reduced ? 0 : .22 }} whileTap={reduced || !valid ? {} : { scale: .98 }}>Continue <span aria-hidden="true">→</span></motion.button>
          </form>
        </motion.div>}
        {step === 'review' && <motion.div key="review" {...contentMotion} className="deposit-step">
          <h2 ref={title} tabIndex={-1}>Review deposit</h2>{creditError && <p role="alert">{creditError}</p>}<p className="sheet-subtitle">Everything look right?</p>
          <motion.div className="review-hero" layoutId="deposit-amount-summary"><span>YOU’RE ADDING</span><strong>{formatMoney(amount, account.symbol)}</strong></motion.div>
          <div className="deposit-review-details"><div><span>Destination</span><motion.div layoutId="deposit-destination"><AccountBadge account={account}/></motion.div></div><div><span>Deposit amount</span><b>{formatMoney(amount, account.symbol)}</b></div><div><span>Transaction fee</span><b>{formatMoney(0, account.symbol)} <small>Free</small></b></div><div className="review-total"><span>Total amount</span><b>{formatMoney(amount, account.symbol)}</b></div></div>
          <motion.button className="deposit-primary" whileTap={reduced ? {} : { scale: .98 }} onClick={() => setStep('processing')}>Add sample funds <span aria-hidden="true">→</span></motion.button>
          <button className="edit-amount" onClick={() => setStep('amount')}>Edit amount</button>
        </motion.div>}
        {(step === 'processing' || step === 'success') && <motion.div key="result" {...contentMotion} className="deposit-step deposit-result" aria-live="polite" aria-busy={step === 'processing'}>
          <div className={`success-art ${step === 'success' ? 'is-success' : ''}`} aria-hidden="true">
            {step === 'success' && !reduced && <>{[0, 1].map(i => <motion.span key={i} className="success-ring" initial={{ scale: .8, opacity: .55 }} animate={{ scale: 1.8 + i * .25, opacity: 0 }} transition={{ duration: .95, delay: i * .14 }}/>) }{Array.from({ length: 6 }, (_, i) => <motion.i className="success-particle" key={i} initial={{ x: 0, y: 0, scale: 0, opacity: 1 }} animate={{ x: Math.cos(i * Math.PI / 3) * 76, y: Math.sin(i * Math.PI / 3) * 65, scale: [0, 1, .4], opacity: [0, .8, 0] }} transition={{ duration: 1, delay: .03 * i }}/>)}</>}
            <motion.div className="success-medallion" animate={{ backgroundColor: step === 'success' ? '#fb72fe' : '#fce9fc', scale: !reduced && step === 'success' ? [1, 1.07, 1] : 1 }} transition={{ duration: reduced ? 0 : .45 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><AnimatePresence mode="wait">{step === 'processing' ? <motion.circle key="spinner" cx="24" cy="24" r="17" stroke="#ce55d0" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="75 32" animate={{ rotate: reduced ? 0 : 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} exit={{ opacity: 0 }}/> : <motion.path key="check" d="m13 24 8 8 15-16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : .38, ease: 'easeOut' }}/>}</AnimatePresence></svg>
            </motion.div>
          </div>
          <h2 ref={title} tabIndex={-1}>{step === 'success' ? 'Money received' : 'Adding your money'}</h2>
          <p className="sheet-subtitle">{step === 'success' ? 'Keep it ready to spend or set some aside.' : 'Just a moment. Making room for more.'}</p>
          <motion.div layoutId="deposit-amount-summary" className="success-amount">{formatMoney(amount, account.symbol)}</motion.div><AccountBadge account={account}/>
          <motion.button className="deposit-primary" disabled={step === 'processing'} whileTap={reduced ? {} : { scale: .98 }} onClick={() => { if (step === 'success' && !settled.current) { settled.current = true; onComplete(amount, true); } }}>{step === 'success' ? 'Split my money' : 'Processing…'}</motion.button>{step === 'success' && <button className="edit-amount" onClick={finish}>Keep all for spending</button>}
        </motion.div>}
      </AnimatePresence>
    </motion.section>
  </motion.div>, document.body);
}
