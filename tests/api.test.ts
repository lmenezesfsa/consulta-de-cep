import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';
import { criarServicoCep } from '../src/services/cepService.js';
import type { ProvedorCep } from '../src/types.js';
import { enderecoExemplo, provedorFake } from './helpers/provedores.js';

function appCom(...provedores: ProvedorCep[]) {
  return criarApp({ servico: criarServicoCep({ provedores }) });
}

describe('GET /api/health', () => {
  it('responde 200 com status ok', async () => {
    const resposta = await request(appCom()).get('/api/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/cep/:cep', () => {
  it('devolve o endereço de um CEP válido', async () => {
    const primario = provedorFake('viacep', {
      tipo: 'encontrado',
      endereco: enderecoExemplo('viacep'),
    });

    const resposta = await request(appCom(primario)).get('/api/cep/01001000');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual(enderecoExemplo('viacep'));
    expect(primario.chamadas).toEqual(['01001000']);
  });

  it('aceita o CEP com hífen', async () => {
    const primario = provedorFake('viacep', {
      tipo: 'encontrado',
      endereco: enderecoExemplo('viacep'),
    });

    const resposta = await request(appCom(primario)).get('/api/cep/01001-000');

    expect(resposta.status).toBe(200);
    expect(resposta.body.cep).toBe('01001-000');
    expect(primario.chamadas).toEqual(['01001000']);
  });

  it('devolve 400 para CEP mal formado', async () => {
    const primario = provedorFake('viacep', { tipo: 'nao_encontrado' });

    const resposta = await request(appCom(primario)).get('/api/cep/123');

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({
      erro: 'cep_invalido',
      mensagem: 'O CEP deve conter 8 dígitos.',
    });
    // Entrada inválida não deve gastar chamada nas fontes públicas.
    expect(primario.chamadas).toEqual([]);
  });

  it('devolve 400 para CEP vazio (sem dígitos depois da barra)', async () => {
    const primario = provedorFake('viacep', { tipo: 'nao_encontrado' });

    const resposta = await request(appCom(primario)).get('/api/cep/');

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({
      erro: 'cep_invalido',
      mensagem: 'O CEP deve conter 8 dígitos.',
    });
    expect(primario.chamadas).toEqual([]);
  });

  it('devolve 404 quando a fonte primária não encontra o CEP', async () => {
    const primario = provedorFake('viacep', { tipo: 'nao_encontrado' });
    const fallback = provedorFake('brasilapi', {
      tipo: 'encontrado',
      endereco: enderecoExemplo('brasilapi'),
    });

    const resposta = await request(appCom(primario, fallback)).get('/api/cep/99999999');

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({
      erro: 'cep_nao_encontrado',
      mensagem: 'CEP não encontrado na base pública.',
    });
    // "Não encontrado" é resposta final: o fallback serve para fonte fora do ar,
    // não para procurar o CEP em outra base.
    expect(fallback.chamadas).toEqual([]);
  });

  it('aciona o fallback quando o primário está indisponível', async () => {
    const primario = provedorFake('viacep', { tipo: 'indisponivel', motivo: 'HTTP 503' });
    const fallback = provedorFake('brasilapi', {
      tipo: 'encontrado',
      endereco: { ...enderecoExemplo('brasilapi'), ibge: '', ddd: '', complemento: '' },
    });

    const resposta = await request(appCom(primario, fallback)).get('/api/cep/01001000');

    expect(resposta.status).toBe(200);
    expect(resposta.body.fonte).toBe('brasilapi');
    expect(resposta.body.logradouro).toBe('Praça da Sé');
    expect(primario.chamadas).toEqual(['01001000']);
    expect(fallback.chamadas).toEqual(['01001000']);
  });

  it('devolve 404 do fallback quando o primário está fora e o fallback não encontra', async () => {
    const primario = provedorFake('viacep', { tipo: 'indisponivel', motivo: 'timeout' });
    const fallback = provedorFake('brasilapi', { tipo: 'nao_encontrado' });

    const resposta = await request(appCom(primario, fallback)).get('/api/cep/99999999');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toBe('cep_nao_encontrado');
    expect(fallback.chamadas).toEqual(['99999999']);
  });

  it('devolve 502 quando todas as fontes estão fora', async () => {
    const primario = provedorFake('viacep', { tipo: 'indisponivel', motivo: 'timeout' });
    const fallback = provedorFake('brasilapi', { tipo: 'indisponivel', motivo: 'HTTP 500' });

    const resposta = await request(appCom(primario, fallback)).get('/api/cep/01001000');

    expect(resposta.status).toBe(502);
    expect(resposta.body).toEqual({
      erro: 'fonte_indisponivel',
      mensagem: 'As bases públicas de CEP estão indisponíveis.',
    });
  });

  it('serve a segunda consulta pelo cache, sem chamar as fontes de novo', async () => {
    const primario = provedorFake('viacep', {
      tipo: 'encontrado',
      endereco: enderecoExemplo('viacep'),
    });
    const app = appCom(primario);

    const primeira = await request(app).get('/api/cep/01001000');
    const segunda = await request(app).get('/api/cep/01001-000');

    expect(primeira.headers['x-cache']).toBe('MISS');
    expect(segunda.headers['x-cache']).toBe('HIT');
    expect(segunda.body).toEqual(primeira.body);
    expect(primario.chamadas).toEqual(['01001000']);
  });
});
