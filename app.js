// ============================================================================
// CORE: SUPABASE SETUP & GLOBAL STATE
// ============================================================================
const SUPABASE_URL = 'https://legzqjhyyuuqcjcbenaw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EfXeQHSFCmzy4UgiGYWmBA_R3LsLr3B';

let db = null;
if (window.supabase) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const State = {
  agendamentos: [],
  historicoEliminado: null,
  sessaoAtiva: false
};

// ============================================================================
// UTILITIES: UI CONTROLLERS & FORMATTING
// ============================================================================
const UI = {
  alertTimeout: null,
  toastTimeout: null,

  showAlert(msg, type = 'error') {
    const alertBox = document.getElementById('system-alert');
    if (!alertBox) return;
    
    clearTimeout(this.alertTimeout);
    alertBox.innerText = msg;
    alertBox.className = `fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md p-4 rounded-xl shadow-2xl text-white text-xs font-bold text-center transition-all duration-300 toast-show ${type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`;
    
    this.alertTimeout = setTimeout(() => {
      alertBox.classList.remove('toast-show');
    }, 4000);
  },

  showUndoToast(msg) {
    const toast = document.getElementById('toast-undo');
    const msgEl = document.getElementById('toast-undo-msg');
    if (!toast || !msgEl) return;

    clearTimeout(this.toastTimeout);
    msgEl.innerText = msg;
    toast.classList.add('toast-show');
    
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('toast-show');
      State.historicoEliminado = null;
    }, 6000);
  },

  hideUndoToast() {
    const toast = document.getElementById('toast-undo');
    if (toast) toast.classList.remove('toast-show');
  },

  setLoading(btnId, isLoading) {
    const btnText = document.getElementById(`${btnId}-text`);
    const btnLoader = document.getElementById(`${btnId}-loader`);
    if (!btnText || !btnLoader) return;

    if (isLoading) {
      btnText.classList.add('opacity-0');
      btnLoader.classList.remove('hidden');
    } else {
      btnText.classList.remove('opacity-0');
      btnLoader.classList.add('hidden');
    }
  },

  toggleModal(forceClose = false) {
    const modal = document.getElementById('modal-agendamento');
    const content = document.getElementById('modal-content');
    if (!modal || !content) return;

    if (forceClose || modal.classList.contains('modal-open')) {
      content.classList.remove('modal-content-open');
      setTimeout(() => modal.classList.remove('modal-open'), 300);
      document.getElementById('form-novo-agendamento').reset();
    } else {
      // Set current time for date picker
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      document.getElementById('input-data').value = now.toISOString().slice(0, 16);
      
      modal.classList.add('modal-open');
      setTimeout(() => content.classList.add('modal-content-open'), 10);
    }
  },

  switchTab(tabName) {
    const isAgenda = tabName === 'agenda';
    
    document.getElementById('content-agenda').classList.toggle('hidden', !isAgenda);
    document.getElementById('content-clientes').classList.toggle('hidden', isAgenda);
    
    const tabAgenda = document.getElementById('tab-agenda');
    const tabClientes = document.getElementById('tab-clientes');
    
    tabAgenda.className = isAgenda 
      ? 'flex-1 py-3 text-xs font-black text-stone-800 bg-stone-100 rounded-xl transition-all' 
      : 'flex-1 py-3 text-xs font-bold text-stone-400 hover:text-stone-800 transition-all';
      
    tabClientes.className = !isAgenda 
      ? 'flex-1 py-3 text-xs font-black text-stone-800 bg-stone-100 rounded-xl transition-all' 
      : 'flex-1 py-3 text-xs font-bold text-stone-400 hover:text-stone-800 transition-all';
  },

  formatDatePT(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString('pt-PT', { 
      day: '2-digit', month: 'short', 
      hour: '2-digit', minute: '2-digit' 
    }).replace(',', ' às');
  },

  setTodayDateHeader() {
    const hoje = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
    const el = document.getElementById('data-hoje');
    if (el) el.innerText = hoje;
  }
};

