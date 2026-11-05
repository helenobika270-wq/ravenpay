import { checkTestAuthentication } from '../server/roqqu/client.mjs';
// Node's --env-file-if-exists loads server-only configuration without printing it.
const result=await checkTestAuthentication();
console.log(JSON.stringify(result,null,2));
if(result.status!=='authenticated')process.exitCode=1;
