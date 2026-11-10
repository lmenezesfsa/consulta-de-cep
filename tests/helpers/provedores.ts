import type { EnderecoCep, FonteCep, ProvedorCep, ResultadoFonte } from '../../src/types.js';

/** Provedor de teste com respostas programadas — evita qualquer chamada HTTP real. */
export function provedorFake(
  nome: FonteCep,
  resposta: ResultadoFonte | (() => ResultadoFonte),
): ProvedorCep & { chamadas: string[] } {
  const chamadas: string[] = [];

  return {
    nome,
    chamadas,
    async consultar(cepNumerico: string): Promise<ResultadoFonte> {
      chamadas.push(cepNumerico);
      return typeof resposta === 'function' ? resposta() : resposta;
    },
  };
}

export function enderecoExemplo(fonte: FonteCep = 'viacep'): EnderecoCep {
  return {
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    complemento: 'lado ímpar',
    bairro: 'Sé',
    localidade: 'São Paulo',
    uf: 'SP',
    ibge: '3550308',
    ddd: '11',
    fonte,
  };
}
