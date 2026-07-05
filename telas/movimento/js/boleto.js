let itensCobranca = [];
let produtoSelecionadoBoleto = null;
let clienteSelecionadoBoleto = null;

document.addEventListener("DOMContentLoaded", function(){
    inicializarBoletos();
});

function inicializarBoletos(){
    prepararDatas();
    preencherIntegracao();
    vincularEventos();
    renderizarItens();
    renderizarParcelas();
    renderizarBoletos();
}

function vincularEventos(){
    document.getElementById("formBoleto")?.addEventListener("submit", emitirCobranca);
    document.getElementById("btnAdicionarProduto")?.addEventListener("click", adicionarProduto);
    document.getElementById("btnLimparBoleto")?.addEventListener("click", limparFormulario);
    document.getElementById("btnAbrirCriarCobranca")?.addEventListener("click", abrirCriarCobranca);
    document.getElementById("btnFecharCriarCobranca")?.addEventListener("click", fecharCriarCobranca);
    document.getElementById("modalCriarCobranca")?.addEventListener("click", function(evento){
        if(evento.target?.id === "modalCriarCobranca") fecharCriarCobranca();
    });
    ["filtroDataInicio","filtroDataFim","filtroStatus"].forEach(function(id){
        document.getElementById(id)?.addEventListener("change", renderizarBoletos);
    });
    document.getElementById("filtroBusca")?.addEventListener("input", renderizarBoletos);
    document.getElementById("buscaClienteBoleto")?.addEventListener("input", pesquisarClientes);
    document.getElementById("buscaProdutoBoleto")?.addEventListener("input", pesquisarProdutos);
    document.getElementById("boletoQuantidade")?.addEventListener("input", sugerirValorProduto);
    document.getElementById("boletoParcelas")?.addEventListener("input", renderizarParcelas);
    document.getElementById("boletoVencimento")?.addEventListener("change", renderizarParcelas);
    document.querySelectorAll("[name='modoEmissaoBoleto']").forEach(function(radio){
        radio.addEventListener("change", atualizarLabelEmissao);
    });
}

function prepararDatas(){
    const hoje = new Date().toISOString().slice(0, 10);
    definirValor("filtroDataInicio", hoje);
    definirValor("filtroDataFim", hoje);
    definirValor("boletoVencimento", hoje);
}

function atualizarLabelEmissao(){
    const ehNfe = document.getElementById("modoBoletoNfe")?.checked;
    const botao = document.getElementById("btnEmitirCobranca");
    if(botao) botao.innerHTML = ehNfe
        ? '<i class="fa-solid fa-file-invoice"></i>Emitir NF-e + Boleto'
        : '<i class="fa-solid fa-barcode"></i>Emitir cobranca';
}

function pesquisarClientes(){
    const termo = normalizar(document.getElementById("buscaClienteBoleto")?.value || "");
    const destino = document.getElementById("resultadoClientesBoleto");
    if(!destino) return;
    clienteSelecionadoBoleto = null;
    if(termo.length < 2){
        destino.classList.add("recolhido");
        destino.innerHTML = "";
        return;
    }
    const clientes = obterClientes().filter(function(cliente){
        const texto = [cliente.nome, cliente.cpf, cliente.cnpj, cliente.documento].join(" ");
        return normalizar(texto).includes(termo);
    }).slice(0, 12);
    destino.classList.remove("recolhido");
    destino.innerHTML = clientes.map(function(cliente){
        const documento = cliente.cpf || cliente.cnpj || cliente.documento || "";
        return `<button type="button" class="produto-resultado" data-id="${escapar(cliente.id)}">
            <strong>${escapar(cliente.nome || "Cliente")}</strong>
            <span>${escapar(documento || "Sem documento")}</span>
        </button>`;
    }).join("") || "<div class='vazio'>Nenhum cliente encontrado.</div>";
    document.querySelectorAll("#resultadoClientesBoleto .produto-resultado").forEach(function(botao){
        botao.addEventListener("click", function(){ selecionarCliente(botao.dataset.id); });
    });
}

