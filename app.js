/**
 * COLUNA FORTE & SEGURA - LÓGICA E INTERATIVIDADE DO WEB APP
 * Protocolo de Treino para Hérnia de Disco
 * Suporte a Cards Retráteis, Responsividade Prime e Timers
 */

// Estado Global
const STORAGE_KEY_SETS = 'treino_fisio_sets_v1';
const STORAGE_KEY_THEME = 'treino_fisio_theme_v1';
const STORAGE_KEY_COLLAPSED = 'treino_fisio_collapsed_v1';
const STORAGE_KEY_FOCUS = 'treino_fisio_focus_v1';

let isFocusMode = false;
let timerInterval = null;
let timerSecondsRemaining = 0;
let timerIsRunning = false;
let currentTimerTitle = 'Cronômetro';

// Inicialização após carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCategoryTabs();
  initSetsTracker();
  initFloatingTimer();
  initCardCollapsibles();
  initPrintButton();
  initKeyboardShortcuts();
});

/* ==========================================================================
   1. GERENCIAMENTO DE TEMA (DARK / LIGHT)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeIcon.textContent = '🌙';
  } else {
    document.body.classList.remove('light-theme');
    themeIcon.textContent = '☀️';
  }

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeIcon.textContent = isLight ? '🌙' : '☀️';
    localStorage.setItem(STORAGE_KEY_THEME, isLight ? 'light' : 'dark');
  });
}

/* ==========================================================================
   2. FILTRO DE CATEGORIAS / ABAS
   ========================================================================== */
function initCategoryTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const exerciseCards = document.querySelectorAll('.exercise-card');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetCat = btn.getAttribute('data-category');

      exerciseCards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (targetCat === 'all' || cardCat === targetCat) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 10);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 200);
        }
      });
    });
  });
}

/* ==========================================================================
   2.5. CARDS MINIMIZÁVEIS / SANFONA (ACCORDION) & MODO FOCO
   ========================================================================== */
function initCardCollapsibles() {
  const headerBars = document.querySelectorAll('.card-header-bar');
  const btnCollapseAll = document.getElementById('btn-collapse-all');
  const btnExpandAll = document.getElementById('btn-expand-all');
  const btnFocusMode = document.getElementById('btn-focus-mode');
  const focusStatus = document.getElementById('focus-mode-status');

  // Restaurar preferência de modo foco
  const savedFocus = localStorage.getItem(STORAGE_KEY_FOCUS);
  if (savedFocus === 'true') {
    isFocusMode = true;
    if (btnFocusMode) btnFocusMode.classList.add('active');
    if (focusStatus) focusStatus.textContent = 'Ativo';
  }

  // Alternar Modo Foco (1 por vez)
  if (btnFocusMode) {
    btnFocusMode.addEventListener('click', () => {
      isFocusMode = !isFocusMode;
      localStorage.setItem(STORAGE_KEY_FOCUS, isFocusMode ? 'true' : 'false');
      btnFocusMode.classList.toggle('active', isFocusMode);
      if (focusStatus) {
        focusStatus.textContent = isFocusMode ? 'Ativo' : '1 por vez';
      }
      triggerHaptic();

      // Ao ligar o modo foco, recolhe todos exceto o primeiro card aberto
      if (isFocusMode) {
        let firstOpen = false;
        document.querySelectorAll('.exercise-card').forEach(card => {
          if (!card.classList.contains('collapsed')) {
            if (!firstOpen) {
              firstOpen = true;
            } else {
              card.classList.add('collapsed');
            }
          }
        });
      }
    });
  }

  // Clique no header para alternar
  headerBars.forEach(bar => {
    bar.addEventListener('click', (e) => {
      const card = bar.closest('.exercise-card');
      if (card) {
        toggleCard(card);
      }
    });
  });

  // Recolher Todos (Modo Lista Compacta para Celular)
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      document.querySelectorAll('.exercise-card').forEach(card => {
        card.classList.add('collapsed');
      });
      triggerHaptic();
    });
  }

  // Expandir Todos
  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      document.querySelectorAll('.exercise-card').forEach(card => {
        card.classList.remove('collapsed');
      });
      triggerHaptic();
    });
  }
}

function toggleCard(card) {
  if (!card) return;
  const isCurrentlyCollapsed = card.classList.contains('collapsed');

  if (isCurrentlyCollapsed) {
    // Abrindo o card
    if (isFocusMode) {
      // Se estiver no Modo Foco, recolhe todos os outros cards
      document.querySelectorAll('.exercise-card').forEach(other => {
        if (other !== card) {
          other.classList.add('collapsed');
        }
      });
    }
    card.classList.remove('collapsed');
  } else {
    // Recolhendo o card
    card.classList.add('collapsed');
  }

  triggerHaptic();
}

// Exportar para escopo global para acionamento via onclick
window.toggleCard = toggleCard;

/* ==========================================================================
   3. CHECKLIST DE SÉRIES E PERSISTÊNCIA LOCAL
   ========================================================================== */
