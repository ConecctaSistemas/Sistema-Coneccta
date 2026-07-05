// pdv-impressao.js
// Impressão 80mm (cupom, fechamento, vale, orçamento, comprovante de entrega), reimpressões e emissão de NFC-e.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Imprime o relatório de fechamento de caixa em 80mm.
function imprimirFechamentoCaixa80mm(fechamento){
    const cfg = _cfgImpressora();
    const resumo = calcularResumoFechamentoCaixa();

    const formasPag = Object.entries(resumo.porFormaPagamento || {})
        .sort(function(a, b){ return b[1] - a[1]; })
        .map(function(par){
            return `<tr><td>${escapar(par[0])}</td><td>${formatarMoedaRS(par[1])}</td></tr>`;
        }).join("") || `<tr><td colspan="2">Nenhuma venda</td></tr>`;

    const corpo = `
${cabecalhoEmpresaImpressaoPdv()}
<div class="center">Fechamento do Caixa</div>
<div class="div-sep"></div>
<div>Operador: ${escapar(fechamento.operador)}</div>
<div>Data    : ${formatarData(fechamento.data)}</div>
<div class="div-sep"></div>
<table>
<tr><td>Abertura</td><td>${formatarMoedaRS(fechamento.valorAbertura)}</td></tr>
<tr><td>Total vendas</td><td>${formatarMoedaRS(fechamento.totalVendas)}</td></tr>
<tr><td>Suprimentos</td><td>${formatarMoedaRS(fechamento.suprimentos)}</td></tr>
<tr><td>Sangrias</td><td>- ${formatarMoedaRS(fechamento.sangrias)}</td></tr>
<tr><td>Canceladas</td><td>- ${formatarMoedaRS(fechamento.totalCanceladas)}</td></tr>
<tr><td class="total">Saldo estimado</td><td class="total">${formatarMoedaRS(fechamento.saldo)}</td></tr>
</table>
<div class="div-sep"></div>
<div class="negrito">Por forma de pagamento</div>
<table>${formasPag}</table>
<div class="div-sep"></div>
<table>
<tr><td>Qtd. vendas</td><td>${fechamento.quantidadeVendas}</td></tr>
<tr><td>Qtd. canceladas</td><td>${fechamento.quantidadeCanceladas}</td></tr>
<tr><td>Movimentos</td><td>${fechamento.quantidadeMovimentos}</td></tr>
</table>
<div class="div-sep"></div>
<div class="center">Conferido e encerrado</div>`;

    _abrirJanelaImpressao(cfg, "Fechamento do Caixa", corpo);
}

// Confirma a impressão do cupom após a venda.
function confirmarImpressaoVenda(){
    return new Promise(function(resolve) {
        const overlay = document.getElementById("confirmacaoImpressaoVenda");
        const btnSim = document.getElementById("btnSimImprimirVenda");
        const btnNao = document.getElementById("btnNaoImprimirVenda");

        if(!overlay || !btnSim || !btnNao){
            resolve(true);
            return;
        }

        let resolvido = false;

        function finalizar(valor){
            if(resolvido) return;
            resolvido = true;
            overlay.classList.remove("ativo");
            overlay.setAttribute("aria-hidden", "true");
            btnSim.removeEventListener("click", imprimir);
            btnNao.removeEventListener("click", ignorar);
            document.removeEventListener("keydown", teclado);
            setTimeout(function(){ resolve(valor); }, 120);
        }

        function imprimir(){ finalizar(true); }
        function ignorar(){ finalizar(false); }
        function teclado(evento){
            if(evento.key === "Escape") finalizar(false);
            if(evento.key === "Enter") finalizar(true);
        }

        btnSim.addEventListener("click", imprimir);
        btnNao.addEventListener("click", ignorar);
        overlay.classList.add("ativo");
        overlay.setAttribute("aria-hidden", "false");
        // Adicionado após o tick atual para não capturar o mesmo Enter que finalizou a venda
        setTimeout(function(){
            document.addEventListener("keydown", teclado);
            btnSim.focus();
        }, 80);
    });
}

