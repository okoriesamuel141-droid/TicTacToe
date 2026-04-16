const statusEl = document.getElementById('status');
const boardEl = document.getElementById('board');
const restartBtn = document.getElementById('restartBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const winOverlay = document.getElementById('winOverlay');
const winMessage = document.getElementById('winMessage');
const playAgainBtn = document.getElementById('playAgainBtn');
const settingsBtn = document.getElementById('settingsBtn');
const onlinePanel = document.getElementById('onlinePanel');
const roomInput = document.getElementById('roomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const onlineStatus = document.getElementById('onlineStatus');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const targetWinsEl = document.getElementById('targetWins');
const confettiCanvas = document.getElementById('confettiCanvas');

let socket = null;
let roomCode = null;
let mySymbol = null;
let opponentConnected = false;

const winStates = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

let board = Array(9).fill('');
let current = 'X';
let gameOver = false;
let score = { X: 0, O: 0 };
let targetWins = 2;
let matchOver = false;
let confettiParticles = [];
let animationId;
let settings = { mode: 'pvp', difficulty: 'easy', bestOf: '3' };

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(frequency = 440, duration = 120, volume = 0.08) {
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function makeConfetti() {
  const w = confettiCanvas.width;
  const h = confettiCanvas.height;
  const count = 110;
  const colors = ['#50c0ff','#56ebe8','#ff5a9c','#ffb74d','#8cff5d'];
  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: Math.random() * w,
      y: -Math.random() * 200,
      r: 4 + Math.random() * 4,
      d: Math.random() * 60 + 20,
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      velocityX: Math.random() * 4 - 2,
      velocityY: Math.random() * 2 + 2
    });
  }
}

function animateConfetti() {
  const ctx = confettiCanvas.getContext('2d');
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach((p) => {
    p.tiltAngle += 0.05;
    p.y += p.velocityY;
    p.x += p.velocityX + Math.sin(p.tiltAngle);
    p.tilt = Math.sin(p.tiltAngle) * 15;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
    ctx.lineTo(p.x + p.tilt, p.y + p.r);
    ctx.lineTo(p.x + p.tilt + p.r, p.y + p.r);
    ctx.closePath();
    ctx.fill();
  });
  confettiParticles = confettiParticles.filter(p => p.y < confettiCanvas.height + 20);
  if (confettiParticles.length > 0) {
    animationId = requestAnimationFrame(animateConfetti);
  } else {
    cancelAnimationFrame(animationId);
  }
}

function triggerConfetti() {
  makeConfetti();
  if (!animationId) animateConfetti();
}

function resetMatch() {
  score = { X: 0, O: 0 };
  matchOver = false;
  updateScoreboard();
  startNewRound();
}

function updateScoreboard() {
  scoreXEl.textContent = score.X;
  scoreOEl.textContent = score.O;
  targetWinsEl.textContent = targetWins;
}

function setOnlineStatus(message, isError = false) {
  onlineStatus.textContent = message;
  onlineStatus.style.color = isError ? '#ff8f8f' : '#b4d4ff';
}

function configureMatch() {
  targetWins = Math.ceil((Number(settings.bestOf) || 3) / 2);
  updateScoreboard();
  if (settings.mode === 'online') {
    onlinePanel.classList.add('visible');
    setOnlineStatus('Ready for online room (create or join)');
    connectSocket();
  } else {
    onlinePanel.classList.remove('visible');
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    roomCode = null;
    mySymbol = null;
    opponentConnected = false;
  }
}