function getSavedSets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveSets(data) {
  try {
    localStorage.setItem(STORAGE_KEY_SETS, JSON.stringify(data));
  } catch (e) {
    console.warn('Erro ao salvar no localStorage', e);
  }
}

function initSetsTracker() {
  const savedState = getSavedSets();
  const setButtons = document.querySelectorAll('.set-btn');
  const resetBtn = document.getElementById('btn-reset-session');

  setButtons.forEach(btn => {
    const parentGroup = btn.closest('.sets-buttons-group');
    const exerciseId = parentGroup.getAttribute('data-exercise');
    const setIndex = btn.getAttribute('data-set');
    const stateKey = `${exerciseId}_s${setIndex}`;

    if (savedState[stateKey]) {
      btn.classList.add('checked');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('checked');
      const isChecked = btn.classList.contains('checked');
      
      const currentData = getSavedSets();
      currentData[stateKey] = isChecked;
      saveSets(currentData);

      updateExerciseProgress(exerciseId);
      updateGlobalProgressBar();

      if (isChecked) {
        triggerHaptic();
      }
    });
  });

  document.querySelectorAll('.sets-buttons-group').forEach(group => {
    const exerciseId = group.getAttribute('data-exercise');
    updateExerciseProgress(exerciseId);
  });

  updateGlobalProgressBar();

  resetBtn.addEventListener('click', () => {
    if (confirm('Deseja reiniciar todas as séries do treino de hoje?')) {
      localStorage.removeItem(STORAGE_KEY_SETS);
      setButtons.forEach(btn => btn.classList.remove('checked'));
      document.querySelectorAll('.sets-buttons-group').forEach(group => {
        const exerciseId = group.getAttribute('data-exercise');
        updateExerciseProgress(exerciseId);
      });
      updateGlobalProgressBar();
    }
  });
}

function updateExerciseProgress(exerciseId) {
  const group = document.querySelector(`.sets-buttons-group[data-exercise="${exerciseId}"]`);
  if (!group) return;

  const totalSets = parseInt(group.getAttribute('data-total-sets'), 10) || 3;
  const checkedSets = group.querySelectorAll('.set-btn.checked').length;
  
  const label = document.getElementById(`label-${exerciseId}`);
  if (label) {
    label.textContent = `${checkedSets}/${totalSets}`;
  }

  // Atualizar também o mini status no header do card (visível mesmo minimizado!)
  const miniStatus = document.getElementById(`ministatus-${exerciseId}`);
  if (miniStatus) {
    if (checkedSets === totalSets) {
      miniStatus.textContent = `✓ ${checkedSets}/${totalSets} S`;
    } else {
      miniStatus.textContent = `${checkedSets}/${totalSets} S`;
    }
  }

  const card = group.closest('.exercise-card');
  if (card) {
    if (checkedSets === totalSets) {
      card.classList.add('completed');
    } else {
      card.classList.remove('completed');
    }
  }
}

function updateGlobalProgressBar() {
  const totalCards = document.querySelectorAll('.exercise-card').length;
  const completedCards = document.querySelectorAll('.exercise-card.completed').length;
  
  const percent = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;
  
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-percent-text');

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }
  if (progressText) {
    progressText.textContent = `${completedCards} de ${totalCards} concluídos (${percent}%)`;
  }
}

function triggerHaptic() {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(40);
    } catch (e) {}
  }
}

/* ==========================================================================
   4. CRONÔMETRO FLUTUANTE COM SÍNTESE DE ÁUDIO WEB AUDIO API
   ========================================================================== */