// Imprime o comprovante do vale de devolução.
function imprimirValePdv(vale){
    if(!vale) return;
    var cfgImpressora = _cfgImpressora();
    var dt      = new Date(vale.geradoEm || new Date()).toLocaleString("pt-BR");
    var valor   = formatarMoedaRS(vale.valor);
    var codigo  = vale.codigo || "—";

    var linhas  = "=".repeat(36);
    var w = window.open("", "_blank", "width=" + cfgImpressora.winW + ",height=520,toolbar=0,menubar=0,scrollbars=1");
    if(!w){ alert("Habilite pop-ups para imprimir o vale."); return; }

    w.document.write("<!DOCTYPE html><html lang=\"pt-BR\"><head>"
        + "<meta charset=\"UTF-8\"><title>Vale de Crédito</title>"
        + "<style>"
        + "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }"
        + "@page { size: " + cfgImpressora.page + "; margin: 0; }"
        + "html, body { width: " + cfgImpressora.page + "; margin: 0; padding: 0; background: #fff; }"
        + "body { font-family: 'Courier New', Courier, monospace; font-size: 12px;"
        + "  padding: " + cfgImpressora.padding + "; color: #111; }"
        + ".linha-solida { border-top: 1px solid #000; margin: 8px 0; }"
        + ".linha-tracejada { border-top: 1px dashed #555; margin: 8px 0; }"
        + ".c { text-align: center; }"
        + ".negrito { font-weight: bold; }"
        + ".titulo { font-size: 16px; font-weight: bold; margin: 6px 0 2px; letter-spacing: .04em; }"
        + ".subtitulo { font-size: 11px; color: #444; }"
        + ".valor-grande { font-size: 34px; font-weight: 900; margin: 10px 0; letter-spacing: .02em; }"
        + ".codigo-box { font-size: 15px; font-weight: bold; letter-spacing: 3px;"
        + "  border: 2px solid #000; padding: 8px 12px; display: inline-block;"
        + "  margin: 6px 0; border-radius: 4px; word-break: break-all; }"
        + ".obs { font-size: 10.5px; color: #555; margin-top: 4px; line-height: 1.5; }"
        + ".rodape { font-size: 10px; color: #888; margin-top: 10px; }"
        + "@media print { body { width: " + cfgImpressora.page + "; padding: " + cfgImpressora.padding + "; } }"
        + "</style>"
        + "</head><body>"
        + "<div class=\"c\">"
        + cabecalhoEmpresaImpressaoPdv()
        + "<div class=\"linha-solida\"></div>"
        + "<p class=\"negrito\" style=\"font-size:13px; margin:4px 0;\">*** VALE DE CRÉDITO ***</p>"
        + "<div class=\"linha-tracejada\"></div>"
        + "<p class=\"subtitulo\">Emitido em: " + dt + "</p>"
        + "<p class=\"valor-grande\">" + valor + "</p>"
        + "<div class=\"linha-tracejada\"></div>"
        + "<p class=\"subtitulo\" style=\"margin-bottom:4px;\">Código do vale:</p>"
        + "<div class=\"codigo-box\">" + codigo + "</div>"
        + "<div class=\"linha-tracejada\"></div>"
        + "<p class=\"obs\">• Válido para uso em qualquer compra neste estabelecimento.</p>"
        + "<p class=\"obs\">• Não acumulável com outras promoções.</p>"
        + "<p class=\"obs\">• Guarde este comprovante para resgate.</p>"
        + "<div class=\"linha-solida\"></div>"
        + "<p class=\"rodape\">Venda origem: " + (vale.vendaOrigemId || "—") + "</p>"
        + "</div>"
        + "<script>(function(){"
        + "var larguraPapel='" + cfgImpressora.page + "';"
        + "function ajustar(){var corpo=document.body;var alturaPx=Math.ceil(corpo.getBoundingClientRect().height||corpo.scrollHeight||0);var alturaMm=Math.max(40,Math.ceil(alturaPx*25.4/96)+4);var estilo=document.createElement('style');estilo.textContent='@page{size:'+larguraPapel+' '+alturaMm+'mm;margin:0;}html,body{width:'+larguraPapel+';height:auto;margin:0;padding:0;}';document.head.appendChild(estilo);}"
        + "function imprimir(){ajustar();window.focus();window.print();}"
        + "window.addEventListener('afterprint',function(){window.close();});"
        + "window.onload=function(){setTimeout(imprimir,300);};"
        + "})();<\/script>"
        + "</body></html>"
    );
    w.document.close();
}

// Reimprime a última venda registrada no caixa.
function reimprimirUltimaVendaPdv(){
    const venda = obterBase().vendas.slice().sort(function(a, b) {
        return new Date(b.data) - new Date(a.data);
    })[0];

    if(!venda){
        alert("Nenhuma venda encontrada para reimprimir.");
        return;
    }

    imprimirVenda80mm(venda);
}

