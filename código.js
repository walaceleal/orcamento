google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(inicializar);

let config = {
  titulo: 'Controle de Orçamento',
  orcamento: 1000,
  dias: 10
};

let gastos = [];

// Carregar dados salvos no localStorage ao iniciar
function carregarDados() {
  const configSalva = localStorage.getItem('orcamento_config');
  const gastosSalvos = localStorage.getItem('orcamento_gastos');

  if (configSalva) {
    try {
      config = JSON.parse(configSalva);
    } catch (e) {
      console.error('Erro ao carregar configurações:', e);
    }
  }

  if (gastosSalvos) {
    try {
      gastos = JSON.parse(gastosSalvos);
    } catch (e) {
      console.error('Erro ao carregar gastos:', e);
    }
  }
}

// Salvar dados no localStorage
function salvarDadosLocal() {
  localStorage.setItem('orcamento_config', JSON.stringify(config));
  localStorage.setItem('orcamento_gastos', JSON.stringify(gastos));
}

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatarMoeda(valor) {
  return moeda.format(valor);
}

function obterMetaDiaria() {
  return config.orcamento / config.dias;
}

// Retorna as datas ordenadas únicas presentes nos gastos ou [hoje-3, hoje+3] se vazio
function obterDatasGrafico() {
  if (gastos.length > 0) {
    const datasUnicas = [...new Set(gastos.map(g => g.data))].sort();
    return datasUnicas.map(dStr => new Date(dStr + 'T00:00:00'));
  } else {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let arr = [];
    for (let i = -3; i <= 3; i++) {
      let d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      arr.push(d);
    }
    return arr;
  }
}

function obterTotalGasto() {
  return gastos.reduce((total, gasto) => total + gasto.valor, 0);
}

function obterTotalPorPagador(pagador) {
  return gastos
    .filter(gasto => gasto.pagador === pagador)
    .reduce((total, gasto) => total + gasto.valor, 0);
}

function inicializar() {
  carregarDados();
  
  const selectTipo = document.getElementById('tipoVisualizacao');
  if (selectTipo) {
    selectTipo.value = 'diario';
  }

  atualizarInformacoes();
  desenharGrafico();
}

