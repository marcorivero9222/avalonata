import { env } from 'cloudflare:workers';

// Guest identity is only enabled by the separate, cookie-verifying temporary host.
export const guestAccessEnabled=()=>env.AVALON_GUEST_MODE==='enabled';
export function sessionIdentity(headers:Headers){
  return guestAccessEnabled()?headers.get('x-avalon-guest-id'):headers.get('oai-authenticated-user-id');
}