// Imprime a lista de pendências do cliente.
function imprimirPendenciasRecebimentoPdv(){
    if(!clienteRecebimentoPdvAtual){
        alert("Abra um cliente antes de imprimir.");
        return;
    }

    const base = obterBase();
    const cliente = base.clientes.find(function(item) {
        return item.id === clienteRecebimentoPdvAtual;
    });
    const pendencias = contasRecebimentoPendentes(base).filter(function(conta) {
        return conta.clienteId === clienteRecebimentoPdvAtual;
    });

    if(pendencias.length === 0){
        alert("Este cliente não possui pendências para imprimir.");
        return;
    }

    const total = pendencias.reduce(function(soma, conta) {
        return soma + numero(conta.saldo);
    }, 0);
    const janela = window.open("", "_blank", "width=820,height=720");

    if(!janela){
        alert("Permita pop-ups para imprimir a lista de pendências.");
        return;
    }

    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Pendências ${escapar(cliente?.nome || pendencias[0].clienteNome)}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
                h1 { margin: 0; font-size: 22px; }
                p { color: #4b5563; }
                table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 13px; }
                th { background: #f3f4f6; }
                .total { margin-top: 18px; text-align: right; font-size: 18px; font-weight: 800; }
            </style>
        </head>
        <body>
            <h1>Lista de pendências - Crédito Loja</h1>
            <p>Cliente: ${escapar(cliente?.nome || pendencias[0].clienteNome)}</p>
            <table>
                <thead>
                    <tr>
                        <th>Venda</th>
                        <th>Documento</th>
                        <th>Emissão</th>
                        <th>Vencimento</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendencias.map(function(conta) {
                        return `
                            <tr>
                                <td>${escapar(conta.vendaId)}</td>
                                <td>${escapar(conta.documento)}</td>
                                <td>${formatarData(conta.data)}</td>
                                <td>${formatarData(conta.vencimento)}</td>
                                <td>${formatarMoedaRS(conta.saldo)}</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
            <div class="total">Total pendente: ${formatarMoedaRS(total)}</div>
            <script>window.onload = function(){ window.print(); }<\/script>
        </body>
        </html>
    `);
    janela.document.close();
}

// Transforma uma venda não fiscal já registrada em NFC-e.
async function transformarEmNfce(id){
    const configuracoes = obterConfiguracoesSistema();

    if(configuracoes.emitirNfce === false){
        notificar("A emissão NFC-e está desativada nas configurações.", "erro");
        return;
    }

    const confirmado = await confirmarTransformacaoNfce();
    if(!confirmado) return;

    const base = obterBase();
    const idx  = base.vendas.findIndex(function(v){ return v.id === id; });
    if(idx < 0) return;

    const serie  = configuracoes.fiscalSerieNfce  || "1";
    const numero = Number(configuracoes.fiscalProximoNfce || 1);

    base.vendas[idx].documento    = "NFC-e";
    base.vendas[idx].nfceSerie    = serie;
    base.vendas[idx].nfceNumero   = numero;
    base.vendas[idx].nfceAmbiente = configuracoes.fiscalAmbiente || "homologacao";
    base.vendas[idx].nfceStatus   = "pendente";
    base.vendas[idx].nfceChaveAcesso = null;
    base.vendas[idx].nfceQrCode      = null;
    base.vendas[idx].nfceProtocolo   = null;

    salvarBase(base);
    _incrementarSequenciaNfce(configuracoes);

    imprimirVenda80mm(base.vendas[idx]);

    renderizarMenuVendas();
    notificar("NFC-e nº " + numero + " (série " + serie + ") emitida e impressa.", "sucesso");
}

// Confirma a transformação de uma venda não fiscal em NFC-e.
function confirmarTransformacaoNfce(){
    return new Promise(function(resolve){
        const overlay = document.getElementById("confirmacaoNfcePdv");
        const btnSim  = document.getElementById("btnSimNfcePdv");
        const btnNao  = document.getElementById("btnNaoNfcePdv");

        if(!overlay || !btnSim || !btnNao){ resolve(true); return; }

        let resolvido = false;

        function finalizar(valor){
            if(resolvido) return;
            resolvido = true;
            overlay.classList.remove("ativo");
            overlay.setAttribute("aria-hidden", "true");
            btnSim.removeEventListener("click", confirmar);
            btnNao.removeEventListener("click", cancelar);
            document.removeEventListener("keydown", teclado);
            setTimeout(function(){ resolve(valor); }, 120);
        }

        function confirmar(){ finalizar(true); }
        function cancelar(){  finalizar(false); }
        function teclado(e){
            if(e.key === "Escape") finalizar(false);
            if(e.key === "Enter")  finalizar(true);
        }

        btnSim.addEventListener("click", confirmar);
        btnNao.addEventListener("click", cancelar);
        document.addEventListener("keydown", teclado);
        overlay.classList.add("ativo");
        overlay.setAttribute("aria-hidden", "false");
        setTimeout(function(){ btnSim.focus(); }, 80);
    });
}

// Reimprime uma venda registrada.
function reimprimirVenda(id){
    const venda = obterBase().vendas.find(function(item) {
        return item.id === id;
    });

    if(!venda){
        alert("Venda não encontrada.");
        return;
    }

    imprimirVenda80mm(venda);
}

// Reimprime o comprovante de uma venda cancelada.
function reimprimirVendaCancelada(id){
    const venda = obterBase().vendasCanceladas.find(function(item) {
        return item.id === id;
    });

    if(!venda){
        alert("Venda cancelada não encontrada.");
        return;
    }

    imprimirVenda80mm({ ...venda, documento: `${venda.documento || "Venda"} CANCELADA` });
}

// Obtém os dados da empresa usados na emissão/impressão.
function obterEmpresaPdv(){
    if(window.EmpresaSistema?.obter){
        return window.EmpresaSistema.obter();
    }

    const base = lerJson(BASE_KEY, {});
    const avulsa = lerJson("empresaSistema", {});
    return {
        nomeFantasia: "Coneccta Sistemas",
        razaoSocial: "Coneccta Sistemas",
        cnpj: "",
        endereco: "",
        numero: "",
        cidade: "",
        estado: "",
        cep: "",
        ...(avulsa || {}),
        ...(base.empresa || {})
    };
}

// Formata o endereço da empresa para impressão.
function formatarEnderecoEmpresaPdv(empresa){
    return [
        empresa.endereco,
        empresa.numero,
        empresa.cidade,
        empresa.estado,
        empresa.cep
    ].filter(Boolean).join(" - ");
}

// Monta os dados da empresa usados no cupom.
function obterDadosEmpresaImpressaoPdv(){
    const empresa = obterEmpresaPdv();
    const configuracoes = obterConfiguracoesSistema?.() || {};
    const razaoSocial = empresa.razaoSocial || configuracoes.razaoSocial || configuracoes.nomeEmpresa || "Coneccta Sistemas";
    const nomeFantasia = empresa.nomeFantasia || configuracoes.nomeFantasia || razaoSocial;

    return {
        nomeFantasia,
        razaoSocial,
        cnpj: empresa.cnpj || configuracoes.cnpj || configuracoes.cnpjEmpresa || configuracoes.fiscalCertificadoCnpj || "",
        endereco: empresa.endereco || configuracoes.endereco || "",
        numero: empresa.numero || configuracoes.numero || "",
        cidade: empresa.cidade || configuracoes.cidade || "",
        estado: empresa.estado || configuracoes.estado || configuracoes.uf || "",
        cep: empresa.cep || configuracoes.cep || ""
    };
}

// Monta o cabeçalho impresso com os dados da empresa.
function cabecalhoEmpresaImpressaoPdv(){
    const empresa = obterDadosEmpresaImpressaoPdv();
    const endereco = formatarEnderecoEmpresaPdv(empresa);

    return `
<h1>${escapar(empresa.nomeFantasia)}</h1>
<div class="center">Razão social: ${escapar(empresa.razaoSocial)}</div>
${empresa.cnpj ? `<div class="center">CNPJ: ${escapar(empresa.cnpj)}</div>` : ""}
${endereco ? `<div class="center">Endereço: ${escapar(endereco)}</div>` : ""}`;
}

// Lê a configuração da impressora térmica.
function _cfgImpressora(){
    const largura = obterConfiguracoesSistema().impressoraLargura || "80mm";
    if(largura === "55mm"){
        return {
            page:    "55mm",
            padding: "2mm 3mm",
            font:    "8pt",
            h1:      "10pt",
            h2:      "8pt",
            total:   "10pt",
            winW:    260
        };
    }
    // 80mm — padrão (Epson TM-T20X e similares)
    return {
        page:    "80mm",
        padding: "2mm 4mm",
        font:    "9pt",
        h1:      "13pt",
        h2:      "9pt",
        total:   "13pt",
        winW:    370
    };
}

// Monta o CSS usado na janela de impressão 80mm.
function _cssImpressora(cfg){
    return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page {
            size: ${cfg.page};
            margin: 0;
        }
        html, body {
            width: ${cfg.page};
            margin: 0;
            padding: 0;
            font-family: "Courier New", Courier, monospace;
            font-size: ${cfg.font};
            color: #000 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .cupom {
            width: 100%;
            display: block;
            padding: ${cfg.padding};
            break-inside: avoid;
            page-break-inside: avoid;
        }
        h1 { font-size: ${cfg.h1}; text-align: center; margin-bottom: 2pt; }
        h2 { font-size: ${cfg.h2}; text-align: center; font-weight: 400; margin-bottom: 3pt; }
        .div-sep { border-top: 1px dashed #000; margin: 3pt 0; }
        table { width: 100%; border-collapse: collapse; break-inside: avoid; page-break-inside: avoid; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        td { padding: 1pt 0; vertical-align: top; }
        td:last-child { text-align: right; }
        .negrito { font-weight: 700; }
        .total { font-size: ${cfg.total}; font-weight: 800; }
        .center { text-align: center; }
        .r { text-align: right; }
        .desc { font-weight: 700; }
        .acr { font-weight: 700; }
        .tab-label { font-size: 0.85em; padding-left: 4pt; opacity: .8; }
        .linha-total td { font-size: ${cfg.total}; font-weight: 800; border-top: 1px solid #000; padding-top: 2pt; }
        thead th { font-weight: 700; border-bottom: 1px dashed #000; padding-bottom: 2pt; }
        thead th:last-child { text-align: right; }
        thead th:nth-child(2) { text-align: right; }
        @media screen {
            body { background: #e5e7eb !important; padding: 8pt; }
            .cupom { background: #fff; display: inline-block; min-width: ${cfg.page}; }
        }
    `;
}

// Monta o script auxiliar da janela de impressão.
function _scriptImpressora(cfg){
    return `<script>
        (function(){
            var larguraPapel = ${JSON.stringify(cfg.page)};
            function mmPorPixel(px){
                return px * 25.4 / 96;
            }
            function ajustarAlturaPagina(){
                var cupom = document.querySelector(".cupom");
                if(!cupom) return;
                var alturaPx = Math.ceil(cupom.getBoundingClientRect().height || cupom.scrollHeight || 0);
                var alturaMm = Math.max(40, Math.ceil(mmPorPixel(alturaPx)) + 4);
                var estilo = document.getElementById("paginaTermicaDinamica");
                if(!estilo){
                    estilo = document.createElement("style");
                    estilo.id = "paginaTermicaDinamica";
                    document.head.appendChild(estilo);
                }
                estilo.textContent = "@page{size:" + larguraPapel + " " + alturaMm + "mm;margin:0;}html,body{width:" + larguraPapel + ";height:auto;margin:0;padding:0;}.cupom{break-inside:avoid;page-break-inside:avoid;}";
            }
            function imprimir(){
                ajustarAlturaPagina();
                window.print();
            }
            window.addEventListener("afterprint", function(){ window.close(); });
            if(document.readyState === "complete"){ setTimeout(imprimir, 300); }
            else { window.addEventListener("load", function(){ setTimeout(imprimir, 300); }); }
        })();
    <\/script>`;
}

// Abre a janela de impressão com o conteúdo montado.
function _abrirJanelaImpressao(cfg, titulo, corpo){
    const janela = window.open("", "_blank", `width=${cfg.winW},height=700,toolbar=0,scrollbars=1`);
    if(!janela){
        alert("Permita pop-ups para imprimir o cupom.");
        return;
    }
    janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<title>${titulo}</title>
<style>${_cssImpressora(cfg)}</style>
</head>
<body>
<div class="cupom">
${corpo}
</div>
${_scriptImpressora(cfg)}
</body>
</html>`);
    janela.document.close();
}

// Imprime o cupom da venda em 80mm.
function imprimirVenda80mm(venda){
    const cfg = _cfgImpressora();
    const cliente = venda.cliente?.nome || "Consumidor";
    const usuarioVenda = venda.usuarioNome || venda.usuarioLogin || "Usuário";
    const vendedorVenda = venda.vendedorNome || venda.vendedorLogin || usuarioVenda;
    const entrega = venda.entrega || null;
    const enderecoEntrega = formatarEnderecoEntregaPdv(entrega);

    const linhas = venda.itens.map(function(item){
        const tabLabel = item.tabelaNome ? `<tr><td colspan="3" class="tab-label">Tabela: ${escapar(item.tabelaNome)}</td></tr>` : "";
        const precoAlterado = item.precoOriginal && Number(item.precoOriginal) !== Number(item.precoUnitario);
        const precoCell = precoAlterado
            ? `<s>${formatarMoedaRS(item.precoOriginal)}</s> ${formatarMoedaRS(item.precoUnitario)}`
            : formatarMoedaRS(item.precoUnitario);
        return `<tr><td colspan="3">${escapar(item.descricao)}</td></tr>
${tabLabel}<tr><td>${formatarQuantidadeItem(item)}</td><td>${precoCell}</td><td>${formatarMoedaRS(item.total)}</td></tr>`;
    }).join("");

    const ajuste = numero(venda.ajusteFormaPagamento) || 0;
    const ajustePerc = numero(venda.ajustePercFormaPagamento) || 0;
    const percAbs = Math.abs(ajustePerc) % 1 !== 0
        ? Math.abs(ajustePerc).toFixed(2)
        : String(Math.abs(ajustePerc));
    const labelAjuste = ajuste < 0
        ? `Desconto ${escapar(venda.pagamento)} (${percAbs}%)`
        : `Acréscimo ${escapar(venda.pagamento)} (${percAbs}%)`;

    const pagamentosHtml = Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0
        ? venda.pagamentos.map(function(pagamento) {
            return `<div>Pgto    : ${escapar(pagamento.forma)} ${formatarMoedaRS(pagamento.valor)}</div>`;
        }).join("")
        : `<div>Pgto    : ${escapar(venda.pagamento)}</div>`;

    const corpo = `
${cabecalhoEmpresaImpressaoPdv()}
<h2>${escapar(venda.documento)}</h2>
<div class="div-sep"></div>
<div>Venda   : ${escapar(venda.id)}</div>
<div>Data    : ${new Date(venda.data).toLocaleString("pt-BR")}</div>
<div>Cliente : ${escapar(cliente)}</div>
<div>Operador: ${escapar(usuarioVenda)}</div>
${vendedorVenda !== usuarioVenda ? `<div>Vendedor: ${escapar(vendedorVenda)}</div>` : ""}
${pagamentosHtml}
${entrega ? `
<div class="div-sep"></div>
<div class="negrito">ENTREGA</div>
<div>Dest.: ${escapar(entrega.destinatario || cliente)}</div>
${entrega.telefone ? `<div>Tel.: ${escapar(entrega.telefone)}</div>` : ""}
<div>End.: ${escapar(enderecoEntrega)}</div>
${entrega.observacoes ? `<div>Obs.: ${escapar(entrega.observacoes)}</div>` : ""}
` : ""}
<div class="div-sep"></div>
<table>
<thead><tr><th>Descrição</th><th>Unit.</th><th>Total</th></tr></thead>
${linhas}
</table>
<div class="div-sep"></div>
<table>
<tr><td>Subtotal</td><td class="r">${formatarMoedaRS(venda.subtotal ?? venda.total)}</td></tr>
${numero(venda.desconto) > 0 ? `<tr><td>Desconto</td><td class="r desc">- ${formatarMoedaRS(venda.desconto)}</td></tr>` : ""}
${ajuste !== 0 ? `<tr><td>${labelAjuste}</td><td class="r ${ajuste < 0 ? "desc" : "acr"}">${ajuste < 0 ? "- " : "+ "}${formatarMoedaRS(Math.abs(ajuste))}</td></tr>` : ""}
<tr class="linha-total"><td>TOTAL</td><td class="r">${formatarMoedaRS(venda.total)}</td></tr>
${venda.valorRecebido > 0 ? `<tr><td>Recebido</td><td class="r">${formatarMoedaRS(venda.valorRecebido)}</td></tr>
<tr><td class="negrito">Troco</td><td class="r negrito">${formatarMoedaRS(venda.troco || 0)}</td></tr>` : ""}
</table>
<div class="div-sep"></div>
<div class="center">Obrigado pela preferência!</div>`;

    _abrirJanelaImpressao(cfg, `${venda.documento} ${venda.id}`, corpo);
}

// Imprime o comprovante de entrega em 80mm.
function imprimirComprovanteEntrega80mm(venda){
    const cfg = _cfgImpressora();
    const empresa = obterDadosEmpresaImpressaoPdv();
    const entrega = venda.entrega || {};
    const cliente = venda.cliente?.nome || entrega.destinatario || "Consumidor";
    const documentoCliente = venda.cliente?.cpfCnpj || venda.cliente?.cpf_cnpj || venda.cliente?.cnpj || venda.cliente?.cpf || "";
    const enderecoEntrega = formatarEnderecoEntregaPdv(entrega);
    const pagamentosHtml = Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0
        ? venda.pagamentos.map(function(pagamento) {
            return `<div>Pgto: ${escapar(pagamento.forma)} ${formatarMoedaRS(pagamento.valor)}</div>`;
        }).join("")
        : `<div>Pgto: ${escapar(venda.pagamento || "Nao informado")}</div>`;

    const linhas = (venda.itens || []).map(function(item){
        return `<tr><td colspan="3">${escapar(item.descricao)}</td></tr>
<tr><td>${formatarQuantidadeItem(item)}</td><td>${formatarMoedaRS(item.precoUnitario)}</td><td>${formatarMoedaRS(item.total)}</td></tr>`;
    }).join("");

    const corpo = `
<h1>${escapar(empresa.nomeFantasia || empresa.razaoSocial || "Empresa")}</h1>
${empresa.cnpj ? `<div class="center">CNPJ: ${escapar(empresa.cnpj)}</div>` : ""}
<div class="div-sep"></div>
<h2>*** COMPROVANTE DE ENTREGA ***</h2>
<div class="div-sep"></div>
<div class="negrito">DADOS DA VENDA</div>
<div>Venda: ${escapar(venda.id)}</div>
<div>Data : ${new Date(venda.data).toLocaleString("pt-BR")}</div>
<div class="div-sep"></div>
<div class="negrito">CLIENTE</div>
<div>Nome: ${escapar(cliente)}</div>
${documentoCliente ? `<div>CPF/CNPJ: ${escapar(documentoCliente)}</div>` : ""}
<div>Entregar a: ${escapar(entrega.destinatario || cliente)}</div>
${entrega.telefone ? `<div>Telefone: ${escapar(entrega.telefone)}</div>` : ""}
<div class="div-sep"></div>
<div class="negrito">ENDERECO DE ENTREGA</div>
<div>${escapar(enderecoEntrega || entrega.endereco || "")}</div>
${entrega.observacoes ? `<div>Obs.: ${escapar(entrega.observacoes)}</div>` : ""}
<div class="div-sep"></div>
<div class="negrito">ITENS DA COMPRA</div>
<table>
<thead><tr><th>Descricao</th><th>Unit.</th><th>Total</th></tr></thead>
${linhas}
</table>
<div class="div-sep"></div>
<div class="negrito">FORMA DE PAGAMENTO</div>
${pagamentosHtml}
<table>
<tr class="linha-total"><td>TOTAL</td><td class="r">${formatarMoedaRS(venda.total)}</td></tr>
</table>
<div class="div-sep"></div>
<div>Recebedor:</div>
<br><br>
<div class="div-sep"></div>
<div class="center">Assinatura / Documento</div>`;

    _abrirJanelaImpressao(cfg, `Entrega ${venda.id}`, corpo);
}

// Emite a NFC-e via webservice fiscal.
function emitirNfceViaWebservice(vendaId, venda, config){
    const url = (config.fiscalWebserviceUrl || "").trim();
    if(!url){
        _atualizarFiscalVenda(vendaId, { nfceStatus: "sem_webservice" });
        return;
    }

    const empresa = window.EmpresaSistema?.obter?.() || {};
    const token   = sessionStorage.getItem("tokenApiSistema") || localStorage.getItem("tokenApiSistema") || null;

    const payload = {
        certificado: {
            conteudo: config.fiscalCertificadoConteudo || "",
            senha:    config.fiscalCertificadoSenha    || ""
        },
        ambiente:    config.fiscalAmbiente || "homologacao",
        idCsc:       config.fiscalIdCsc   || "",
        csc:         config.fiscalCsc     || "",
        emitente: {
            cnpj:                empresa.cnpj  || config.fiscalCertificadoCnpj || "",
            razaoSocial:         empresa.razaoSocial || "",
            nomeFantasia:        empresa.nomeFantasia || "",
            ie:                  config.fiscalInscricaoEstadual || "",
            im:                  empresa.inscricaoMunicipal || "",
            cnae:                config.fiscalCnae || "",
            regimeTributario:    config.fiscalCodigoRegimeTributario || "1",
            logradouro:          empresa.endereco  || "",
            numero:              empresa.numero    || "S/N",
            bairro:              empresa.bairro    || "",
            cidade:              empresa.cidade    || "",
            uf:                  empresa.estado    || config.fiscalUf || "",
            cep:                 empresa.cep       || "",
            codigoMunicipio:     config.fiscalCodigoMunicipio || ""
        },
        nfce: {
            serie:          Number(config.fiscalSerieNfce || 1),
            numero:         Number(config.fiscalProximoNfce || 1),
            dataEmissao:    venda.data,
            consumidorFinal: true,
            finalidade:     1,
            presencaComprador: 1,
            informacoesComplementares: config.fiscalInformacoesComplementares || "",
            itens: venda.itens.map(function(item, idx){
                return {
                    ordem:           idx + 1,
                    codigo:          item.codigo     || item.id,
                    descricao:       item.descricao  || "",
                    ncm:             item.ncm        || "00000000",
                    cest:            item.cest       || "",
                    cfop:            item.cfop       || config.fiscalCfopVendaEstadual || "5102",
                    unidade:         item.unidade    || "UN",
                    quantidade:      Number(item.qtd),
                    valorUnitario:   Number(item.precoUnitario),
                    valorTotal:      Number(item.total),
                    desconto:        0,
                    origemMercadoria: String(item.origem || config.fiscalOrigemMercadoriaPadrao || "0"),
                    cst:             item.cst        || "",
                    csosn:           item.csosn      || config.fiscalCsosnPadrao || "102",
                    cstPis:          item.cstPis     || config.fiscalCstPisPadrao || "49",
                    cstCofins:       item.cstCofins  || config.fiscalCstCofinsPadrao || "49",
                    aliquotaIcms:    Number(config.fiscalAliquotaIcmsPadrao || 0),
                    aliquotaPis:     Number(config.fiscalAliquotaPisPadrao  || 0),
                    aliquotaCofins:  Number(config.fiscalAliquotaCofinsPadrao || 0)
                };
            }),
            totais: {
                produtos:  Number(venda.subtotal),
                desconto:  Number(venda.desconto  || 0),
                totalNota: Number(venda.total)
            },
            pagamentos: _montarPagamentosNfce(venda),
            cliente: venda.cliente ? {
                nome: venda.cliente.nome || "Consumidor",
                cpf:  venda.cliente.cpf  || "",
                cnpj: venda.cliente.cnpj || ""
            } : null
        }
    };

    const headers = { "Content-Type": "application/json", "Accept": "application/json" };
    if(token) headers["Authorization"] = "Bearer " + token;

    fetch(url.replace(/\/$/, "") + "/nfce/emitir", {
        method:  "POST",
        headers: headers,
        body:    JSON.stringify(payload)
    })
    .then(function(res){
        return res.json().then(function(corpo){
            if(!res.ok){
                throw new Error(corpo.mensagem || corpo.message || "Erro " + res.status);
            }
            return corpo;
        });
    })
    .then(function(resp){
        const atualizado = {
            nfceStatus:      "autorizada",
            nfceChaveAcesso: resp.chaveAcesso || resp.chave || "",
            nfceQrCode:      resp.qrCode      || "",
            nfceProtocolo:   resp.protocolo   || resp.nProtocolo || "",
            nfceXml:         resp.xml         || ""
        };
        _atualizarFiscalVenda(vendaId, atualizado);
        _incrementarSequenciaNfce(config);
        mostrarAvisoSistema("NFC-e autorizada! Chave: " + (atualizado.nfceChaveAcesso || "").slice(-8));
    })
    .catch(function(err){
        console.error("[NFC-e] Falha na emissão:", err);
        _atualizarFiscalVenda(vendaId, {
            nfceStatus:  "erro",
            nfceErro:    err.message || String(err)
        });
        mostrarAvisoSistema("Erro ao emitir NFC-e: " + (err.message || "verifique as configurações fiscais."));
    });
}

// Monta o array de pagamentos exigido pelo webservice de NFC-e.
function _montarPagamentosNfce(venda){
    const MAP_PAGAMENTO = {
        "dinheiro":      "01",
        "cheque":        "02",
        "cartao credito":"03",
        "credito":       "03",
        "cartao debito": "04",
        "debito":        "04",
        "pix":           "17",
        "crediario":     "15",
        "credito loja":  "15",
        "vale alimentacao": "10",
        "vale refeicao":    "11"
    };

    function codigoPagamento(forma){
        const pag = normalizar(forma || "dinheiro");
        let tpag = "01";
        for(const [chave, codigo] of Object.entries(MAP_PAGAMENTO)){
            if(pag.includes(chave)){ tpag = codigo; break; }
        }
        return tpag;
    }

    if(Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0){
        return venda.pagamentos.map(function(pagamento) {
            return {
                tpag: codigoPagamento(pagamento.tipo || pagamento.forma),
                valor: Number(pagamento.valor)
            };
        });
    }

    const pag = normalizar(venda.pagamento || "dinheiro");
    return [{ tpag: codigoPagamento(pag), valor: Number(venda.total) }];
}

// Imprime o orçamento em 80mm.
function imprimirOrcamento80mm(orc){
    const cfg = _cfgImpressora();
    const cliente = orc.cliente?.nome || "Consumidor";
    const dataEmissao = new Date(orc.data).toLocaleString("pt-BR");
    const validade = new Date(new Date(orc.data).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR");

    const linhas = orc.itens.map(function(item){
        return `<tr><td colspan="3">${escapar(item.descricao)}</td></tr>
<tr><td>${formatarQuantidade(item.quantidade)} UN</td><td>${formatarMoedaRS(item.precoUnitario)}</td><td>${formatarMoedaRS(item.total)}</td></tr>`;
    }).join("");

    const corpo = `
${cabecalhoEmpresaImpressaoPdv()}
<div class="center negrito">*** ORCAMENTO ***</div>
<div class="div-sep"></div>
<div>N.    : ${orc.numero}</div>
<div>Data  : ${dataEmissao}</div>
<div>Client: ${escapar(cliente)}</div>
<div>Oper. : ${escapar(orc.usuarioNome)}</div>
<div class="div-sep"></div>
<table>${linhas}</table>
<div class="div-sep"></div>
<table>
<tr><td>Subtotal</td><td>${formatarMoedaRS(orc.subtotal ?? orc.total)}</td></tr>
${numero(orc.desconto) > 0 ? `<tr><td>Desconto</td><td>- ${formatarMoedaRS(orc.desconto)}</td></tr>` : ""}
<tr><td class="total">TOTAL</td><td class="total">${formatarMoedaRS(orc.total)}</td></tr>
</table>
<div class="div-sep"></div>
<div class="center">Sem valor fiscal. Valido ate ${validade}.</div>`;

    _abrirJanelaImpressao(cfg, `Orcamento N. ${orc.numero}`, corpo);
}

