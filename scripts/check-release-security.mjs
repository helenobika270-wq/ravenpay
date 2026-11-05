import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const candidates=execFileSync('git',['ls-files','-co','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const ignored=execFileSync('git',['check-ignore','.env.local'],{encoding:'utf8'}).trim()==='.env.local';
const trackedPrivate=execFileSync('git',['ls-files','--','.env.local','.env.production','.env.production.local','.data/**','.secrets/**'],{encoding:'utf8'}).trim().length>0;
const secrets=['ROQQU_TEST_API_KEY','DEMO_DATABASE_AUTH_TOKEN'].map(name=>process.env[name]?.trim()).filter(Boolean);
function files(path){return existsSync(path)?readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(path,entry.name)):[join(path,entry.name)]):[];}
const outputs=files('dist').filter(path=>/\.(js|css|html|map)$/.test(path));
const logs=readdirSync('.').filter(path=>path.endsWith('.log'));
let exposed=false;
for(const path of new Set([...candidates,...outputs,...logs])){if(!existsSync(path))continue;const bytes=readFileSync(path);if(secrets.some(secret=>bytes.includes(Buffer.from(secret))))exposed=true;}
const serverCodeExposed=outputs.some(path=>/ROQQU_TEST_API_KEY|DEMO_DATABASE_AUTH_TOKEN|x-staging-api-key|node:sqlite/.test(readFileSync(path,'utf8')));
console.log(JSON.stringify({environmentFileIgnored:ignored,privateFilesTracked:trackedPrivate,configuredSecretsChecked:secrets.length,releaseFilesChecked:candidates.length,browserOutputsChecked:outputs.length,configuredSecretFound:exposed,serverAuthOrDatabaseCodeInBrowser:serverCodeExposed}));
if(!ignored||trackedPrivate||exposed||serverCodeExposed)process.exitCode=1;
