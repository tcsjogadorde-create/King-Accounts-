const BASE_URL = 'https://pix.evopay.cash/v1';

async function request(config, path, options = {}) {
  if (!config?.apiKey) throw new Error('API Key da EvoPay não configurada.');
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'API-Key': config.apiKey, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.message || body.error || `EvoPay respondeu HTTP ${response.status}`);
  return body;
}

export async function criarCobrancaEvoPay(config, cart, total) {
  const data = await request(config, '/pix/', {
    method: 'POST',
    body: JSON.stringify({ amount: Number(total), externalReference: cart.publicId }),
  });
  return { transactionId: data.id, copiaCola: data.qrCodeText, qrCodeUrl: data.qrCodeUrl, status: data.status };
}

export async function consultarCobrancaEvoPay(config, transactionId) {
  const data = await request(config, `/pix?id=${encodeURIComponent(transactionId)}`);
  return { paid: data.status === 'COMPLETED', status: data.status };
}
