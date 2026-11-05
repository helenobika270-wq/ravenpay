import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/accounts.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { accounts, accountById, accountBalance, DEMO_BALANCES, selectAccount, walletConnection } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
let order = ['GBP', 'USDC', 'USD'];
assert.equal(accounts.length, 5);
assert.equal(accountBalance(accountById('USDC'), 0), '0.00 USDC');
assert.equal(accountBalance(accountById('USDC'), 123456789.12), '123,456,789.12 USDC');
assert.equal(accountBalance(accountById('EUR'), 0), '€0.00');
for (const id of ['USDT', 'USDC', 'EUR', 'GBP', 'USD', 'EUR', 'USDC', 'USDC']) {
  order = selectAccount(order, id);
  assert.equal(order.length, 3);
  assert.equal(new Set(order).size, 3);
  assert.equal(order[2], id);
}
const balances = { ...DEMO_BALANCES, USD: DEMO_BALANCES.USD + 50 };
assert.equal(balances.USDC, 550);
assert.deepEqual(accountById('USDC').actions, ['Receive', 'Send']);
assert.deepEqual(accountById('EUR').actions, ['Deposit', 'Withdraw']);
assert.equal(walletConnection.status, 'unavailable');
assert.equal(walletConnection.networks.length, 0);
console.log('Account checks passed: selection uniqueness, EUR retention, formatting, action mapping, balance isolation, unavailable wallet.');

assert.equal(accountBalance(accountById('USDT'), .000001), '<0.01 USDT');
assert.equal(accountBalance(accountById('USDC'),550.986301),'550.99 USDC');
assert.equal(accountBalance(accountById('USD'),5550),'$5,550.00');