function selecionarCliente(id){
    const cliente = obterClientes().find(function(item){ return item.id === id; }) || null;
    if(!cliente) return;
    clienteSelecionadoBoleto = cliente;
    const documento = cliente.cpf || cliente.cnpj || cliente.documento || "";
    definirValor("buscaClienteBoleto", cliente.nome + (documento ? " - " + documento : ""));
    document.getElementById("resultadoClientesBoleto")?.classList.add("recolhido");
}

function preencherIntegracao(){
    const config = obterConfiguracaoBoleto();
    definirTexto("apiProvedor", config.provedor || "Nao configurado");
    definirTexto("apiEndpoint", config.url || "Nao configurado");
    definirTexto("apiToken", config.token ? "Configurado" : "Pendente");
    definirTexto("statusIntegracao", config.configurada ? "Integracao configurada" : "Integracao pendente");
    definirTexto("apiStatusResumo", config.configurada ? "Configurada" : "Pendente");
}

function pesquisarProdutos(){
    const termo = normalizar(document.getElementById("buscaProdutoBoleto")?.value || "");
    const destino = document.getElementById("resultadoProdutosBoleto");
    if(!destino) return;
    produtoSelecionadoBoleto = null;
    if(termo.length < 2){
        destino.classList.add("recolhido");
        destino.innerHTML = "";
        return;
    }
    const produtos = obterProdutos().filter(function(produto){
        const texto = [produto.codigo, produto.ean, produto.referencia, produto.descricao, produto.nome].join(" ");
        return normalizar(texto).includes(termo);
    }).slice(0, 12);
    destino.classList.remove("recolhido");
    destino.innerHTML = produtos.map(function(produto){
        return `<button type="button" class="produto-resultado" data-id="${escapar(produto.id)}">
            <strong>${escapar(produto.descricao || produto.nome || "Produto")}</strong>
            <span>${escapar(produto.codigo || produto.ean || "-")} | ${formatarMoeda(precoProduto(produto))}</span>
        </button>`;
    }).join("") || "<div class='vazio'>Nenhum produto encontrado.</div>";
    document.querySelectorAll(".produto-resultado").forEach(function(botao){
        botao.addEventListener("click", function(){ selecionarProduto(botao.dataset.id); });
    });
}

function selecionarProduto(id){
    const produto = obterProdutos().find(function(item){ return item.id === id; }) || null;
    if(!produto) return;
    produtoSelecionadoBoleto = produto;
    definirValor("buscaProdutoBoleto", (produto.codigo || produto.ean || "-") + " - " + (produto.descricao || produto.nome || "Produto"));
    document.getElementById("resultadoProdutosBoleto")?.classList.add("recolhido");
    sugerirValorProduto();
}

function sugerirValorProduto(){
    if(!produtoSelecionadoBoleto) return;
    const quantidade = Math.max(1, numero(document.getElementById("boletoQuantidade")?.value || 1));
    definirValor("boletoValor", (precoProduto(produtoSelecionadoBoleto) * quantidade).toFixed(2));
}

function adicionarProduto(){
    const produto = produtoSelecionadoBoleto;
    if(!produto){
        notificar("Pesquise e selecione um produto.", "aviso");
        return;
    }
    const quantidade = Math.max(1, numero(document.getElementById("boletoQuantidade")?.value || 1));
    const valorInformado = numero(document.getElementById("boletoValor")?.value || 0);
    const valorUnitario = valorInformado > 0 ? valorInformado / quantidade : precoProduto(produto);
    itensCobranca.push({
        id:gerarId("item"),
        produtoId:produto.id,
        codigo:produto.codigo || produto.ean || "",
        descricao:produto.descricao || produto.nome || "Produto",
        quantidade,
        valorUnitario,
        valorTotal:valorUnitario * quantidade
    });
    produtoSelecionadoBoleto = null;
    definirValor("buscaProdutoBoleto", "");
    definirValor("boletoQuantidade", "1");
    definirValor("boletoValor", "0");
    renderizarItens();
    renderizarParcelas();
}