function connectSocket() {
  if (socket) return;

  socket = io();

  socket.on('connect', () => {
    setOnlineStatus('Connected to server. Create or join a room.');
  });

  socket.on('disconnect', () => {
    setOnlineStatus('Disconnected. Reconnecting...', true);
    roomCode = null;
    mySymbol = null;
    opponentConnected = false;
  });

  socket.on('room_created', (data) => {
    roomCode = data.room;
    mySymbol = data.symbol;
    opponentConnected = false;
    setOnlineStatus(`Room ${roomCode} created. Waiting opponent...`);
    statusEl.textContent = `You are ${mySymbol}. Waiting for opponent ...`;
  });

  socket.on('room_joined', (data) => {
    roomCode = data.room;
    mySymbol = data.symbol;
    opponentConnected = true;
    setOnlineStatus(`Joined room ${roomCode} as ${mySymbol}`);
    statusEl.textContent = `You are ${mySymbol}. Waiting for game start...`;
  });

  socket.on('start_game', (data) => {
    opponentConnected = true;
    mySymbol = data.yourSymbol;
    roomCode = data.room;
    current = 'X';
    gameOver = false;
    matchOver = false;
    board = Array(9).fill('');
    updateScoreboard();
    showGameStatus();
    render();
    setOnlineStatus(`Game started in room ${roomCode}. You are ${mySymbol}`);
  });

  socket.on('opponent_move', (data) => {
    if (settings.mode !== 'online') return;
    board[data.idx] = data.symbol;
    playTone(280, 60, 0.08);
    processBoardEvent(true);
  });

  socket.on('round_result', (data) => {
    if (!data.winner) {
      showWinOverlay('It is a draw!');
    } else {
      // animate winner locally and update scoring already done by processBoardEvent from move
      // If this is remote extra info, it can be shown as needed
    }
  });

  socket.on('room_error', (data) => {
    setOnlineStatus(data.error, true);
  });

  socket.on('opponent_left', () => {
    opponentConnected = false;
    setOnlineStatus('Opponent left. Waiting for reconnect...', true);
    statusEl.textContent = 'Opponent disconnected';
  });
}

function showGameStatus() {
  if (settings.mode === 'online') {
    const turn = current === mySymbol ? 'Your turn' : 'Opponent turn';
    statusEl.textContent = `Online ${mySymbol || '?'} · ${turn}`;
  } else {
    statusEl.textContent = `Player ${current}'s turn`;
  }
}

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem('ticTacToeSettings') || '{}');
  settings = { ...settings, ...saved };
  configureMatch();
}

function startNewRound() {
  board = Array(9).fill('');
  current = 'X';
  gameOver = false;
  statusEl.textContent = "Player X's turn";
  render();
  if (!matchOver && settings.mode === 'ai' && current === 'O') {
    setTimeout(aiMove, 200);
  }
}

function render() {
  boardEl.innerHTML = '';
  board.forEach((cell, idx) => {
    const el = document.createElement('button');
    el.className = 'cell' + (cell ? ' ' + cell.toLowerCase() : '');
    el.textContent = cell;
    let disabled = !!cell || gameOver;
    if (settings.mode === 'online') {
      if (!roomCode || !opponentConnected || !mySymbol) disabled = true;
      if (current !== mySymbol) disabled = true;
    }
    el.disabled = disabled;
    el.addEventListener('click', () => onCellClick(idx));
    boardEl.appendChild(el);
  });
  showGameStatus();
}

function onCellClick(idx) {
  if (gameOver || board[idx]) return;
  if (settings.mode === 'online') {
    if (!roomCode || !opponentConnected || !mySymbol) return;
    if (current !== mySymbol) return;
    board[idx] = current;
    playTone(280, 60, 0.08);
    socket.emit('make_move', { room: roomCode, idx, symbol: current });
    processBoardEvent(false);
    return;
  }

  if (settings.mode === 'ai' && current === 'O') return;

  board[idx] = current;
  playTone(280, 60, 0.08);
  processBoardEvent(false);
}

function processBoardEvent(fromRemote = false) {
  const winner = getWinner();
  if (winner) {
    gameOver = true;
    score[winner] += 1;
    updateScoreboard();
    highlightWinner(winner);
    const roundMessage = `Player ${winner} wins round!`;
    if (!fromRemote && settings.mode === 'online' && socket && roomCode) {
      socket.emit('round_end', { room: roomCode, winner });
    }
    if (score[winner] >= targetWins) {
      matchOver = true;
      showWinOverlay(`Player ${winner} wins match!`);
      playTone(880, 220, 0.16);
      triggerConfetti();
      return;
    }
    showWinOverlay(roundMessage);
    triggerConfetti();
    playTone(660, 180, 0.15);
  } else if (board.every(cell => cell)) {
    gameOver = true;
    if (!fromRemote && settings.mode === 'online' && socket && roomCode) {
      socket.emit('round_end', { room: roomCode, winner: null });
    }
    showWinOverlay('It is a draw!');
    playTone(200, 170, 0.12);
  } else {
    current = current === 'X' ? 'O' : 'X';
    statusEl.textContent = `Player ${current}'s turn`;
    if (settings.mode === 'ai' && current === 'O' && !gameOver) {
      setTimeout(aiMove, 220);
    }
  }
  render();
}

