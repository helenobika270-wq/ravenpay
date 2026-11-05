import { DemoMode } from './DemoMode';
import { SpendingWithdrawal, useOutgoingProcessor } from './SpendingWithdrawal';
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { preload } from 'react-dom';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { DetailScreen, PromoCarousel, Lucide } from './Experiences';
import { RecentActivity } from './RecentActivity';
import { Savings } from './Savings';
import { credit, transact, units, useLedger, value, type Deposit } from './savingsStore';
import { Showcase } from './Showcase';
import { DepositSheet } from './DepositSheet';
import { AccountStack } from './AccountStack';
import { TokenReceive } from './TokenReceive';
import { AccountSheet } from './AccountSheet';
import { accounts, accountById, selectAccount, type AccountId, type FiatId } from './accounts';
import './accounts.css';
import './deposit.css';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/700.css';
import './styles.css';
import './accountPolish.css';

const icon = (name: string, className = '') => <img src={`/assets/${name}.svg`} alt="" className={className} draggable={false}/>;
accounts.forEach(account => preload(account.flag, { as: 'image' }));

function App() {
  const [page, setPage] = useState<'home' | 'more' | 'profile' | 'savings'>('home');
  const [order, setOrder] = useState<AccountId[]>(['GBP', 'USDC', 'USD']);
  const [allActivity,setAllActivity]=useState(false);
  const [banner, setBanner] = useState(0);
  const ledger = useLedger();
  useOutgoingProcessor();
  const [outgoingAsset,setOutgoingAsset]=useState<AccountId|null>(null);
  const balances = Object.fromEntries(accounts.map(a => [a.code, value(ledger.balances[a.code], a.code)])) as Record<AccountId, number>;
  const [savingsKind,setSavingsKind] = useState<'flexible'|'locked'|undefined>();
  const [savingsVisit,setSavingsVisit] = useState(0);
  const [receipt, setReceipt] = useState<Deposit | null>(null);
  const depositId = useRef('');
  const creditedDeposit = useRef<Deposit | null>(null);
  const [depositFiatId, setDepositFiatId] = useState<FiatId | null>(null);
  const [depositVisible, setDepositVisible] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [accountSheet, setAccountSheet] = useState<'selector' | 'receive' | 'send' | null>(null);
  const [accountSheetClosing, setAccountSheetClosing] = useState(false);
  const accountSheetOpener = useRef<HTMLElement | null>(null);
  const pendingSplit = useRef(false);
  const depositOpener = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  function chooseAccount(id: AccountId) { setOrder(previous => selectAccount(previous, id)); }
  function openAccountSheet(mode: 'selector' | 'receive' | 'send') { if(mode==='send'){setOutgoingAsset(order[2]);return;} accountSheetOpener.current = document.activeElement as HTMLElement; setAccountSheet(mode); }
  function closeAccountSheet() { setAccountSheetClosing(true); setAccountSheet(null); }
  function finishAccountSheetClose() {
    setAccountSheetClosing(false);
    requestAnimationFrame(() => {
      const opener = accountSheetOpener.current;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      else document.querySelector<HTMLButtonElement>('.account-dropdown')?.focus({ preventScroll: true });
    });
  }
  function openDeposit(currency: FiatId) { depositId.current = crypto.randomUUID(); creditedDeposit.current = null; depositOpener.current = document.activeElement as HTMLElement; setDepositFiatId(currency); setDepositVisible(true); }
  function settleDeposit() {
    if (pendingSplit.current && creditedDeposit.current) { setReceipt(creditedDeposit.current); setSavingsKind(undefined); setSavingsVisit(n=>n+1); setPage('savings'); }
    pendingSplit.current = false;
    setDepositFiatId(null);
    requestAnimationFrame(() => depositOpener.current?.focus({ preventScroll: true }));
  }
  function navigate(next: typeof page) { setPage(next); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function openSavings(kind?: 'flexible'|'locked') { setReceipt(null); setSavingsKind(kind); setSavingsVisit(n=>n+1); navigate('savings'); }
  return <MotionConfig reducedMotion="user"><DemoMode/><div className="phone" inert={depositFiatId !== null || accountSheet !== null || accountSheetClosing}>
    <div className="status-bar" aria-hidden="true"><span>4:20</span><div className="status-icons">{icon('signal')}{icon('wifi')}<span className="battery">{icon('batteryLevel', 'battery-level')}{icon('battery', 'battery-outline')}</span></div></div>
    <motion.div animate={{ scale: (depositVisible || accountSheet !== null) && !reduced ? .975 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} style={{ transformOrigin: '50% 25%' }}>
    <AnimatePresence mode="wait" initial={false}><motion.div key={page} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={{ duration: reduced ? 0 : .18 }}>
    {page === 'home' ? <><header className="flex items-center justify-between"><div className="flex items-center gap-1"><button className="avatar-button" aria-label="Open Raven’s profile" onClick={() => navigate('profile')}><img className="avatar" src="/assets/avatar.png" alt="Raven"/></button><span className="greeting">Hi Raven</span></div><div className="flex items-center gap-[13px]"><button className="header-icon" aria-label="Scan">{icon('scan')}</button><button className="header-icon" aria-label="Notifications">{icon('bell')}</button></div></header>
    <main>
      <AccountStack order={order} onSelect={chooseAccount} balances={balances} onDeposit={openDeposit} onWithdraw={setOutgoingAsset} onSelector={() => openAccountSheet('selector')} onTokenAction={openAccountSheet} pulse={pulse}/>
      <PromoCarousel index={banner} onChange={setBanner}/>
      <section className="home-savings"><h2>Start saving</h2><p className="home-savings-intro">Put some money aside for what matters.</p><div className="home-savings-grid">{([{kind:'flexible',title:'Flexible savings',text:'Save at your own pace.',icon:'vault'},{kind:'locked',title:'Locked savings',text:'Set money aside for later.',icon:'lock-keyhole'}] as const).map(item=><motion.button key={item.kind} className="home-savings-card" onClick={()=>openSavings(item.kind)} whileHover={{backgroundColor:'#fceffc'}} whileTap={reduced?{}:{scale:.98}} transition={reduced?{duration:0}:{type:'spring',stiffness:400,damping:30}}><Lucide name={item.icon}/><span className="home-savings-title">{item.title}</span><span className="home-savings-copy">{item.text}</span></motion.button>)}</div></section>
      <section className="activity"><div className="flex items-center justify-between"><h2>Recent Activity</h2><button className="view-all" onClick={()=>setAllActivity(!allActivity)}>{allActivity?'Show less':'View All'}</button></div><RecentActivity items={ledger.activity} expanded={allActivity}/></section>
    </main></> : page === 'savings' ? <Savings key={savingsVisit} initialKind={savingsKind} receipt={receipt} onHome={() => navigate('home')}/> : <DetailScreen page={page} onBack={() => navigate('home')}/>}
    </motion.div></AnimatePresence>
    </motion.div>
    <nav className="bottom-nav" aria-label="Main navigation"><div className="nav-items">{[['home','Home'],['wallet','Wallet'],['savings','Savings'],['more','More']].map(([name,label])=><button key={name} className={`${name === 'home' && page !== 'home' ? 'home-inactive' : ''} ${(name === 'more' || name === 'savings') && name === page ? 'more-active' : ''}`} onClick={name === 'savings' ? () => openSavings() : name === 'wallet' ? () => openAccountSheet('selector') : name === 'home' || name === 'more' ? () => navigate(name) : undefined} aria-current={name === page ? 'page' : undefined}>{name === 'savings' ? icon('savings-nav') : icon(name)}<span>{label}</span></button>)}</div><div className="home-indicator" aria-hidden="true"/></nav>
  </div><AnimatePresence onExitComplete={settleDeposit}>{depositVisible && depositFiatId && <DepositSheet key="deposit" account={accountById(depositFiatId)} onClose={() => setDepositVisible(false)} onConfirmed={async amount => { const deposit = { id: depositId.current, asset: depositFiatId, amount: units(amount,depositFiatId), date: new Date().toISOString() }; await transact(s => credit(s,deposit)); creditedDeposit.current = deposit; setPulse(n => n + 1); }} onComplete={(_amount, split) => { pendingSplit.current = !!split; setDepositVisible(false); }}/>}</AnimatePresence><AnimatePresence onExitComplete={finishAccountSheetClose}>{accountSheet === 'receive' && (order[2] === 'USDC' || order[2] === 'USDT') ? <TokenReceive key="token-receive" token={order[2]} onClose={closeAccountSheet} onSplit={deposit=>{closeAccountSheet();setReceipt(deposit);setSavingsKind(undefined);setSavingsVisit(n=>n+1);navigate('savings');}}/> : accountSheet && <AccountSheet key="accounts" mode={accountSheet} selected={order[2]} balances={balances} onSelect={id => { chooseAccount(id); closeAccountSheet(); }} onClose={closeAccountSheet}/>}</AnimatePresence><AnimatePresence>{outgoingAsset&&<SpendingWithdrawal key="spending-withdrawal" initialAsset={outgoingAsset} onClose={()=>setOutgoingAsset(null)} onHome={()=>{setOutgoingAsset(null);navigate('home');}}/>}</AnimatePresence></MotionConfig>;
}
const isShowcase = window.location.pathname.replace(/\/$/, '') === '/showcase';
if (isShowcase) document.documentElement.classList.add('showcase-root');
else if (new URLSearchParams(window.location.search).get('showcase') === 'embedded') document.documentElement.classList.add('showcase-embedded');
const root=createRoot(document.getElementById('root')!);
if ('hot' in import.meta) (import.meta.hot as {dispose:(callback:()=>void)=>void}).dispose(()=>root.unmount());
root.render(<React.StrictMode>{isShowcase ? <Showcase/> : <App/>}</React.StrictMode>);