function renderizarItens(){
    const destino = document.getElementById("listaItensBoleto");
    if(!destino) return;
    if(!itensCobranca.length){
        destino.innerHTML = "<div class='vazio'>Nenhum produto adicionado.</div>";
    }else{
        destino.innerHTML = itensCobranca.map(function(item){
            return `<div class="item-cobranca">
                <span>
                    <strong>${escapar(item.descricao)}</strong>
                    <small>${escapar(item.codigo || "-")} | Qtd. ${formatarQuantidade(item.quantidade)}</small>
                </span>
                <strong>${formatarMoeda(item.valorTotal)}</strong>
                <button type="button" class="btn secundario btn-remover-item" data-id="${escapar(item.id)}"><i class="fa-solid fa-trash"></i>Remover</button>
            </div>`;
        }).join("");
    }
    document.querySelectorAll(".btn-remover-item").forEach(function(botao){
        botao.addEventListener("click", function(){
            itensCobranca = itensCobranca.filter(function(item){ return item.id !== botao.dataset.id; });
            renderizarItens();
            renderizarParcelas();
        });
    });
    definirTexto("totalCobranca", formatarMoedaRS(totalItens()));
}

function renderizarParcelas(){
    const destino = document.getElementById("listaParcelasBoleto");
    if(!destino) return;
    const parcelas = Math.max(1, Math.min(60, Math.floor(numero(document.getElementById("boletoParcelas")?.value || 1))));
    const total = totalItens();
    const valorParcela = parcelas ? arredondar(total / parcelas) : total;
    definirTexto("totalParcelas", parcelas + (parcelas === 1 ? " boleto" : " boletos"));
    destino.innerHTML = Array.from({ length:parcelas }).map(function(_, index){
        const data = somarMeses(document.getElementById("boletoVencimento")?.value || new Date().toISOString().slice(0, 10), index);
        const valor = index === parcelas - 1 ? arredondar(total - valorParcela * (parcelas - 1)) : valorParcela;
        return `<div class="parcela-item">
            <span><strong>${index + 1}/${parcelas}</strong><small>${formatarMoeda(valor)}</small></span>
            <input type="date" class="data-parcela" data-parcela="${index + 1}" value="${data}">
        </div>`;
    }).join("");
}

function emitirCobranca(evento){
    evento.preventDefault();
    const cliente = obterClienteSelecionado();
    const observacao = document.getElementById("boletoObservacao")?.value.trim() || "";
    const parcelas = coletarParcelas();
    if(!cliente){
        notificar("Selecione o cliente da cobranca.", "aviso");
        return;
    }
    if(!itensCobranca.length){
        notificar("Adicione pelo menos um produto.", "aviso");
        return;
    }
    if(parcelas.some(function(parcela){ return !parcela.vencimento; })){
        notificar("Informe o vencimento de todas as parcelas.", "aviso");
        return;
    }

    if(document.getElementById("modoBoletoNfe")?.checked){
        emitirComNfe(cliente, parcelas, observacao);
        return;
    }

    const base = obterBase();
    base.boletos = Array.isArray(base.boletos) ? base.boletos : [];
    base.contasReceber = Array.isArray(base.contasReceber) ? base.contasReceber : [];
    const config = obterConfiguracaoBoleto();
    const agora = new Date();
    const usuario = usuarioAtualBoleto();
    const totalAntes = base.boletos.length;
    parcelas.forEach(function(parcela, index){
        const numeroBoleto = proximoNumeroBoleto(base.boletos, totalAntes + index + 1);
        const boleto = montarBoleto({
            numeroBoleto,
            cliente,
            itens:itensCobranca,
            valor:parcela.valor,
            vencimento:parcela.vencimento,
            observacao,
            config,
            usuario,
            agora,
            parcela:index + 1,
            totalParcelas:parcelas.length
        });
        base.boletos.push(boleto);
        base.contasReceber.push({
            id:gerarId("rec"),
            origem:"boleto",
            boletoId:boleto.id,
            clienteId:boleto.clienteId,
            cliente:boleto.clienteNome,
            descricao:"Boleto " + boleto.numero,
            vencimento:boleto.vencimento,
            valor:boleto.valor,
            status:"aberto",
            criadoEm:boleto.criadoEm
        });
    });
    baixarEstoqueItensBoleto(base, itensCobranca);
    salvarBase(base);
    limparFormulario();
    renderizarBoletos();
    fecharCriarCobranca();
    notificar(parcelas.length + " boleto(s) emitido(s).", "sucesso");
}

