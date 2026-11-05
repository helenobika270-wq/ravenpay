import {spawnSync} from 'node:child_process';
for(const suite of ['database','judge-sessions','savings','outgoing','accounts','roqqu']){
 const result=spawnSync(process.execPath,[`scripts/check-${suite}.mjs`],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
