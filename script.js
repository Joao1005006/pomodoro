// =============================================================
// script.js — Lógica do Pomodoro Timer (Standoff 2 Theme)
// Conceitos: variáveis, setInterval, eventos DOM, funções
// =============================================================

// Cada modo tem duração, cor do anel, id da aba e texto do log
const MODES = {
  focus: { label: 'MISSÃO ATIVA',    minutes: 25, stroke: '#c0392b', tabId: 'tab-focus', logLabel: 'Missão concluída',  logClass: 'focus' },
  short: { label: 'RECUO — PAUSA',   minutes: 5,  stroke: '#27ae60', tabId: 'tab-short', logLabel: 'Recuo encerrado',   logClass: 'short' },
  long:  { label: 'BASE — DESCANSO', minutes: 15, stroke: '#2980b9', tabId: 'tab-long',  logLabel: 'Retorno à base',    logClass: 'long'  }
};

// Perímetro do anel SVG (C = 2πr, onde r = 78px)
// Usado para controlar quanto do anel fica "preenchido"
const CIRCUMFERENCE = 2 * Math.PI * 78;

// ── Estado da aplicação ──────────────────────────────────────
let currentMode  = 'focus';  // modo ativo no momento
let totalSeconds = 25 * 60;  // duração total em segundos
let remaining    = 25 * 60;  // segundos restantes
let running      = false;    // true enquanto o timer estiver rodando
let intervalId   = null;     // guarda a referência do setInterval para poder cancelar
let toastTimer   = null;     // guarda a referência do setTimeout do toast

// Contadores exibidos nos cards de estatísticas
let missions = 0;
let minutes  = 0;
let cycles   = 0;
let streak   = 0;

// ── Referências ao DOM ───────────────────────────────────────
// Buscamos os elementos uma única vez e guardamos nas variáveis
const ring       = document.getElementById('sf-ring');
const timeEl     = document.getElementById('sf-time');
const modeEl     = document.getElementById('sf-mode-name');
const btnStart   = document.getElementById('sf-btn-start');
const dot        = document.getElementById('sf-dot');
const statusText = document.getElementById('sf-status-text');
const toastEl    = document.getElementById('sf-toast');
const logEl      = document.getElementById('sf-log');
const logEmpty   = document.getElementById('sf-log-empty');

const statKills  = document.getElementById('stat-kills');
const statMin    = document.getElementById('stat-min');
const statCycles = document.getElementById('stat-cycles');
const statStreak = document.getElementById('stat-streak');

// ── Helpers ──────────────────────────────────────────────────

// Garante que números < 10 apareçam com zero à esquerda (ex: "05")
function pad(n) {
  return String(n).padStart(2, '0');
}

// Retorna a hora atual formatada (ex: "14:32") para o log
function currentTime() {
  const d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

// ── Renderização ─────────────────────────────────────────────

// Atualiza o display do tempo e a animação do anel SVG
function render() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timeEl.textContent = pad(m) + ':' + pad(s); // atualiza texto no DOM

  // strokeDashoffset controla quanto do anel fica visível
  // quando pct = 1 (cheio) o offset é 0; quando pct = 0 (vazio) o offset = CIRCUMFERENCE
  const pct = remaining / totalSeconds;
  ring.style.strokeDashoffset = ((1 - pct) * CIRCUMFERENCE).toFixed(2);
}

// ── Troca de modo ────────────────────────────────────────────

