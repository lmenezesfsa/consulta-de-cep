# Consulta de CEP

API HTTP de consulta de CEP usando base pública (dados dos Correios via **ViaCEP**, com fallback no **BrasilAPI**).

Os Correios não oferecem API pública gratuita de CEP — a oficial exige contrato e credenciais. Este projeto usa os serviços públicos que expõem a mesma base, sem nenhuma credencial. **Não há segredos no repositório.**

## Requisitos

- Node.js 20 ou superior
- npm

## Instalação

```bash
npm install
```

## Como rodar

```bash
npm run dev      # desenvolvimento, com reload automático (tsx)
npm run build    # compila TypeScript para dist/
npm start        # roda a build de dist/
```

A porta padrão é `3000` e pode ser alterada pela variável `PORT`:

```bash
PORT=8080 npm start
```

A mesma aplicação serve os arquivos estáticos de `public/` na raiz (`/`), onde o frontend será publicado.

## Interface web

Com o servidor rodando (`npm run dev` ou `npm start`), acesse `http://localhost:3000` no navegador. A página tem um campo de CEP (com máscara `00000-000`), botão "Consultar" e uma área de resultado que mostra o endereço completo ou uma mensagem de erro em português.

## Como testar

```bash
npm test
```

Os testes unitários mockam o HTTP externo (`fetch`) — a suíte roda offline e não consulta as bases públicas.

## Endpoints

### `GET /api/health`

```json
{ "status": "ok" }
```

### `GET /api/cep/:cep`

Aceita `01001000` ou `01001-000`.

**200 OK**

```json
{
  "cep": "01001-000",
  "logradouro": "Praça da Sé",
  "complemento": "lado ímpar",
  "bairro": "Sé",
  "localidade": "São Paulo",
  "uf": "SP",
  "ibge": "3550308",
  "ddd": "11",
  "fonte": "viacep"
}
```

O campo `fonte` indica qual base respondeu: `viacep` ou `brasilapi`.

**400** — formato inválido

```json
{ "erro": "cep_invalido", "mensagem": "O CEP deve conter 8 dígitos." }
```

**404** — não encontrado

```json
{ "erro": "cep_nao_encontrado", "mensagem": "CEP não encontrado na base pública." }
```

**502** — nenhuma fonte respondeu

```json
{ "erro": "fonte_indisponivel", "mensagem": "As bases públicas de CEP estão indisponíveis." }
```

Respostas 200 incluem o cabeçalho `X-Cache: HIT|MISS`, indicando se vieram do cache em memória.

### Exemplos

```bash
curl localhost:3000/api/cep/01001000   # 200 — Praça da Sé
curl localhost:3000/api/cep/99999999   # 404
curl localhost:3000/api/cep/123        # 400
curl localhost:3000/api/health         # 200
```

## Comportamento das fontes

| Fonte | URL | Papel |
| --- | --- | --- |
| ViaCEP | `https://viacep.com.br/ws/{cep}/json/` | primária |
| BrasilAPI | `https://brasilapi.com.br/api/cep/v2/{cep}` | fallback |

- O **fallback é acionado por indisponibilidade** da fonte primária (erro de rede, timeout de 5s, HTTP 5xx), não por divergência de base. Se o ViaCEP responde que o CEP não existe, a API devolve 404 — encadear as fontes nesse caso tornaria o resultado dependente de qual fonte estava no ar, já que as bases não são idênticas.
- Quando todas as fontes falham, a resposta é 502.
- A resposta do BrasilAPI é normalizada para o contrato acima (`street` → `logradouro`, `neighborhood` → `bairro`, `city` → `localidade`, `state` → `uf`). A v2 do BrasilAPI não devolve `ibge`, `ddd` nem `complemento`, então esses campos vêm como string vazia quando a resposta vem do fallback.
- Consultas bem-sucedidas ficam em **cache em memória por 1 hora**. Não há banco de dados; reiniciar o servidor limpa o cache.

## Console do navegador em respostas de erro

Ao consultar um CEP inválido, inexistente ou com as fontes fora do ar, o navegador registra no console algo como `Failed to load resource: the server responded with a status of 400/404/502`. **Isso é esperado e não é um bug**: é o comportamento nativo do `fetch()` ao chamar uma URL que responde com status HTTP não-2xx — o próprio navegador loga o aviso antes do código da página tratar a resposta. A interface já trata esses casos e exibe a mensagem amigável correspondente (`cep_invalido`, `cep_nao_encontrado`, `fonte_indisponivel`); mantemos os status HTTP semânticos (400/404/502) porque é o contrato correto da API, em vez de mascarar erros como 200.

## Estrutura

```
src/
  index.ts                 bootstrap do servidor HTTP
  app.ts                   montagem do Express (rotas /api + estáticos de public/)
  routes/cep.ts            rotas /api/cep/:cep e /api/health
  services/cepService.ts   orquestração: cache → primária → fallback
  providers/viacep.ts      adaptador ViaCEP
  providers/brasilapi.ts   adaptador BrasilAPI (normaliza para o contrato)
  lib/cep.ts               validação, normalização e formatação de CEP
  lib/cache.ts             cache em memória com TTL
  lib/http.ts              fetch com timeout
tests/                     testes (Vitest) com HTTP externo mockado
public/                    frontend estático, servido em /
  index.html               página de consulta
  styles.css               estilo
  app.js                   chamada à API e tratamento dos cenários de resposta
```
