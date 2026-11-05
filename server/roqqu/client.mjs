import { verifiedTestEndpoint } from './test-endpoint.mjs';

export function connectionStatus(env = process.env) {
  if (env.ROQQU_MODE !== 'test') return {status:'blocked',code:'TEST_MODE_REQUIRED',message:'Roqqu Test mode must be configured on the server.'};
  if (!verifiedTestEndpoint || env.ROQQU_TEST_BASE_URL !== verifiedTestEndpoint.baseUrl) return {status:'blocked',code:'TEST_ENDPOINT_UNVERIFIED',message:'Roqqu Test connection is awaiting a verified test endpoint. Sample funds remain separate.'};
  if (!env.ROQQU_TEST_API_KEY?.trim()) return {status:'blocked',code:'TEST_KEY_REQUIRED',message:'Configure the original test credential securely on the server.'};
  return {status:'configured',code:'AUTHENTICATION_NOT_CHECKED',message:'Test configuration is ready. Authentication has not been checked.'};
}

// Exactly one explicitly invoked, read-only provider request. No retries,
// redirects, production headers, public/private-key guessing or wallet writes.
export async function checkTestAuthentication(env = process.env, fetcher = fetch) {
  const readiness=connectionStatus(env);
  if (readiness.status !== 'configured') return {...readiness,attempted:false,upstreamHttpStatus:null};
  try {
    const response=await fetcher(`${verifiedTestEndpoint.baseUrl}/balances`, {
      method:'POST',headers:{'x-staging-api-key':env.ROQQU_TEST_API_KEY.trim(),'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({token:'usdc'}),redirect:'error',signal:AbortSignal.timeout(10000),
    });
    const result=await sanitizeAuthResponse(response);
    return {...result,attempted:true};
  } catch {
    return {status:'error',code:'CONNECTION_FAILED',message:'Test connection failed or timed out. No automatic retry was made.',attempted:true,upstreamHttpStatus:null};
  }
}

export async function sanitizeAuthResponse(response) {
  // Never return upstream bodies, headers, balances, customer data or errors.
  const status=response.status;
  if(status===401||status===403)return {status:'error',code:'AUTHENTICATION_REJECTED',upstreamHttpStatus:status,message:'Test authentication was rejected. Check the original test key, its required role, merchant activation, endpoint and IP restrictions with Roqqu.'};
  if(!response.ok)return {status:'error',code:'UPSTREAM_ERROR',upstreamHttpStatus:status,message:'Roqqu returned an unsuccessful response. Confirm the endpoint and account permissions.'};
  let body;try{body=await response.json();}catch{return {status:'error',code:'INVALID_RESPONSE',upstreamHttpStatus:status,message:'The test endpoint did not return the documented JSON response.'};}
  if(body?.status!=='success'||!body?.data?.balance||typeof body.data.balance!=='object')return {status:'error',code:'APPLICATION_REJECTED',upstreamHttpStatus:status,message:'Roqqu did not confirm successful balance retrieval. Confirm the test credential and account access.'};
  return {status:'authenticated',code:'TEST_AUTHENTICATED',upstreamHttpStatus:status,message:'Read-only Roqqu Test authentication succeeded. No wallet has been created.'};
}
