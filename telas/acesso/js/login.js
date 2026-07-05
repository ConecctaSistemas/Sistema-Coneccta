document.addEventListener("DOMContentLoaded", function() {
    const TRANSICAO_LOGIN_KEY = "transicaoLoginSistema";
    const form = document.getElementById("formLogin");
    const mensagem = document.getElementById("mensagemLogin");
    const telaCarregamento = document.getElementById("loadingLogin");
    const mensagemCarregamento = document.getElementById("mensagemCarregamento");
    const botaoEntrar = form?.querySelector("button[type='submit']");

    form?.addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const usuario = document.getElementById("loginUsuario")?.value || "";
        const senha = document.getElementById("loginSenha")?.value || "";
        const sessao = await Promise.resolve(window.AuthSistema?.login(usuario, senha));

        if(!sessao){
            if(mensagem) mensagem.textContent = "Usuário ou senha inválidos.";
            return;
        }

        if(mensagem) mensagem.textContent = "";
        if(botaoEntrar) botaoEntrar.disabled = true;

        const nomeUsuario = sessao.nome || sessao.login || usuario;
        const destinoLogin = obterDestinoLogin(sessao);
        prepararProximaTela(destinoLogin);

        if(mensagemCarregamento){
            mensagemCarregamento.textContent = `Seja Bem-Vindo(a): ${nomeUsuario}`;
        }

        if(telaCarregamento){
            telaCarregamento.classList.remove("com-mensagem");
            telaCarregamento.classList.add("ativo");
            telaCarregamento.setAttribute("aria-hidden", "false");
        }

        setTimeout(function() {
            telaCarregamento?.classList.add("com-mensagem");
        }, 1100);

        setTimeout(function() {
            sessionStorage.setItem(TRANSICAO_LOGIN_KEY, JSON.stringify({
                nome: nomeUsuario,
                criadoEm: Date.now()
            }));
        }, 2600);

        setTimeout(function() {
            location.replace(new URL(destinoLogin, document.baseURI).href);
        }, 3050);
    });
});

function prepararProximaTela(destino){
    if(!destino) return;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = destino;
    document.head.appendChild(link);
}

function obterDestinoLogin(sessao){
    const destino = document.getElementById("destinoLogin")?.value || "auto";

    if(destino && destino !== "auto"){
        return destino;
    }

    const permissoes = sessao.permissoes || {};
    const permissoesAtivas = Object.keys(permissoes).filter(function(chave) {
        return permissoes[chave] === true;
    });
    const permissoesPdv = [
        "pdv",
        "pdvVender",
        "pdvGuardarVendas",
        "pdvRecebimento",
        "descontos",
        "pdvCancelarVendaAtual",
        "cancelarVendas",
        "pdvReimprimir",
        "pdvSangriaSuprimento"
    ];

    if(permissoes.pdv === true && permissoesAtivas.every(function(chave) {
        return permissoesPdv.includes(chave);
    })){
        return "telas/pdv/pdv.html";
    }

    return "telas/shell/sistema.html";
}
