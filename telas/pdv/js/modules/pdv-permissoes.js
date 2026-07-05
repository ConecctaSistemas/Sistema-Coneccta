// pdv-permissoes.js
// Checagem de permissão de usuário/vendedor e de recursos/funcionalidades habilitadas por configuração.
// Extraído de pdvapp.js (arquivo antigo, ver telas/pdv/pdvapp.js.bak) — funções mantidas com o mesmo nome e corpo original.

// Habilita/oculta o botão de guardar venda conforme configuração.
function atualizarRecursoGuardarVendas(){
    const permitido = recursoGuardarVendasAtivo() && usuarioTemPermissaoSistema("pdvGuardarVendas");
    document.querySelectorAll('[data-comando-caixa="guardar"]').forEach(function(botao) {
        botao.disabled = !permitido;
        botao.classList.toggle("desabilitado", !permitido);
        botao.title = permitido ? "" : "Guardar vendas está desativado nas configurações.";
    });
}

// Habilita/oculta o recurso de orçamento conforme configuração.
function atualizarRecursoOrcamentoPdv(){
    const habilitado = obterConfiguracoesSistema().permitirOrcamentoPdv === true;
    const btnOrc = document.getElementById("btnOrcamentoPdv");
    if(btnOrc) btnOrc.style.display = habilitado ? "" : "none";
    // "Importar Orçamento" fica sempre visível no painel de opções
}

// Habilita/oculta o recurso de importar pedido de venda.
function atualizarRecursoPedidosVendaPdv(){
    const habilitado = obterConfiguracoesSistema().pedidosVendaHabilitado !== false;
    const btn = document.querySelector('[data-comando-caixa="importarPedido"]');
    if(btn) btn.style.display = habilitado ? "" : "none";
}

// Indica se o recurso de guardar vendas está ativo.
function recursoGuardarVendasAtivo(){
    return obterConfiguracoesSistema().permitirGuardarVendas !== false;
}

// Indica se a seleção de vendedor é obrigatória.
function vendedorObrigatorioPdv(){
    const cfg = obterConfiguracoesSistema();
    return cfg.usarVendedor === true && cfg.pdvNaoObrigarVendedor !== true;
}

// Atualiza a interface conforme a exigência de vendedor.
function atualizarRecursoVendedorPdv(){
    const cfg = obterConfiguracoesSistema();
    const grupo = document.getElementById("grupoVendedorPdv");
    const select = document.getElementById("vendedorPdv");
    if(!grupo || !select) return;

    grupo.style.display = "";
    const base = obterBase();
    const usuario = window.AuthSistema?.usuarioAtual?.() || {};
    const podeMudar = cfg.usarVendedor && usuarioTemPermissaoSistema("alterarVendedor");
    const usuarioAtual = (base.usuarios || []).find(function(u){
        return normalizar(u.login) === normalizar(usuario.login);
    }) || usuario;

    const anterior = select.value;
    const opcoes = cfg.usarVendedor ? (base.usuarios || []) : [usuarioAtual];
    select.innerHTML = opcoes.map(function(u){
            return '<option value="' + escapar(u.login) + '">' + escapar(u.nome || u.login) + '</option>';
        }).join("");

    if(!podeMudar){
        vendedorPdvAtual = usuarioAtual?.login ? {
            login: usuarioAtual.login,
            nome: usuarioAtual.nome || usuarioAtual.login
        } : null;
        select.value = vendedorPdvAtual?.login || "";
        select.disabled = true;
    } else {
        select.disabled = false;
        select.value = vendedorPdvAtual?.login || anterior;
        if(!select.value && usuarioAtual?.login){
            vendedorPdvAtual = {
                login: usuarioAtual.login,
                nome: usuarioAtual.nome || usuarioAtual.login
            };
            select.value = vendedorPdvAtual.login;
        }
    }

    select.onchange = function(){
        if(!podeMudar) return;
        const u = (obterBase().usuarios || []).find(function(x){ return x.login === select.value; });
        vendedorPdvAtual = select.value ? { login: select.value, nome: u ? (u.nome || u.login) : select.value } : null;
        atualizarOperadorLogadoPdv();
    };

    atualizarOperadorLogadoPdv();
}

// Delega a auth.js a checagem de permissão do usuário logado.
function usuarioTemPermissaoSistema(permissao){
    return window.SistemaCore ? window.SistemaCore.temPermissao(permissao) : false;
}

// Verifica se o usuário pode abrir a busca rápida de preço.
function podeAbrirBuscaPrecoPdv(){
    const popupPixAberto = !document.getElementById("popupPixPagamento")?.classList.contains("oculto");
    const ajustesAberto = document.getElementById("overlayAjustes")?.classList.contains("ativo");
    const modalAberto = Boolean(document.querySelector(".modal-pdv.aberto"));
    const painelPesquisaAberto = document.getElementById("painelPesquisaMercadoria")?.classList.contains("aberto");
    const modalQtdAberto = document.getElementById("modalQtdPesquisa")?.classList.contains("ativo");
    const modalAberturaCaixa = document.getElementById("modalAberturaCaixa");
    const aberturaCaixaAberta = modalAberturaCaixa && getComputedStyle(modalAberturaCaixa).display !== "none";
    return !popupPixAberto && !ajustesAberto && !modalAberto && !painelPesquisaAberto && !modalQtdAberto && !aberturaCaixaAberta;
}

