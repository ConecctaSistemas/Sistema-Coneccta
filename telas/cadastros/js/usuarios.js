document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("formUsuario")?.addEventListener("submit", salvarUsuario);
    document.getElementById("btnAdicionarUsuario")?.addEventListener("click", function(){ abrirModal(null); });
    document.getElementById("btnFecharModalUsuario")?.addEventListener("click", fecharModal);
    document.getElementById("btnCancelarModalUsuario")?.addEventListener("click", fecharModal);

    document.getElementById("modalUsuario")?.addEventListener("click", function(e){
        if(e.target === this) fecharModal();
    });

    document.getElementById("usuarioAdministrador")?.addEventListener("change", function(){
        aplicarModoAdmin(this.checked);
    });

    aplicarPermissoesDaTela();
    renderizarUsuarios();

    if(window.ControleSaida) ControleSaida.ativarProtecaoCadastro();
});

function abrirModal(id){
    const modal = document.getElementById("modalUsuario");
    const titulo = document.getElementById("modalUsuarioTitulo");
    if(!modal) return;

    if(id){
        editarUsuario(id);
        if(titulo) titulo.textContent = "Editar usuário";
    }else{
        limparFormulario();
        if(titulo) titulo.textContent = "Novo usuário";
    }

    modal.setAttribute("aria-hidden", "false");
    document.getElementById("usuarioNome")?.focus();
}

function fecharModal(){
    document.getElementById("modalUsuario")?.setAttribute("aria-hidden", "true");
    limparFormulario();
}

function salvarUsuario(evento){
    evento.preventDefault();

    if(!usuarioPode("usuariosEditar")){
        alert("Seu usuário não possui permissão para criar ou editar usuários.");
        return;
    }

    const base = obterBase();
    const id = valorCampo("usuarioId") || gerarId("usr");
    const login = valorCampo("usuarioLogin");

    const duplicado = base.usuarios.find(function(u){
        return normalizar(u.login) === normalizar(login) && u.id !== id;
    });

    if(duplicado){
        alert("Já existe um usuário com este login.");
        return;
    }

    const existente = base.usuarios.find(function(u){ return u.id === id; });
    const isAdmin = document.getElementById("usuarioAdministrador")?.checked === true;

    const usuario = {
        id,
        nome: valorCampo("usuarioNome"),
        login,
        senha: valorCampo("usuarioSenha"),
        comissao: numero(valorCampo("usuarioComissao")),
        salario: numero(valorCampo("usuarioSalario")),
        contratacao: valorCampo("usuarioContratacao"),
        aniversario: valorCampo("usuarioAniversario"),
        administrador: isAdmin,
        permissoes: isAdmin ? todasPermissoes() : obterPermissoesFormulario(),
        ativo: existente ? (existente.ativo !== false) : true,
        atualizadoEm: new Date().toISOString()
    };

    const indice = base.usuarios.findIndex(function(u){ return u.id === id; });

    if(indice >= 0){
        base.usuarios[indice] = usuario;
    }else{
        usuario.criadoEm = new Date().toISOString();
        base.usuarios.push(usuario);
    }

    salvarBase(base);
    if(window.ControleSaida) ControleSaida.marcarSalvo();
    notificar("Usuário salvo com sucesso.", "sucesso");
    fecharModal();
    renderizarUsuarios();
}

function alternarStatusUsuario(id){
    if(!usuarioPode("usuariosExcluir")){
        alert("Seu usuário não possui permissão para desativar usuários.");
        return;
    }

    if(id === "usr_adm"){
        alert("O usuário ADM padrão não pode ser desativado.");
        return;
    }

    const base = obterBase();
    const indice = base.usuarios.findIndex(function(u){ return u.id === id; });
    if(indice < 0) return;

    const ativo = base.usuarios[indice].ativo !== false;
    const acao = ativo ? "desativar" : "ativar";

    if(!confirm(`Deseja ${acao} o usuário "${base.usuarios[indice].nome}"?`)) return;

    base.usuarios[indice].ativo = !ativo;
    base.usuarios[indice].atualizadoEm = new Date().toISOString();
    salvarBase(base);
    notificar(`Usuário ${ativo ? "desativado" : "ativado"}.`, "sucesso");
    renderizarUsuarios();
}

