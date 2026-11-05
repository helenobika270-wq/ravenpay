import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const schema=[
 `CREATE TABLE IF NOT EXISTS provider_balances (source TEXT NOT NULL CHECK(source='roqqu-test'), account_id TEXT NOT NULL, network TEXT NOT NULL, asset TEXT NOT NULL, amount TEXT NOT NULL DEFAULT '0', PRIMARY KEY(source,account_id,network,asset))`,

 `CREATE TABLE IF NOT EXISTS demo_accounts (id TEXT PRIMARY KEY, session_hash TEXT UNIQUE NOT NULL, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS demo_commands (account_id TEXT NOT NULL REFERENCES demo_accounts(id), request_id TEXT NOT NULL, payload_hash TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(account_id,request_id))`,
 `CREATE TABLE IF NOT EXISTS demo_postings (account_id TEXT NOT NULL, request_id TEXT NOT NULL, asset TEXT NOT NULL, bucket TEXT NOT NULL, delta INTEGER NOT NULL, PRIMARY KEY(account_id,request_id,asset,bucket))`,
 `CREATE TABLE IF NOT EXISTS provider_events (source TEXT NOT NULL CHECK(source='roqqu-test'), event_id TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL, PRIMARY KEY(source,event_id))`,
 `CREATE TABLE IF NOT EXISTS provider_wallets (source TEXT NOT NULL CHECK(source='roqqu-test'), account_id TEXT NOT NULL, network TEXT NOT NULL, asset TEXT NOT NULL, address TEXT NOT NULL, PRIMARY KEY(source,network,asset,address))`,
];
let singleton;
export async function openDatabase(env=process.env){
 let client,local=false;
 if(env.DEMO_DATABASE_URL){const u=new URL(env.DEMO_DATABASE_URL);if(!['https:','libsql:'].includes(u.protocol)||!env.DEMO_DATABASE_AUTH_TOKEN)throw new Error('DATABASE_CONFIGURATION_REQUIRED');const {createClient}=await import('@libsql/client/web');client=createClient({url:env.DEMO_DATABASE_URL,authToken:env.DEMO_DATABASE_AUTH_TOKEN});}
 else {if(env.VERCEL)throw new Error('PERSISTENT_DATABASE_REQUIRED');const path=resolve(env.DEMO_SQLITE_PATH||'.data/ravenpay.sqlite');mkdirSync(dirname(path),{recursive:true});const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(path);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');local=true;client={execute:async statement=>{const {sql,args=[]}=typeof statement==='string'?{sql:statement}:statement;const q=db.prepare(sql);if(/^\s*(SELECT|PRAGMA)/i.test(sql))return{rows:q.all(...args)};const r=q.run(...args);return{rows:[],rowsAffected:Number(r.changes)};},close:()=>db.close(),db};}
 for(const sql of schema)await client.execute(sql);
 let queue=Promise.resolve();
 return {async transaction(fn){if(local){let unlock;const prior=queue;queue=new Promise(r=>unlock=r);await prior;try{client.db.exec('BEGIN IMMEDIATE');try{const result=await fn(client);client.db.exec('COMMIT');return result;}catch(e){client.db.exec('ROLLBACK');throw e;}}finally{unlock();}}
 const tx=await client.transaction('write');try{const result=await fn(tx);await tx.commit();return result;}catch(e){await tx.rollback();throw e;}finally{tx.close();}},close:()=>client.close()};
}
export function database(){return singleton??=openDatabase().catch(error=>{singleton=undefined;throw error;});}
