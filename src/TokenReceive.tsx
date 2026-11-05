import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sheet } from './AccountSheet';
import { AccountIcon } from './AccountStack';
import { accountBalance, accountById, walletConnection } from './accounts';
import { credit, money, parseAmount, precision, transact, value, type Deposit } from './savingsStore';

export function TokenReceive({token,onClose,onSplit}:{token:'USDC'|'USDT';onClose:()=>void;onSplit:(deposit:Deposit)=>void}) {
  const [step,setStep]=useState<'receive'|'amount'|'processing'|'receipt'>('receive');
  const [input,setInput]=useState('');
  const [connection,setConnection]=useState<{status:string;message:string}|null>(null);
  const [providerWallet,setProviderWallet]=useState<{address:string;network:string}|null>(null);
  const [checking,setChecking]=useState(false);
  const checkBusy=useRef(false);
  async function checkConnection() {
    if(checkBusy.current)return;checkBusy.current=true;setChecking(true);setConnection(null);
    try {const response=await fetch(`/api/roqqu?token=${token}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();const data=await response.json();if(!['blocked','configured','error'].includes(data.status)||typeof data.message!=='string')throw new Error();setConnection({status:data.status,message:data.message});if(data.wallet?.source==='roqqu-test'&&data.wallet.token===token&&typeof data.wallet.address==='string'&&typeof data.wallet.network==='string')setProviderWallet({address:data.wallet.address,network:data.wallet.network});else setProviderWallet(null);}
    catch{setConnection({status:'error',message:'Connection status is unavailable. Try again when the server is ready.'});}
    finally{checkBusy.current=false;setChecking(false);}
  }
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState('');
  const [receipt,setReceipt]=useState<Deposit|null>(null);
  const busy=useRef(false);
  const timer=useRef<number|undefined>(undefined);
  const id=useRef(crypto.randomUUID());
  const reduced=useReducedMotion();
  useEffect(()=>()=>window.clearTimeout(timer.current),[]);
  const address=providerWallet?.address??`DEMO-${token}-ADDRESS-NOT-FOR-PAYMENTS`;
  const amount=parseAmount(input,token);
  const demo=walletConnection.source==='demo';
  async function copy() {
    const fallback=()=>{const field=document.createElement('textarea');field.value=address;field.style.cssText='position:fixed;opacity:0;pointer-events:none';document.body.append(field);field.select();const ok=document.execCommand('copy');field.remove();return ok;};
    try {await navigator.clipboard.writeText(address);setCopied(true);setError('');}
    catch {if(fallback()){setCopied(true);setError('');}else setError('Copy unavailable. Select and copy the address below.');}
  }
  async function confirm() {
    if (!demo || busy.current || amount===null) return;
    busy.current=true;setError('');
    const deposit:Deposit={id:id.current,asset:token,amount,date:new Date().toISOString()};
    try {
      // Atomic, idempotent demo-only commit before the presentation delay.
      // Closing or refreshing during processing cannot create another credit.
      const state=await transact(s=>credit(s,deposit));
      setReceipt(state.deposits.find(d=>d.id===deposit.id)!);
      setStep('processing');
      timer.current=window.setTimeout(()=>setStep('receipt'),reduced?0:650);
    } catch(e) {busy.current=false;setError(e instanceof Error?e.message:'Unable to save this deposit. Check your balance before trying again.');}
  }
  return <Sheet title={step==='receive'?`Receive ${token}`:step==='amount'?'Add sample funds':step==='processing'?'Adding funds':'Deposit received'} onClose={onClose}>
    <div className="token-receive-identity"><AccountIcon code={token}/><strong>{token}</strong></div>
    
    {error && <p className="savings-error" role="alert">{error}</p>}
    {step==='receive' && <>
      <button className="edit-amount" disabled={checking} onClick={checkConnection}>{checking?'Checking connection…':'Roqqu Test connection'}</button>
      {connection&&<p className={connection.status==='error'?'savings-error':'savings-note'} role="status">{connection.message}</p>}
      <p className="sheet-subtitle">{providerWallet?`Roqqu Test · ${providerWallet.network}`:'Preview address'}</p>
      {!providerWallet&&<img className="demo-receive-qr" src={`/assets/demo-${token.toLowerCase()}-qr.svg`} alt={`QR code encoding ${address}`}/>}
      <p className="demo-receive-address">{address}</p>
      <button className="edit-amount" onClick={copy}>{copied?'Address copied':'Copy address'}</button><span className="sr-only" role="status">{copied?'Address copied.':''}</span>
      {demo && !providerWallet && <motion.button className="deposit-primary" whileTap={reduced?{}:{scale:.98}} onClick={()=>setStep('amount')}>Add sample funds</motion.button>}
    </>}
    {step==='amount' && <><p className="sheet-subtitle">Choose an amount to add to your wallet.</p>
      <label className="savings-field">Amount ({token})<input inputMode="decimal" autoComplete="off" value={input} onChange={e=>setInput(e.target.value)} aria-invalid={!!input&&amount===null} aria-describedby="token-amount-help"/></label>
      <p id="token-amount-help" className={input&&amount===null?'savings-error':'savings-note'}>Enter a positive amount with up to {precision(token)} decimal places.</p>
      <motion.button className="deposit-primary" disabled={!demo||amount===null} whileTap={reduced?{}:{scale:.98}} onClick={confirm}>Add sample funds</motion.button>
      <button className="edit-amount" onClick={()=>setStep('receive')}>Back to receiving details</button>
    </>}
    {step==='processing' && <p className="savings-note" role="status">Adding funds…</p>}
    {step==='receipt' && receipt && <><div className="savings-success" aria-hidden="true">✓</div><div className="review-hero"><strong title={money(receipt.amount,token)}>{accountBalance(accountById(token),value(receipt.amount,token))}</strong></div><p className="savings-note">Completed · {money(receipt.amount,token)}</p><p className="sheet-subtitle">Keep it ready to spend or set some aside.</p><button className="deposit-primary" onClick={()=>onSplit(receipt)}>Split my money</button><button className="edit-amount" onClick={onClose}>Keep all for spending</button></>}
  </Sheet>;
}
