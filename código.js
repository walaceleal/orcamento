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

function abrirModalGasto(index = -1) {
  // Se estivermos abrindo a edição a partir da lista de gastos, fechamos a lista primeiro para evitar sobreposição
  fecharModalListaGastos();

  document.getElementById('gastoEditIndex').value = index;

  if (index >= 0 && index < gastos.length) {
    document.getElementById('tituloModalGasto').textContent = '✏️ Editar gasto';
    const gasto = gastos[index];
    document.getElementById('gastoValor').value = gasto.valor;
    document.getElementById('gastoData').value = gasto.data;
    if (gasto.pagador === 'Gatão') {
      document.getElementById('pagGatao').checked = true;
    } else {
      document.getElementById('pagPretinha').checked = true;
    }
  } else {
    document.getElementById('tituloModalGasto').textContent = '＋ Adicionar gasto';
    document.getElementById('gastoValor').value = '';
    document.getElementById('gastoData').value = new Date().toISOString().split('T')[0];
    document.getElementById('pagPretinha').checked = true;
  }

  document.getElementById('modalGastoOverlay').style.display = 'flex';
  
  setTimeout(() => {
    document.getElementById('gastoValor').focus();
  }, 50);
}

function fecharModalGasto() {
  document.getElementById('modalGastoOverlay').style.display = 'none';
}

function salvarGasto() {
  const index = Number(document.getElementById('gastoEditIndex').value);
  const valor = Number(document.getElementById('gastoValor').value);
  const data = document.getElementById('gastoData').value;
  const pagadorEl = document.querySelector('input[name="gastoPagador"]:checked');
  const pagador = pagadorEl ? pagadorEl.value : 'Pretinha';

  if (!data || !Number.isFinite(valor) || valor <= 0) {
    alert('Informe um valor válido maior que zero e uma data.');
    return;
  }

  if (index >= 0 && index < gastos.length) {
    gastos[index] = { data, valor, pagador };
  } else {
    gastos.push({ data, valor, pagador });
  }

  salvarDadosLocal();

  atualizarInformacoes();
  desenharGrafico();
  fecharModalGasto();
  renderizarTabelaGastos();
}

function excluirGasto(index) {
  if (confirm('Deseja realmente excluir este gasto?')) {
    gastos.splice(index, 1);
    salvarDadosLocal();
    atualizarInformacoes();
    desenharGrafico();
    renderizarTabelaGastos();
  }
}

/* Modal de Lista de Gastos */
function abrirModalListaGastos() {
  renderizarTabelaGastos();
  document.getElementById('modalListaGastosOverlay').style.display = 'flex';
}

function fecharModalListaGastos() {
  document.getElementById('modalListaGastosOverlay').style.display = 'none';
}

function renderizarTabelaGastos() {
  const corpo = document.getElementById('corpoTabelaGastos');
  if (!corpo) return;

  if (gastos.length === 0) {
    corpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #888; padding: 15px;">Nenhum gasto registrado.</td></tr>`;
    return;
  }

  // Ordenar lista por data decrescente para facilitar visualização
  const gastosComIndex = gastos.map((g, idx) => ({ ...g, originalIndex: idx }));
  gastosComIndex.sort((a, b) => b.data.localeCompare(a.data));

  corpo.innerHTML = gastosComIndex.map(g => {
    const dataFmt = new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR');
    const classeBadge = g.pagador === 'Gatão' ? 'badge-gatao' : 'badge-pretinha';

    return `
      <tr>
        <td>${dataFmt}</td>
        <td><strong>${formatarMoeda(g.valor)}</strong></td>
        <td><span class="badge ${classeBadge}">${g.pagador}</span></td>
        <td style="text-align: center;">
          <button class="btn-acao btn-editar" onclick="editarGastoFromLista(${g.originalIndex})" title="Editar">✏️</button>
          <button class="btn-acao btn-excluir" onclick="excluirGasto(${g.originalIndex})" title="Excluir">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function editarGastoFromLista(index) {
  abrirModalGasto(index);
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
  renderizarTabelaGastos();
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
  dados.addColumn({ type: 'string', role: 'annotation' });
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

    const rotuloValor = valorGasto > 0 ? formatarMoeda(valorGasto) : '';

    dados.addRow([
      rotuloData,
      valorGasto,
      rotuloValor,
      meta
    ]);
  });

  const opcoes = {
    height: '100%',
    legend: { position: 'none' },
    chartArea: {
      left: 10,
      right: 10,
      top: 20,
      bottom: 35,
      width: '98%',
      height: '85%'
    },
    annotations: {
      alwaysOutside: true,
      textStyle: {
        fontSize: 11,
        bold: true,
        color: '#333'
      }
    },
    hAxis: {
      title: null
    },
    vAxis: {
      textPosition: 'none',
      gridlines: { count: 0 },
      minorGridlines: { count: 0 },
      baselineColor: 'transparent',
      ticks: [],
      format: '#,##0.00'
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
      groupWidth: '55%'
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
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});

document.getElementById('modalGastoOverlay').addEventListener('click', function(e) {
  if (e.target === this) fecharModalGasto();
});

document.getElementById('modalListaGastosOverlay').addEventListener('click', function(e) {
  if (e.target === this) fecharModalListaGastos();
});

window.addEventListener('resize', function() {
  desenharGrafico();
});