function initFloatingTimer() {
  const toggleBtn = document.getElementById('btn-timer-toggle');
  const add15Btn = document.getElementById('btn-timer-add15');
  const resetBtn = document.getElementById('btn-timer-reset');
  const minimizeBtn = document.getElementById('btn-timer-minimize');
  const bubbleBtn = document.getElementById('btn-timer-bubble');
  const floatingDock = document.getElementById('floating-timer');

  toggleBtn.addEventListener('click', toggleTimer);
  add15Btn.addEventListener('click', () => {
    timerSecondsRemaining += 15;
    updateTimerDisplay();
    triggerHaptic();
  });
  resetBtn.addEventListener('click', resetTimer);

  if (minimizeBtn && floatingDock && bubbleBtn) {
    minimizeBtn.addEventListener('click', () => {
      floatingDock.classList.add('hidden-dock');
      bubbleBtn.style.display = 'flex';
      triggerHaptic();
    });

    bubbleBtn.addEventListener('click', () => {
      floatingDock.classList.remove('hidden-dock');
      bubbleBtn.style.display = 'none';
      triggerHaptic();
    });
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  const bubbleDigits = document.getElementById('timer-bubble-digits');
  const label = document.getElementById('timer-status-label');
  const formatted = formatTime(timerSecondsRemaining);
  if (display) display.textContent = formatted;
  if (bubbleDigits) bubbleDigits.textContent = formatted;
  if (label) label.textContent = currentTimerTitle;
}

function startTimer(seconds, label = 'Cronômetro') {
  currentTimerTitle = label;
  timerSecondsRemaining = seconds;
  updateTimerDisplay();

  // Reabre dock se estiver minimizado
  const floatingDock = document.getElementById('floating-timer');
  const bubbleBtn = document.getElementById('btn-timer-bubble');
  if (floatingDock) floatingDock.classList.remove('hidden-dock');
  if (bubbleBtn) bubbleBtn.style.display = 'none';

  const toggleBtn = document.getElementById('btn-timer-toggle');
  if (toggleBtn) toggleBtn.textContent = '⏸';

  if (timerInterval) clearInterval(timerInterval);
  timerIsRunning = true;

  timerInterval = setInterval(() => {
    if (timerSecondsRemaining > 0) {
      timerSecondsRemaining--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerIsRunning = false;
      if (toggleBtn) toggleBtn.textContent = '▶';
      currentTimerTitle = 'Tempo Esgotado!';
      updateTimerDisplay();
      playCompletionChime();
      flashTimerBar();
    }
  }, 1000);

  const timerBar = document.getElementById('floating-timer');
  if (timerBar) {
    timerBar.style.transform = 'translateX(-50%) scale(1.06)';
    setTimeout(() => {
      timerBar.style.transform = 'translateX(-50%) scale(1)';
    }, 250);
  }
}

function toggleTimer() {
  const toggleBtn = document.getElementById('btn-timer-toggle');
  if (timerIsRunning) {
    clearInterval(timerInterval);
    timerIsRunning = false;
    if (toggleBtn) toggleBtn.textContent = '▶';
  } else {
    if (timerSecondsRemaining <= 0) {
      timerSecondsRemaining = 60;
      currentTimerTitle = 'Descanso';
    }
    startTimer(timerSecondsRemaining, currentTimerTitle);
  }
}

function resetTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerIsRunning = false;
  timerSecondsRemaining = 0;
  currentTimerTitle = 'Cronômetro';
  updateTimerDisplay();
  const toggleBtn = document.getElementById('btn-timer-toggle');
  if (toggleBtn) toggleBtn.textContent = '▶';
}

function flashTimerBar() {
  const timerBar = document.getElementById('floating-timer');
  if (!timerBar) return;
  timerBar.style.boxShadow = '0 0 25px #10b981';
  triggerHaptic();
  setTimeout(() => {
    timerBar.style.boxShadow = '';
  }, 2000);
}

function playCompletionChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [587.33, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + idx * 0.15);
      osc.stop(ctx.currentTime + idx * 0.15 + 0.4);
    });
  } catch (e) {
    console.log('Web Audio indisponível.');
  }
}

/* ==========================================================================
   4.5. ALTERNÂNCIA DE MODO DE VISUALIZAÇÃO (PESSOA REAL VS BIOMECÂNICA)
   ========================================================================== */
function switchCardView(btn, mode) {
  const card = btn.closest('.exercise-card');
  if (!card) return;

  const toggleGroup = card.querySelector('.view-mode-segmented');
  if (toggleGroup) {
    toggleGroup.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
  }
  btn.classList.add('active');

  const cardWrapper = card.querySelector('.card-image-wrapper');
  if (!cardWrapper) return;

  const img = cardWrapper.querySelector('img');
  if (!img) return;

  const humanSrc = cardWrapper.getAttribute('data-human-src');
  const diagramSrc = cardWrapper.getAttribute('data-diagram-src');

  img.style.opacity = '0.3';
  setTimeout(() => {
    if (mode === 'diagram' && diagramSrc) {
      img.src = diagramSrc;
    } else if (mode === 'human' && humanSrc) {
      img.src = humanSrc;
    }
    img.style.opacity = '1';
  }, 120);
}

function handleCardImageClick(wrapper) {
  const img = wrapper.querySelector('img');
  if (!img) return;
  const title = wrapper.getAttribute('data-title') || img.alt || 'Exercício';
  openLightbox(img.src, title);
}

/* ==========================================================================
   5. LIGHTBOX MODAL PARA AMPLIAR IMAGENS
   ========================================================================== */
function openLightbox(src, caption) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');

  if (modal && img && cap) {
    img.src = src;
    img.alt = caption;
    cap.textContent = caption;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeLightbox(e) {
  if (e && e.target && e.target.id === 'lightbox-img') return;
  const modal = document.getElementById('lightbox-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ==========================================================================
   6. EXPORTAR / IMPRIMIR EM PDF
   ========================================================================== */
function initPrintButton() {
  const printBtn = document.getElementById('btn-print-pdf');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      // Abre a caixa de diálogo nativa
      window.print();
    });
  }
}

/* ==========================================================================
   7. ATALHOS DE TECLADO
   ========================================================================== */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    }
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      toggleTimer();
    }
  });
}

// Exportações explícitas para garantir compatibilidade com onclick inline
window.toggleCard = toggleCard;
window.switchCardView = switchCardView;
window.handleCardImageClick = handleCardImageClick;
window.startTimer = startTimer;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

