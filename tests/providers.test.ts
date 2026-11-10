import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { brasilapi } from '../src/providers/brasilapi.js';
import { viacep } from '../src/providers/viacep.js';

/** Monta um `fetch` falso — nenhum teste unitário toca a rede. */
function mockarFetch(resposta: { status: number; json?: unknown; lancar?: Error }) {
  const fetchFalso = vi.fn(async () => {
    if (resposta.lancar) throw resposta.lancar;

    return {
      status: resposta.status,
      async json() {
        if (resposta.json === undefined) throw new Error('corpo não é JSON');
        return resposta.json;
      },
    } as unknown as Response;
  });

  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('provedor ViaCEP', () => {
  it('normaliza um CEP encontrado', async () => {
    const fetchFalso = mockarFetch({
      status: 200,
      json: {
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        complemento: 'lado ímpar',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
        ibge: '3550308',
        gia: '1004',
        ddd: '11',
        siafi: '7107',
      },
    });

    const resultado = await viacep.consultar('01001000');

    expect(fetchFalso).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01001000/json/',
      expect.anything(),
    );
    expect(resultado).toEqual({
      tipo: 'encontrado',
      endereco: {
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        complemento: 'lado ímpar',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
        ibge: '3550308',
        ddd: '11',
        fonte: 'viacep',
      },
    });
  });

  it('trata `{ erro: true }` como CEP não encontrado', async () => {
    mockarFetch({ status: 200, json: { erro: true } });
    expect(await viacep.consultar('99999999')).toEqual({ tipo: 'nao_encontrado' });
  });

  it('trata `{ erro: "true" }` como CEP não encontrado', async () => {
    mockarFetch({ status: 200, json: { erro: 'true' } });
    expect(await viacep.consultar('99999999')).toEqual({ tipo: 'nao_encontrado' });
  });

  it('reporta indisponibilidade em erro 5xx', async () => {
    mockarFetch({ status: 503, json: {} });
    expect(await viacep.consultar('01001000')).toMatchObject({ tipo: 'indisponivel' });
  });

  it('reporta indisponibilidade quando o fetch falha', async () => {
    mockarFetch({ status: 0, lancar: new Error('timeout') });
    expect(await viacep.consultar('01001000')).toEqual({
      tipo: 'indisponivel',
      motivo: 'timeout',
    });
  });
});

describe('provedor BrasilAPI', () => {
  it('normaliza os campos em inglês para o contrato da API', async () => {
    const fetchFalso = mockarFetch({
      status: 200,
      json: {
        cep: '01001000',
        state: 'SP',
        city: 'São Paulo',
        neighborhood: 'Sé',
        street: 'Praça da Sé',
        service: 'open-cep',
      },
    });

    const resultado = await brasilapi.consultar('01001000');

    expect(fetchFalso).toHaveBeenCalledWith(
      'https://brasilapi.com.br/api/cep/v2/01001000',
      expect.anything(),
    );
    expect(resultado).toEqual({
      tipo: 'encontrado',
      endereco: {
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        complemento: '',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
        ibge: '',
        ddd: '',
        fonte: 'brasilapi',
      },
    });
  });

  it('usa string vazia para campos ausentes', async () => {
    mockarFetch({ status: 200, json: { cep: '01001000', state: 'SP', city: 'São Paulo' } });

    const resultado = await brasilapi.consultar('01001000');

    expect(resultado).toMatchObject({
      tipo: 'encontrado',
      endereco: { logradouro: '', bairro: '', complemento: '', ibge: '', ddd: '' },
    });
  });

  it('trata 404 como CEP não encontrado', async () => {
    mockarFetch({ status: 404, json: { name: 'CepPromiseError' } });
    expect(await brasilapi.consultar('99999999')).toEqual({ tipo: 'nao_encontrado' });
  });
});
