import { describe, expect, it } from 'vitest';

import { cepValido, formatarCep, somenteDigitos, texto } from '../src/lib/cep.js';

describe('validação e formatação de CEP', () => {
  it('aceita 8 dígitos com e sem hífen', () => {
    expect(cepValido('01001000')).toBe(true);
    expect(cepValido('01001-000')).toBe(true);
    expect(cepValido(' 01001-000 ')).toBe(true);
  });

  it('rejeita formatos fora do padrão', () => {
    expect(cepValido('123')).toBe(false);
    expect(cepValido('010010000')).toBe(false);
    expect(cepValido('0100a000')).toBe(false);
    expect(cepValido('')).toBe(false);
    expect(cepValido('0100-1000')).toBe(false);
  });

  it('normaliza e formata', () => {
    expect(somenteDigitos('01001-000')).toBe('01001000');
    expect(formatarCep('01001000')).toBe('01001-000');
  });

  it('converte campos ausentes em string vazia', () => {
    expect(texto(undefined)).toBe('');
    expect(texto(null)).toBe('');
    expect(texto(42)).toBe('');
    expect(texto('Sé')).toBe('Sé');
  });
});
