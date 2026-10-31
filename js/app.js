
document.addEventListener("DOMContentLoaded", () => {

    const status = document.getElementById("appStatus");

    status.textContent = "Meu Scanner está funcionando!";

    document.getElementById("scanButton").addEventListener("click", () => {
        alert("Scanner: recurso em desenvolvimento.");
    });

    document.getElementById("catalogButton").addEventListener("click", () => {
        alert("Catálogo: recurso em desenvolvimento.");
    });

    document.getElementById("searchButton").addEventListener("click", () => {
        alert("Pesquisa: recurso em desenvolvimento.");
    });

    document.getElementById("historyButton").addEventListener("click", () => {
        alert("Histórico: recurso em desenvolvimento.");
    });

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js")
            .catch(error => console.error("Erro no Service Worker:", error));
    }

});
