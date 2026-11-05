import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
// Run with Node --env-file=.env.local. Never print the credential or file text.
const key=process.env.ROQQU_TEST_API_KEY?.trim();
function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(path,entry.name)):[join(path,entry.name)]);}
const outputs=files('dist').filter(path=>/\.(js|html|map|css)$/.test(path));
const unsafe=outputs.some(path=>{const text=readFileSync(path,'utf8');return /ROQQU_TEST_API_KEY|x-staging-api-key|VITE_ROQQU.*KEY/.test(text)||(key&&text.includes(key));});
console.log(JSON.stringify({credentialConfigured:!!key,browserAssetsChecked:outputs.length,credentialOrServerAuthCodeInBundle:unsafe}));
if(unsafe)process.exitCode=1;
