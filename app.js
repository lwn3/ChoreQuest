const API_URL = 'https://script.google.com/macros/s/AKfycbwwtxIFj6BaOWinXmPV2BTgdsUdRvqpqtp_0bzoSJv2_C3E2PoHLbKRBj4oH-RPEAUy/exec';

const params = new URLSearchParams(window.location.search);
const kidId = params.get('kid');

if (kidId) {
  loadKidDashboard(kidId);
}

function loadKidDashboard(kidId) {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">⚔️</div>
        <h1>Loading...</h1>
        <p>Gathering today’s quests...</p>
      </header>
    </main>
  `;

  const callbackName = 'chorequestCallback_' + Date.now();

  window[callbackName] = function(data) {
    delete window[callbackName];

    if (data.error) {
      showError(data.error);
      return;
    }

    renderDashboard(data.kid, data.quests || [], data.bonusQuests || []);
  };

  const script = document.createElement('script');
  script.src = `${API_URL}?action=kidDashboard&kid=${encodeURIComponent(kidId)}&callback=${callbackName}`;
  document.body.appendChild(script);
}

function renderDashboard(kid, quests, sideQuests) {
  const xp = Number(kid.xp || 0);
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
      </header>

      <section class="card character-card">
        <div class="level-row">
          <div>
            <span class="label">Level</span>
            <strong>${level}</strong>
          </div>
          <div>
            <span class="label">Gold</span>
            <strong>${xp}</strong>
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
  const button = event.target;
  const questEl = button.closest('.quest');

  button.textContent = 'Submitting...';
  button.classList.add('submitting');
  button.disabled = true;

  if (questEl) {
    questEl.classList.add('submitting');
  }

  const callbackName = 'completeQuestCallback_' + Date.now();

  window[callbackName] = function(data) {
    delete window[callbackName];

    if (data.error) {
      alert(data.error);
      loadKidDashboard(kidId);
      return;
    }

    button.textContent = 'Submitted!';
    button.classList.remove('submitting');
    button.classList.add('submitted');

    if (questEl) {
      questEl.classList.remove('submitting');
      questEl.classList.add('submitted');
    }

    setTimeout(() => {
      loadKidDashboard(kidId);
    }, 650);
  };

  const script = document.createElement('script');
  script.src =
    `${API_URL}?action=completeQuest&kid=${encodeURIComponent(kidId)}&choreId=${encodeURIComponent(choreId)}&callback=${callbackName}`;

  document.body.appendChild(script);
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
