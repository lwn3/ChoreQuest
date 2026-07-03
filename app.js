import "./firebase.js";
const {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
} = window.ChoreQuestFirebase;

const API_URL = 'https://script.google.com/macros/s/AKfycbwwtxIFj6BaOWinXmPV2BTgdsUdRvqpqtp_0bzoSJv2_C3E2PoHLbKRBj4oH-RPEAUy/exec';

const params = new URLSearchParams(window.location.search);
const kidId = params.get('kid');
const isParent = params.get('parent') === 'true';

if (isParent) {
  loadParentDashboard();
}

if (kidId) {
  loadKidDashboard(kidId);
}

async function loadKidDashboard(kidId) {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">⚔️</div>
        <h1>Loading...</h1>
        <p>Gathering today's quests...</p>
      </header>
    </main>
  `;

  try {
    const kidSnap = await getDoc(doc(db, "kids", kidId));

    if (!kidSnap.exists()) {
      showError("Kid not found: " + kidId);
      return;
    }

    const kid = {
      kidId,
      ...kidSnap.data()
    };

    renderDashboard(kid, [], []);
  } catch (err) {
    showError("Firebase error: " + err.message);
  }
}


function renderDashboard(kid, quests, sideQuests) {
  const xp = Number(kid.xp || 0);
  const gold = Number(kid.gold || 0);
  const streak = Number(kid.currentStreak || 0);
  const level = Math.max(1, Number(kid.level || 1));

  const xpNeeded = 100;
  const xpIntoLevel = xp % xpNeeded;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100));

  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact">
        <div class="logo">${kid.avatar}</div>
        <h1>${kid.name}</h1>
        <p>${kid.title}</p>
        <small class="class-path">${kid.classPath}</small>
      </header>

      <section class="card character-card">
        <div class="level-row">
          <div>
            <span class="label">Level</span>
            <strong>${level}</strong>
          </div>
          <div>
            <span class="label">Gold</span>
            <strong>${gold}</strong>
          </div>
          <div>
            <span class="label">Streak</span>
            <strong>${streak}🔥</strong>
          </div>
        </div>

        <div class="xp-bar">
          <div class="xp-fill" style="width:${progressPercent}%"></div>
        </div>

        <p class="xp-text">${xpIntoLevel} / ${xpNeeded} XP to next level</p>
      </section>

      <section class="card">
        <h2>⚔️ Daily Quests</h2>
        ${
          quests.length === 0
            ? '<p>No daily quests available right now.</p>'
            : quests.map(questCard).join('')
        }
      </section>

      <section class="card side-card">
        <h2>🗺 Side Quests</h2>
        ${
          sideQuests.length === 0
            ? '<p>No side quests available right now.</p>'
            : sideQuests.map(questCard).join('')
        }
      </section>

      <a class="back-link" href="./">← Switch Character</a>
    </main>
  `;
}

function questCard(quest) {
  return `
    <div class="quest">
      <div class="quest-icon">${iconForQuest(quest.name)}</div>

      <div class="quest-info">
        <strong>${quest.name}</strong>
        <span>${quest.time} • +${quest.xp} Gold</span>
        <small class="status ${statusClass(quest.status)}">${statusLabel(quest.status)}</small>
      </div>

      ${buttonForQuest(quest)}
    </div>
  `;
}

function buttonForQuest(quest) {
  if (quest.status === 'Not Started' || quest.status === 'Available') {
    return `<button onclick="completeQuest('${quest.type}', '${quest.choreId}')">Complete</button>`;
  }

  if (quest.status === 'Pending') {
    return `<button class="disabled" disabled>Pending</button>`;
  }

  if (quest.status === 'Approved') {
    return `<button class="approved" disabled>Done</button>`;
  }

  return `<button class="disabled" disabled>${quest.status}</button>`;
}

function statusLabel(status) {
  if (status === 'Not Started') return 'Ready';
  if (status === 'Available') return 'Available';
  if (status === 'Pending') return 'Awaiting approval';
  if (status === 'Approved') return 'Completed';
  return status;
}

function statusClass(status) {
  if (status === 'Pending') return 'status-pending';
  if (status === 'Approved') return 'status-approved';
  return 'status-ready';
}

function iconForQuest(name) {
  const lower = name.toLowerCase();

  if (lower.includes('zeus')) return '🐕';
  if (lower.includes('cat')) return '🐈';
  if (lower.includes('dish')) return '🍽️';
  if (lower.includes('litter')) return '🧹';
  if (lower.includes('garbage') || lower.includes('trash')) return '🗑️';
  if (lower.includes('vacuum')) return '🧽';

  return '📜';
}

