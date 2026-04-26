/**
 * Print the dev machine's LAN IP and the exact env line a phone
 * should use to reach the local AI proxy.
 *
 * Run:
 *   npm run lanip
 *
 * Output (for the user to paste into `.env`):
 *   LAN IP: 192.168.1.42
 *   For phone testing, set:
 *     EXPO_PUBLIC_PURA_AI_PROXY_URL=http://192.168.1.42:8787
 *
 * If multiple non-internal IPv4 addresses are present (e.g. WiFi +
 * docker0), every candidate is listed so the user can pick the right
 * one for their network.
 */

import * as os from 'node:os';

const port = Number(process.env.PURA_AI_PROXY_PORT ?? 8787);

interface Candidate {
  iface: string;
  address: string;
}

function lanCandidates(): Candidate[] {
  const out: Candidate[] = [];
  const interfaces = os.networkInterfaces();
  for (const [name, ifaces] of Object.entries(interfaces)) {
    for (const ni of ifaces ?? []) {
      if (ni.family !== 'IPv4') continue;
      if (ni.internal) continue;
      out.push({ iface: name, address: ni.address });
    }
  }
  // Heuristic: prefer Wi-Fi-shaped addresses (192.168.*, 10.*, 172.16-31.*)
  // over docker / vbox bridges which are also non-internal.
  return out.sort((a, b) => privateScore(b.address) - privateScore(a.address));
}

function privateScore(addr: string): number {
  // Higher = more likely to be the user's actual Wi-Fi/Ethernet.
  if (addr.startsWith('192.168.')) return 3;
  if (addr.startsWith('10.')) return 2;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return 2;
  return 0;
}

function main(): void {
  const cands = lanCandidates();
  if (cands.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      'No non-loopback IPv4 interface found. Check your network connection.'
    );
    process.exit(1);
  }

  const top = cands[0];
  // eslint-disable-next-line no-console
  console.log(`LAN IP: ${top.address}  (interface: ${top.iface})`);
  // eslint-disable-next-line no-console
  console.log('For phone testing, set in .env:');
  // eslint-disable-next-line no-console
  console.log(
    `  EXPO_PUBLIC_PURA_AI_PROXY_URL=http://${top.address}:${port}`
  );

  if (cands.length > 1) {
    // eslint-disable-next-line no-console
    console.log('\nOther candidates (use one matching your phone’s Wi-Fi):');
    for (const c of cands.slice(1)) {
      // eslint-disable-next-line no-console
      console.log(`  http://${c.address}:${port}   (${c.iface})`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    '\nThen restart Expo (so the new env is picked up) and run `npm run dev`.'
  );
}

main();
