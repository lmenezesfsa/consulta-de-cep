import { Router } from 'express';

import { cepValido, somenteDigitos } from '../lib/cep.js';
import type { ServicoCep } from '../services/cepService.js';
import type { ErroCep } from '../types.js';

const ERROS: Record<ErroCep['erro'], ErroCep> = {
  cep_invalido: {
    erro: 'cep_invalido',
    mensagem: 'O CEP deve conter 8 dígitos.',
  },
  cep_nao_encontrado: {
    erro: 'cep_nao_encontrado',
    mensagem: 'CEP não encontrado na base pública.',
  },
  fonte_indisponivel: {
    erro: 'fonte_indisponivel',
    mensagem: 'As bases públicas de CEP estão indisponíveis.',
  },
};

export function criarRotasCep(servico: ServicoCep): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Express não casa `/cep/:cep` com CEP vazio (`/cep` ou `/cep/`); tratamos
  // explicitamente para cair na mesma validação e devolver 400 cep_invalido,
  // em vez de 404 genérico de rota não encontrada.
  router.get(['/cep', '/cep/'], (_req, res) => {
    res.status(400).json(ERROS.cep_invalido);
  });

  router.get('/cep/:cep', async (req, res, next) => {
    const informado = req.params.cep ?? '';

    if (!cepValido(informado)) {
      res.status(400).json(ERROS.cep_invalido);
      return;
    }

    try {
      const resultado = await servico.consultar(somenteDigitos(informado));

      switch (resultado.tipo) {
        case 'encontrado':
          res.set('X-Cache', resultado.doCache ? 'HIT' : 'MISS');
          res.json(resultado.endereco);
          return;
        case 'nao_encontrado':
          res.status(404).json(ERROS.cep_nao_encontrado);
          return;
        case 'fonte_indisponivel':
          console.error('[cep] nenhuma fonte respondeu:', resultado.motivos.join(' | '));
          res.status(502).json(ERROS.fonte_indisponivel);
          return;
      }
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}
