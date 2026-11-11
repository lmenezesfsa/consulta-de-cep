const form = document.getElementById('form-cep');
const input = document.getElementById('input-cep');
const botao = document.getElementById('botao-consultar');
const iconeBusca = botao.querySelector('.icone-busca');
const iconeSpinner = botao.querySelector('.icone-spinner');
const textoBotao = botao.querySelector('.texto-botao');
const mensagemErro = document.getElementById('mensagem-erro');
const mensagemErroTexto = document.getElementById('mensagem-erro-texto');
const resultado = document.getElementById('resultado');
const botaoTema = document.getElementById('botao-tema');

const CHAVE_TEMA = 'nexus-cep-tema';

function temaEscuroAtivo() {
  return document.documentElement.classList.contains('dark');
}

function atualizarRotuloTema() {
  const escuro = temaEscuroAtivo();
  botaoTema.setAttribute('aria-label', escuro ? 'Ativar modo claro' : 'Ativar modo escuro');
}

botaoTema.addEventListener('click', () => {
  const escuro = !temaEscuroAtivo();
  document.documentElement.classList.toggle('dark', escuro);
  try {
    localStorage.setItem(CHAVE_TEMA, escuro ? 'escuro' : 'claro');
  } catch {
    /* localStorage indisponível; preferência vale só para esta sessão */
  }
  atualizarRotuloTema();
});

atualizarRotuloTema();

function formatarCep(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);

  if (digitos.length > 5) {
    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
  }

  return digitos;
}

input.addEventListener('input', () => {
  input.value = formatarCep(input.value);
});

function mostrarErro(texto) {
  mensagemErroTexto.textContent = texto;
  mensagemErro.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', 'dica-cep mensagem-erro');
}

function limparErro() {
  mensagemErroTexto.textContent = '';
  mensagemErro.hidden = true;
  input.removeAttribute('aria-invalid');
  input.setAttribute('aria-describedby', 'dica-cep');
}

function mostrarEstadoVazio() {
  resultado.innerHTML = `
    <div class="estado-vazio">
      <span class="estado-vazio-icone">
        <svg class="icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </span>
      <p class="estado-vazio-titulo">Nenhuma consulta realizada</p>
      <p class="estado-vazio-texto">Digite um CEP acima para ver o endereço completo.</p>
    </div>
  `;
}

function mostrarCarregando() {
  resultado.innerHTML = `
    <div class="esqueleto-card" role="status">
      <span class="sr-only">Consultando CEP...</span>
      <div class="esqueleto-linha"></div>
      <div class="esqueleto-linha"></div>
      <div class="esqueleto-linha"></div>
      <div class="esqueleto-linha"></div>
    </div>
  `;
}

function limparResultado() {
  resultado.innerHTML = '';
}

function mostrarEndereco(endereco) {
  const linhas = [
    ['CEP', endereco.cep, true],
    ['Logradouro', endereco.logradouro || '—', false],
    ['Complemento', endereco.complemento || '—', false],
    ['Bairro', endereco.bairro || '—', false],
    ['Cidade', endereco.localidade || '—', false],
    ['UF', endereco.uf || '—', false],
    ['IBGE', endereco.ibge || '—', true],
    ['DDD', endereco.ddd || '—', true],
  ];

  const card = document.createElement('div');
  card.className = 'endereco-card';

  const badge = document.createElement('p');
  badge.className = 'badge';
  badge.innerHTML = `
    <svg class="icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
      <path d="m9 11 3 3L22 4"></path>
    </svg>
    Endereço encontrado
  `;

  const dl = document.createElement('dl');
  dl.className = 'endereco';

  for (const [rotulo, valor, ehCodigo] of linhas) {
    const dt = document.createElement('dt');
    dt.textContent = rotulo;
    const dd = document.createElement('dd');
    if (ehCodigo) {
      dd.className = 'valor-codigo';
    }
    dd.textContent = valor;
    dl.append(dt, dd);
  }

  const fonte = document.createElement('p');
  fonte.className = 'fonte';
  fonte.textContent = `Fonte: ${endereco.fonte}`;

  card.append(badge, dl, fonte);
  resultado.innerHTML = '';
  resultado.appendChild(card);
}

function mostrarCarregandoBotao(carregando) {
  botao.disabled = carregando;
  iconeBusca.hidden = carregando;
  iconeSpinner.hidden = !carregando;
  textoBotao.textContent = carregando ? 'Consultando...' : 'Consultar';
}

async function consultarCep(cepDigitado) {
  const digitos = cepDigitado.replace(/\D/g, '');

  if (digitos.length !== 8) {
    mostrarErro('Formato inválido. Digite os 8 dígitos do CEP, ex.: 01001-000.');
    return;
  }

  limparErro();
  limparResultado();
  mostrarCarregando();
  mostrarCarregandoBotao(true);

  try {
    const resposta = await fetch(`/api/cep/${digitos}`);
    const dados = await resposta.json();

    if (resposta.ok) {
      mostrarEndereco(dados);
      return;
    }

    limparResultado();

    switch (dados.erro) {
      case 'cep_invalido':
        mostrarErro('Formato inválido. Digite os 8 dígitos do CEP, ex.: 01001-000.');
        break;
      case 'cep_nao_encontrado':
        mostrarErro('CEP não encontrado.');
        break;
      case 'fonte_indisponivel':
        mostrarErro('As bases públicas de CEP estão indisponíveis. Tente novamente em alguns minutos.');
        break;
      default:
        mostrarErro('Não foi possível consultar o CEP agora. Tente novamente.');
    }
  } catch {
    limparResultado();
    mostrarErro('Falha de conexão. Verifique sua internet e tente novamente.');
  } finally {
    mostrarCarregandoBotao(false);
  }
}

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  consultarCep(input.value);
});

mostrarEstadoVazio();