function baixarEstoqueItensBoleto(base, itens){
    const config = window.ConfiguracoesSistema && typeof window.ConfiguracoesSistema.obter === "function" ? window.ConfiguracoesSistema.obter() : {};
    if(config.controleEstoque === false) return;
    itens.forEach(function(item){
        const produto = (base.mercadorias || []).find(function(m){ return m.id === item.produtoId; });
        if(produto){
            produto.estoque = Math.max(0, numero(produto.estoque) - numero(item.quantidade));
            produto.atualizadoEm = new Date().toISOString();
        }
    });
}

function emitirComNfe(cliente, parcelas, observacao){
    localStorage.setItem("boletoParaNfe", JSON.stringify({
        clienteId: cliente.id,
        itens: itensCobranca.map(function(item){
            return { produtoId:item.produtoId, quantidade:item.quantidade, valorUnitario:item.valorUnitario };
        }),
        formaPagamento: "15",
        boletoVencimento: parcelas[0]?.vencimento || "",
        boletoParcelas: parcelas.length,
        observacao
    }));
    window.location.href = new URL("telas/notasfiscais/emitirnfe.html", document.baseURI).href;
}

function montarBoleto(dados){
    return {
        id:gerarId("bol"),
        numero:dados.numeroBoleto,
        nossoNumero:document.getElementById("boletoNossoNumero")?.value.trim() || dados.numeroBoleto,
        parcela:dados.parcela,
        totalParcelas:dados.totalParcelas,
        clienteId:dados.cliente.id,
        clienteNome:dados.cliente.nome || "Cliente",
        clienteDocumento:dados.cliente.cpf || dados.cliente.cnpj || dados.cliente.documento || "",
        clienteEmail:dados.cliente.email || "",
        clienteTelefone:dados.cliente.telefone || "",
        itens:dados.itens.map(function(item){ return Object.assign({}, item); }),
        valor:dados.valor,
        vencimento:dados.vencimento,
        observacao:dados.observacao,
        status:"gerado",
        statusIntegracao:dados.config.configurada ? "aguardando_envio" : "pendente_configuracao",
        integracao:{
            origem:"telas/movimento/boleto.html",
            provedor:dados.config.provedor || "",
            url:dados.config.url || "",
            configurada:dados.config.configurada
        },
        payloadApi:montarPayloadApi(dados.numeroBoleto, dados.cliente, dados.itens, dados.valor, dados.vencimento, dados.observacao),
        retornoApi:null,
        criadoEm:dados.agora.toISOString(),
        dataHora:dados.agora.toISOString(),
        usuarioId:dados.usuario.id || "",
        usuarioNome:dados.usuario.nome || dados.usuario.login || "Usuario"
    };
}

function renderizarBoletos(){
    const base = obterBase();
    base.boletos = Array.isArray(base.boletos) ? base.boletos : [];
    const boletos = filtrarBoletos(base.boletos);
    atualizarResumo(boletos);
    definirTexto("contadorBoletos", boletos.length + " boleto(s)");
    const destino = document.getElementById("listaBoletos");
    if(!destino) return;
    if(!boletos.length){
        destino.innerHTML = "<tr><td colspan='9' class='vazio'>Nenhum boleto emitido.</td></tr>";
        return;
    }
    destino.innerHTML = boletos.sort(ordenarBoletosDesc).map(linhaBoleto).join("");
    vincularAcoesTabela();
}

