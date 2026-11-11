export const CREDIT_NAME = 'Zend';
export const CREDIT_INVITE = 'Zend';
export const CREDIT_TAG = 'Zend • ns_wz';
export const CREDIT_FOOTER = 'Zend • ns_wz';
export const CREDIT_BANNER = [
  '  ─────────────────────────────',
  `   ${CREDIT_NAME}`,
  '   Créditos: ns_wz',
  '  ─────────────────────────────',
].join('\n');

export function garantirCreditos() {
  return true;
}

export function footerComCredito(guildName, label) {
  const base = guildName || 'Loja';
  const mid = label ? ` • ${label}` : '';
  return `${base}${mid} • ns_wz`.slice(0, 2048);
}

export function creditLine() {
  return CREDIT_TAG;
}
