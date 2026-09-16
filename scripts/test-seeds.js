const {WalletSeeds} = require('@midnight-ntwrk/testkit-js');
const mnemonic = 'federal dumb raven sun suffer solution equip trap glue obey crumble marble pitch wisdom profit under viable nuclear boy road public curtain model fiscal';
try {
  const s = WalletSeeds.fromMnemonic(mnemonic);
  console.log('shielded:', Buffer.from(s.shielded).toString('hex'));
  console.log('unshielded:', Buffer.from(s.unshielded).toString('hex'));
  console.log('dust:', Buffer.from(s.dust).toString('hex'));
} catch(e) { console.error('ERROR:', e.message); }