function linhaBoleto(boleto){
    return `<tr>
        <td><strong>${escapar(boleto.numero || boleto.nossoNumero || "-")}</strong><small>${boleto.totalParcelas > 1 ? "Parcela " + boleto.parcela + "/" + boleto.totalParcelas : ""}</small></td>
        <td>${formatarDataHora(boleto.criadoEm || boleto.dataHora)}</td>
        <td>${escapar(boleto.clienteNome || "-")}</td>
        <td>${escapar(descreverItens(boleto.itens))}</td>
        <td>${formatarMoeda(boleto.valor)}</td>
        <td>${escapar(boleto.usuarioNome || "-")}</td>
        <td><span class="status ${escapar(boleto.status || "gerado")}">${escapar(rotuloStatus(boleto.status))}</span></td>
        <td><span class="status ${statusIntegracaoClasse(boleto.statusIntegracao)}">${escapar(rotuloIntegracao(boleto.statusIntegracao))}</span></td>
        <td>
            <div class="acoes-tabela">
                <button type="button" class="btn secundario btn-reimprimir" data-id="${escapar(boleto.id)}">Reimprimir</button>
                ${boleto.status !== "pago" ? `<button type="button" class="btn secundario btn-pagar" data-id="${escapar(boleto.id)}">Pago</button>` : ""}
                ${boleto.status !== "cancelado" && boleto.status !== "pago" ? `<button type="button" class="btn secundario btn-cancelar" data-id="${escapar(boleto.id)}">Cancelar</button>` : ""}
            </div>
        </td>
    </tr>`;
}

function vincularAcoesTabela(){
    document.querySelectorAll(".btn-pagar").forEach(function(botao){
        botao.addEventListener("click", function(){ alterarStatusBoleto(botao.dataset.id, "pago"); });
    });
    document.querySelectorAll(".btn-cancelar").forEach(function(botao){
        botao.addEventListener("click", function(){ alterarStatusBoleto(botao.dataset.id, "cancelado"); });
    });
    document.querySelectorAll(".btn-reimprimir").forEach(function(botao){
        botao.addEventListener("click", function(){ reimprimirBoleto(botao.dataset.id); });
    });
}

function filtrarBoletos(boletos){
    const inicio = document.getElementById("filtroDataInicio")?.value || "";
    const fim = document.getElementById("filtroDataFim")?.value || "";
    const status = document.getElementById("filtroStatus")?.value || "";
    const busca = normalizar(document.getElementById("filtroBusca")?.value || "");
    return boletos.filter(function(boleto){
        const data = String(boleto.criadoEm || boleto.dataHora || "").slice(0, 10);
        if(inicio && data < inicio) return false;
        if(fim && data > fim) return false;
        if(status === "aberto" && !["gerado","aberto"].includes(boleto.status)) return false;
        if(status && status !== "aberto" && boleto.status !== status) return false;
        if(busca){
            const texto = [boleto.numero, boleto.nossoNumero, boleto.clienteNome, boleto.usuarioNome, descreverItens(boleto.itens)].join(" ");
            if(!normalizar(texto).includes(busca)) return false;
        }
        return true;
    });
}

function atualizarResumo(boletos){
    definirTexto("kpiEmitidos", String(boletos.length));
    definirTexto("kpiAbertos", String(boletos.filter(function(boleto){ return ["gerado","aberto"].includes(boleto.status); }).length));
    definirTexto("kpiPagos", String(boletos.filter(function(boleto){ return boleto.status === "pago"; }).length));
    definirTexto("kpiGerados", String(boletos.filter(function(boleto){ return boleto.status === "gerado"; }).length));
    definirTexto("kpiValorGerado", formatarMoedaRS(boletos.reduce(function(total, boleto){ return total + numero(boleto.valor); }, 0)));
}

