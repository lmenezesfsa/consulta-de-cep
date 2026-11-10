import { describe, expect, it } from 'vitest';

import { CacheMemoria } from '../src/lib/cache.js';

describe('CacheMemoria', () => {
  it('devolve o valor dentro do TTL e expira depois', () => {
    let agora = 1_000;
    const cache = new CacheMemoria<string>(60_000, () => agora);

    cache.set('01001000', 'Praça da Sé');
    expect(cache.get('01001000')).toBe('Praça da Sé');

    agora += 59_999;
    expect(cache.get('01001000')).toBe('Praça da Sé');

    agora += 1;
    expect(cache.get('01001000')).toBeUndefined();
    expect(cache.tamanho).toBe(0);
  });

  it('devolve undefined para chave inexistente', () => {
    const cache = new CacheMemoria<string>(60_000);
    expect(cache.get('99999999')).toBeUndefined();
  });
});
