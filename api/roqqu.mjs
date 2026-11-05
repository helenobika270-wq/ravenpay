import { configuredReceiveWallet } from '../server/roqqu/wallet.mjs';
import { connectionStatus } from '../server/roqqu/client.mjs';

export async function handleRoqquRequest(request, env = process.env) {
  const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
  if(request.method!=='GET')return Response.json({code:'METHOD_NOT_ALLOWED',message:'Only the connection-status check is available.'},{status:405,headers:{...headers,Allow:'GET'}});
  // This route never calls Roqqu. Checks credentials/environment readiness only.
  const state=connectionStatus(env);
  const token=new URL(request.url).searchParams.get('token');
  const wallet=configuredReceiveWallet(token,env);
  return Response.json({...state,source:'roqqu-test',authenticated:false,walletCreationEnabled:false,receivingEnabled:!!wallet,wallet,balances:null},{status:200,headers});
}
export default {fetch(request){return handleRoqquRequest(request);}};
