export type FiatId = 'USD' | 'GBP' | 'EUR';
export type AccountId = FiatId | 'USDC' | 'USDT';
type FiatAccount = { code: FiatId; kind: 'fiat'; name: string; symbol: string; flag: string; actions: readonly ['Deposit', 'Withdraw'] };
type TokenAccount = { code: 'USDC' | 'USDT'; kind: 'token'; name: string; symbol: ''; flag: string; actions: readonly ['Receive', 'Send'] };
export type Account = FiatAccount | TokenAccount;
export const accounts: readonly Account[] = [
  { code: 'USD', kind: 'fiat', name: 'USD Account', symbol: '$', flag: '/assets/usd.png', actions: ['Deposit', 'Withdraw'] },
  { code: 'GBP', kind: 'fiat', name: 'GBP Account', symbol: '£', flag: '/assets/gbp.svg', actions: ['Deposit', 'Withdraw'] },
  { code: 'EUR', kind: 'fiat', name: 'EUR Account', symbol: '€', flag: '/assets/eur.svg', actions: ['Deposit', 'Withdraw'] },
  { code: 'USDC', kind: 'token', name: 'USDC Wallet', symbol: '', flag: '/assets/usdc.png', actions: ['Receive', 'Send'] },
  { code: 'USDT', kind: 'token', name: 'USDT Wallet', symbol: '', flag: '/assets/usdt.png', actions: ['Receive', 'Send'] },
];
export const accountById = (id: AccountId) => accounts.find(account => account.code === id)!;
// Local prototype fixtures only. There is no wallet provider or live price feed.
export const DEMO_BALANCES: Record<AccountId, number> = { USD: 5500, GBP: 2000, EUR: 4000, USDC: 550, USDT: 0 };
export const walletConnection = { status: 'unavailable', source: 'demo', networks: [] } as const;
export const numberAmount = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const compactAmount = (amount: number) => Math.abs(amount) > 0 && Math.abs(amount) < .01 ? '<0.01' : numberAmount(Math.abs(amount));
export const accountBalance = (account: Account, balance: number) => account.kind === 'token' ? `${compactAmount(balance)} ${account.code}` : `${account.symbol}${compactAmount(balance)}`;
export function selectAccount(order: AccountId[], next: AccountId): AccountId[] {
  return order.at(-1) === next ? order : [...order.filter(id => id !== next).slice(-2), next];
}
