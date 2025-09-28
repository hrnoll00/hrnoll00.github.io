const el = id => document.getElementById(id);

const hostBtn = el('hostBtn');
const joinBtn = el('joinBtn');
const hostView = el('hostView');
const joinView = el('joinView');
const home = el('home');
const codeBox = el('codeBox');
const backFromHost = el('backFromHost');
const backFromJoin = el('backFromJoin');
const joinCodeInput = el('joinCodeInput');
const doJoin = el('doJoin');
const joinResult = el('joinResult');
const nameInput = el('nameInput');

const playerList = el('playerList');
const startRound = el('startRound');
const clientLobby = el('clientLobby');
const clientPlayerList = el('clientPlayerList');
const clientStageInfo = el('clientStageInfo');
const submissionView = el('submissionView');
const promptsArea = el('promptsArea');
const submitAnswers = el('submitAnswers');
const votingView = el('votingView');
const votingArea = el('votingArea');
const finishVoting = el('finishVoting');
const resultsView = el('resultsView');
const resultsArea = el('resultsArea');
const backToHome = el('backToHome');

let currentCode = null;
let currentPlayer = null;
let poller = null;


function show(view) {
  home.classList.add('hidden');
  hostView.classList.add('hidden');
  joinView.classList.add('hidden');
  view.classList.remove('hidden');
}

hostBtn.addEventListener('click', () => {
  // Show host setup screen first (do not create room until user clicks Create Game)
  show(hostView);
});

const createGameBtn = el('createGameBtn');
const hostNameInput = el('hostNameInput');
const lobbyArea = el('lobbyArea');
const hostAvatarRow = el('hostAvatarRow');
const joinAvatarRow = el('joinAvatarRow');
const joinNameInput = el('joinNameInput');

let selectedHostAvatar = '🧑';
let selectedJoinAvatar = '🙂';

function setupAvatarRow(rowEl, onSelect) {
  if (!rowEl) return;
  rowEl.querySelectorAll('.avatar').forEach(btn => {
    btn.addEventListener('click', e => {
      rowEl.querySelectorAll('.avatar').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(btn.textContent);
    });
  });
}

setupAvatarRow(hostAvatarRow, a => selectedHostAvatar = a);
setupAvatarRow(joinAvatarRow, a => selectedJoinAvatar = a);

createGameBtn.addEventListener('click', async () => {
  // Create the room and show the code + lobby
  codeBox.textContent = '...';
  try {
    const payload = { name: hostNameInput.value.trim(), avatar: selectedHostAvatar };
    const res = await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    codeBox.textContent = data.code;
    currentCode = data.code;
    // mark current player as host object returned by server
    currentPlayer = data.host;
    // show lobby area
    lobbyArea.classList.remove('hidden');
    startPolling();
  } catch (err) {
    codeBox.textContent = 'Error creating room';
  }
});

joinBtn.addEventListener('click', () => show(joinView));
backFromHost.addEventListener('click', () => show(home));
backFromJoin.addEventListener('click', () => show(home));

doJoin.addEventListener('click', async () => {
  // Normalize code to uppercase so it's case-insensitive for users
  const code = joinCodeInput.value.trim().toUpperCase();
  const name = joinNameInput ? joinNameInput.value.trim() : '';
  if (!/^[A-Za-z0-9]{6}$/.test(code)) {
    joinResult.textContent = 'Please enter a 6-character code.';
    return;
  }
  joinResult.textContent = 'Joining...';
  try {
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, avatar: selectedJoinAvatar })
    });
    const data = await res.json();
    if (res.ok) {
      currentCode = code;
      currentPlayer = data.player;
      joinResult.textContent = 'Joined! Players: ' + data.players.map(p => p.name).join(', ');
      clientLobby.classList.remove('hidden');
      startPolling();
    } else {
      joinResult.textContent = data.error || 'Failed to join';
    }
  } catch (err) {
    joinResult.textContent = 'Network error';
  }
});

function startPolling() {
  stopPolling();
  poller = setInterval(fetchState, 1000);
  fetchState();
}

function stopPolling() {
  if (poller) clearInterval(poller);
  poller = null;
}

