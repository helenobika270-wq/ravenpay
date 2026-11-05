import assert from 'node:assert/strict';
import fs from 'node:fs';
import {connectionStatus,checkTestAuthentication,sanitizeAuthResponse} from '../server/roqqu/client.mjs';
import {handleRoqquRequest} from '../api/roqqu.mjs';
let calls=0;const neverFetch=async()=>{calls++;throw new Error('Must never contact upstream');};
for(const env of [{},{ROQQU_MODE:'live',ROQQU_TEST_API_KEY:'fixture-secret'},{ROQQU_MODE:'test',ROQQU_TEST_BASE_URL:'https://service.roqqu.com/v1'},{ROQQU_MODE:'test',ROQQU_TEST_BASE_URL:'https://attacker.invalid',ROQQU_TEST_API_KEY:'fixture-secret'}]) {
 const result=await checkTestAuthentication(env,neverFetch);assert.equal(result.attempted,false);assert.equal(result.upstreamHttpStatus,null);assert.equal(result.status,'blocked');assert.ok(!JSON.stringify(result).includes('fixture-secret'));
}
assert.equal(calls,0);
const env={ROQQU_MODE:'test',ROQQU_TEST_BASE_URL:'https://service.roqqu.com/v1',ROQQU_TEST_API_KEY:'fixture-secret'};
let probeCalls=0;
const authenticated=await checkTestAuthentication(env,async(url,options)=>{
 probeCalls++;assert.equal(url,'https://service.roqqu.com/v1/balances');assert.equal(options.method,'POST');assert.equal(options.headers['x-staging-api-key'],'fixture-secret');assert.ok(!('x-api-key' in options.headers));assert.equal(options.headers['Content-Type'],'application/x-www-form-urlencoded');assert.equal(String(options.body),'token=usdc');assert.equal(options.redirect,'error');return Response.json({status:'success',data:{balance:{usdc:0}}});
});
assert.equal(probeCalls,1);assert.equal(authenticated.status,'authenticated');assert.equal(authenticated.upstreamHttpStatus,200);assert.ok(!JSON.stringify(authenticated).includes('fixture-secret'));
const response=await handleRoqquRequest(new Request('http://localhost/api/roqqu'),env);
assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const status=await response.json();assert.equal(status.authenticated,false);assert.equal(status.receivingEnabled,false);assert.equal(status.walletCreationEnabled,false);assert.equal(status.balances,null);assert.equal(status.code,'AUTHENTICATION_NOT_CHECKED');assert.ok(!JSON.stringify(status).includes('fixture-secret'));
assert.equal((await handleRoqquRequest(new Request('http://localhost/api/roqqu',{method:'POST'}),env)).status,405);
for(const code of [401,403,429,500]){const result=await sanitizeAuthResponse(new Response(JSON.stringify({message:'fixture-secret',balance:123456}),{status:code}));assert.equal(result.upstreamHttpStatus,code);assert.equal(result.status,'error');assert.ok(!JSON.stringify(result).includes('fixture-secret'));assert.ok(!JSON.stringify(result).includes('123456'));}
assert.equal((await sanitizeAuthResponse(new Response('<html>not JSON</html>',{status:200}))).code,'INVALID_RESPONSE');
assert.equal((await sanitizeAuthResponse(Response.json({status:'fail',message:'fixture-secret'}))).code,'APPLICATION_REJECTED');
assert.equal((await sanitizeAuthResponse(Response.json({status:'success',data:{balance:{usdc:10}}}))).status,'authenticated');
assert.equal(connectionStatus({ROQQU_MODE:'test'}).code,'TEST_ENDPOINT_UNVERIFIED');
const frontend=fs.readFileSync('src/TokenReceive.tsx','utf8');assert.ok(!/ROQQU_TEST_API_KEY|x-staging-api-key/.test(frontend));assert.ok(!fs.readFileSync('server/roqqu/client.mjs','utf8').includes("'x-api-key':"));
console.log('Roqqu offline checks passed: wrong mode/URL/missing key blocked; one fixture-only balance probe uses the confirmed Test header, no retries or redirects; status-only API, sanitized responses and no frontend credentials. No Roqqu requests made.');
import {generateTestWallet,validCustomer,sanitizeWalletResponse,configuredReceiveWallet} from '../server/roqqu/wallet.mjs';
assert.equal(validCustomer({email:'raven@example.com',first_name:'Raven',last_name:'Test'}),true);
assert.equal(validCustomer({email:'bad',first_name:'Raven',last_name:'Test'}),false);
assert.equal((await generateTestWallet({env,customer:{},fetcher:neverFetch})).code,'WALLET_APPROVAL_REQUIRED');
assert.equal((await generateTestWallet({env,customer:{email:'raven@example.com',first_name:'Raven',last_name:'Test'},approved:true,fetcher:neverFetch})).code,'TEST_ROUTE_REQUIRED');
assert.equal(calls,0);assert.equal(configuredReceiveWallet('USDC',{...env,ROQQU_TEST_TOKEN:'USDC',ROQQU_TEST_NETWORK:'base',ROQQU_TEST_RECEIVE_ADDRESS:'0x0000000000000000000000000000000000000000'}),null);
const walletError=await sanitizeWalletResponse(new Response('fixture-secret',{status:401}));assert.equal(walletError.upstreamHttpStatus,401);assert.ok(!JSON.stringify(walletError).includes('fixture-secret'));
assert.equal((await sanitizeWalletResponse(Response.json({status:'success',data:{address:'fixture-address'}}))).address,'fixture-address');
assert.equal((await sanitizeWalletResponse(Response.json({status:'success',data:{}}))).status,'uncertain');
console.log('Wallet preparation checks passed: explicit approval and verified receiving-route gates, no provider calls, no unverified address handoff, sanitized errors and uncertain-result handling.');
