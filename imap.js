import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

function centavos(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.round(numero * 100) : null;
}

function valorMonetario(valor) {
  let texto = String(valor ?? '').trim().replace(/\s/g, '');
  if (!texto) return null;
  texto = texto.replace(/R\$|BRL/gi, '');
  if (texto.includes(',') && texto.includes('.')) {
    texto = texto.lastIndexOf(',') > texto.lastIndexOf('.')
      ? texto.replace(/\./g, '').replace(',', '.')
      : texto.replace(/,/g, '');
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.');
  }
  const numero = Number(texto.replace(/[^0-9.-]/g, ''));
  return centavos(numero);
}

function valoresDoTexto(texto) {
  const encontrados = String(texto || '').match(/(?:R\$|BRL)?\s*\d{1,3}(?:[.\s]\d{3})*(?:[,\.]\d{2})|(?:R\$|BRL)?\s*\d+(?:[,\.]\d{2})/gi) || [];
  return encontrados.map(valorMonetario).filter((valor) => valor !== null);
}

function remetentePermitido(config, parsed, envelopeFrom) {
  const permitido = String(config.allowedSender || '').trim().toLowerCase();
  if (!permitido) return false;
  const remetentes = [
    ...(envelopeFrom || []),
    parsed?.from?.value?.map((item) => item.address || item.name || '').join(' ') || '',
  ].join(' ').toLowerCase();
  return remetentes.includes(permitido);
}

const clientesAtivos = new Map();

function chaveCliente(config) {
  return [config.host, config.port || 993, config.email, config.mailbox || 'INBOX'].join('|');
}

async function obterCliente(config) {
  const key = chaveCliente(config);
  let imap = clientesAtivos.get(key);
  if (!imap) {
    imap = cliente(config);
    clientesAtivos.set(key, imap);
    imap.on?.('error', (error) => {
      console.error(`[imap] conexão ${config.email} apresentou erro:`, error?.message || error);
      if (clientesAtivos.get(key) === imap) clientesAtivos.delete(key);
    });
    imap.on?.('close', () => {
      if (clientesAtivos.get(key) === imap) clientesAtivos.delete(key);
    });
    await imap.connect();
  }
  return { imap, key };
}

function cliente(config) {
  if (!config?.email || !config?.password || !config?.host || !config?.allowedSender) {
    throw new Error('Configuração IMAP incompleta. Preencha e-mail, senha de aplicativo, servidor e remetente permitido.');
  }
  return new ImapFlow({
    host: config.host,
    port: Number(config.port || 993),
    secure: config.secure !== false,
    auth: { user: config.email, pass: config.password },
    logger: false,
    connectionTimeout: 7_000,
    greetingTimeout: 7_000,
    socketTimeout: 60_000,
  });
}

export async function verificarPagamentoImap(config, { total, since, usedUids = [] }) {
  const { imap, key } = await obterCliente(config);
  try {
    const lock = await imap.getMailboxLock(config.mailbox || 'INBOX');
    try {
      const desde = since ? new Date(Number(since)) : new Date(Date.now() - 24 * 60 * 60_000);
      const uids = await imap.search({ since: desde }, { uid: true });
      const totalCentavos = centavos(total);
      for (const uid of uids.slice(-100).reverse()) {
        if (usedUids.includes(String(uid))) continue;
        const message = await imap.fetchOne(uid, { envelope: true, source: true, internalDate: true }, { uid: true });
        if (!message?.source) continue;
        const parsed = await simpleParser(message.source);
        const envelopeFrom = (message.envelope?.from || []).map((item) => item.address || item.name || '');
        if (!remetentePermitido(config, parsed, envelopeFrom)) continue;
        const dataMensagem = message.internalDate instanceof Date
          ? message.internalDate.getTime()
          : parsed.date ? new Date(parsed.date).getTime() : 0;
        if (since && Number.isFinite(dataMensagem) && dataMensagem < Number(since)) continue;
        const texto = [parsed.subject, parsed.text, parsed.html].filter(Boolean).join('\n').replace(/\s+/g, ' ');
        if (!valoresDoTexto(texto).includes(totalCentavos)) continue;
        return { paid: true, uid: String(uid), subject: parsed.subject || 'Pagamento recebido' };
      }
      return { paid: false, checked: uids.length };
    } finally {
      lock.release();
    }
  } catch (error) {
    if (clientesAtivos.get(key) === imap) clientesAtivos.delete(key);
    await imap.logout().catch(() => null);
    throw error;
  }
}

export async function testarImap(config) {
  const { imap } = await obterCliente(config);
  await imap.mailboxOpen(config.mailbox || 'INBOX');
  return { ok: true };
}
