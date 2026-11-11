import path from 'node:path';
import { EfiPay } from 'sdk-node-apis-efi';

function cliente(config) {
  if (!config?.clientId || !config?.clientSecret || !config?.certificate || !config?.pixKey) {
    throw new Error('Credenciais da Efí incompletas.');
  }
  return new EfiPay({
    sandbox: Boolean(config.sandbox),
    client_id: config.clientId,
    client_secret: config.clientSecret,
    certificate: path.resolve(config.certificate),
  });
}

export async function criarCobrancaEfi(config, cart, total) {
  const api = cliente(config);
  const cobranca = await api.pixCreateImmediateCharge({
    calendario: { expiracao: 1800 },
    valor: { original: Number(total).toFixed(2) },
    chave: config.pixKey,
    solicitacaoPagador: `Pedido ${cart.publicId}`.slice(0, 140),
    infoAdicionais: [{ nome: 'Pedido', valor: cart.publicId }],
  });
  const qr = await api.pixGenerateQRCode({ id: cobranca.loc.id });
  return {
    txid: cobranca.txid,
    locationId: cobranca.loc.id,
    copiaCola: qr.qrcode,
    imagemQrcode: qr.imagemQrcode,
    expiresAt: Date.now() + 30 * 60_000,
  };
}

export async function consultarCobrancaEfi(config, txid) {
  const cobranca = await cliente(config).pixDetailCharge({ txid });
  return {
    paid: cobranca.status === 'CONCLUIDA',
    status: cobranca.status,
    pix: cobranca.pix || [],
  };
}

export async function testarEfi(config) {
  const agora = new Date();
  const inicio = new Date(agora.getTime() - 60_000);
  await cliente(config).pixReceivedList({
    inicio: inicio.toISOString(),
    fim: agora.toISOString(),
    'paginacao.paginaAtual': 0,
    'paginacao.itensPorPagina': 1,
  });
  return { ok: true };
}
