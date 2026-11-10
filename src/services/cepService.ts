import { CacheMemoria } from '../lib/cache.js';
import { brasilapi } from '../providers/brasilapi.js';
import { viacep } from '../providers/viacep.js';
import type { EnderecoCep, ProvedorCep } from '../types.js';

export const TTL_CACHE_MS = 60 * 60 * 1000; // 1 hora

export type ResultadoConsulta =
  | { tipo: 'encontrado'; endereco: EnderecoCep; doCache: boolean }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'fonte_indisponivel'; motivos: string[] };

export interface OpcoesServicoCep {
  provedores?: ProvedorCep[];
  cache?: CacheMemoria<EnderecoCep>;
}

export interface ServicoCep {
  consultar(cepNumerico: string): Promise<ResultadoConsulta>;
  cache: CacheMemoria<EnderecoCep>;
}

/**
 * Orquestra a consulta: cache → fonte primária → fonte de fallback.
 *
 * O fallback existe para indisponibilidade da fonte (rede, timeout, 5xx), não para
 * divergência de base: se o primário respondeu que o CEP não existe, essa é a resposta
 * final (404). As bases não são idênticas — o BrasilAPI, por exemplo, conhece CEPs que o
 * ViaCEP não conhece — e encadear fontes em `nao_encontrado` tornaria o resultado
 * dependente de qual fonte estava no ar.
 *
 * Só devolvemos `fonte_indisponivel` quando nenhuma fonte conseguiu responder.
 */
export function criarServicoCep(opcoes: OpcoesServicoCep = {}): ServicoCep {
  const provedores = opcoes.provedores ?? [viacep, brasilapi];
  const cache = opcoes.cache ?? new CacheMemoria<EnderecoCep>(TTL_CACHE_MS);

  return {
    cache,

    async consultar(cepNumerico: string): Promise<ResultadoConsulta> {
      const emCache = cache.get(cepNumerico);
      if (emCache) {
        return { tipo: 'encontrado', endereco: emCache, doCache: true };
      }

      const motivos: string[] = [];

      for (const provedor of provedores) {
        const resultado = await provedor.consultar(cepNumerico);

        if (resultado.tipo === 'encontrado') {
          cache.set(cepNumerico, resultado.endereco);
          return { tipo: 'encontrado', endereco: resultado.endereco, doCache: false };
        }

        if (resultado.tipo === 'nao_encontrado') {
          return { tipo: 'nao_encontrado' };
        }

        motivos.push(`${provedor.nome}: ${resultado.motivo}`);
      }

      return { tipo: 'fonte_indisponivel', motivos };
    },
  };
}
