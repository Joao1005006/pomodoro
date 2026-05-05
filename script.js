/* ── Configuração dos modos ── */
const MODES = {
  focus: {
    label:    'MISSÃO ATIVA',
    minutes:  25,
    stroke:   '#c0392b',
    tabId:    'tab-focus',
    logLabel: 'Missão concluída',
    logClass: 'focus'
  },
  short: {
    label:    'RECUO — PAUSA',
    minutes:  5,
    stroke:   '#27ae60',
    tabId:    'tab-short',
    logLabel: 'Recuo encerrado',
    logClass: 'short'
  },
  long: {
    label:    'BASE — DESCANSO',
    minutes:  15,
    stroke:   '#2980b9',
    tabId:    'tab-long',
    logLabel: 'Retorno à base',
    logClass: 'long'
  }
};

const CIRCUMFERENCE = 2 * Math.PI * 78; // r = 78

/* ── Estado da aplicação ── */
let currentMode = 'focus';
let totalSeconds = 25 * 60;
let remaining    = 25 * 60;
let running      = false;
let intervalId   = null;
let toastTimer   = null;

/* Contadores de eventos */
let missions = 0;
let minutes  = 0;
let cycles   = 0;
let streak   = 0;

/* ── Referências ao DOM ── */
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

/* ── Helpers ── */
function pad(n) {
  return String(n).padStart(2, '0');
}

function currentTime() {
  const d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* ── Renderiza o timer e o anel SVG ── */
function render() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timeEl.textContent = pad(m) + ':' + pad(s);

  const pct = remaining / totalSeconds;
  ring.style.strokeDashoffset = ((1 - pct) * CIRCUMFERENCE).toFixed(2);
}

/* ── Troca de modo (Missão / Recuo / Base) ── */
function setMode(mode) {
  if (running) stopTimer();

  currentMode  = mode;
  const cfg    = MODES[mode];
  totalSeconds = cfg.minutes * 60;
  remaining    = totalSeconds;

  modeEl.textContent = cfg.label;
  ring.style.stroke  = cfg.stroke;

  document.querySelectorAll('.sf-tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById(cfg.tabId).classList.add('active');

  btnStart.textContent = 'Iniciar';
  btnStart.classList.remove('paused');
  dot.classList.remove('active');
  statusText.textContent = 'Aguardando início';

  render();
}

/* ── Iniciar / Pausar (toggle) ── */
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
  intervalId = setInterval(() => {
    if (remaining <= 0) {
      clearInterval(intervalId);
      running = false;
      onSessionComplete();
      return;
    }
    remaining--;
    render();
  }, 1000);
}

function stopTimer() {
  clearInterval(intervalId);
  running = false;
}

/* ── Resetar ── */
function resetTimer() {
  stopTimer();
  remaining = totalSeconds;
  btnStart.textContent = 'Iniciar';
  btnStart.classList.remove('paused');
  dot.classList.remove('active');
  statusText.textContent = 'Aguardando início';
  render();
}

/* ── Pular sessão ── */
function skipSession() {
  stopTimer();
  onSessionComplete();
}

/* ── Lógica ao concluir uma sessão ── */
function onSessionComplete() {
  btnStart.textContent = 'Iniciar';
  btnStart.classList.remove('paused');
  dot.classList.remove('active');
  statusText.textContent = 'Operação concluída';

  const cfg = MODES[currentMode];
  addLogEntry(cfg.logLabel, cfg.logClass);

  if (currentMode === 'focus') {
    missions++;
    streak++;
    minutes += cfg.minutes;

    statKills.textContent  = missions;
    statMin.textContent    = minutes;
    statStreak.textContent = streak;

    if (missions % 4 === 0) {
      cycles++;
      statCycles.textContent = cycles;
      showToast('Ciclo completo! Retorno à base para descanso longo.');
    } else {
      showToast('Missão concluída! Recuando para pausa curta.');
    }

    setTimeout(() => setMode(missions % 4 === 0 ? 'long' : 'short'), 1600);

  } else {
    streak = 0;
    statStreak.textContent = streak;
    showToast('Pausa encerrada. Nova missão disponível!');
    setTimeout(() => setMode('focus'), 1600);
  }
}

/* ── Adicionar entrada no log de eventos ── */
function addLogEntry(text, cssClass) {
  if (logEmpty) logEmpty.style.display = 'none';

  const item = document.createElement('div');
  item.className = 'sf-log-item';
  item.innerHTML =
    `<div class="sf-log-dot ${cssClass}"></div>` +
    `<div class="sf-log-text">${text}</div>` +
    `<div class="sf-log-time">${currentTime()}</div>`;

  logEl.insertBefore(item, logEl.firstChild);
}

/* ── Exibir toast de notificação ── */
function showToast(msg) {
  toastEl.textContent   = msg;
  toastEl.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.style.display = 'none';
  }, 3000);
}

/* ── Inicialização ── */
render();
