import { formatarCep, texto } from '../lib/cep.js';
import { buscarJson } from '../lib/http.js';
import type { ProvedorCep, ResultadoFonte } from '../types.js';

const BASE_URL = 'https://viacep.com.br/ws';

/**
 * Adaptador do ViaCEP (fonte primária). Expõe a base dos Correios sem exigir credenciais.
 * Quando o CEP não existe, o ViaCEP responde 200 com `{ "erro": true }`.
 */
export const viacep: ProvedorCep = {
  nome: 'viacep',

  async consultar(cepNumerico: string): Promise<ResultadoFonte> {
    let resposta: { status: number; corpo: unknown };

    try {
      resposta = await buscarJson(`${BASE_URL}/${cepNumerico}/json/`);
    } catch (erro) {
      return { tipo: 'indisponivel', motivo: descreverErro(erro) };
    }

    const { status, corpo } = resposta;

    // O ViaCEP responde 400 quando rejeita o formato da chave consultada.
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

    // `erro` pode vir como boolean `true` ou string `"true"`, dependendo da versão.
    if (dados['erro'] === true || dados['erro'] === 'true') {
      return { tipo: 'nao_encontrado' };
    }

    const cepRetornado = texto(dados['cep']).replace(/\D/g, '');
    if (cepRetornado.length !== 8) {
      return { tipo: 'indisponivel', motivo: 'resposta sem CEP válido' };
    }

    return {
      tipo: 'encontrado',
      endereco: {
        cep: formatarCep(cepRetornado),
        logradouro: texto(dados['logradouro']),
        complemento: texto(dados['complemento']),
        bairro: texto(dados['bairro']),
        localidade: texto(dados['localidade']),
        uf: texto(dados['uf']),
        ibge: texto(dados['ibge']),
        ddd: texto(dados['ddd']),
        fonte: 'viacep',
      },
    };
  },
};

function descreverErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
