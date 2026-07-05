// pdv.js
// Ponto de entrada do PDV: apenas declara o estado global da aplicação e dispara a inicialização.
// Nenhuma regra de negócio deve ser adicionada aqui — ver modules/ e services/.

const PROPORCAO_TELA_PDV_KEY = "proporcaoTelaPdv";
const CONFIGURACOES_PADRAO_PDV = {
    controleEstoque: true,
    bloquearVendaSemEstoque: false,
    alertaEstoqueMinimo: true,
    solicitarQuantidadePdv: true,
    permitirDescontoPdv: true,
    permitirGuardarVendas: true,
    permitirOrcamentoPdv: false,
    pdvMensagens: "Seja Bem-Vindo(a)!!",
    exigirClienteVendaPrazo: true,
    emitirNfce: true,
    usarVendedor: false,
    pdvCorTextos: "#0f172a",
    pdvCorBotoes: "#1A436B",
    pdvCorVenda: "#00bcd4",
    pdvCorPrevenda: "#00bcd4",
    pdvTemaVenda: "claro",
    pdvTemaPrevenda: "claro",
    pdvMostrarBotoesAtalho: true,
    pdvItemDetalhado: true,
    pdvConsultarPorReferencia: true,
    pdvPesquisarComEnter: true,
    pdvExibirDetalhesSingleResult: true,
    pdvValorMaximoItem: 10000,
    pdvQtdMaximaVenda: 0,
    pdvNaoJuntarItens: false,
    pdvNaoJuntarItensBalanca: false,
    pdvNaoSolicitarQuantidade: false,
    pdvNaoManterConfigEmbalagem: false,
    pdvDesativarQtdPorPreco: false,
    pdvTabelaPreco: "padrao",
    pdvTrocaTabelaAtacado: true,
    pdvNaoSalvarPrecoVendaLivre: false,
    pdvPriorizarDesconto: "percentual",
    pdvDescontoMaximo: 5,
    pdvConsiderarDescontoPromocoes: false,
    pdvNaoAbrirPesquisaAuto: false,
    pdvQtdUltimasCompras: 5,
    pdvNaoSolicitarNaAbertura: false,
    pdvNaoObrigarVendedor: false,
    pdvNaoSolicitarNaAberturaPrevenda: false,
    pdvFormaPagamentoPadrao: "dinheiro",
    pdvRecebimentoPadrao: "por-cliente",
    pdvControlarFechamento: true,
    pdvFechamentoComPrevendas: true,
    pdvSangriaSaldoDinheiro: false,
    pdvIgnorarSaldoSangria: true,
    pdvMostrarQtdCancelamentos: false,
    pdvIgnorarPrevendasSemPagamento: true,
    pdvMaximoCaixa: 0,
    pdvTipoConferencia: "completa",
    pdvConversaoPeso: "real-para-moeda",
    pdvConversaoDolar: "real-para-moeda",
    pdvCotacaoPeso: 0,
    pdvCotacaoDolar: 0,
    pdvDddPadrao: "",
    pdvSolicitarMesa: false,
    pdvIncluirTaxaFrete: false,
    pdvNaoDeslogar: false,
    pdvTempoSessao: 60,
    pdvValorMaximoSemCpf: 0,
    pdvValorMaximoSemDest: 10000,
    pdvNaoSolicitarCpf: false,
    pdvPermitirLiberacaoRemota: true,
    pdvNfeHabilitarPrevendas: true,
    pdvNomePersonalizado: "Nao fiscal",
    pdvDiasValidade: 1,
    pdvGerarPromissoria: true,
    pdvTefPosPixAtivado: true,
    pdvMotivoCancelamentoDesativado: false,
    pdvPagamentoParcialAtivado: true,
    pdvCashbackValorMinimo: 0,
    pdvCashbackPercentual: 0,
    pdvCashbackDiasExpiracao: 0,
    pdvCashbackTodosClientes: true,
    pdvCashbackNaoGerarPrevendas: false,
    pdvTicketRetiradaVenda: false,
    pdvTicketRetiradaPrevenda: false,
    pdvVendasFiscais: true,
    pdvVendasNaoFiscais: true,
    pdvControleImpressao: false,
    pdvForcaContingencia: false,
    pdvMaquininha: "",
    pdvTimeoutPix: 120
};
let sessaoCaixaAtual = null;
let clienteVenda = null;
let clienteVendaPdvSelecionadoId = null;
let _creditoLojaFluxoPendente = false;
let _creditoLojaParcelamentoConfirmado = null;
let carrinhoVenda = [];
let pedidoImportadoAtual = null;
let itemEmDigitacao = null;
let itensCanceladosVenda = 0;
let clienteRecebimentoPdvAtual = null;
let sugestoesProdutosPdv = [];
let sugestaoProdutoAtiva = -1;
let quantidadePendentePesquisa = 0;
let quantidadePendenteTexto = "";
let pesquisaMercadoriaLista = [];
let pesquisaMercadoriaIndice = -1;
let pesquisaMercadoriaProduto = null;
let pesquisaMercadoriaRenderizados = 0;
const PESQUISA_MERCADORIA_INICIAL = 10;
const PESQUISA_MERCADORIA_INCREMENTO = 5;
let produtoBuscaPrecoPdv = null;
let temporizadorAvisoSistema = null;
let tabelaPrecoPdvAtual = "";
let pagamentoPixManualConfirmado = false;
let vendedorPdvAtual = null;
let _callbackVendedorPdv = null;
let entregaFluxoFinalizacaoAtivo = false;
let pagamentosFinalizacao = [];
let vendaMenuItensAbertaId = null;
let entregaVendaPendente = null;
var _devVendaSelecionada    = null;
var _devProdutoTrocaSel     = null;
var _devQtdTroca            = 1;
let _totalParcelamentoCreditoLoja = 0;
var orcItensAbertosId = null;
let scannerCodigoStreamPdv = null;
let scannerCodigoDetectorPdv = null;
let scannerCodigoAtivoPdv = false;

document.addEventListener("DOMContentLoaded", function () {
    PdvEventos.inicializar();
});