function completeQuest(type, choreId) {
  const callbackName = 'completeQuestCallback_' + Date.now();

  window[callbackName] = function(data) {
    delete window[callbackName];

    if (data.error) {
      alert(data.error);
      return;
    }

    showToast(getCompletionMessage());

    setTimeout(() => {
      loadKidDashboard(kidId);
    }, 700);
  };

  const script = document.createElement('script');
  script.src =
    API_URL +
    '?action=completeQuest' +
    '&kid=' + encodeURIComponent(kidId) +
    '&type=' + encodeURIComponent(type) +
    '&choreId=' + encodeURIComponent(choreId) +
    '&callback=' + callbackName;

  document.body.appendChild(script);
}

function showToast(message) {
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 1800);
}

function loadParentDashboard() {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">🛡️</div>
        <h1>Guild Hall</h1>
        <p>Parent Dashboard</p>
      </header>
    </main>
  `;

  const callbackName = 'parentDashboardCallback_' + Date.now();

  window[callbackName] = function(data) {
    delete window[callbackName];

    if (data.error) {
      showError(data.error);
      return;
    }

    renderParentDashboard(data);
  };

  const script = document.createElement('script');
  script.src =
    API_URL +
    '?action=parentDashboard' +
    '&callback=' + callbackName;

  document.body.appendChild(script);
}

function renderParentDashboard(data) {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact">
        <div class="logo">🛡️</div>
        <h1>Guild Hall</h1>
        <p>Quest Review & Family Progress</p>
      </header>

      <section class="card">
        <h2>Adventurers</h2>
        ${data.kids.map(kid => `
          <div class="quest">
            <div class="quest-icon">${kid.kidId === 'K001' ? '🐺' : '🦊'}</div>
            <div class="quest-info">
              <strong>${kid.name}</strong>
              <span>Level ${kid.level} • ${kid.gold} Gold • ${kid.currentStreak}🔥</span>
              <small class="status status-ready">${kid.lifetimeQuests} lifetime quests</small>
            </div>
          </div>
        `).join('')}
      </section>

      <section class="card">
        <h2>Quest Review</h2>
        ${
          data.pending.length === 0
            ? '<p>No quests pending approval.</p>'
            : data.pending.map(item => `
              <div class="quest">
                <div class="quest-icon">📜</div>

                <div class="quest-info">
                  <strong>${item.choreName}</strong>
                  <span>Assigned: ${item.assignedKid}</span>
                  <small class="status status-pending">Completed by ${item.completedBy}</small>
                </div>

                <div class="parent-buttons">
                  <button onclick="approveQuest(&quot;${item.logId}&quot;)">✅</button>
                  <button onclick="rejectQuest(&quot;${item.logId}&quot;)">❌</button>
                </div>
              </div>
            `).join('')
        }
      </section>

      <a class="back-link" href="./">← Back to Home</a>
    </main>
  `;
}

function showError(message) {
  document.body.innerHTML = `
    <main class="app">
      <section class="card">
        <h2>Something went wrong</h2>
        <p>${message}</p>
        <a href="./">Back</a>
      </section>
    </main>
  `;
}
function approveQuest(logId) {
  parentAction('approveQuest', logId);
}

function rejectQuest(logId) {
  parentAction('rejectQuest', logId);
}

function parentAction(action, logId) {
  const callbackName = 'parentAction_' + Date.now();

  window[callbackName] = function(data) {
    delete window[callbackName];

    if (data.error) {
      alert('Error: ' + data.error);
      return;
    }

    
    loadParentDashboard();
  };

  const script = document.createElement('script');

  script.onerror = function() {
    alert('API call failed to load.');
  };

  script.src =
    API_URL +
    '?action=' + action +
    '&logId=' + encodeURIComponent(logId) +
    '&callback=' + callbackName;

  document.body.appendChild(script);
}

function approveQuest(logId) {
  parentAction('approveQuest', logId);
}

function getCompletionMessage() {
  const kidName = document.querySelector('h1')?.textContent || '';

  if (kidName === 'Autumn') {
    return '✨ Quest submitted with sparkles!';
  }

  if (kidName === 'Cammron') {
    return '🥊 Quest punched into review!';
  }

  return 'Quest submitted for approval!';
}