// ============================================================================
// MODULE: AUTHENTICATION
// ============================================================================
const Auth = {
  async init() {
    if (!db) return UI.showAlert('Falha: Script Supabase não carregado.');
    
    const { data: { session } } = await db.auth.getSession();
    if (session) {
      this.setAppVisible(true);
      await DB.carregarDados();
    }
  },

  async login(username, password) {
    const loader = document.getElementById('login-loader');
    if (loader) loader.classList.remove('hidden');
    if (loader) loader.classList.add('flex');

    const email = username.includes('@') ? username : `${username.toLowerCase().trim()}@operacaogl.pt`;

    try {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      this.setAppVisible(true);
      await DB.carregarDados();
    } catch (err) {
      UI.showAlert('Credenciais inválidas.', 'error');
    } finally {
      if (loader) loader.classList.add('hidden');
      if (loader) loader.classList.remove('flex');
    }
  },

  async logout() {
    await db.auth.signOut();
    window.location.reload();
  },

  setAppVisible(visible) {
    State.sessaoAtiva = visible;
    const loginScreen = document.getElementById('screen-login');
    const appScreen = document.getElementById('screen-app');
    
    if (visible) {
      loginScreen.style.opacity = '0';
      setTimeout(() => {
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        setTimeout(() => appScreen.style.opacity = '1', 50);
        UI.setTodayDateHeader();
      }, 500);
    }
  }
};

