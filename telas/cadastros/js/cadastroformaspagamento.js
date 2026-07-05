document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formFormaPagamento")?.addEventListener("submit", salvarFormaPagamento);
    document.getElementById("btnNovoFormaPagamento")?.addEventListener("click", novaFormaPagamento);
    document.getElementById("btnFecharModalFormaPagamento")?.addEventListener("click", fecharModalFormaPagamento);
    document.getElementById("modalFormaPagamento")?.addEventListener("click", function(evento) {
        if(evento.target === this) fecharModalFormaPagamento();
    });
    document.getElementById("btnLimparForma")?.addEventListener("click", limparFormularioForma);
    document.getElementById("listaFormasPagamento")?.addEventListener("click", tratarCliqueForma);
    document.getElementById("formaTipo")?.addEventListener("change", atualizarCamposCondicionaisForma);
    document.getElementById("formaUsarQrPix")?.addEventListener("change", atualizarCamposCondicionaisForma);
    document.getElementById("formaUsarIntegracaoCartao")?.addEventListener("change", atualizarCamposCondicionaisForma);
    document.addEventListener("keydown", function(evento) {
        if(evento.key === "Escape") fecharModalFormaPagamento();
    });
    atualizarCamposCondicionaisForma();
    renderizarFormasPagamento();

    if (window.ControleSaida) ControleSaida.ativarProtecaoCadastro();
});

function salvarFormaPagamento(evento){
    evento.preventDefault();

    const descricao = valorForma("formaDescricao");
    if(!descricao){
        alert("Informe a descricao da forma de pagamento.");
        document.getElementById("formaDescricao")?.focus();
        return;
    }

    const formas = window.FormasPagamentoSistema.obterTodas();
    const idAtual = valorForma("formaPagamentoId");
    const atalho = valorForma("formaAtalho");

    if(atalho){
        const conflito = formas.find(function(item) { return item.atalho === atalho && item.id !== idAtual; });
        if(conflito){
            alert(`A tecla ${atalho} já está em uso pela forma "${conflito.descricao}". Escolha outra tecla de atalho.`);
            document.getElementById("formaAtalho")?.focus();
            return;
        }
    }

    const forma = {
        id: idAtual || window.FormasPagamentoSistema.gerarId(descricao),
        descricao,
        codigoFiscal: valorForma("formaCodigoFiscal"),
        tipo: valorForma("formaTipo"),
        usarQrPix: document.getElementById("formaUsarQrPix").checked,
        chavePix: valorForma("formaChavePix"),
        usarIntegracaoCartao: document.getElementById("formaUsarIntegracaoCartao").checked,
        integracaoCartao: valorForma("formaIntegracaoCartao") || "pos",
        ativo: document.getElementById("formaAtiva").value === "true",
        aparecePdv: document.getElementById("formaAparecePdv").checked,
        apareceNfe: document.getElementById("formaApareceNfe").checked,
        atalho
    };

    const indice = formas.findIndex(function(item) { return item.id === forma.id; });
    if(indice >= 0){
        formas[indice] = forma;
    }else{
        formas.push(forma);
    }

    window.FormasPagamentoSistema.salvarTodas(formas);
    if (window.ControleSaida) ControleSaida.marcarSalvo();
    limparFormularioForma();
    renderizarFormasPagamento();
    fecharModalFormaPagamento();
}

function novaFormaPagamento(){
    limparFormularioForma();
    abrirModalFormaPagamento();
    document.getElementById("formaDescricao")?.focus();
}

function abrirModalFormaPagamento(){
    const modal = document.getElementById("modalFormaPagamento");
    if(!modal) return;
    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-forma-aberto");
}

function fecharModalFormaPagamento(){
    const modal = document.getElementById("modalFormaPagamento");
    if(!modal) return;
    modal.classList.remove("aberto");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-forma-aberto");
}

