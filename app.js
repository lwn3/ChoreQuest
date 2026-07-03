const characters = {
  K001: {
    name: 'Cammron',
    avatar: '🐺',
    title: 'Animal Care Adventurer',
    xp: 0,
    level: 1,
    quests: [
      { icon: '🐕', name: 'Take Care of Zeus', time: 'Morning', xp: 5, status: 'Not Started' },
      { icon: '🍽️', name: 'Dishwasher', time: 'Anytime', xp: 5, status: 'Not Started' },
      { icon: '🐕', name: 'Take Care of Zeus', time: 'Evening', xp: 5, status: 'Not Started' }
    ]
  },
  K002: {
    name: 'Autumn',
    avatar: '🦊',
    title: 'Household Quest Ranger',
    xp: 0,
    level: 1,
    quests: [
      { icon: '🐈', name: 'Feed Cats', time: 'Morning', xp: 5, status: 'Not Started' },
      { icon: '🐈', name: 'Feed Cats', time: 'Evening', xp: 5, status: 'Not Started' },
      { icon: '🧹', name: 'Litter Box', time: 'Anytime', xp: 5, status: 'Not Started' }
    ]
  }
};

const params = new URLSearchParams(window.location.search);
const kidId = params.get('kid');

if (kidId && characters[kidId]) {
  renderDashboard(characters[kidId]);
}

function renderDashboard(character) {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">${character.avatar}</div>
        <h1>${character.name}</h1>
        <p>${character.title}</p>
      </header>

      <section class="card stats">
        <div>
          <strong>Level ${character.level}</strong>
          <span>Current Level</span>
        </div>
        <div>
          <strong>${character.xp} XP</strong>
          <span>Total XP</span>
        </div>
      </section>

      <section class="card">
        <h2>Today's Quests</h2>
        ${character.quests.map((quest, index) => `
          <div class="quest">
            <div class="quest-icon">${quest.icon}</div>
            <div class="quest-info">
              <strong>${quest.name}</strong>
              <span>${quest.time} • +${quest.xp} XP</span>
            </div>
            <button onclick="completeQuest(${index})">Complete</button>
          </div>
        `).join('')}
      </section>

      <a class="back-link" href="./">← Switch Character</a>
    </main>
  `;
}

function completeQuest(index) {
  alert('Quest submitted for parent approval. Backend hookup comes next.');
}
