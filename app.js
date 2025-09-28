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
const startDemoGame = el('startDemoGame');
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

// Demo join flow: when clicking Join from the home view we enter a client-only lobby demo
joinBtn.addEventListener('click', () => {
  // Show join view inputs first
  show(joinView);
  // If you'd like to bypass code entry and immediately demo the lobby, the user can click "Find"
});
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

// --- Client-only demo lobby (no server) -----------------------------------
// Trigger a purely client-side lobby that simulates other players joining.
const demoBtn = document.createElement('button');
demoBtn.textContent = 'Demo Join (no server)';
demoBtn.className = 'btn ghost';
demoBtn.style.marginTop = '8px';
// Add demo button under join card if present
const joinCard = document.querySelector('.join-card');
if (joinCard) joinCard.appendChild(demoBtn);

demoBtn.addEventListener('click', () => demoJoin());

function demoJoin() {
  // Read name and avatar choice from join inputs (or default)
  const name = (joinNameInput && joinNameInput.value.trim()) || 'You';
  const avatar = selectedJoinAvatar || '🙂';
  // Prepare local lobby state
  currentPlayer = { id: 'demo-' + Date.now(), name, avatar };
  currentCode = 'DEMO';
  // Show client lobby
  joinResult.textContent = '';
  clientLobby.classList.remove('hidden');
  show(joinView);
  // Seed the list with the current player
  const players = [currentPlayer];
  renderClientPlayers(players);

  // Simulate other players joining over the next few seconds
  const simulated = [
    { name: 'Alex', avatar: '😎' },
    { name: 'Taylor', avatar: '🧑‍🎓' },
    { name: 'Sam', avatar: '👩‍🏫' },
    { name: 'Jamie', avatar: '🧑‍💻' }
  ];

  simulated.forEach((p, i) => {
    setTimeout(() => {
      players.push({ id: 'sim-' + i + '-' + Date.now(), name: p.name, avatar: p.avatar });
      // animate insertion by re-rendering
      renderClientPlayers(players);
    }, 800 + i * 900);
  });

  // Store demo players state for game flow
  demoPlayers = players;
  // Ensure the start demo button has a handler (button lives in the clientLobby view)
  const startBtn = document.getElementById('startDemoGame');
  if (startBtn) {
    // remove any existing listeners by cloning the node
    const newBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newBtn, startBtn);
    newBtn.addEventListener('click', startDemoGameFlow);
  }
}

function renderClientPlayers(players) {
  if (!clientPlayerList) return;
  clientPlayerList.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'lobby-list';
  players.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    chip.innerHTML = `<div class="player-avatar">${p.avatar || '🙂'}</div><div class="player-name">${p.name}</div>`;
    list.appendChild(chip);
  });
  clientPlayerList.appendChild(list);
}

// --- Demo game flow state -------------------------------------------------

let demoPlayers = [];
let demoPrompts = []; // array of prompt strings
let demoSubmissions = {}; // { promptIndex: [ { playerId, text } ] }

// NOTE: attach Start Demo Game handler when the demo lobby is shown to ensure the button exists

function startDemoGameFlow() {
  // Only allow if we have players
  if (!demoPlayers || demoPlayers.length < 2) return alert('Need players to demo the game');
  // Move to prompt creation (reuse submissionView as creation screen)
  show(submissionView);
  // Clear and show one input for the human to create a prompt
  promptsArea.innerHTML = '';
  const div = document.createElement('div');
  div.innerHTML = `<div class="prompt">Create a prompt for others to answer</div><input id="createdPromptInput" placeholder="e.g. What's your secret talent?" />`;
  promptsArea.appendChild(div);
  // Change submit button to proceed from creation to answering
  submitAnswers.textContent = 'Save Prompt and Continue';
  const onCreate = async () => {
    const input = document.getElementById('createdPromptInput');
    const text = (input && input.value.trim()) || 'What is your favorite color?';
    demoPrompts = [text];
    // Generate prompts from bot players (to simulate others creating prompts)
    const botPrompts = demoPlayers.slice(1, 3).map((p, i) => {
      return `Answer this: ${['What is your favorite color?','Finish this: My secret talent is...','If I were a college mascot I would be...'][i % 3]}`;
    });
    demoPrompts = demoPrompts.concat(botPrompts);
    // Setup empty submissions for each prompt
    demoSubmissions = {};
    demoPrompts.forEach((_, idx) => demoSubmissions[idx] = []);
    // After creation, go to answer screen where the human answers prompts from others
    // Prepare answer prompts: exclude the human-created prompt for the human to answer others'
    prepareAnswerPhase();
    // restore submit button label and handler
    submitAnswers.textContent = 'Submit Answers';
    submitAnswers.removeEventListener('click', onCreate);
  };
  submitAnswers.addEventListener('click', onCreate);
}

