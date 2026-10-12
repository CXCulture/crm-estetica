// ============================================================================
// CONFIGURAÇÃO SUPABASE & ESTADO GLOBAL
// ============================================================================
const SUPABASE_URL = 'https://iegzgihyasujcqcbenaw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EfXeQHSFCmzy4UgiGYWmBA_R3LsLr3B';

let db = null;
if (SUPABASE_URL !== 'https://SEU-PROJETO.supabase.co') {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const State = { 
  agendamentos: [], 
  isDesktopLayout: false 
};

// ============================================================================
// AUTENTICAÇÃO & SESSÃO PERSISTENTE (F5 SAFE)
// ============================================================================
const Auth = {
  showAlert(msg, type = 'error') {
    const box = document.getElementById('auth-alert');
    if (!box) return;
    box.className = `fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] p-4 rounded-2xl text-xs font-bold shadow-2xl transition-all duration-300 text-center ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`;
    box.innerText = msg;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 3500);
  },

  showLoginView() {
    document.getElementById('view-login')?.classList.remove('hidden');
    document.getElementById('view-recovery')?.classList.add('hidden');
    document.getElementById('view-app')?.classList.add('hidden');
  },

  showRecoveryView() {
    document.getElementById('view-login')?.classList.add('hidden');
    document.getElementById('view-recovery')?.classList.remove('hidden');
    document.getElementById('view-app')?.classList.add('hidden');
  },

  async handleLogin(e) {
    e.preventDefault();
    const userInput = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if ((userInput.toLowerCase() === "gabyzinha" || userInput === "gabyzinha@operacaogl.pt") && password === "Gaby150405") {
      localStorage.setItem('gl_session_active', 'true');
      localStorage.setItem('gl_user_name', 'Gabyzinha');
      
      if (db) {
        await db.auth.signInWithPassword({ email: 'gabyzinha@operacaogl.pt', password }).catch(() => {});
      }
      
      Auth.showAlert("Bem-vinda à Operação GL, Gabriela!", "success");
      this.loginSuccess();
      return;
    }

    if (db) {
      const { data, error } = await db.auth.signInWithPassword({ email: userInput, password });
      if (!error && data.session) {
        localStorage.setItem('gl_session_active', 'true');
        return this.loginSuccess();
      }
    }
    Auth.showAlert("Erro de Acesso: Verifique o utilizador e a palavra-passe.", "error");
  },

  loginSuccess() {
    document.getElementById('view-login')?.classList.add('hidden');
    document.getElementById('view-recovery')?.classList.add('hidden');
    document.getElementById('view-app')?.classList.remove('hidden');
    App.init();
  },

  async handleLogout() {
    localStorage.removeItem('gl_session_active');
    localStorage.removeItem('gl_user_name');
    if (db) await db.auth.signOut();
    this.showLoginView();
  },

  async checkSessionOnLoad() {
    const isLocalActive = localStorage.getItem('gl_session_active') === 'true';
    if (db) {
      const { data: { session } } = await db.auth.getSession();
      if (session || isLocalActive) {
        this.loginSuccess();
        return;
      }
    } else if (isLocalActive) {
      this.loginSuccess();
      return;
    }
    this.showLoginView();
  }
};

