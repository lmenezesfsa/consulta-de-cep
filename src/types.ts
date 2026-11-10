/** Fonte pública que respondeu à consulta. */
export type FonteCep = 'viacep' | 'brasilapi';

/** Resposta normalizada da API, conforme o contrato definido na NEXAA-3. */
export interface EnderecoCep {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  ddd: string;
  fonte: FonteCep;
}

export type CodigoErroCep = 'cep_invalido' | 'cep_nao_encontrado' | 'fonte_indisponivel';

export interface ErroCep {
  erro: CodigoErroCep;
  mensagem: string;
}

/**
 * Resultado da consulta a uma fonte pública:
 * - `encontrado`: a fonte respondeu com um endereço
 * - `nao_encontrado`: a fonte respondeu, mas o CEP não existe na base
 * - `indisponivel`: a fonte falhou (rede, timeout, 5xx, corpo inválido)
 */
export type ResultadoFonte =
  | { tipo: 'encontrado'; endereco: EnderecoCep }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'indisponivel'; motivo: string };

/** Adaptador de uma base pública de CEP. */
export interface ProvedorCep {
  nome: FonteCep;
  consultar(cepNumerico: string): Promise<ResultadoFonte>;
}
