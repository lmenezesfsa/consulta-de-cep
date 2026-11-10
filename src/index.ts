import { criarApp } from './app.js';

const porta = Number(process.env['PORT'] ?? 3000);
const app = criarApp();

app.listen(porta, () => {
  console.log(`API de consulta de CEP ouvindo em http://localhost:${porta}`);
});
