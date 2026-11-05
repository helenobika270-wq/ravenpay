import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, useReducedMotion } from 'motion/react';
import { accounts, accountBalance, walletConnection, type AccountId } from './accounts';
import { AccountIcon } from './AccountStack';

export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const drag = useDragControls();
  const reduced = useReducedMotion();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const phone = document.querySelector<HTMLElement>('.phone');
    const wasInert = phone?.inert ?? false;
    if (phone) phone.inert = true;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    heading.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []);
      const first = items[0], last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement as HTMLElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (phone && !wasInert) phone.inert = false; requestAnimationFrame(() => opener?.isConnected && opener.focus({preventScroll:true})); };
  }, []);
  useEffect(() => { heading.current?.focus({preventScroll:true}); }, [title]);
  return createPortal(<motion.div className="deposit-modal-layer" initial="closed" animate="open" exit="closed">
    <motion.div className="deposit-backdrop" aria-hidden="true" onClick={onClose} variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }} transition={{ duration: reduced ? 0 : .2 }}/>
    <motion.section className="deposit-sheet account-sheet" ref={ref} role="dialog" aria-modal="true" aria-label={title} variants={{ closed: { y: reduced ? 0 : '110%', opacity: reduced ? 0 : 1 }, open: { y: 0, opacity: 1 } }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 34 }} drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: .02, bottom: .45 }} dragSnapToOrigin onDragEnd={(_, info) => { if (info.offset.y > 90 || (info.offset.y > 20 && info.velocity.y > 500)) onClose(); }}>
      <div className="sheet-drag-zone" aria-hidden="true" onPointerDown={event => drag.start(event)}/>
      <div className="deposit-sheet-toolbar"><button className="sheet-close" onClick={onClose} aria-label="Close account sheet">×</button></div>
      <div className="deposit-step"><h2 ref={heading} tabIndex={-1}>{title}</h2>{children}</div>
    </motion.section>
  </motion.div>, document.body);
}

export function AccountSheet({ mode, selected, balances, onSelect, onClose }: { mode: 'selector' | 'receive' | 'send'; selected: AccountId; balances: Record<AccountId, number>; onSelect: (id: AccountId) => void; onClose: () => void }) {
  return <Sheet title={mode === 'selector' ? 'All accounts' : mode === 'receive' ? `Receive ${selected}` : `Send ${selected}`} onClose={onClose}>
    {mode === 'selector' ? <><p className="sheet-subtitle">Choose where you want to manage your money.</p><div className="account-options">{accounts.map(account => <button key={account.code} className="account-option" aria-pressed={selected === account.code} onClick={() => onSelect(account.code)}><AccountIcon code={account.code}/><span className="account-option-copy"><strong>{account.name}</strong><span>{accountBalance(account, balances[account.code])}</span></span><span className="account-selection-mark" aria-hidden="true">{selected === account.code ? '✓' : ''}</span></button>)}</div></> : <>
      <p className="sheet-subtitle">{mode === 'receive' ? `Choose another wallet to view receiving details.` : `Choose another account to send money.`}</p>
      <div className="wallet-demo-notice"><AccountIcon code={selected}/><div><strong>Choose another account</strong><p>{mode === 'receive' ? 'Return to All accounts and select a token wallet.' : 'Return to All accounts and select a token wallet.'}</p></div></div>
      {mode === 'receive' && <><dl className="wallet-connection-details"><div><dt>Network</dt><dd>Not selected</dd></div><div><dt>Receiving address</dt><dd>Unavailable</dd></div></dl><p id="wallet-unavailable" className="wallet-explanation">Select a token wallet to view its receiving details.</p><div className="wallet-disabled-actions"><button disabled aria-describedby="wallet-unavailable">Copy address</button><button disabled aria-describedby="wallet-unavailable">Share details</button></div></>}
      <motion.button className="deposit-primary" onClick={onClose} whileTap={{ opacity: .85 }}>Got it</motion.button>
    </>}
  </Sheet>;
}
