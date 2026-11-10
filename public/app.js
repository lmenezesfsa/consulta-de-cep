const form = document.getElementById('form-cep');
const input = document.getElementById('input-cep');
const botao = document.getElementById('botao-consultar');
const mensagemErro = document.getElementById('mensagem-erro');
const resultado = document.getElementById('resultado');

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
  mensagemErro.textContent = texto;
  mensagemErro.hidden = false;
  input.setAttribute('aria-invalid', 'true');
}

function limparErro() {
  mensagemErro.textContent = '';
  mensagemErro.hidden = true;
  input.removeAttribute('aria-invalid');
}

function mostrarCarregando() {
  resultado.innerHTML = '<p class="carregando">Consultando...</p>';
}

function limparResultado() {
  resultado.innerHTML = '';
}

function mostrarEndereco(endereco) {
  const linhas = [
    ['CEP', endereco.cep],
    ['Logradouro', endereco.logradouro || '—'],
    ['Complemento', endereco.complemento || '—'],
    ['Bairro', endereco.bairro || '—'],
    ['Cidade', endereco.localidade || '—'],
    ['UF', endereco.uf || '—'],
    ['IBGE', endereco.ibge || '—'],
    ['DDD', endereco.ddd || '—'],
  ];

  const dl = document.createElement('dl');
  dl.className = 'endereco';

  for (const [rotulo, valor] of linhas) {
    const dt = document.createElement('dt');
    dt.textContent = rotulo;
    const dd = document.createElement('dd');
    dd.textContent = valor;
    dl.append(dt, dd);
  }

  const fonte = document.createElement('p');
  fonte.className = 'fonte';
  fonte.textContent = `Fonte: ${endereco.fonte}`;
  dl.appendChild(fonte);

  resultado.innerHTML = '';
  resultado.appendChild(dl);
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
  botao.disabled = true;

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
    botao.disabled = false;
  }
}

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  consultarCep(input.value);
});
