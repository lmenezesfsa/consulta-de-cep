export const TIMEOUT_PADRAO_MS = 5000;

/** `fetch` com timeout, para que uma fonte lenta não trave a requisição do cliente. */
export async function buscarJson(
  url: string,
  timeoutMs: number = TIMEOUT_PADRAO_MS,
): Promise<{ status: number; corpo: unknown }> {
  const resposta = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  // Algumas fontes devolvem corpo vazio ou HTML em caso de erro; nesses casos
  // deixamos `corpo` como `null` e quem chamou decide pelo status.
  let corpo: unknown = null;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = null;
  }

  return { status: resposta.status, corpo };
}
