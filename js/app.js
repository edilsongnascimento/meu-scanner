
document.addEventListener("DOMContentLoaded", () => {

    const appStatus = document.getElementById("appStatus");

    function atualizarStatus(mensagem) {
        if (appStatus) {
            appStatus.textContent = mensagem;
        }
    }

    const scanButton = document.getElementById("scanButton");
    const catalogButton = document.getElementById("catalogButton");
    const searchButton = document.getElementById("searchButton");
    const historyButton = document.getElementById("historyButton");

    scanButton?.addEventListener("click", () => {
        atualizarStatus("Leitor de produtos será implementado na próxima etapa.");
    });

    catalogButton?.addEventListener("click", () => {
        atualizarStatus("Catálogo de produtos será implementado na próxima etapa.");
    });

    searchButton?.addEventListener("click", () => {
        atualizarStatus("Pesquisa de produtos será implementada na próxima etapa.");
    });

    historyButton?.addEventListener("click", () => {
        atualizarStatus("Histórico será implementado na próxima etapa.");
    });

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js")
            .then(() => {
                atualizarStatus("MeuScaner está funcionando e pronto para uso.");
            })
            .catch((erro) => {
                console.error("Erro ao registrar Service Worker:", erro);
                atualizarStatus("Aplicativo aberto, mas houve um erro no modo offline.");
            });
    } else {
        atualizarStatus("MeuScaner está funcionando.");
    }

});