function abrirModal() {
  document.getElementById('configTitulo').value = config.titulo;
  document.getElementById('configOrcamento').value = config.orcamento;
  document.getElementById('configDias').value = config.dias;

  document.getElementById('modalOverlay').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

function abrirModalGasto() {
  document.getElementById('gastoValor').value = '';
  document.getElementById('gastoData').value = new Date().toISOString().split('T')[0];
  document.getElementById('pagPretinha').checked = true;

  document.getElementById('modalGastoOverlay').style.display = 'flex';
  
  setTimeout(() => {
    document.getElementById('gastoValor').focus();
  }, 50);
}

function fecharModalGasto() {
  document.getElementById('modalGastoOverlay').style.display = 'none';
}

function salvarGasto() {
  const valor = Number(document.getElementById('gastoValor').value);
  const data = document.getElementById('gastoData').value;
  const pagadorEl = document.querySelector('input[name="gastoPagador"]:checked');
  const pagador = pagadorEl ? pagadorEl.value : 'Pretinha';

  if (!data || !Number.isFinite(valor) || valor <= 0) {
    alert('Informe um valor válido maior que zero e uma data.');
    return;
  }

  gastos.push({ data, valor, pagador });
  salvarDadosLocal();

  atualizarInformacoes();
  desenharGrafico();
  fecharModalGasto();
}

function limparDados() {
  if (!confirm('Tem certeza que deseja apagar todos os gastos registrados?')) {
    return;
  }

  gastos = [];
  salvarDadosLocal();

  atualizarInformacoes();
  desenharGrafico();
  fecharModal();
}

function salvarConfiguracoes() {
  const titulo = document.getElementById('configTitulo').value.trim();
  const orcamento = Number(document.getElementById('configOrcamento').value);
  const dias = Number(document.getElementById('configDias').value);

  if (
    !titulo ||
    !Number.isFinite(orcamento) ||
    !Number.isInteger(dias) ||
    orcamento <= 0 ||
    dias < 1 ||
    dias > 365
  ) {
    alert('Preencha os campos com valores válidos.');
    return;
  }

  config.titulo = titulo;
  config.orcamento = orcamento;
  config.dias = dias;
  
  salvarDadosLocal();

  atualizarInformacoes();
  desenharGrafico();
  fecharModal();
}

function atualizarInformacoes() {
  const totalPretinha = obterTotalPorPagador('Pretinha');
  const totalGatao = obterTotalPorPagador('Gatão');
  const totalIdentificado = totalPretinha + totalGatao;

  const infoPretinha = document.getElementById('infoPretinha');
  if (infoPretinha) infoPretinha.textContent = formatarMoeda(totalPretinha);

  const infoGatao = document.getElementById('infoGatao');
  if (infoGatao) infoGatao.textContent = formatarMoeda(totalGatao);

  const percentualPretinha = totalIdentificado > 0
    ? (totalPretinha / totalIdentificado) * 100
    : 0;

  const percentualGatao = totalIdentificado > 0
    ? (totalGatao / totalIdentificado) * 100
    : 0;

  const barraPretinha = document.getElementById('barraPretinha');
  if (barraPretinha) barraPretinha.style.width = percentualPretinha + '%';

  const barraGatao = document.getElementById('barraGatao');
  if (barraGatao) barraGatao.style.width = percentualGatao + '%';
}

function desenharGrafico() {
  if (!window.google || !google.visualization || !google.visualization.DataTable) {
    return;
  }

  const tipo = document.getElementById('tipoVisualizacao').value;
  const datasArray = obterDatasGrafico();
  const metaDiaria = obterMetaDiaria();

  const gastosPorData = {};
  gastos.forEach(gasto => {
    gastosPorData[gasto.data] = (gastosPorData[gasto.data] || 0) + gasto.valor;
  });

  const dados = new google.visualization.DataTable();

  dados.addColumn('string', 'Data');
  dados.addColumn(
    'number',
    tipo === 'acumulado' ? 'Gasto acumulado' : 'Gasto diário'
  );
  dados.addColumn('number', 'Meta');

  let acumulado = 0;
  let maiorValor = 0;

  datasArray.forEach((dObj, index) => {
    const dataISO = dObj.toISOString().split('T')[0];
    const rotuloData = dObj.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });

    const gasto = gastosPorData[dataISO] || 0;
    acumulado += gasto;

    const valorGasto = tipo === 'acumulado' ? acumulado : gasto;
    const meta = tipo === 'acumulado' ? metaDiaria * (index + 1) : metaDiaria;

    if (valorGasto > maiorValor) maiorValor = valorGasto;
    if (meta > maiorValor) maiorValor = meta;

    dados.addRow([
      rotuloData,
      valorGasto,
      meta
    ]);
  });

  const maximo = Math.max(100, (tipo === 'acumulado' ? Math.max(config.orcamento, acumulado) : maiorValor) * 1.15);

  const opcoes = {
    height: 450,
    legend: { position: 'bottom' },
    chartArea: {
      left: 100,
      right: 30,
      top: 30,
      bottom: 70,
      width: '85%',
      height: '75%'
    },
    hAxis: {
      title: 'Datas'
    },
    vAxis: {
      title: 'Valor (R$)',
      minValue: 0,
      maxValue: maximo,
      viewWindow: {
        min: 0,
        max: maximo
      },
      format: 'R$ #,##0.00'
    },
    seriesType: 'bars',
    series: {
      0: {
        type: 'bars',
        color: '#4054d6'
      },
      1: {
        type: 'line',
        color: '#e53935',
        lineWidth: 3,
        pointSize: 5
      }
    },
    bar: {
      groupWidth: '45%'
    },
    tooltip: {
      textStyle: { fontSize: 13 }
    }
  };

  const containerGrafico = document.getElementById('grafico');
  if (containerGrafico) {
    const grafico = new google.visualization.ComboChart(containerGrafico);
    grafico.draw(dados, opcoes);
  }
}

// Fechar modais clicando fora
document.getElementById('modalOverlay')
  .addEventListener('click', function(e) {
    if (e.target === this) fecharModal();
  });

document.getElementById('modalGastoOverlay')
  .addEventListener('click', function(e) {
    if (e.target === this) fecharModalGasto();
  });

window.addEventListener('resize', function() {
  desenharGrafico();
});