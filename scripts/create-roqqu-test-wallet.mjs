import { mkdir, writeFile } from 'node:fs/promises';
import { generateTestWallet } from '../server/roqqu/wallet.mjs';
const approved=process.argv.includes('--approve-wallet-creation');
if(!approved){console.log(JSON.stringify({status:'blocked',code:'WALLET_APPROVAL_REQUIRED',message:'Ask for approval before creating a test wallet.'}));process.exitCode=1;}
else {
  // A persistent exclusive attempt marker prevents concurrent or blind repeats.
  // Retain it even if the provider times out: the wallet may already exist.
  await mkdir('.secrets',{recursive:true});
  try {
    const marker=await writeFile('.secrets/roqqu-wallet-attempt.json',JSON.stringify({started:new Date().toISOString(),status:'operator-requested'}),{flag:'wx',mode:0o600}).then(()=>true).catch(()=>false);
    if(!marker)throw new Error('attempt-exists');
    const result=await generateTestWallet({approved,customer:{email:process.env.ROQQU_TEST_CUSTOMER_EMAIL,first_name:process.env.ROQQU_TEST_CUSTOMER_FIRST_NAME,last_name:process.env.ROQQU_TEST_CUSTOMER_LAST_NAME}});
    // No keys or customer details are saved in this receipt or printed.
    await writeFile('.secrets/roqqu-test-wallet.json',JSON.stringify(result,null,2),{mode:0o600});
    console.log(JSON.stringify({status:result.status,code:result.code??'WALLET_CREATED',upstreamHttpStatus:result.upstreamHttpStatus??null,message:result.message??'Wallet receipt saved privately. Inspect .secrets/roqqu-test-wallet.json in your editor.'},null,2));
    if(result.status!=='created')process.exitCode=1;
  }catch{console.log(JSON.stringify({status:'blocked',code:'CHECK_EXISTING_ATTEMPT',message:'An attempt exists or private storage could not be written. Inspect the private receipt before any retry.'}));process.exitCode=1;}
}
