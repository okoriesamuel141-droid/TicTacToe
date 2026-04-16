const modeSelect = document.getElementById('modeSelect');
const difficultySelect = document.getElementById('difficultySelect');
const bestOfSelect = document.getElementById('bestOfSelect');
const saveBtn = document.getElementById('saveBtn');
const backBtn = document.getElementById('backBtn');

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('ticTacToeSettings') || '{}');
  modeSelect.value = settings.mode || 'pvp';
  difficultySelect.value = settings.difficulty || 'easy';
  bestOfSelect.value = settings.bestOf || '3';
  configureDifficulty();
}

function saveSettings() {
  const settings = {
    mode: modeSelect.value,
    difficulty: difficultySelect.value,
    bestOf: bestOfSelect.value
  };
  localStorage.setItem('ticTacToeSettings', JSON.stringify(settings));
}

function configureDifficulty() {
  difficultySelect.disabled = modeSelect.value === 'pvp';
}

modeSelect.addEventListener('change', configureDifficulty);

saveBtn.addEventListener('click', () => {
  saveSettings();
  window.location.href = 'index.html';
});

backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

loadSettings();
