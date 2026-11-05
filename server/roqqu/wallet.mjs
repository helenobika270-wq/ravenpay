import {verifiedTestEndpoint} from './test-endpoint.mjs';
import {connectionStatus,checkTestAuthentication} from './client.mjs';

export function walletConfiguration(env=process.env) {
  const token=env.ROQQU_TEST_TOKEN?.toUpperCase();
  const network=env.ROQQU_TEST_NETWORK;
  if(!['USDC','USDT'].includes(token)||!network)return {status:'blocked',code:'TEST_ROUTE_REQUIRED',message:'Confirm one supported test token and network with Roqqu.'};
  if(!verifiedTestEndpoint?.receivingRoutes?.some(r=>r.token===token&&r.network===network))return {status:'blocked',code:'TEST_ROUTE_UNVERIFIED',message:'The receiving token/network has not been verified for Test mode.'};
  return {status:'configured',token,network};
}
export function validCustomer(customer) {
  return customer&&typeof customer.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)&&['first_name','last_name'].every(k=>typeof customer[k]==='string'&&customer[k].trim().length>0&&customer[k].length<=100);
}
export async function sanitizeWalletResponse(response) {
  if(!response.ok)return {status:'error',code:'WALLET_REQUEST_REJECTED',upstreamHttpStatus:response.status,message:'Wallet creation was not confirmed. Check existing wallets before retrying.'};
  let body;try{body=await response.json();}catch{return {status:'uncertain',code:'WALLET_RESULT_UNKNOWN',upstreamHttpStatus:response.status,message:'Could not read the wallet result. Check with Roqqu before retrying.'};}
  const address=body?.data?.address;
  if(body?.status!=='success'||typeof address!=='string'||!address.trim()||address.length>256)return {status:'uncertain',code:'WALLET_RESULT_UNKNOWN',upstreamHttpStatus:response.status,message:'Wallet creation was not confirmed. Check existing wallets before retrying.'};
  return {status:'created',address:address.trim(),upstreamHttpStatus:response.status};
}
// Operator-only operation: not exported through a public HTTP write route.
export async function generateTestWallet({env=process.env,customer,approved=false,fetcher=fetch}) {
  if(!approved)return {status:'blocked',code:'WALLET_APPROVAL_REQUIRED',message:'Explicit approval is required before creating a test wallet.'};
  const config=connectionStatus(env);if(config.status!=='configured')return {...config,attempted:false};
  const route=walletConfiguration(env);if(route.status!=='configured')return {...route,attempted:false};
  if(!validCustomer(customer))return {status:'blocked',code:'CUSTOMER_REQUIRED',message:'Configure the designated test customer privately on the server.'};
  const auth=await checkTestAuthentication(env,fetcher);if(auth.status!=='authenticated')return auth;
  try {
    const response=await fetcher(`${verifiedTestEndpoint.baseUrl}/wallets/generate-wallet`,{method:'POST',headers:{'x-staging-api-key':env.ROQQU_TEST_API_KEY.trim(),'Content-Type':'application/json'},body:JSON.stringify({network:route.network,customer:{email:customer.email,first_name:customer.first_name,last_name:customer.last_name}}),redirect:'error',signal:AbortSignal.timeout(10000)});
    return {...await sanitizeWalletResponse(response),token:route.token,network:route.network};
  }catch{return {status:'uncertain',code:'WALLET_RESULT_UNKNOWN',message:'Connection ended without a confirmed wallet result. Do not retry until Roqqu confirms whether a wallet was created.'};}
}
export function configuredReceiveWallet(token,env=process.env) {
  if(connectionStatus(env).status!=='configured')return null;
  const route=walletConfiguration(env);const address=env.ROQQU_TEST_RECEIVE_ADDRESS?.trim();
  if(route.status!=='configured'||route.token!==token||!address||address.length>256||/\s|DEMO-/i.test(address))return null;
  // Configured address is explicitly attributed to Test mode. No balance or
  // on-chain verification is inferred from an address or its format.
  return {source:'roqqu-test',token,network:route.network,address,balance:null};
}
