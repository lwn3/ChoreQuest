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
        <p>Gathering today's quests...</p>
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

    renderDashboard(data.kid, data.quests);
  };

  const script = document.createElement('script');
  script.src = `${API_URL}?action=kidDashboard&kid=${encodeURIComponent(kidId)}&callback=${callbackName}`;
  document.body.appendChild(script);
}

function renderDashboard(kid, quests) {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">${kid.avatar}</div>
        <h1>${kid.name}</h1>
        <p>${kid.title}</p>
      </header>

      <section class="card stats">
        <div>
          <strong>Level ${kid.level}</strong>
          <span>Current Level</span>
        </div>
        <div>
          <strong>${kid.xp} XP</strong>
          <span>Total XP</span>
        </div>
      </section>

      <section class="card">
        <h2>Today's Quests</h2>
        ${
          quests.length === 0
            ? '<p>No quests available right now.</p>'
            : quests.map(questCard).join('')
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
        <span>${quest.time} • +${quest.xp} XP</span>
        <small>Status: ${quest.status}</small>
      </div>
      ${buttonForQuest(quest)}
    </div>
  `;
}

function buttonForQuest(quest) {
  if (quest.status === 'Not Started') {
    return `<button onclick="completeQuest('${quest.choreId}')">Complete</button>`;
  }

  if (quest.status === 'Pending') {
    return `<button disabled>Pending</button>`;
  }

  if (quest.status === 'Approved') {
    return `<button disabled>Approved</button>`;
  }

  return `<button disabled>${quest.status}</button>`;
}

function iconForQuest(name) {
  const lower = name.toLowerCase();

  if (lower.includes('zeus')) return '🐕';
  if (lower.includes('cat')) return '🐈';
  if (lower.includes('dish')) return '🍽️';
  if (lower.includes('litter')) return '🧹';

  return '📜';
}

function completeQuest(choreId) {
  alert('Live quest submission is next. This button is reading the real chore ID: ' + choreId);
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
