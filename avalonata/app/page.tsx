import { getChatGPTUser } from './chatgpt-auth';
import { headers } from 'next/headers';
import { guestAccessEnabled, sessionIdentity } from '../lib/session';
import Club from './club';
export const dynamic='force-dynamic';
export default async function Page(){const guestAccess=guestAccessEnabled();const signedIn=guestAccess?!!sessionIdentity(await headers()):!!(await getChatGPTUser());return <Club signedIn={signedIn} guestAccess={guestAccess}/>;}
