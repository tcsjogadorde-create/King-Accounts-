import { GEMINI_MODEL } from '../configuracoes/ambiente.js';

async function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || GEMINI_MODEL,
  };
}

/**
 * Chama a API do Google Gemini REST Endpoint
 */
export async function callGeminiAPI(prompt, systemInstruction = '', jsonOutput = false) {
  const { apiKey, model } = await getGeminiConfig();
  if (!apiKey) {
    throw new Error('Chave Gemini API não configurada no ambiente.');
  }

  const modelsToTry = [model, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError = null;

  for (const currentModel of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

      const contents = [];
      if (systemInstruction) {
        contents.push({
          role: 'user',
          parts: [{ text: `[INSTRUÇÕES DO SISTEMA]: ${systemInstruction}\n\n[SOLICITAÇÃO]: ${prompt}` }],
        });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: prompt }],
        });
      }

      const bodyPayload = {
        contents,
        generationConfig: {
          temperature: 0.7,
        },
      };

      if (jsonOutput) {
        bodyPayload.generationConfig.responseMimeType = 'application/json';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        await response.text();
        throw new Error(`Gemini API respondeu com status HTTP ${response.status} (${currentModel}).`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`Resposta vazia da Gemini API (${currentModel})`);
      }
      return text;
    } catch (err) {
      lastError = err?.message?.startsWith('Gemini API respondeu')
        ? err
        : new Error(`Falha ao conectar com a Gemini API (${currentModel}).`);
      continue;
    }
  }

  throw lastError || new Error('Falha ao conectar com Gemini API');
}

/**
 * Gera um produto completo estruturado pronto para salvar no banco do bot
 */
export async function gerarProdutoComIA(promptDescricao, contextoGuilda = {}) {
  const systemInstruction = `Você é um gerador de produtos profissional especialista em lojas de Discord (serviços virtuais, contas, keys, VIPs, scripts, impulsionamentos).
Gere uma estrutura JSON estrita e válida para um produto da loja.

O formato JSON deve ter EXATAMENTE este esquema:
{
  "name": "Nome curto e chamativo do Produto",
  "description": "Descrição detalhada do produto formatada com emojis e markdown para Discord (use tópicos com • ou ⚡)",
  "price": 19.90,
  "category": "Geral",
  "terms": "Termos de uso do produto (regras de garantia, prazos e suporte)",
  "fields": [
    {
      "name": "Opção Principal / Padrão",
      "price": 19.90,
      "description": "Descrição breve desta variação do produto"
    }
  ],
  "stockItems": [
    "EXEMPLO-STOCK-KEY-001 | Instruções de resgate"
  ]
}

Responda APENAS com o JSON válido sem nenhum texto adicional.`;

  const prompt = `Crie um produto para a loja com base nesta ideia/solicitação: "${promptDescricao}".
Moeda da loja: ${contextoGuilda.currency || 'BRL'}.`;

  const resText = await callGeminiAPI(prompt, systemInstruction, true);

  try {
    const cleanJson = resText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    throw new Error(`Erro ao interpretar o produto gerado pela IA: ${err.message}`);
  }
}

/**
 * Atende a dúvidas de clientes em tickets usando o contexto atual da loja
 */
export async function responderTicketComIA(duvidaUsuario, historicoMensagens = [], contextoLoja = {}) {
  const produtosResumo = (contextoLoja.products || [])
    .map((p) => `- ${p.name} (R$ ${p.price || 0}) | Categoria: ${p.category || 'Geral'}`)
    .join('\n');

  const systemInstruction = `Você é um atendente virtual prestativo, educado e eficiente de suporte da loja no Discord.
Responda a dúvida do cliente com clareza, objetividade e educação.

Regras importantes:
1. Use markdown legível do Discord e emojis amigáveis.
2. Diga ao cliente os passos exatos para efetuar compras ou tirar dúvidas na loja.
3. Se o assunto for sobre produto, consulte a lista de produtos disponíveis abaixo.
4. Mantenha um tom profissional e prestativo.

Produtos disponíveis na loja atualmente:
${produtosResumo || 'Nenhum produto cadastrado no momento.'}
`;

  const prompt = `Dúvida do cliente no ticket: "${duvidaUsuario}"
Histórico recente do ticket:
${historicoMensagens.length > 0 ? historicoMensagens.join('\n') : 'Sem histórico prévio.'}`;

  return await callGeminiAPI(prompt, systemInstruction, false);
}

/**
 * Melhora e otimiza uma descrição de produto ou anúncio
 */
export async function melhorarTextoComIA(textoOriginal, objetivo = 'vendas') {
  const systemInstruction = `Você é um copywriter de elite para e-commerce e lojas de Discord.
Sua missão é transformar textos de produtos ou anúncios em textos altamente persuasivos, limpos, organizados e atraentes no Discord.
Use marcações como **negrito**, listas com emojis e estrutura visual impecável. Retorne apenas o texto melhorado.`;

  const prompt = `Melhore o seguinte texto para objetivo "${objetivo}":\n\n${textoOriginal}`;

  return await callGeminiAPI(prompt, systemInstruction, false);
}

/**
 * Teste rápido de conexão com a API
 */
export async function testarConexaoGemini() {
  const res = await callGeminiAPI('Diga apenas "API OK"', '', false);
  return res.trim();
}