async function fetchState() {
  if (!currentCode) return;
  try {
    const res = await fetch('/api/state/' + currentCode);
    if (!res.ok) throw new Error('No room');
    const s = await res.json();
    // update lobby
    renderLobbyPlayers(s.players || [], s.hostId);

    // stage transitions
    if (s.stage === 'submission') {
      show(submissionView);
      renderPrompts(s.prompts);
    } else if (s.stage === 'voting') {
      show(votingView);
      renderVoting(s.prompts, s.submissions);
    } else if (s.stage === 'results') {
      show(resultsView);
      renderResults(s.prompts, s.submissions, s.results);
    }
  } catch (err) {
    console.log('fetchState err', err);
  }
}

function renderLobbyPlayers(players, hostId) {
  // Render chips with avatar and name
  if (playerList) {
    playerList.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'lobby-list';
    players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      if (p.id === hostId) chip.style.border = '2px solid rgba(57,68,214,0.12)';
      chip.innerHTML = `<div class="player-avatar">${p.avatar || '🙂'}</div><div class="player-name">${p.name}</div>`;
      list.appendChild(chip);
    });
    playerList.appendChild(list);
  }
  if (clientPlayerList) {
    clientPlayerList.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'lobby-list';
    players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      if (p.id === hostId) chip.style.border = '2px solid rgba(57,68,214,0.12)';
      chip.innerHTML = `<div class="player-avatar">${p.avatar || '🙂'}</div><div class="player-name">${p.name}</div>`;
      list.appendChild(chip);
    });
    clientPlayerList.appendChild(list);
  }
  // enable/disable startRound button based on host and min players
  const isHost = currentPlayer && currentPlayer.id === hostId;
  const minOk = players.length >= 3;
  if (startRound) startRound.disabled = !(isHost && minOk);
}

function renderPrompts(prompts) {
  promptsArea.innerHTML = '';
  prompts.forEach((p, idx) => {
    const div = document.createElement('div');
    div.innerHTML = `<div class="prompt">${p}</div><input data-prompt="${idx}" placeholder="Your answer" />`;
    promptsArea.appendChild(div);
  });
}

submitAnswers.addEventListener('click', async () => {
  const inputs = promptsArea.querySelectorAll('input');
  for (const input of inputs) {
    const promptIndex = input.getAttribute('data-prompt');
    const text = input.value.trim() || '...';
    await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: currentCode, playerId: currentPlayer.id, promptIndex, text })});
  }
  // after submitting, wait for host to move to voting
  alert('Submitted! Wait for voting to start.');
});

startRound.addEventListener('click', async () => {
  // sample prompts
  const prompts = ['Finish this sentence: My secret talent is...', 'A ridiculous campus rule would be...'];
  await fetch('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: currentCode, prompts })});
});

function renderVoting(prompts, submissions) {
  votingArea.innerHTML = '';
  prompts.forEach((p, idx) => {
    const div = document.createElement('div');
    div.innerHTML = `<div class="prompt">${p}</div>`;
    const list = document.createElement('div');
    const subs = submissions[idx] || [];
    subs.forEach((s, si) => {
      const b = document.createElement('button');
      b.textContent = s.text;
      b.addEventListener('click', async () => {
        await fetch('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: currentCode, voterId: currentPlayer.id, promptIndex: idx, submissionIndex: si })});
        alert('Voted!');
      });
      list.appendChild(b);
    });
    div.appendChild(list);
    votingArea.appendChild(div);
  });
}

finishVoting.addEventListener('click', async () => {
  await fetch('/api/finish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: currentCode })});
});

function renderResults(prompts, submissions, results) {
  resultsArea.innerHTML = '';
  prompts.forEach((p, idx) => {
    const r = results[idx];
    const div = document.createElement('div');
    div.innerHTML = `<div class="prompt">${p}</div>`;
    const subs = submissions[idx] || [];
    subs.forEach((s, si) => {
      const row = document.createElement('div');
      const win = r && r.winnerIndex === si ? ' (WINNER)' : '';
      const count = r ? r.counts[si] : 0;
      row.textContent = `${s.text} - ${count} votes${win}`;
      div.appendChild(row);
    });
    resultsArea.appendChild(div);
  });
}

backToHome.addEventListener('click', () => {
  stopPolling();
  currentCode = null;
  currentPlayer = null;
  show(home);
});