function alterarStatusBoleto(id, status){
    const base = obterBase();
    const boleto = (base.boletos || []).find(function(item){ return item.id === id; });
    if(!boleto) return;
    boleto.status = status;
    boleto.atualizadoEm = new Date().toISOString();
    if(status === "pago") boleto.pagoEm = boleto.atualizadoEm;
    base.contasReceber = Array.isArray(base.contasReceber) ? base.contasReceber : [];
    base.contasReceber.forEach(function(conta){
        if(conta.boletoId === id) conta.status = status === "pago" ? "pago" : conta.status;
    });
    salvarBase(base);
    renderizarBoletos();
}

function reimprimirBoleto(id){
    const boleto = (obterBase().boletos || []).find(function(item){ return item.id === id; });
    if(!boleto) return;
    const janela = window.open("", "_blank");
    if(!janela){
        notificar("Nao foi possivel abrir a reimpressao.", "aviso");
        return;
    }
    janela.document.write(`<!DOCTYPE html><html><head><title>Boleto ${escapar(boleto.numero)}</title><style>
        body{font-family:Arial,sans-serif;padding:30px;color:#111827}
        .box{border:1px solid #111827;padding:18px;margin-bottom:14px}
        h1{font-size:24px;margin:0 0 16px}
        strong{display:block;margin-bottom:5px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}
    </style></head><body>
        <h1>Reimpressao de Boleto</h1>
        <div class="box"><strong>Numero</strong>${escapar(boleto.numero || "-")}</div>
        <div class="box"><strong>Cliente</strong>${escapar(boleto.clienteNome || "-")}</div>
        <div class="box"><strong>Vencimento</strong>${escapar(formatarDataSimples(boleto.vencimento))}</div>
        <div class="box"><strong>Valor</strong>${escapar(formatarMoeda(boleto.valor))}</div>
        <table><thead><tr><th>Produto</th><th>Qtd.</th><th>Valor</th></tr></thead><tbody>${(boleto.itens || []).map(function(item){
            return `<tr><td>${escapar(item.descricao)}</td><td>${formatarQuantidade(item.quantidade)}</td><td>${formatarMoeda(item.valorTotal)}</td></tr>`;
        }).join("")}</tbody></table>
        <script>window.print();<\/script>
    </body></html>`);
    janela.document.close();
}

function abrirCriarCobranca(){
    document.getElementById("modalCriarCobranca")?.classList.remove("recolhido");
    document.body.style.overflow = "hidden";
}

function fecharCriarCobranca(){
    document.getElementById("modalCriarCobranca")?.classList.add("recolhido");
    document.body.style.overflow = "";
}

function limparFormulario(){
    itensCobranca = [];
    produtoSelecionadoBoleto = null;
    clienteSelecionadoBoleto = null;
    ["buscaClienteBoleto","buscaProdutoBoleto","boletoNossoNumero","boletoObservacao"].forEach(function(id){ definirValor(id, ""); });
    definirValor("boletoQuantidade", "1");
    definirValor("boletoValor", "0");
    definirValor("boletoParcelas", "1");
    definirValor("boletoVencimento", new Date().toISOString().slice(0, 10));
    document.getElementById("resultadoProdutosBoleto")?.classList.add("recolhido");
    document.getElementById("resultadoClientesBoleto")?.classList.add("recolhido");
    const radioBoleto = document.getElementById("modoApenasBoleto");
    if(radioBoleto) radioBoleto.checked = true;
    atualizarLabelEmissao();
    renderizarItens();
    renderizarParcelas();
}

function coletarParcelas(){
    const datas = Array.from(document.querySelectorAll(".data-parcela"));
    const parcelas = Math.max(1, datas.length || 1);
    const total = totalItens();
    const valorBase = arredondar(total / parcelas);
    return datas.map(function(input, index){
        return {
            vencimento:input.value,
            valor:index === parcelas - 1 ? arredondar(total - valorBase * (parcelas - 1)) : valorBase
        };
    });
}

function obterClientes(){
    return (obterBase().clientes || []).filter(function(cliente){ return cliente.ativo !== false; });
}

function obterProdutos(){
    return (obterBase().mercadorias || []).filter(function(produto){ return produto.ativo !== false; });
}

