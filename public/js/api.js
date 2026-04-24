/**
 * L2 Impure - API Client v1.2.1
 * 
 * SITE (auth) → email + senha → tabela web_accounts (com verificação)
 * JOGO (game) → login + senha → tabela accounts (L2J)
 */
const API = {
    BASE_URL: 'https://l2impure-api-production.up.railway.app/api',
    SITE_URL: 'https://l2impure.com',
    EMAIL_URL: 'https://l2impure.com',  // Emails sempre via Hostinger PHP

    // Acordar API ao carregar página (evita cold start)
    warmup() {
        fetch('https://l2impure-api-production.up.railway.app/').catch(() => {});
    },

    // === TOKEN ===
    getToken() { return localStorage.getItem('l2impure_token'); },
    setToken(token) { localStorage.setItem('l2impure_token', token); },
    removeToken() { localStorage.removeItem('l2impure_token'); localStorage.removeItem('l2impure_user'); },
    getUser() { const u = localStorage.getItem('l2impure_user'); return u ? JSON.parse(u) : null; },
    setUser(user) { localStorage.setItem('l2impure_user', JSON.stringify(user)); },
    isLoggedIn() { return !!this.getToken(); },

    // === REQUESTS ===
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const token = this.getToken();
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...options
        };
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw { status: response.status, message: data.error || 'Erro desconhecido', data };
            return data;
        } catch (err) {
            if (err.status) throw err;
            throw { status: 0, message: 'Servidor indisponível. Tente novamente.' };
        }
    },

    // === AUTH DO SITE (email com verificação) ===
    async register(email, password) {
        const data = await this.request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
        
        // Enviar email em background (não trava a tela)
        if (data.needsVerification && data.verificationToken) {
            this.sendVerificationEmail(data.email, data.verificationToken);
        }
        
        return data;
    },

    async login(email, password) {
        try {
            const data = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            this.setToken(data.token);
            this.setUser(data.user);
            return data;
        } catch (err) {
            // Se email não verificado, oferecer reenvio
            if (err.status === 403 && err.data && err.data.needsVerification) {
                throw { status: 403, message: err.message, needsVerification: true, email: err.data.email };
            }
            throw err;
        }
    },

    async verifyEmail(token) {
        return this.request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
    },

    async resendVerification(email) {
        const data = await this.request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
        if (data.verificationToken) {
            this.sendVerificationEmail(data.email, data.verificationToken);
        }
        return data;
    },

    async forgotPassword(email) {
        const data = await this.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
        if (data.resetToken) {
            this.sendResetEmail(data.email, data.resetToken);
        }
        return data;
    },

    async resetPassword(token, password) {
        return this.request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
    },

    logout() {
        this.removeToken();
        window.location.href = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
    },

    // === ENVIO DE EMAIL VIA PHP (Hostinger) ===
    async sendVerificationEmail(email, token) {
        try {
            const verifyLink = `${this.SITE_URL}/pages/verify.html?token=${token}`;
            await fetch(`${this.EMAIL_URL}/php/send-email.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'verification',
                    to: email,
                    link: verifyLink
                })
            });
        } catch (err) {
            console.error('Erro ao enviar email de verificação:', err);
        }
    },

    async sendResetEmail(email, token) {
        try {
            const resetLink = `${this.SITE_URL}/pages/reset-password.html?token=${token}`;
            await fetch(`${this.EMAIL_URL}/php/send-email.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'reset',
                    to: email,
                    link: resetLink
                })
            });
        } catch (err) {
            console.error('Erro ao enviar email de recuperação:', err);
        }
    },

    // === CONTAS DE JOGO (login L2J) ===
    async createGameAccount(login, password) {
        return this.request('/game/create-account', { method: 'POST', body: JSON.stringify({ login, password }) });
    },
    async getMyGameAccounts() {
        return this.request('/game/my-accounts');
    },

    // === RANKINGS (público) ===
    async getRankingPvp(limit = 10) { return this.request(`/rankings/pvp?limit=${limit}`); },
    async getRankingPk(limit = 10) { return this.request(`/rankings/pk?limit=${limit}`); },
    async getRankingClans(limit = 10) { return this.request(`/rankings/clans?limit=${limit}`); },
    async getRankingTop(limit = 10) { return this.request(`/rankings/top?limit=${limit}`); },
    async getServerStatus() { return this.request('/rankings/server/status'); }
};

// Acordar API assim que qualquer página carregar
API.warmup();
