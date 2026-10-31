
import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

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
        atualizarStatus("Leitor de produtos será implementado.");
    });

    catalogButton?.addEventListener("click", () => {
        atualizarStatus("Catálogo de produtos será implementado.");
    });

    searchButton?.addEventListener("click", () => {
        atualizarStatus("Pesquisa de produtos será implementada.");
    });

    historyButton?.addEventListener("click", () => {
        atualizarStatus("Histórico será implementado.");
    });

    atualizarStatus("Conectando ao banco de dados...");

    try {
        const { data, error } = await supabase
            .from("produtos")
            .select("id, nome")
            .limit(1);

        if (error) {
            throw error;
        }

        console.log("Conexão com Supabase realizada!");
        console.log("Produtos encontrados:", data);

        atualizarStatus(
            `Supabase conectado! ${data.length > 0
                ? "Catálogo possui produtos cadastrados."
                : "Catálogo ainda está vazio."}`
        );

    } catch (erro) {
        console.error("Erro na conexão com Supabase:", erro);
        atualizarStatus("Não foi possível conectar ao banco. Verifique a configuração.");
    }

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js")
            .catch((erro) => {
                console.error("Erro no Service Worker:", erro);
            });
    }
});