function setMode(mode) {
  if (running) stopTimer(); // para o timer antes de trocar

  currentMode  = mode;
  const cfg    = MODES[mode];
  totalSeconds = cfg.minutes * 60;
  remaining    = totalSeconds;

  // Atualiza texto e cor do anel no DOM
  modeEl.textContent = cfg.label;
  ring.style.stroke  = cfg.stroke;

  // Remove a classe "active" de todas as abas e ativa a correta
  document.querySelectorAll('.sf-tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById(cfg.tabId).classList.add('active');

  // Reseta visual dos controles
  btnStart.textContent = 'Iniciar';
  btnStart.classList.remove('paused');
  dot.classList.remove('active');
  statusText.textContent = 'Aguardando início';

  render();
}

// ── Iniciar / Pausar ─────────────────────────────────────────

// Função chamada pelo onclick do botão principal — alterna entre rodar e pausar
function toggleTimer() {
  if (running) {
    stopTimer();
    btnStart.textContent = 'Continuar';
    btnStart.classList.add('paused');
    dot.classList.remove('active');
    statusText.textContent = 'Pausado';
  } else {
    startTimer();
    btnStart.textContent = 'Pausar';
    btnStart.classList.remove('paused');
    dot.classList.add('active');
    statusText.textContent = 'Em execução...';
  }
}

function startTimer() {
  running = true;
  // setInterval executa o callback a cada 1000ms (1 segundo)
  intervalId = setInterval(() => {
    if (remaining <= 0) {
      clearInterval(intervalId); // para o interval quando chegar a zero
      running = false;
      onSessionComplete();
      return;
    }
    remaining--;
    render(); // re-renderiza a cada tick
  }, 1000);
}

function stopTimer() {
  clearInterval(intervalId); // cancela o setInterval pelo id guardado
  running = false;
}

// ── Reset ─────────────────────────────────────────────────────

function resetTimer() {
  stopTimer();
  remaining = totalSeconds; // volta ao tempo total do modo atual
  btnStart.textContent = 'Iniciar';
  btnStart.classList.remove('paused');
  dot.classList.remove('active');
  statusText.textContent = 'Aguardando início';
  render();
}

// ── Pular sessão ─────────────────────────────────────────────

function skipSession() {
  stopTimer();
  onSessionComplete(); // trata como se a sessão tivesse terminado
}

// ── Lógica ao concluir uma sessão ───────────────────────────

function onSessionComplete() {
  btnStart.textContent = 'Iniciar';
  btnStart.classList.remove('paused');
  dot.classList.remove('active');
  statusText.textContent = 'Operação concluída';

  const cfg = MODES[currentMode];
  addLogEntry(cfg.logLabel, cfg.logClass); // registra no log de eventos

  if (currentMode === 'focus') {
    // Atualiza os contadores e reflete no DOM
    missions++;
    streak++;
    minutes += cfg.minutes;
    statKills.textContent  = missions;
    statMin.textContent    = minutes;
    statStreak.textContent = streak;

    // A cada 4 missões completa um ciclo e vai para pausa longa
    if (missions % 4 === 0) {
      cycles++;
      statCycles.textContent = cycles;
      showToast('Ciclo completo! Retorno à base para descanso longo.');
    } else {
      showToast('Missão concluída! Recuando para pausa curta.');
    }

    // Aguarda um momento antes de trocar de modo automaticamente
    setTimeout(() => setMode(missions % 4 === 0 ? 'long' : 'short'), 1600);

  } else {
    // Pausa encerrada — zera sequência e volta ao foco
    streak = 0;
    statStreak.textContent = streak;
    showToast('Pausa encerrada. Nova missão disponível!');
    setTimeout(() => setMode('focus'), 1600);
  }
}

// ── Log de eventos ───────────────────────────────────────────

// Cria dinamicamente um elemento <div> e insere no topo da lista
function addLogEntry(text, cssClass) {
  if (logEmpty) logEmpty.style.display = 'none'; // esconde o placeholder vazio

  const item = document.createElement('div');  // cria elemento no DOM
  item.className = 'sf-log-item';
  item.innerHTML =
    `<div class="sf-log-dot ${cssClass}"></div>` +
    `<div class="sf-log-text">${text}</div>` +
    `<div class="sf-log-time">${currentTime()}</div>`;

  logEl.insertBefore(item, logEl.firstChild); // insere no início (mais recente no topo)
}

// ── Toast de notificação ─────────────────────────────────────

// Exibe uma mensagem temporária por 3 segundos
function showToast(msg) {
  toastEl.textContent   = msg;
  toastEl.style.display = 'block';
  clearTimeout(toastTimer); // cancela um toast anterior se ainda estiver ativo
  toastTimer = setTimeout(() => {
    toastEl.style.display = 'none';
  }, 3000);
}

// ── Inicialização ─────────────────────────────────────────────
// Renderiza o estado inicial assim que o script é carregado
render();