// ============================================================================
// INTERFACE DE UTILIZADOR (UI CONTROLLER)
// ============================================================================
const UI = {
  toggleLayoutMode() {
    State.isDesktopLayout = !State.isDesktopLayout;
    const container = document.getElementById('main-container');
    const icon = document.getElementById('view-mode-icon');
    const label = document.getElementById('view-mode-label');

    if (!container) return;

    if (State.isDesktopLayout) {
      container.className = "w-full max-w-6xl bg-[#faf8f6] min-h-screen shadow-2xl relative flex flex-col pb-20 transition-all duration-300";
      if (icon) icon.innerText = "📱";
      if (label) label.innerText = "Ver Telemóvel";
    } else {
      container.className = "w-full max-w-md bg-[#faf8f6] min-h-screen shadow-2xl relative flex flex-col pb-20 transition-all duration-300";
      if (icon) icon.innerText = "🖥️";
      if (label) label.innerText = "Ver Computador";
    }
    setTimeout(() => { if (calendarObj) calendarObj.updateSize(); }, 300);
  },

  switchTab(tab) {
    ['agenda', 'clientes', 'laser', 'catalogo', 'dashboard'].forEach(t => {
      document.getElementById(`sec-${t}`)?.classList.add('hidden');
      const tabBtn = document.getElementById(`tab-${t}`);
      if (tabBtn) tabBtn.className = "px-3.5 py-2 rounded-xl text-stone-500 hover:bg-[#fdf8f6] whitespace-nowrap";
    });

    document.getElementById(`sec-${tab}`)?.classList.remove('hidden');
    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) activeTab.className = "px-3.5 py-2 rounded-xl bg-[#c89d93] text-white shadow-xs whitespace-nowrap";

    if (tab === 'agenda') setTimeout(renderCalendar, 50);
  },

  openModal(isEdit = false, selectedDateTime = null) {
    const title = document.getElementById('modal-title');
    if (title) title.innerText = isEdit ? "Editar Ficha no CRM" : "Novo Agendamento";
    if (selectedDateTime) {
      const inputData = document.getElementById('input-data');
      if (inputData) inputData.value = selectedDateTime;
    }
    document.getElementById('modal-agendamento')?.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('form-agendamento')?.reset();
    const editId = document.getElementById('edit-id');
    if (editId) editId.value = "";
    document.getElementById('modal-agendamento')?.classList.add('hidden');
  },

  renderEmptyState() {
    const stories = document.getElementById('stories-container');
    const feed = document.getElementById('feed-container');
    if (stories) stories.innerHTML = '';
    if (feed) {
      feed.innerHTML = `
        <div class="flex flex-col items-center justify-center h-48 text-center space-y-2 opacity-60 bg-white rounded-2xl p-6 border border-[#f2e8e5]">
          <div class="text-3xl">📅</div>
          <h3 class="font-bold text-stone-700 text-xs">A base de dados está pronta</h3>
          <p class="text-xs text-stone-500 max-w-xs">Clique no calendário ou no botão "+ Novo Agendamento" para começar.</p>
        </div>
      `;
    }
  },

  renderData(data) {
    if (!data || data.length === 0) return this.renderEmptyState();

    const stories = document.getElementById('stories-container');
    if (stories) {
      stories.innerHTML = data.map(i => `
        <div class="flex flex-col items-center space-y-1 min-w-[56px] cursor-pointer" onclick="Controllers.prepareEdit('${i.id}')">
          <div class="w-12 h-12 rounded-full p-[2px] border-2 border-emerald-500 flex items-center justify-center bg-white">
            <div class="w-10 h-10 bg-[#f2e8e5] rounded-full flex items-center justify-center text-[#96675d] font-bold text-xs">
              ${i.client_name ? i.client_name.substring(0,2).toUpperCase() : 'GL'}
            </div>
          </div>
          <span class="text-[10px] font-bold text-stone-700 truncate w-14 text-center">${(i.client_name || '').split(' ')[0]}</span>
        </div>
      `).join('');
    }

    const feed = document.getElementById('feed-container');
    if (feed) {
      feed.innerHTML = data.map(i => {
        const dateObj = new Date(i.start_time || Date.now());
        const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const day = dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' });

        return `
        <article class="card-crm">
          <div class="flex justify-between items-start pb-3 border-b border-[#fdf8f6]">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-[#c89d93] text-white rounded-full flex items-center justify-center font-bold text-sm">
                ${i.client_name ? i.client_name.substring(0,2).toUpperCase() : 'GL'}
              </div>
              <div>
                <h3 class="font-bold text-stone-800 text-xs">${i.client_name || 'Cliente'}</h3>
                <p class="text-stone-400 text-[11px]">📅 ${day} às ${time} • Tel: ${i.client_phone || '--'}</p>
              </div>
            </div>
            <div class="flex space-x-1">
              <button onclick="Controllers.prepareEdit('${i.id}')" class="text-stone-500 hover:text-[#c89d93] font-bold bg-[#fdf8f6] px-2.5 py-1 rounded-lg text-xs">✏️</button>
              <button onclick="CommandPattern.executeSoftDelete('${i.id}', 'appointments')" class="text-rose-500 hover:text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg text-xs">🗑️</button>
            </div>
          </div>
          <div class="pt-3 space-y-2 text-xs">
            <p class="text-stone-600">Tratamento: <strong class="text-stone-800">${i.service_name || 'Sessão'}</strong></p>
            <div class="p-2.5 bg-[#fdf8f6] rounded-xl border border-[#f2e8e5] flex justify-between items-center font-mono text-[11px]">
              <span>Fluência: <strong>${i.fluence_jcm2 || '--'} J/cm²</strong></span>
              <span>Status: <strong class="text-emerald-600">${i.status || 'confirmada'}</strong></span>
            </div>
          </div>
        </article>
      `}).join('');
    }

    const total = document.getElementById('dash-total-clientes');
    const cross = document.getElementById('dash-cross-sell');
    const fat = document.getElementById('dash-faturamento');
    const ret = document.getElementById('dash-retornos');

    if (total) total.innerText = data.length;
    if (cross) cross.innerText = Math.ceil(data.length * 0.4);
    if (fat) fat.innerText = `€ ${(data.length * 45).toFixed(2)}`;
    if (ret) ret.innerText = data.length;

    if (calendarObj) {
      calendarObj.removeAllEvents();
      data.forEach(item => {
        calendarObj.addEvent({
          id: item.id,
          title: `${item.client_name} - ${item.service_name}`,
          start: item.start_time,
          end: item.end_time || item.start_time
        });
      });
    }
  }
};

