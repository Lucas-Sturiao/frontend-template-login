const API_BASE_URL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000" 
    : "https://api.dominio.com"; // Substituir pela URL real do backend quando fizer o deploy

// --- UTILITÁRIOS ---
function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
            background: type === 'success' ? "#10b981" : "#ef4444",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }
    }).showToast();
}

function getToken() {
    // Procura primeiro no localStorage, se não achar, tenta no sessionStorage
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function getAuthHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (input.type === 'password') {
        input.type = 'text';
        // Troca para o SVG de "olho cortado"
        icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        `;
    } else {
        input.type = 'password';
        // Volta para o SVG de "olho aberto"
        icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        `;
    }
}

// --- MODO CLARO / ESCURO ---
const themeIcon = document.getElementById('theme-icon');

const iconMoon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
const iconSun = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />';

function updateThemeIcon(isDark) {
    themeIcon.innerHTML = isDark ? iconSun : iconMoon;
}

// Verifica o tema salvo ou a preferência do sistema ao carregar a página
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    updateThemeIcon(true);
} else {
    document.documentElement.classList.remove('dark');
    updateThemeIcon(false);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    updateThemeIcon(isDark);
    
    if (isDark) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

// --- ROTEAMENTO (SPA) ---
const views = ['login', 'register', 'forgot-password', 'profile', 'dashboard'];

function navigate(viewName) {
    // Esconde todas as views
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if(el) el.classList.add('hidden-view');
    });

    // Mostra a selecionada
    document.getElementById(`view-${viewName}`).classList.remove('hidden-view');

    // Lógica de navbar
    const token = localStorage.getItem('token');
    const navbar = document.getElementById('navbar');
    
    if (token && (viewName === 'profile' || viewName === 'dashboard')) {
        navbar.classList.remove('hidden-view');
        if(viewName === 'profile') carregarPerfil();
        if(viewName === 'dashboard') carregarDashboard();
    } else {
        navbar.classList.add('hidden-view');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verifica se o usuário acabou de voltar de um login social (Google/Facebook)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
        // Salva o token, limpa a URL para ficar bonita e manda pro perfil
        localStorage.setItem('token', tokenFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast('Login social efetuado com sucesso!');
        navigate('profile');
        return;
    }

    // 2. Fluxo normal: verifica se já tem token salvo
    const token = getToken();
    if (token) navigate('profile');
    else navigate('login');
});

function logout() {
    // Limpa ambos os armazenamentos para garantir a segurança
    localStorage.clear();
    sessionStorage.clear();
    
    document.querySelectorAll('form').forEach(form => form.reset()); 
    navigate('login');
    showToast('Deslogado com sucesso.');
}

// --- INTEGRAÇÃO COM A API ---

// 1. LOGIN
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 exige username
    formData.append('password', password);

    try {
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.access_token);
            showToast('Login efetuado com sucesso!');
            navigate('profile');
        } else {
            showToast(data.detail || 'Erro ao fazer login', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor.', 'error');
    }

    if (res.ok) {
        // Verifica se a caixa está marcada
        const rememberMe = document.getElementById('remember-me').checked;
        
        // Define o local de armazenamento correto
        if (rememberMe) {
            localStorage.setItem('token', data.access_token);
        } else {
            sessionStorage.setItem('token', data.access_token);
        }
        
        showToast('Login efetuado com sucesso!');
        document.getElementById('form-login').reset();
        navigate('profile');
    } else {
        showToast(data.detail || 'Erro ao fazer login', 'error');
        document.getElementById('login-password').value = '';
    }
});

// 2. REGISTRO
document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch(`${API_BASE_URL}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            showToast('Conta criada! Verifique seu e-mail para ativar.');
            navigate('login');
        } else {
            showToast(data.detail || 'Erro ao criar conta', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor.', 'error');
    }

    if (res.ok) {
            showToast('Conta criada! Verifique seu e-mail para ativar.');
            document.getElementById('form-register').reset(); // <-- Limpa ao cadastrar
            navigate('login');
    }
});

// 3. RECUPERAÇÃO DE SENHA
document.getElementById('form-forgot-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;

    try {
        const res = await fetch(`${API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        showToast('Se o e-mail existir, as instruções foram enviadas.');
        navigate('login');
    } catch (error) {
        showToast('Erro de conexão com o servidor.', 'error');
    }
});