function getWinner() {
  for (let line of winStates) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function highlightWinner(winner) {
  const cells = boardEl.querySelectorAll('.cell');
  for (let line of winStates) {
    const [a,b,c] = line;
    if (board[a] === winner && board[b] === winner && board[c] === winner) {
      [a,b,c].forEach(i => cells[i] && cells[i].classList.add('winner'));
      break;
    }
  }
}

function showWinOverlay(message) {
  winMessage.textContent = message;
  playAgainBtn.textContent = matchOver ? 'New Match' : 'Next Round';
  winOverlay.classList.add('visible');
  winOverlay.classList.remove('hidden');
}

function hideWinOverlay() {
  winOverlay.classList.remove('visible');
  winOverlay.classList.add('hidden');
}

function aiMove() {
  if (gameOver || matchOver) return;
  const emptyIndexes = board.map((v,i) => v === '' ? i : -1).filter(i => i >= 0);
  if (emptyIndexes.length === 0) return;
  const difficulty = settings.difficulty;
  let chosen;
  if (difficulty === 'easy') {
    chosen = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
  } else if (difficulty === 'medium') {
    if (Math.random() < 0.5) {
      chosen = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
    } else {
      chosen = findBestMove('O').index;
    }
  } else {
    chosen = findBestMove('O').index;
  }
  if (chosen === undefined) chosen = emptyIndexes[0];
  board[chosen] = 'O';
  playTone(340, 70, 0.08);
  processBoardEvent();
}

function findBestMove(player) {
  const opponent = player === 'O' ? 'X' : 'O';
  function minimax(boardState, currentPlayer) {
    const winner = getWinnerFromBoard(boardState);
    if (winner === 'O') return { score: 10 };
    if (winner === 'X') return { score: -10 };
    if (boardState.every(cell => cell !== '')) return { score: 0 };
    const moves = [];
    boardState.forEach((cell, idx) => {
      if (cell === '') {
        const clone = [...boardState];
        clone[idx] = currentPlayer;
        const result = minimax(clone, currentPlayer === 'O' ? 'X' : 'O');
        moves.push({ index: idx, score: result.score });
      }
    });
    let bestMove;
    if (currentPlayer === 'O') {
      let bestScore = -Infinity;
      for (let m of moves) {
        if (m.score > bestScore) {
          bestScore = m.score;
          bestMove = m;
        }
      }
    } else {
      let bestScore = Infinity;
      for (let m of moves) {
        if (m.score < bestScore) {
          bestScore = m.score;
          bestMove = m;
        }
      }
    }
    return bestMove;
  }
  return minimax(board, player) || { index: board.findIndex(c => c === '') };
}

function getWinnerFromBoard(boardState) {
  for (let line of winStates) {
    const [a,b,c] = line;
    if (boardState[a] && boardState[a] === boardState[b] && boardState[b] === boardState[c]) {
      return boardState[a];
    }
  }
  return null;
}

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

settingsBtn.addEventListener('click', () => {
  window.location.href = 'settings.html';
});

createRoomBtn.addEventListener('click', () => {
  if (!socket) connectSocket();
  if (socket) {
    socket.emit('create_room');
  }
});

joinRoomBtn.addEventListener('click', () => {
  const code = roomInput.value.trim().toUpperCase();
  if (!code) {
    setOnlineStatus('Enter a room code to join.', true);
    return;
  }
  if (!socket) connectSocket();
  if (socket) {
    socket.emit('join_room', { room: code });
  }
});

restartBtn.addEventListener('click', () => {
  hideWinOverlay();
  resetMatch();
});

playAgainBtn.addEventListener('click', () => {
  hideWinOverlay();
  if (matchOver) {
    resetMatch();
  } else {
    startNewRound();
  }
});

window.addEventListener('resize', resizeCanvas);

loadSettings();
resizeCanvas();
startNewRound();
