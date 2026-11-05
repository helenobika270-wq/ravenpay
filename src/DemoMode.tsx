import { createPortal } from 'react-dom';
import { walletConnection } from './accounts';
export function DemoMode() {
 if(walletConnection.source!=='demo')return null;
 return createPortal(<aside className="demo-mode-shell" aria-label="About this experience"><details className="simulation-disclosure"><summary aria-label="Simulated experience. Transactions are simulated. No real funds are transferred.">Simulated experience</summary><p>Transactions are simulated. No real funds are transferred.</p></details></aside>,document.body);
}
