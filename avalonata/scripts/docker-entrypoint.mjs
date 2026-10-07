import {mkdir,chown,chmod} from 'node:fs/promises';
import path from 'node:path';

// Only this container initializer needs root; game requests run as UID 1000.
const data=path.resolve(process.env.AVALON_DATA_DIR||'/data/avalon');
await mkdir(data,{recursive:true,mode:0o700});
if(process.getuid?.()===0){
  await chown(data,1000,1000);
  await chmod(data,0o700);
  process.setgroups([]);
  process.setgid(1000);
  process.setuid(1000);
}
await import('./temporary-host.mjs');
