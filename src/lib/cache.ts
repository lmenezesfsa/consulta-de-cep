/** Cache em memória com TTL por chave. Sem dependências externas e sem persistência. */
export class CacheMemoria<T> {
  private readonly entradas = new Map<string, { valor: T; expiraEm: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly agora: () => number = () => Date.now(),
  ) {}

  get(chave: string): T | undefined {
    const entrada = this.entradas.get(chave);
    if (!entrada) return undefined;

    if (entrada.expiraEm <= this.agora()) {
      this.entradas.delete(chave);
      return undefined;
    }

    return entrada.valor;
  }

  set(chave: string, valor: T): void {
    this.entradas.set(chave, { valor, expiraEm: this.agora() + this.ttlMs });
  }

  limpar(): void {
    this.entradas.clear();
  }

  get tamanho(): number {
    return this.entradas.size;
  }
}