function prepareAnswerPhase() {
  // Build the list of prompts the human must answer (prompts created by bots)
  // For demo: human answers the other players' prompts (indexes 1 and 2)
  const answerPrompts = demoPrompts.slice(1, 3);
  // Render inputs for each
  promptsArea.innerHTML = '';
  answerPrompts.forEach((p, idx) => {
    const div = document.createElement('div');
    div.innerHTML = `<div class="prompt">${p}</div><input data-prompt="${idx+1}" placeholder="Your answer" />`;
    promptsArea.appendChild(div);
  });
  show(submissionView);
  // Change submitAnswers behavior to record answers and simulate bot answers
  const onSubmit = async () => {
    const inputs = promptsArea.querySelectorAll('input');
    inputs.forEach(input => {
      const promptIndex = parseInt(input.getAttribute('data-prompt'));
      const text = input.value.trim() || '...';
      demoSubmissions[promptIndex] = demoSubmissions[promptIndex] || [];
      demoSubmissions[promptIndex].push({ playerId: currentPlayer.id, text });
    });
    // Auto-generate bot answers for each prompt
    Object.keys(demoSubmissions).forEach(k => {
      const idx = parseInt(k);
      // Ensure bots add answers (2 bots per prompt)
      const bots = demoPlayers.filter(p => p.id !== currentPlayer.id);
      for (let i = 0; i < 2; i++) {
        const bot = bots[i % bots.length];
        demoSubmissions[idx].push({ playerId: bot.id, text: generateBotAnswer(demoPrompts[idx]) });
      }
    });
    // Move to voting stage (use votingView)
    show(votingView);
    renderDemoVoting(demoPrompts, demoSubmissions);
    submitAnswers.removeEventListener('click', onSubmit);
  };
  submitAnswers.addEventListener('click', onSubmit);
}

function generateBotAnswer(promptText) {
  const canned = ['Blue, obviously.','I once juggled textbooks.','Probably a taco.','An existential study habit.','A mascot with style.'];
  return canned[Math.floor(Math.random()*canned.length)];
}

function renderDemoVoting(prompts, submissions) {
  votingArea.innerHTML = '';
  prompts.forEach((p, idx) => {
    const div = document.createElement('div');
    div.innerHTML = `<div class="prompt">${p}</div>`;
    const list = document.createElement('div');
    const subs = submissions[idx] || [];
    subs.forEach((s, si) => {
      const b = document.createElement('button');
      const author = demoPlayers.find(dp => dp.id === s.playerId) || { name: 'Bot' };
      b.textContent = `${s.text} — ${author.name}`;
      b.addEventListener('click', () => {
        // Simple vote: mark selection visually and store in results
        b.style.outline = '3px solid rgba(57,68,214,0.12)';
        // store vote count on the fly
        s.votes = (s.votes || 0) + 1;
      });
      list.appendChild(b);
    });
    div.appendChild(list);
    votingArea.appendChild(div);
  });
  // Add finish voting button handler to tally and show results
  finishVoting.addEventListener('click', () => {
    // Compute simple counts per prompt
    const results = {};
    Object.keys(demoSubmissions).forEach(k => {
      const subs = demoSubmissions[k] || [];
      const counts = subs.map(s => s.votes || 0);
      const max = Math.max(...counts);
      results[k] = { counts, winnerIndex: counts.indexOf(max) };
    });
    show(resultsView);
    renderResults(demoPrompts, demoSubmissions, results);
  }, { once: true });
}

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
