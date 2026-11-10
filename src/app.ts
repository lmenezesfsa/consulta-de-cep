import { fileURLToPath } from 'node:url';

import express, { type Express, type NextFunction, type Request, type Response } from 'express';

import { criarRotasCep } from './routes/cep.js';
import { criarServicoCep, type ServicoCep } from './services/cepService.js';

/**
 * `src/app.ts` e `dist/app.js` ficam ambos um nível abaixo da raiz do projeto,
 * então o mesmo caminho relativo serve para `npm run dev` e para `npm start`.
 */
export const DIRETORIO_PUBLICO = fileURLToPath(new URL('../public', import.meta.url));

export interface OpcoesApp {
  servico?: ServicoCep;
}

export function criarApp(opcoes: OpcoesApp = {}): Express {
  const servico = opcoes.servico ?? criarServicoCep();
  const app = express();

  app.disable('x-powered-by');

  app.use('/api', criarRotasCep(servico));

  // Qualquer outra rota sob /api é erro de cliente, não arquivo estático.
  app.use('/api', (_req, res) => {
    res.status(404).json({ erro: 'rota_nao_encontrada', mensagem: 'Rota não encontrada.' });
  });

  // O frontend (NEXAA-4) será publicado em `public/`.
  app.use(express.static(DIRETORIO_PUBLICO));

  app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[app] erro não tratado:', erro);
    res.status(500).json({ erro: 'erro_interno', mensagem: 'Erro interno no servidor.' });
  });

  return app;
}