function renderizarUsuarios(){
    const base = obterBase();
    const tbody = document.getElementById("tabelaUsuariosBody");

    definirTexto("contadorUsuarios", base.usuarios.length + " usuário(s)");

    if(!tbody) return;

    if(base.usuarios.length === 0){
        tbody.innerHTML = `<tr><td colspan="7" class="vazio">Nenhum usuário cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = base.usuarios.map(function(u){
        const ativo = u.ativo !== false;
        const contratacao = u.contratacao
            ? new Date(u.contratacao + "T00:00:00").toLocaleDateString("pt-BR")
            : "—";

        return `
            <tr class="${ativo ? "" : "usuario-inativo"}">
                <td>
                    <strong>${escapar(u.nome)}</strong>
                    ${u.administrador ? '<span class="badge-admin"><i class="fa-solid fa-shield-halved"></i> Admin</span>' : ""}
                </td>
                <td>${escapar(u.login)}</td>
                <td>${formatarPercentual(u.comissao)}</td>
                <td>${formatarMoedaRS(u.salario)}</td>
                <td>${contratacao}</td>
                <td><span class="badge ${ativo ? "badge-ativo" : "badge-inativo"}">${ativo ? "Ativo" : "Inativo"}</span></td>
                <td>
                    <div class="acoes-linha">
                        <button type="button" class="btn-linha btn-editar" onclick="abrirModal('${u.id}')">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        <button type="button" class="btn-linha ${ativo ? "btn-desativar" : "btn-ativar"}" onclick="alternarStatusUsuario('${u.id}')">
                            <i class="fa-solid fa-${ativo ? "ban" : "check"}"></i> ${ativo ? "Desativar" : "Ativar"}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function editarUsuario(id){
    const usuario = obterBase().usuarios.find(function(u){ return u.id === id; });
    if(!usuario) return;

    const isAdmin = usuario.administrador === true;

    definirValor("usuarioId", usuario.id);
    definirValor("usuarioNome", usuario.nome);
    definirValor("usuarioLogin", usuario.login);
    definirValor("usuarioSenha", usuario.senha);
    definirValor("usuarioComissao", usuario.comissao);
    definirValor("usuarioSalario", usuario.salario);
    definirValor("usuarioContratacao", usuario.contratacao);
    definirValor("usuarioAniversario", usuario.aniversario);

    preencherPermissoes(isAdmin ? todasPermissoes() : (usuario.permissoes || {}));
    const adminEl = document.getElementById("usuarioAdministrador");
    if(adminEl) adminEl.checked = isAdmin;
    aplicarModoAdmin(isAdmin);
    renderizarAnaliseUsuario(usuario);
}

function limparFormulario(){
    definirValor("usuarioId", "");
    definirValor("usuarioNome", "");
    definirValor("usuarioLogin", "");
    definirValor("usuarioSenha", "");
    definirValor("usuarioComissao", "0");
    definirValor("usuarioSalario", "0");
    definirValor("usuarioContratacao", "");
    definirValor("usuarioAniversario", "");

    const adminEl = document.getElementById("usuarioAdministrador");
    if(adminEl) adminEl.checked = false;
    aplicarModoAdmin(false);
    preencherPermissoes({});
    renderizarAnaliseUsuario(null);
}

function renderizarAnaliseUsuario(usuario){
    const painel = document.getElementById("analiseUsuarioAtual");
    if(!painel) return;

    if(!usuario){
        painel.hidden = true;
        return;
    }

    const base = obterBase();
    const vendas = vendasDoUsuario(base.vendas, usuario);
    const totalVendas = somar(vendas, "total");
    const descontos = vendas.reduce(function(acc, v){
        return acc + numero(v.desconto || v.totalDesconto || v.descontos);
    }, 0);
    const comissao = totalVendas * (numero(usuario.comissao) / 100);

    definirTexto("usuarioTotalVendas", formatarMoedaRS(totalVendas));
    definirTexto("usuarioTotalDescontos", formatarMoedaRS(descontos));
    definirTexto("usuarioTotalComissoes", formatarMoedaRS(comissao));
    painel.hidden = false;
}

function vendasDoUsuario(vendas, usuario){
    const login = normalizar(usuario.login);
    return (vendas || []).filter(function(v){
        const vLogin = normalizar(v.usuarioLogin || v.vendedorLogin || v.usuario?.login || v.vendedor?.login);
        if(vLogin) return vLogin === login;
        return login === "adm";
    });
}

var _permissoesAntesAdmin = null;

function aplicarModoAdmin(ativo){
    const campos = document.querySelectorAll("[data-permissao-campo]");

    if(ativo){
        _permissoesAntesAdmin = obterPermissoesFormulario();
        campos.forEach(function(el){
            el.checked = true;
            el.disabled = true;
            el.closest("label")?.classList.toggle("desabilitada", true);
        });
        return;
    }

    campos.forEach(function(el){
        if(_permissoesAntesAdmin){
            el.checked = _permissoesAntesAdmin[el.dataset.permissaoCampo] === true;
        }
        el.disabled = false;
        el.closest("label")?.classList.toggle("desabilitada", false);
    });
    _permissoesAntesAdmin = null;
}

function todasPermissoes(){
    const permissoes = {};
    document.querySelectorAll("[data-permissao-campo]").forEach(function(el){
        permissoes[el.dataset.permissaoCampo] = true;
    });
    return permissoes;
}

function obterPermissoesFormulario(){
    const permissoes = {};
    document.querySelectorAll("[data-permissao-campo]").forEach(function(el){
        permissoes[el.dataset.permissaoCampo] = el.checked;
    });
    return permissoes;
}

function preencherPermissoes(permissoes){
    document.querySelectorAll("[data-permissao-campo]").forEach(function(el){
        el.checked = permissoes[el.dataset.permissaoCampo] === true;
    });
}

function usuarioPode(permissao){
    return window.SistemaCore.temPermissao(permissao);
}

function aplicarPermissoesDaTela(){
    const podeEditar = usuarioPode("usuariosEditar");
    const btnAdicionar = document.getElementById("btnAdicionarUsuario");
    const btnSalvar = document.getElementById("btnSalvarUsuario");

    if(btnAdicionar){
        btnAdicionar.disabled = !podeEditar;
        if(!podeEditar) btnAdicionar.title = "Sem permissão para criar usuários.";
    }

    if(btnSalvar){
        btnSalvar.disabled = !podeEditar;
        if(!podeEditar) btnSalvar.title = "Sem permissão para salvar usuários.";
    }
}

function formatarPercentual(valor){
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + "%";
}
