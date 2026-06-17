const API_URL = "http://127.0.0.1:8000";
let currentTab = 'login'; // 'login' ou 'register'

// Executado assim que a página carrega
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
});

// ==========================================
// CONTROLE DE INTERFACE (UI)
// ==========================================
function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-login').className = tab === 'login' ? 'w-1/2 py-2 text-blue-600 border-b-2 border-blue-600 font-semibold' : 'w-1/2 py-2 text-gray-500 font-semibold';
    document.getElementById('tab-register').className = tab === 'register' ? 'w-1/2 py-2 text-blue-600 border-b-2 border-blue-600 font-semibold' : 'w-1/2 py-2 text-gray-500 font-semibold';
    document.getElementById('submit-btn').innerText = tab === 'login' ? 'Entrar' : 'Criar Conta';
    showAlert('', ''); // Limpa alertas
}

function showAlert(message, type) {
    const alertBox = document.getElementById('alert-box');
    if (!message) {
        alertBox.classList.add('hidden');
        return;
    }
    alertBox.innerText = message;
    alertBox.className = `mb-4 p-3 rounded text-sm text-center font-medium ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    alertBox.classList.remove('hidden');
}

function toggleSections(isLoggedIn) {
    document.getElementById('auth-section').style.display = isLoggedIn ? 'none' : 'block';
    document.getElementById('dashboard-section').style.display = isLoggedIn ? 'block' : 'none';
}

// ==========================================
// REQUISIÇÕES PARA A API (FASTAPI)
// ==========================================
async function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (currentTab === 'register') {
        await register(email, password);
    } else {
        await login(email, password);
    }
}

async function register(email, password) {
    try {
        const response = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            showAlert('Conta criada com sucesso! Faça login.', 'success');
            switchTab('login');
        } else {
            const error = await response.json();
            showAlert(error.detail || 'Erro ao criar conta', 'error');
        }
    } catch (error) {
        showAlert('Erro de conexão com o servidor.', 'error');
    }
}

async function login(email, password) {
    // O FastAPI com OAuth2 espera receber os dados como Form URL Encoded
    const formData = new URLSearchParams();
    formData.append('username', email); // Lembre-se: o FastAPI chama de username
    formData.append('password', password);

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            // Salva os tokens no navegador
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            checkAuth(); // Vai para o dashboard
        } else {
            showAlert('E-mail ou senha incorretos.', 'error');
        }
    } catch (error) {
        showAlert('Erro de conexão com o servidor.', 'error');
    }
}

async function fetchProfile() {
    const token = localStorage.getItem('access_token');
    
    try {
        let response = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Se o token expirou (Erro 401), tentamos o Refresh Token automaticamente!
        if (response.status === 401) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                // Se deu certo, tenta buscar o perfil de novo com o novo token
                const newToken = localStorage.getItem('access_token');
                response = await fetch(`${API_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${newToken}` }
                });
            } else {
                logout();
                showAlert('Sua sessão expirou. Faça login novamente.', 'error');
                return;
            }
        }

        if (response.ok) {
            const data = await response.json();
            document.getElementById('user-email').innerText = data.email;
        }
    } catch (error) {
        console.error(error);
    }
}

async function attemptRefresh() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            return true;
        }
    } catch (error) {
        return false;
    }
    return false;
}

// ==========================================
// GERENCIAMENTO DE SESSÃO
// ==========================================
function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (token) {
        toggleSections(true);
        fetchProfile();
    } else {
        toggleSections(false);
    }
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    toggleSections(false);
}