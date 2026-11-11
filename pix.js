function crc16(value) {
  let crc = 0xffff;
  for (const char of value) {
    crc ^= char.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id, value) {
  const text = String(value);
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

export function gerarPixCopiaCola(chave, valor, descricao = 'Pagamento') {
  const pixKey = String(chave || '').trim();
  const amount = Number(valor);
  if (!pixKey || !Number.isFinite(amount) || amount <= 0) return '';

  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', pixKey);
  const payloadWithoutCrc = [
    tlv('00', '01'),
    tlv('26', merchantAccount),
    tlv('52', '0000'),
    tlv('53', '986'),
    tlv('54', amount.toFixed(2)),
    tlv('58', 'BR'),
    tlv('59', 'ZEN SELLERS'.slice(0, 25)),
    tlv('60', 'SAO PAULO'),
    tlv('62', tlv('05', String(descricao).replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 25))),
    '6304',
  ].join('');

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}