// ============================================================================
// MODULE: DATABASE & RENDER
// ============================================================================
const DB = {
  async carregarDados() {
    if (!db) return;
    try {
      const { data, error } = await db
        .from('agendamentos')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      State.agendamentos = data || [];
      
      this.renderAgendamentos();
      this.renderClientes();
    } catch (err) {
      UI.showAlert('Erro ao sincronizar base de dados.', 'error');
    }
  },

  async inserir(registro) {
    if (!db) return;
    try {
      const { error } = await db.from('agendamentos').insert([registro]);
      if (error) throw error;
      
      UI.showAlert('Agendamento confirmado!', 'success');
      await this.carregarDados();
    } catch (err) {
      UI.showAlert('Erro ao gravar dados no servidor.', 'error');
      throw err;
    }
  },

  async apagar(id) {
    if (!db) return;
    const item = State.agendamentos.find(a => a.id === id);
    if (!item) return;
    
    State.historicoEliminado = { ...item };
    delete State.historicoEliminado.id; 
    delete State.historicoEliminado.created_at;

    try {
      // Optimistic UI update
      document.getElementById(`card-${id}`)?.remove();
      
      const { error } = await db.from('agendamentos').delete().eq('id', id);
      if (error) throw error;

      UI.showUndoToast(`Marcação de ${item.client_name} eliminada.`);
      await this.carregarDados();
    } catch (err) {
      UI.showAlert('Erro ao apagar registo.', 'error');
      await this.carregarDados();
    }
  },

  async desfazer() {
    if (!State.historicoEliminado) return;
    UI.hideUndoToast();
    try {
      await this.inserir(State.historicoEliminado);
      State.historicoEliminado = null;
    } catch(e) {
      console.error(e);
    }
  },

  renderAgendamentos() {
    const container = document.getElementById('grid-agendamentos');
    if (!container) return;
    container.innerHTML = '';

    const agendamentosFuturos = State.agendamentos;

    if (agendamentosFuturos.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-10 bg-white rounded-[2rem] border border-dashed border-stone-300 text-center mt-4">
          <div class="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <p class="text-sm font-black text-stone-800">Agenda livre</p>
          <p class="text-[11px] text-stone-500 font-medium mt-1">Sem marcações para os próximos dias.</p>
        </div>
      `;
      return;
    }

    agendamentosFuturos.forEach(item => {
      const card = document.createElement('div');
      card.id = `card-${item.id}`;
      card.className = 'bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm shadow-stone-200/50 space-y-4 relative group';
      
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1 pr-4">
            <h4 class="font-black text-stone-800 text-base leading-tight">${item.client_name}</h4>
            <p class="text-xs font-bold text-emerald-600 mt-1">${item.service_name}</p>
          </div>
          <button onclick="DB.apagar('${item.id}')" class="w-8 h-8 bg-stone-50 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-all shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>

        <div class="bg-stone-50 p-3 rounded-xl flex items-center gap-3 text-xs font-semibold text-stone-600">
          <div class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ${UI.formatDatePT(item.start_time)}
          </div>
        </div>

        ${(item.fototipo || item.fluencia || item.contact) ? `
          <div class="grid grid-cols-2 gap-2 border-t border-stone-100 pt-3">
            \${item.contact ? `<div class="text-[10px]"><span class="block font-black text-stone-400 uppercase tracking-widest mb-0.5">Telefone</span><span class="font-bold text-stone-700">${item.contact}</span></div>` : ''}
            \${item.fototipo ? `<div class="text-[10px]"><span class="block font-black text-stone-400 uppercase tracking-widest mb-0.5">Fotótipo</span><span class="font-bold text-stone-700">${item.fototipo.split(' - ')[0]}</span></div>` : ''}
            \${item.fluencia ? `<div class="text-[10px]"><span class="block font-black text-stone-400 uppercase tracking-widest mb-0.5">Fluência</span><span class="font-bold text-stone-700">${item.fluencia} J/cm²</span></div>` : ''}
          </div>
        ` : ''}
      `;
      container.appendChild(card);
    });
  },

  renderClientes() {
    const container = document.getElementById('lista-clientes');
    if (!container) return;
    container.innerHTML = '';

    const mapaClientes = new Map();
    State.agendamentos.forEach(a => {
      const nameKey = a.client_name.trim().toLowerCase();
      if (!mapaClientes.has(nameKey)) {
        mapaClientes.set(nameKey, {
          nome: a.client_name,
          contacto: a.contact || '-',
          ultimoServico: a.service_name,
          marcacoes: 1
        });
      } else {
        mapaClientes.get(nameKey).marcacoes += 1;
        mapaClientes.get(nameKey).ultimoServico = a.service_name; // latest by chronological order
      }
    });

    if (mapaClientes.size === 0) {
      container.innerHTML = '<p class="text-xs font-bold text-stone-400 text-center py-10">Nenhum cliente registado.</p>';
      return;
    }

    const arrayClientes = Array.from(mapaClientes.values()).sort((a, b) => a.nome.localeCompare(b.nome));

    arrayClientes.forEach(c => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-2xl border border-stone-100 flex items-center justify-between shadow-sm';
      card.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center font-black text-stone-500 text-sm">
            ${c.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h5 class="text-sm font-black text-stone-800">${c.nome}</h5>
            <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wide mt-0.5">${c.contacto}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-block bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-lg">
            ${c.marcacoes} Visita${c.marcacoes > 1 ? 's' : ''}
          </span>
        </div>
      `;
      container.appendChild(card);
    });
  }
};

// ============================================================================
// EVENTS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();

  // Login Submit
  document.getElementById('form-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    Auth.login(
      document.getElementById('login-username').value,
      document.getElementById('login-pass').value
    );
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

  // New Appointment Submit
  document.getElementById('form-novo-agendamento')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    UI.setLoading('btn-submit', true);

    const novo = {
      client_name: document.getElementById('input-nome').value,
      contact: document.getElementById('input-contacto').value,
      start_time: document.getElementById('input-data').value,
      service_name: document.getElementById('input-servico').value,
      fototipo: document.getElementById('input-fototipo').value,
      fluencia: document.getElementById('input-fluencia').value
    };

    try {
      await DB.inserir(novo);
      UI.toggleModal(true);
    } catch (e) {
      // Error handled in DB method
    } finally {
      UI.setLoading('btn-submit', false);
    }
  });

  // Modal Triggers
  document.getElementById('btn-abrir-modal')?.addEventListener('click', () => UI.toggleModal());
  document.getElementById('btn-fechar-modal')?.addEventListener('click', () => UI.toggleModal(true));
  
  // Close modal on click outside
  document.getElementById('modal-agendamento')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-agendamento') UI.toggleModal(true);
  });

  // Tabs
  document.getElementById('tab-agenda')?.addEventListener('click', () => UI.switchTab('agenda'));
  document.getElementById('tab-clientes')?.addEventListener('click', () => UI.switchTab('clientes'));

  // Sync / Refresh
  document.getElementById('btn-sync')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-sync');
    btn.classList.add('animate-spin');
    DB.carregarDados().then(() => setTimeout(() => btn.classList.remove('animate-spin'), 500));
  });

  // Undo Delete
  document.getElementById('btn-undo')?.addEventListener('click', () => DB.desfazer());
});
