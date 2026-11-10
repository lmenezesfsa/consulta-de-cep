/** Remove tudo que não for dígito. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Valida o CEP informado pelo cliente. Aceita `01001000` e `01001-000`,
 * mas rejeita entradas com caracteres inesperados (ex.: `0100a000`).
 */
export function cepValido(valor: string): boolean {
  return /^\d{5}-?\d{3}$/.test(valor.trim());
}

/** Formata um CEP de 8 dígitos como `00000-000`. */
export function formatarCep(cepNumerico: string): string {
  return `${cepNumerico.slice(0, 5)}-${cepNumerico.slice(5)}`;
}

/** Converte valores possivelmente ausentes/nulos das fontes em string. */
export function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}