function renderizarFormasPagamento(){
    const formas = window.FormasPagamentoSistema.obterTodas();
    const destino = document.getElementById("listaFormasPagamento");
    document.getElementById("contadorFormasPagamento").textContent = `${formas.length} forma${formas.length === 1 ? "" : "s"}`;

    if(!destino) return;

    destino.innerHTML = formas.map(function(forma) {
        return `
            <tr>
                <td><strong>${escaparForma(forma.descricao)}</strong></td>
                <td>${escaparForma(forma.codigoFiscal || "-")}</td>
                <td>${forma.atalho ? `<span class="tag neutra">${escaparForma(forma.atalho)}</span>` : "-"}</td>
                <td><div class="uso-lista">${forma.aparecePdv !== false ? '<span class="tag">PDV</span>' : ""}${forma.apareceNfe !== false ? '<span class="tag">NF-e</span>' : ""}${tagExtraForma(forma)}</div></td>
                <td><span class="tag ${forma.ativo === false ? "inativa" : ""}">${forma.ativo === false ? "Inativa" : "Ativa"}</span></td>
                <td>
                    <div class="acoes-linha">
                        <button type="button" class="acao" data-acao-forma="editar" data-id="${escaparForma(forma.id)}">Editar</button>
                        <button type="button" class="acao perigo" data-acao-forma="excluir" data-id="${escaparForma(forma.id)}">Excluir</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function tratarCliqueForma(evento){
    const botao = evento.target.closest("[data-acao-forma]");
    if(!botao) return;

    if(botao.dataset.acaoForma === "editar"){
        editarForma(botao.dataset.id);
    }

    if(botao.dataset.acaoForma === "excluir"){
        excluirForma(botao.dataset.id);
    }
}

function editarForma(id){
    const forma = window.FormasPagamentoSistema.obterTodas().find(function(item) { return item.id === id; });
    if(!forma) return;

    document.getElementById("formaPagamentoId").value = forma.id;
    document.getElementById("formaDescricao").value = forma.descricao || "";
    document.getElementById("formaCodigoFiscal").value = forma.codigoFiscal || "99";
    document.getElementById("formaTipo").value = forma.tipo || "outros";
    document.getElementById("formaUsarQrPix").checked = forma.usarQrPix === true;
    document.getElementById("formaChavePix").value = forma.chavePix || "";
    document.getElementById("formaUsarIntegracaoCartao").checked = forma.usarIntegracaoCartao === true;
    document.getElementById("formaIntegracaoCartao").value = forma.integracaoCartao || "pos";
    document.getElementById("formaAtiva").value = String(forma.ativo !== false);
    document.getElementById("formaAtalho").value = forma.atalho || "";
    document.getElementById("formaAparecePdv").checked = forma.aparecePdv !== false;
    document.getElementById("formaApareceNfe").checked = forma.apareceNfe !== false;
    atualizarCamposCondicionaisForma();
    document.getElementById("statusFormaPagamento").textContent = "Editando";
    abrirModalFormaPagamento();
    document.getElementById("formaDescricao")?.focus();
}

function excluirForma(id){
    if(!confirm("Deseja excluir esta forma de pagamento?")) return;
    const formas = window.FormasPagamentoSistema.obterTodas().filter(function(item) { return item.id !== id; });
    window.FormasPagamentoSistema.salvarTodas(formas);
    limparFormularioForma();
    renderizarFormasPagamento();
}

function limparFormularioForma(){
    document.getElementById("formFormaPagamento").reset();
    document.getElementById("formaPagamentoId").value = "";
    document.getElementById("formaUsarQrPix").checked = false;
    document.getElementById("formaChavePix").value = "";
    document.getElementById("formaUsarIntegracaoCartao").checked = false;
    document.getElementById("formaIntegracaoCartao").value = "pos";
    document.getElementById("formaAtiva").value = "true";
    document.getElementById("formaAtalho").value = "";
    document.getElementById("formaAparecePdv").checked = true;
    document.getElementById("formaApareceNfe").checked = true;
    atualizarCamposCondicionaisForma();
    document.getElementById("statusFormaPagamento").textContent = "Novo registro";
}

function atualizarCamposCondicionaisForma(){
    const tipo = valorForma("formaTipo");
    const pix = tipo === "pix";
    const cartao = ["cartao_credito", "cartao_debito"].includes(tipo);
    const campoPix = document.getElementById("campoChavePix");
    const campoCartao = document.getElementById("campoIntegracaoCartao");
    const usarQrPix = document.getElementById("formaUsarQrPix")?.checked === true;
    const usarIntegracaoCartao = document.getElementById("formaUsarIntegracaoCartao")?.checked === true;
    const chavePix = document.getElementById("formaChavePix");
    const integracaoCartao = document.getElementById("formaIntegracaoCartao");

    if(campoPix) campoPix.hidden = !pix;
    if(campoCartao) campoCartao.hidden = !cartao;
    if(chavePix) chavePix.disabled = !pix || !usarQrPix;
    if(integracaoCartao) integracaoCartao.disabled = !cartao || !usarIntegracaoCartao;

    if(!pix){
        document.getElementById("formaUsarQrPix").checked = false;
        document.getElementById("formaChavePix").value = "";
    }
    if(!cartao){
        document.getElementById("formaUsarIntegracaoCartao").checked = false;
        document.getElementById("formaIntegracaoCartao").value = "pos";
    }
}

function valorForma(id){
    return document.getElementById(id)?.value.trim() || "";
}

function tagExtraForma(forma){
    if(["cartao_credito", "cartao_debito"].includes(forma.tipo) && forma.usarIntegracaoCartao === true){
        return `<span class="tag neutra">${escaparForma(String(forma.integracaoCartao || "pos").toUpperCase())}</span>`;
    }

    if(forma.tipo === "pix" && forma.usarQrPix === true && forma.chavePix){
        return '<span class="tag neutra">Chave PIX</span>';
    }

    return "";
}

function escaparForma(valor){
    return String(valor ?? "").replace(/[&<>"']/g, function(char) {
        return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[char];
    });
}
