import { formatarCep, texto } from '../lib/cep.js';
import { buscarJson } from '../lib/http.js';
import type { ProvedorCep, ResultadoFonte } from '../types.js';

const BASE_URL = 'https://brasilapi.com.br/api/cep/v2';

/**
 * Adaptador do BrasilAPI (fonte de fallback). O payload usa nomes em inglês
 * (`street`, `neighborhood`, `city`, `state`) e é normalizado para o contrato da nossa API.
 * A v2 não devolve `ibge` nem `ddd`, então esses campos saem como string vazia.
 */
export const brasilapi: ProvedorCep = {
  nome: 'brasilapi',

  async consultar(cepNumerico: string): Promise<ResultadoFonte> {
    let resposta: { status: number; corpo: unknown };

    try {
      resposta = await buscarJson(`${BASE_URL}/${cepNumerico}`);
    } catch (erro) {
      return { tipo: 'indisponivel', motivo: descreverErro(erro) };
    }

    const { status, corpo } = resposta;

    if (status === 400 || status === 404) {
      return { tipo: 'nao_encontrado' };
    }

    if (status !== 200) {
      return { tipo: 'indisponivel', motivo: `HTTP ${status}` };
    }

    if (corpo === null || typeof corpo !== 'object') {
      return { tipo: 'indisponivel', motivo: 'corpo da resposta inválido' };
    }

    const dados = corpo as Record<string, unknown>;
    const cepRetornado = texto(dados['cep']).replace(/\D/g, '') || cepNumerico;

    if (cepRetornado.length !== 8) {
      return { tipo: 'indisponivel', motivo: 'resposta sem CEP válido' };
    }

    return {
      tipo: 'encontrado',
      endereco: {
        cep: formatarCep(cepRetornado),
        logradouro: texto(dados['street']),
        complemento: '',
        bairro: texto(dados['neighborhood']),
        localidade: texto(dados['city']),
        uf: texto(dados['state']),
        ibge: '',
        ddd: '',
        fonte: 'brasilapi',
      },
    };
  },
};

function descreverErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
