// ==========================================
// CONFIGURAÇÃO SUPABASE & ESTADO GLOBAL
// ==========================================
const SUPABASE_URL = 'https://legzqjhyyuuqcjcbenaw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EfXeQHSFCmzy4UgiGYWmBA_R3LsLr3B';

// Inicialização do cliente Supabase
let db = null;
if (window.supabase) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let State = {
  agendamentos: [],
  ligado: false
};

// ==========================================
// AUTENTICAÇÃO E SESSÃO
// ==========================================
const Auth = {
  async login(email, password) {
    if (!db) return false;
    try {
      const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (error) throw error;
      State.ligado = true;
      await Agendamentos.carregar();
      return true;
    } catch (err) {
      console.error('Erro de autenticação:', err.message);
      this.showAlert('E-mail ou palavra-passe incorretos.');
      return false;
    }
  },

  async logout() {
    if (db) await db.auth.signOut();
    State.ligado = false;
    State.agendamentos = [];
    window.location.reload();
  },

  showAlert(msg) {
    const box = document.getElementById('auth-alert');
    if (box) {
      box.innerText = msg;
      box.classList.remove('hidden');
    }
  }
};

// ==========================================
// OPERAÇÕES DE AGENDAMENTO (SUPABASE REAL)
// ==========================================
const Agendamentos = {
  async carregar() {
    if (!db) return;
    try {
      const { data, error } = await db
        .from('agendamentos')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      State.agendamentos = data || [];
      UI.renderizarMatriz();
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err.message);
    }
  },

  async criar(novoAgendamento) {
    if (!db) return;
    try {
      const { data, error } = await db
        .from('agendamentos')
        .insert([novoAgendamento])
        .select();

      if (error) throw error;

      await this.carregar();
      UI.fecharModal();
    } catch (err) {
      console.error('Erro ao guardar agendamento:', err.message);
      alert('Não foi possível guardar no Supabase. Verifique a permissão RLS.');
    }
  },

  async apagar(id) {
    if (!db) return;
    try {
      const { error } = await db
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await this.carregar();
    } catch (err) {
      console.error('Erro ao eliminar agendamento:', err.message);
    }
  }
};

// ==========================================
// INTERFACE E RENDERIZAÇÃO (UI)
// ==========================================
const UI = {
  renderizarMatriz() {
    const container = document.getElementById('grid-agendamentos');
    if (!container) return;

    container.innerHTML = '';

    if (State.agendamentos.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 py-4">Nenhum agendamento encontrado.</p>';
      return;
    }

    State.agendamentos.forEach(item => {
      const card = document.createElement('div');
      card.className = 'p-3 bg-white border border-gray-200 rounded-lg shadow-sm mb-2 flex justify-between items-center';
      card.innerHTML = `
        <div>
          <h4 class="font-bold text-gray-800">${item.client_name || 'Cliente'}</h4>
          <p class="text-sm text-gray-600">${item.service_name || 'Tratamento'} - ${item.start_time || ''}</p>
        </div>
        <button onclick="Agendamentos.apagar('${item.id}')" class="text-red-500 hover:text-red-700 text-sm font-semibold">
          Eliminar
        </button>
      `;
      container.appendChild(card);
    });
  },

  fecharModal() {
    const modal = document.getElementById('modal-agendamento');
    if (modal) modal.classList.add('hidden');
  }
};

// ==========================================
// INICIALIZAÇÃO DOS EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Form de Login
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-pass').value;
      await Auth.login(email, pass);
    });
  }

  // Form de Novo Agendamento
  const formNovo = document.getElementById('form-novo-agendamento');
  if (formNovo) {
    formNovo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const novo = {
        client_name: document.getElementById('input-nome').value,
        service_name: document.getElementById('input-servico').value,
        start_time: document.getElementById('input-data').value
      };
      await Agendamentos.criar(novo);
    });
  }
});
