import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accountStatus = document.getElementById("accountStatus");
    const accountForms = document.getElementById("accountForms");
    const signInForm = document.getElementById("signInForm");
    const signUpForm = document.getElementById("signUpForm");
    const signInButton = document.getElementById("signInButton");
    const signUpButton = document.getElementById("signUpButton");
    const signOutButton = document.getElementById("signOutButton");

    const destinosPermitidos = [
        "catalogo.html",
        "catalogo.html#comparar",
        "catalogo.html#favoritos",
        "index.html"
    ];
    const destinoSolicitado = new URLSearchParams(window.location.search).get("next");
    const destino = destinosPermitidos.includes(destinoSolicitado)
        ? destinoSolicitado
        : "catalogo.html";

    function mostrarStatus(texto, erro = false) {
        accountStatus.textContent = texto;
        accountStatus.classList.toggle("status-error", erro);
    }

    function atualizarSessao(usuario) {
        accountForms.hidden = Boolean(usuario);
        signOutButton.hidden = !usuario;
        mostrarStatus(
            usuario
                ? `Conectado como ${usuario.email}. Seus favoritos são privados.`
                : "Entre ou crie uma conta para guardar seus favoritos."
        );
    }

    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        atualizarSessao(data.session?.user);
    } catch (error) {
        console.error("Erro ao verificar a conta:", error);
        mostrarStatus(
            error.message || "Não foi possível verificar sua conta. Confira a configuração do Supabase.",
            true
        );
    }

    signInForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        signInButton.disabled = true;
        mostrarStatus("Entrando...");

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: document.getElementById("email").value.trim(),
                password: document.getElementById("password").value
            });
            if (error) throw error;
            window.location.href = `./${destino}`;
        } catch (error) {
            console.error("Erro ao entrar:", error);
            mostrarStatus(error.message || "Não foi possível entrar.", true);
            signInButton.disabled = false;
        }
    });

    signUpForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        signUpButton.disabled = true;
        mostrarStatus("Criando conta...");

        try {
            const emailRedirectUrl = new URL("./conta.html", window.location.href);
            emailRedirectUrl.searchParams.set("next", destino);

            const { data, error } = await supabase.auth.signUp({
                email: document.getElementById("newEmail").value.trim(),
                password: document.getElementById("newPassword").value,
                options: {
                    emailRedirectTo: emailRedirectUrl.href
                }
            });
            if (error) throw error;

            if (data.session) {
                window.location.href = `./${destino}`;
                return;
            }

            mostrarStatus("Conta criada. Confirme o cadastro pelo link enviado ao seu e-mail e depois entre.");
            signUpButton.disabled = false;
        } catch (error) {
            console.error("Erro ao criar conta:", error);
            mostrarStatus(error.message || "Não foi possível criar a conta.", true);
            signUpButton.disabled = false;
        }
    });

    signOutButton.addEventListener("click", async () => {
        signOutButton.disabled = true;
        mostrarStatus("Saindo da conta...");

        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            atualizarSessao(null);
        } catch (error) {
            console.error("Erro ao sair:", error);
            mostrarStatus(error.message || "Não foi possível sair da conta.", true);
        } finally {
            signOutButton.disabled = false;
        }
    });
});
