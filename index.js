import express from 'express';
import { iniciarBot } from './iniciar-bot.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Servidor web básico para o Render manter a instância ativa (auto-ping)
app.get('/', (req, res) => {
  res.status(200).send('Bot Zend operacional e ativo!');
});

app.listen(PORT, () => {
  console.log(`Servidor HTTP na porta ${PORT} pronto para evitar spin-down.`);
});

// Inicia o bot do Discord
iniciarBot().catch((err) => {
  console.error('Erro fatal ao iniciar o bot:', err);
  process.exit(1);
});
