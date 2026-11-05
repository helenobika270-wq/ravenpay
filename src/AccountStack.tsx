import { motion, useReducedMotion } from 'motion/react';
import { AnimatedBalance } from './DepositSheet';
import { accountBalance, accountById, numberAmount, type AccountId, type FiatId } from './accounts';

export function AccountIcon({ code }: { code: AccountId }) {
  const account = accountById(code);
  return <span className={code === 'USD' ? 'account-icon account-icon-usd' : 'account-icon'}><img src={account.flag} alt="" width={18} height={18} draggable={false}/></span>;
}

export function AccountStack({ order, onSelect, balances, onDeposit, onWithdraw, onSelector, onTokenAction, pulse }: {
  order: AccountId[]; onSelect: (id: AccountId) => void; balances: Record<AccountId, number>;
  onDeposit: (id: FiatId) => void; onWithdraw: (id: FiatId) => void; onSelector: () => void; onTokenAction: (action: 'receive' | 'send') => void; pulse: number;
}) {
  const reduced = useReducedMotion();
  const active = order[2];
  return <section className="account-stack" aria-label="Currency accounts">
    <div className="stack-base"/>
    {pulse > 0 && !reduced && <motion.div key={pulse} className="deposit-card-pulse" aria-hidden="true" initial={{ opacity: 0, scale: .75, y: 45 }} animate={{ opacity: [0, .6, 0], scale: [.75, 1, 1.06], y: [45, 0, 0] }} transition={{ duration: .8, ease: 'easeOut' }}/>}
    <button className="all-accounts" aria-haspopup="dialog" onClick={onSelector}>All accounts <img src="/assets/chevron.svg" alt=""/></button>
    {order.map((id, position) => {
      const account = accountById(id);
      const selected = id === active;
      const token = account.kind === 'token';
      const balance = accountBalance(account, balances[id]);
      return <motion.div key={id} className={`account ${token ? 'token-account' : ''}`} data-currency={id} data-active={selected} initial={false}
        animate={{ top: selected ? 90 : 25 + position * 30, left: selected ? 9 : 16, right: selected ? 11 : 16, height: selected ? 145 : 70, backgroundColor: selected ? '#171717' : position === 0 ? '#e5e5e5' : '#d4d4d4', zIndex: selected ? 4 : position + 1 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 330, damping: 31, mass: .85 }}>
        {selected ? <div className="account-selector selected">
          <button className="account-title account-dropdown" aria-label={`Choose account, ${account.name} selected`} aria-haspopup="dialog" onClick={onSelector}><AccountIcon code={id}/>{account.name}<img src="/assets/dropdown.svg" alt=""/></button>
          <motion.span initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} className="selected-balance">
            {token ? <span className="balance token-balance" style={{ fontSize: Math.min(26, 240 / (balance.length * .62)) }}>{balance}</span> : <AnimatedBalance value={balances[id]} symbol={account.symbol}/>}
          </motion.span>
          {token && <span className="token-equivalent">≈ ${numberAmount(balances[id])} <span>· Illustrative rate</span></span>}
        </div> : <button className="account-selector" aria-label={`Select ${account.name}, ${balance}`} onClick={() => onSelect(id)}><span className="preview-account-name"><AccountIcon code={id}/><span>{account.name}</span></span><span className="preview-account-balance">{balance}</span></button>}
        {selected && <div className="account-actions"><motion.button className="deposit" onClick={() => account.kind === 'fiat' ? onDeposit(account.code) : onTokenAction('receive')} whileTap={reduced ? {} : { scale: .96 }}><img src="/assets/deposit.svg" alt=""/>{account.actions[0]}</motion.button><button className="withdraw" onClick={token ? () => onTokenAction('send') : () => onWithdraw(account.code as FiatId)}><img src="/assets/withdraw.svg" alt=""/>{account.actions[1]}</button></div>}
      </motion.div>;
    })}
    <span className="sr-only" role="status">{accountById(active).name} selected. Balance {accountBalance(accountById(active), balances[active])}.</span>
  </section>;
}