// 4. CARREGAR PERFIL
async function carregarPerfil() {
    try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
            headers: getAuthHeaders()
        });

        if (res.ok) {
            const user = await res.json();
            document.getElementById('profile-email').textContent = user.email;
            document.getElementById('profile-role').textContent = user.role.toUpperCase();
            
            // Salva cache para o menu
            localStorage.setItem('user_role', user.role);
            localStorage.setItem('user_email', user.email);

            // Mostra botão dashboard se for admin
            if (user.role === 'admin') {
                document.getElementById('nav-dashboard-btn').classList.remove('hidden-view');
            }
        } else {
            logout();
        }
    } catch (error) {
        console.error(error);
    }
}

// 5. ALTERAR SENHA
document.getElementById('form-change-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    const senha_atual = document.getElementById('cp-current').value;
    const nova_senha = document.getElementById('cp-new').value;
    const email_atual = localStorage.getItem('user_email');

    try {
        const res = await fetch(`${API_BASE_URL}/users/me/password`, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_atual, senha_atual, nova_senha })
        });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Senha atualizada com sucesso!');
            document.getElementById('form-change-password').reset();
        } else {
            showToast(data.detail, 'error');
        }
    } catch (error) {
        showToast('Erro de conexão.', 'error');
    }
});

// 6. EXCLUIR CONTA (PASSO 1: SOLICITAÇÃO)
document.getElementById('form-delete-request').addEventListener('submit', async (e) => {
    e.preventDefault();
    const senha_atual = document.getElementById('del-password').value;
    const email_atual = localStorage.getItem('user_email');

    if(!confirm("Tem certeza? Esta ação enviará um código de exclusão para o seu e-mail.")) return;

    try {
        const res = await fetch(`${API_BASE_URL}/users/me/delete-request`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_atual, senha_atual })
        });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Código de exclusão enviado para o e-mail!');
            // Esconde o formulário da senha e mostra o formulário do código
            document.getElementById('form-delete-request').classList.add('hidden-view');
            document.getElementById('form-delete-confirm').classList.remove('hidden-view');
        } else {
            showToast(data.detail, 'error');
        }
    } catch (error) {
        showToast('Erro de conexão.', 'error');
    }
});

// 6.1 EXCLUIR CONTA (PASSO 2: CONFIRMAÇÃO DO CÓDIGO)
document.getElementById('form-delete-confirm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo_confirmacao = document.getElementById('del-code').value;

    if(!confirm("AVISO CRÍTICO: Deseja mesmo apagar sua conta permanentemente?")) return;

    try {
        const res = await fetch(`${API_BASE_URL}/users/me/delete-confirm`, {
            method: 'DELETE',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo_confirmacao })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Sua conta foi excluída permanentemente.');
            logout(); // Desloga o usuário e limpa o sistema
        } else {
            showToast(data.detail || 'Código inválido', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão ao confirmar exclusão.', 'error');
    }
});

// 7. CARREGAR DASHBOARD ADMIN
async function carregarDashboard() {
    const tbody = document.getElementById('dashboard-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Carregando dados...</td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/users/dashboard?limit=50&offset=0`, {
            headers: getAuthHeaders()
        });

        if (res.ok) {
            const usuarios = await res.json();
            tbody.innerHTML = '';
            
            usuarios.forEach(user => {
                const date = new Date(user.created_at).toLocaleDateString('pt-BR');
                const badgeClass = user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                const statusText = user.is_active ? 'Ativo' : 'Pendente';
                
                const tr = document.createElement('tr');
                tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition';
                tr.innerHTML = `
                    <td class="py-4 px-6 text-gray-500">#${user.id}</td>
                    <td class="py-4 px-6 font-medium text-gray-900">${user.email}</td>
                    <td class="py-4 px-6 text-gray-500 capitalize">${user.role}</td>
                    <td class="py-4 px-6"><span class="px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">${statusText}</span></td>
                    <td class="py-4 px-6 text-gray-500">${date}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            const data = await res.json();
            showToast(data.detail, 'error');
            navigate('profile'); // Força saída se não for admin
        }
    } catch (error) {
        showToast('Erro ao carregar o dashboard.', 'error');
    }
}