// ============================================================================
// CONTROLADORES DE AÇÃO
// ============================================================================
const Controllers = {
  handleProcedimentoSelect(val) {
    const boxManual = document.getElementById('box-procedimento-manual');
    if (boxManual) boxManual.classList.toggle('hidden', val !== 'outro');
  },

  prepareEdit(id) {
    const item = State.agendamentos.find(a => a.id === id);
    if (!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('input-nome').value = item.client_name || '';
    document.getElementById('input-telefone').value = item.client_phone || '';
    document.getElementById('select-procedimento').value = item.service_name || '';
    document.getElementById('input-fluencia').value = item.fluence_jcm2 || 0;
    
    UI.openModal(true);
  },

  async saveData(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const procSelect = document.getElementById('select-procedimento').value;
    const procManual = document.getElementById('input-zonas-manual').value;
    const clientName = document.getElementById('input-nome').value.trim();
    const clientPhone = document.getElementById('input-telefone').value.trim();

    const startTime = new Date(document.getElementById('input-data').value || Date.now()).toISOString();
    const endTime = new Date(new Date(document.getElementById('input-data').value || Date.now()).getTime() + 45*60000).toISOString();

    if (db) {
      try {
        let clientId = null;
        const { data: existingClients } = await db.from('clients').select('id').eq('phone', clientPhone);
        
        if (existingClients && existingClients.length > 0) {
          clientId = existingClients[0].id;
        } else {
          const { data: newClient, error: clientErr } = await db.from('clients').insert([{
            name: clientName,
            phone: clientPhone,
            fitzpatrick: document.getElementById('input-fototipo').value || 'III'
          }]).select();
          if (!clientErr && newClient) clientId = newClient[0].id;
        }

        const apptPayload = {
          client_id: clientId,
          service_category: procSelect.includes('Laser') ? 'laser' : 'facial_catia',
          service_name: procSelect === 'outro' ? procManual : procSelect,
          start_time: startTime,
          end_time: endTime,
          fluence_jcm2: parseFloat(document.getElementById('input-fluencia').value) || 0,
          status: 'confirmada'
        };

        if (id) {
          await db.from('appointments').update(apptPayload).eq('id', id);
        } else {
          await db.from('appointments').insert([apptPayload]);
        }
      } catch (err) {
        Auth.showAlert("Erro ao guardar no Supabase: " + err.message, "error");
      }
    } else {
      const localPayload = {
        id: id || Date.now().toString(),
        client_name: clientName,
        client_phone: clientPhone,
        start_time: startTime,
        end_time: endTime,
        service_name: procSelect === 'outro' ? procManual : procSelect,
        fluence_jcm2: parseFloat(document.getElementById('input-fluencia').value) || 0,
        status: 'confirmada'
      };
      if (id) {
        const idx = State.agendamentos.findIndex(a => a.id === id);
        State.agendamentos[idx] = localPayload;
      } else {
        State.agendamentos.unshift(localPayload);
      }
      localStorage.setItem('gl_local_agendamentos', JSON.stringify(State.agendamentos));
    }

    UI.closeModal();
    Auth.showAlert("Ficha guardada com sucesso no CRM!", "success");
    await App.loadData();
  }
};

// ============================================================================
// CALENDÁRIO FULLCALENDAR
// ============================================================================
let calendarObj = null;
function renderCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;
  
  if (!calendarObj) {
    calendarObj = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      selectable: true,
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' },
      select: function(info) {
        const selectedDateTime = info.startStr.slice(0, 16);
        UI.openModal(false, selectedDateTime);
      }
    });
    calendarObj.render();
  } else {
    calendarObj.updateSize();
  }
}

