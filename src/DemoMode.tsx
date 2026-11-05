import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { walletConnection } from './accounts';
const key='raven-demo-introduction-seen';
export function DemoMode() {
 const [intro,setIntro]=useState(()=>{try{return !localStorage.getItem(key);}catch{return true;}});
 useEffect(()=>{try{localStorage.setItem(key,'1');}catch{/* The explanation remains available for this visit. */}},[]);
 if(walletConnection.source!=='demo')return null;
 return createPortal(<aside className="demo-mode-shell" aria-label="Demo mode"><span className="demo-mode-indicator">Demo mode</span>{intro&&<div className="demo-mode-intro" role="status"><p>Explore RavenPay with sample funds. No real money moves.</p><button onClick={()=>setIntro(false)}>Got it</button></div>}</aside>,document.body);
}
