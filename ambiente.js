import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PermissionFlagsBits } from '../discord/permissoes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, '../../config.json');
const ENV_PATH = path.resolve(__dirname, '../../.env');

function carregarEnvLocal() {
  if (!existsSync(ENV_PATH)) return;

  const linhas = readFileSync(ENV_PATH, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const separador = limpa.indexOf('=');
    if (separador < 1) continue;

    const chave = limpa.slice(0, separador).trim();
    let valor = limpa.slice(separador + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(chave)) continue;
    if (
      valor.length >= 2 &&
      ((valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'")))
    ) {
      valor = valor.slice(1, -1);
    }
    if (process.env[chave] === undefined || process.env[chave] === '') {
      process.env[chave] = valor;
    }
  }
}

carregarEnvLocal();

function carregarConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Arquivo config.json não encontrado em: ${CONFIG_PATH}`);
    console.error('Crie config.json com os IDs do bot e configure as credenciais no arquivo .env.');
    process.exit(1);
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Falha ao ler config.json:', err.message);
    process.exit(1);
  }
}

const config = carregarConfig();

export const TOKEN = process.env.DISCORD_TOKEN || config.token || config.DISCORD_TOKEN || '';
export const CLIENT_ID = process.env.CLIENT_ID || config.clientId || config.DISCORD_CLIENT_ID || '';
export const GUILD_ID = process.env.GUILD_ID || config.guildId || config.DISCORD_GUILD_ID || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || config.geminiModel || 'gemini-2.5-flash';

export function atualizarVariaveisEnv(atualizacoes = {}) {
  const linhas = existsSync(ENV_PATH)
    ? readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
    : [];
  const restantes = new Set(Object.keys(atualizacoes));
  const atualizadas = linhas.map((linha) => {
    const correspondencia = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!correspondencia || !Object.hasOwn(atualizacoes, correspondencia[1])) return linha;
    const chave = correspondencia[1];
    restantes.delete(chave);
    return `${chave}=${String(atualizacoes[chave] ?? '')}`;
  });

  for (const chave of restantes) {
    atualizadas.push(`${chave}=${String(atualizacoes[chave] ?? '')}`);
  }

  writeFileSync(ENV_PATH, `${atualizadas.join('\n').replace(/\n+$/, '')}\n`, { mode: 0o600 });
  for (const [chave, valor] of Object.entries(atualizacoes)) {
    process.env[chave] = String(valor ?? '');
  }
}

export const SYNC_EMOJIS_ONLY = process.argv.includes('--sync-emojis');
export const SYNC_EMOJIS_ON_START =
  SYNC_EMOJIS_ONLY ||
  config.syncEmojisOnStart === true ||
  /^true$/i.test(String(config.SYNC_EMOJIS_ON_START || ''));
export const MANAGE_GUILD_EXPRESSIONS =
  PermissionFlagsBits.ManageGuildExpressions ?? PermissionFlagsBits.ManageEmojisAndStickers;

export function validarAmbiente() {
  if (!TOKEN || !CLIENT_ID) {
    console.error('Configure DISCORD_TOKEN e CLIENT_ID no arquivo .env ou no ambiente de execução.');
    process.exit(1);
  }
}