function obterClienteSelecionado(){
    return clienteSelecionadoBoleto;
}

function precoProduto(produto){
    return numero(produto.precoPromocional) > 0 ? numero(produto.precoPromocional) : numero(produto.precoVenda);
}

function totalItens(){
    return itensCobranca.reduce(function(total, item){ return total + numero(item.valorTotal); }, 0);
}

function montarPayloadApi(numeroBoleto, cliente, itens, valor, vencimento, observacao){
    return {
        numeroDocumento:numeroBoleto,
        sacado:{
            id:cliente.id,
            nome:cliente.nome || "",
            documento:cliente.cpf || cliente.cnpj || cliente.documento || "",
            email:cliente.email || "",
            telefone:cliente.telefone || ""
        },
        itens:itens.map(function(item){
            return {
                produtoId:item.produtoId,
                descricao:item.descricao,
                quantidade:item.quantidade,
                valorUnitario:item.valorUnitario,
                valorTotal:item.valorTotal
            };
        }),
        valor,
        vencimento,
        observacao,
        especie:"DM",
        aceite:"N",
        moeda:"BRL"
    };
}

function obterConfiguracaoBoleto(){
    const cfg = window.ConfiguracoesSistema && typeof window.ConfiguracoesSistema.obter === "function" ? window.ConfiguracoesSistema.obter() : {};
    const provedor = cfg.fiscalBoletoApiProvedor || cfg.boletoApiProvedor || "";
    const url = cfg.fiscalBoletoApiUrl || cfg.boletoApiUrl || "";
    const token = cfg.fiscalBoletoApiToken || cfg.boletoApiToken || "";
    return { provedor, url, token, configurada:Boolean(provedor && url && token) };
}

function usuarioAtualBoleto(){
    if(window.AuthSistema && typeof window.AuthSistema.usuarioAtual === "function") return window.AuthSistema.usuarioAtual() || {};
    return {};
}

function proximoNumeroBoleto(boletos, posicao){
    const ano = new Date().getFullYear();
    const numero = posicao || ((boletos || []).length + 1);
    return "BOL-" + ano + "-" + String(numero).padStart(6, "0");
}

function descreverItens(itens){
    itens = Array.isArray(itens) ? itens : [];
    if(!itens.length) return "-";
    const nomes = itens.slice(0, 2).map(function(item){ return item.descricao; }).join(", ");
    return itens.length > 2 ? nomes + " +" + (itens.length - 2) : nomes;
}

function rotuloStatus(status){
    return { gerado:"Gerado", aberto:"Em aberto", pago:"Pago", cancelado:"Cancelado" }[status] || "Gerado";
}

function rotuloIntegracao(status){
    return { aguardando_envio:"Aguardando API", pendente_configuracao:"Configurar API", enviado:"Enviado", erro:"Erro" }[status] || "Pendente";
}

function statusIntegracaoClasse(status){
    if(status === "enviado") return "pago";
    if(status === "erro") return "erro";
    if(status === "aguardando_envio") return "gerado";
    return "aberto";
}

function formatarDataHora(valor){
    if(!valor) return "-";
    const data = new Date(valor);
    if(Number.isNaN(data.getTime())) return "-";
    return data.toLocaleString("pt-BR");
}

function formatarDataSimples(valor){
    if(!valor) return "-";
    const partes = String(valor).slice(0, 10).split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : valor;
}

function somarMeses(dataIso, meses){
    const partes = String(dataIso || "").split("-").map(Number);
    const data = partes.length === 3 ? new Date(partes[0], partes[1] - 1, partes[2]) : new Date();
    data.setMonth(data.getMonth() + meses);
    return data.toISOString().slice(0, 10);
}

function ordenarBoletosDesc(a, b){
    return new Date(b.criadoEm || b.dataHora || 0) - new Date(a.criadoEm || a.dataHora || 0);
}

function arredondar(valor){
    return Math.round(numero(valor) * 100) / 100;
}