// ============================================================================
// UNDO / REDO COMMAND PATTERN
// ============================================================================
const CommandPattern = {
  historyCache: null,
  timeoutRef: null,

  executeSoftDelete(id, table) {
    const itemToSave = State.agendamentos.find(a => a.id === id);
    if (!itemToSave) return;
    
    this.historyCache = { action: 'delete', table, data: itemToSave };
    State.agendamentos = State.agendamentos.filter(a => a.id !== id);
    UI.renderData(State.agendamentos);

    const toast = document.getElementById('toast-desfazer');
    const msg = document.getElementById('toast-desfazer-msg');
    if (msg) msg.innerText = "Ficha removida da agenda.";
    toast?.classList.remove('hidden');

    clearTimeout(this.timeoutRef);
    this.timeoutRef = setTimeout(async () => {
      this.commitToSupabase();
    }, 6000);
  },

  undo() {
    if (!this.historyCache) return;
    clearTimeout(this.timeoutRef);

    State.agendamentos.push(this.historyCache.data);
    State.agendamentos.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    UI.renderData(State.agendamentos);

    this.historyCache = null;
    document.getElementById('toast-desfazer')?.classList.add('hidden');
    Auth.showAlert("Ação desfeita. A ficha foi restaurada.", "success");
  },

  async commitToSupabase() {
    if (!this.historyCache) return;
    try {
      if (db) {
        await db.from(this.historyCache.table).delete().eq('id', this.historyCache.data.id);
      }
    } catch (error) {
      Auth.showAlert("Falha ao comunicar com o servidor.", "error");
    } finally {
      this.historyCache = null;
      document.getElementById('toast-desfazer')?.classList.add('hidden');
    }
  }
};

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================
const App = {
  async init() { 
    await this.loadData();
    setTimeout(renderCalendar, 100);
  },
  async loadData() {
    if (db) {
      const { data, error } = await db.from('appointments').select(`
        id,
        start_time,
        end_time,
        service_name,
        fluence_jcm2,
        status,
        clients ( name, phone )
      `).order('start_time', { ascending: true });

      if (!error && data) {
        State.agendamentos = data.map(item => ({
          id: item.id,
          start_time: item.start_time,
          end_time: item.end_time,
          service_name: item.service_name,
          fluence_jcm2: item.fluence_jcm2,
          status: item.status,
          client_name: item.clients ? item.clients.name : 'Cliente',
          client_phone: item.clients ? item.clients.phone : ''
        }));
      }
    } else {
      const savedLocal = localStorage.getItem('gl_local_agendamentos');
      if (savedLocal) {
        State.agendamentos = JSON.parse(savedLocal);
      }
    }
    UI.renderData(State.agendamentos);
  }
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const inputData = document.getElementById('input-data');
  if (inputData) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    inputData.value = now.toISOString().slice(0, 16);
  }
  
  Auth.checkSessionOnLoad();
});

document.addEventListener('keydown', function(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    const toast = document.getElementById('toast-desfazer');
    if (toast && !toast.classList.contains('hidden')) {
      event.preventDefault();
      CommandPattern.undo();
    }
  }
});
