imprt "./firebase.js";

const {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc
} = window.ChoreQuestFirebase;

const API_URL = 'https://script.google.com/macros/s/AKfycbwwtxIFj6BaOWinXmPV2BTgdsUdRvqpqtp_0bzoSJv2_C3E2PoHLbKRBj4oH-RPEAUy/exec';

const params = new URLSearchParams(window.location.search);
const kidId = params.get('kid');
const isParent = params.get('parent') === 'true';
const isManager = params.get('manager') === 'true';

if (isParent && isManager) {
  loadQuestManager();
} else if (isParent) {
  loadParentDashboard();
}


if (kidId) {
  loadKidDashboard(kidId);
}

async function loadKidDashboard(kidId) {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">⚔️<div>
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
console.log(kid);const questSnap = await getDocs(collection(db, "quests"));
await resetDailyQuestsIfNeeded();
const quests = [];
const sideQuests = [];

questSnap.forEach(docSnap => {
  const quest = {
    choreId: docSnap.id,
    ...docSnap.data()
  };

  if (!quest.active) return;
  if (quest.kidId !== kidId) return;

  if (quest.type === "bonus") {
    sideQuests.push(quest);
  } else {
    quests.push(quest);
  }
});

renderDashboard(kid, quests, sideQuests);

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
        <p>${kid.classTitle}</p>
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
  document.querySelectorAll('.complete-btn').forEach(button => {
  button.addEventListener('click', () => {
    completeQuest(button.dataset.type, button.dataset.choreId);
  });
});
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function resetDailyQuestsIfNeeded() {
  const today = getTodayKey();
  const questSnap = await getDocs(collection(db, "quests"));

  const resets = [];

  questSnap.forEach(docSnap => {
    const quest = docSnap.data();

    if (quest.type !== "daily") return;
    if (quest.lastResetDate === today) return;

    resets.push(
      updateDoc(doc(db, "quests", docSnap.id), {
        status: "Ready",
        completedBy: "",
        lastResetDate: today
      })
    );
  });

  await Promise.all(resets);
}

function questCard(quest) {
  return `
    <div class="quest">
      <div class="quest-icon">${iconForQuest(quest.name)}</div>

      <div class="quest-info">
        <strong>${quest.name}</strong>
        <span>${quest.time} • +${quest.gold} Gold</span>
        <small class="status ${statusClass(quest.status)}">${statusLabel(quest.status)}</small>
      </div>

      ${buttonForQuest(quest)}
    </div>
  `;
}

function buttonForQuest(quest) {
  if (quest.status === 'Ready' || quest.status === 'Not Started' || quest.status === 'Available') {
    return `<button class="complete-btn" data-type="${quest.type}" data-chore-id="${quest.choreId}">Complete</button>`;
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

async function completeQuest(type, choreId) {
  try {
    await updateDoc(doc(db, "quests", choreId), {
      status: "Pending",
      completedBy: kidId
    });

    showToast(getCompletionMessage());

    setTimeout(() => {
      loadKidDashboard(kidId);
    }, 700);
  } catch (err) {
    alert("Could not submit quest: " + err.message);
  }
}
window.completeQuest = completeQuest;

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

async function loadParentDashboard() {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">🛡️</div>
        <h1>Guild Hall</h1>
        <p>Loading quest review...</p>
      </header>
    </main>
  `;

  try {
    const kidsSnap = await getDocs(collection(db, "kids"));
    const questSnap = await getDocs(collection(db, "quests"));

    const kids = [];
    kidsSnap.forEach(docSnap => {
      kids.push({
        kidId: docSnap.id,
        ...docSnap.data()
      });
    });

    const kidNames = {};
    kids.forEach(kid => {
      kidNames[kid.kidId] = kid.name;
    });
await resetDailyQuestsIfNeeded();
    const pending = [];
    questSnap.forEach(docSnap => {
      const quest = {
        choreId: docSnap.id,
        ...docSnap.data()
      };

      if (quest.status === "Pending") {
        pending.push({
          logId: quest.choreId,
          choreName: quest.name,
          assignedKid: kidNames[quest.kidId] || quest.kidId,
          completedBy: kidNames[quest.completedBy] || quest.completedBy || kidNames[quest.kidId] || quest.kidId
        });
      }
    });

    renderParentDashboard({
      kids,
      pending
    });
  } catch (err) {
    showError("Firebase parent error: " + err.message);
  }
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
<a class="character parent-link" href="?parent=true&manager=true">
  <div class="avatar">📋</div>
  <div>
    <strong>Quest Manager</strong>
    <span>View and manage quests</span>
  </div>
</a>

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
async function approveQuest(logId) {
  try {
    const questRef = doc(db, "quests", logId);
    const questSnap = await getDoc(questRef);

    if (!questSnap.exists()) {
      alert("Quest not found.");
      return;
    }

    const quest = questSnap.data();
    const kidRef = doc(db, "kids", quest.kidId);
    const kidSnap = await getDoc(kidRef);

    if (!kidSnap.exists()) {
      alert("Kid not found.");
      return;
    }

    const kid = kidSnap.data();

    await updateDoc(questRef, {
      status: "Approved",
      approvedAt: new Date().toISOString()
    });

    const oldLevel = Number(kid.level || 1);
const newXp = Number(kid.xp || 0) + Number(quest.xp || 0);
const newGold = Number(kid.gold || 0) + Number(quest.gold || 0);
const newLevel = Math.floor(newXp / 100) + 1;

await updateDoc(kidRef, {
  xp: newXp,
  gold: newGold,
  level: newLevel,
  lifetimeQuests: Number(kid.lifetimeQuests || 0) + 1
});

if (newLevel > oldLevel) {
  alert(`${kid.name} leveled up to Level ${newLevel}! 🎉`);
}


    loadParentDashboard();
  } catch (err) {
    alert("Could not approve quest: " + err.message);
  }
}

window.approveQuest = approveQuest;

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

async function loadQuestManager() {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact">
        <div class="logo">📋</div>
        <h1>Quest Manager</h1>
        <p>Manage Daily and Side Quests</p>
      </header>

      <section class="card">
        <p>Loading quests...</p>
      </section>
    </main>
  `;

  try {
    const kidsSnap = await getDocs(collection(db, "kids"));
    const questSnap = await getDocs(collection(db, "quests"));

    const kidNames = {};
    kidsSnap.forEach(docSnap => {
      kidNames[docSnap.id] = docSnap.data().name;
    });

    const quests = [];
    questSnap.forEach(docSnap => {
      quests.push({
        questId: docSnap.id,
        ...docSnap.data()
      });
    });

    document.body.innerHTML = `
      <main class="app">
        <header class="hero compact">
          <div class="logo">📋</div>
          <h1>Quest Manager</h1>
          <p>${quests.length} quests</p>
        </header>

        <section class="card">
          ${quests.map(quest => `
            <div class="quest">
              <div class="quest-icon">${quest.type === 'daily' ? '⚔️' : '🗺️'}</div>
              <div class="quest-info">
                <strong>${quest.name}</strong>
                <span>${quest.type === 'daily' ? 'Daily Quest' : 'Side Quest'} • ${quest.time || 'Anytime'}</span>
                <small class="status status-ready">
                
                  ${kidNames[quest.kidId] || quest.kidId} • +${quest.xp || 0} XP • +${quest.gold || 0} Gold
                </small>
                <div class="parent-buttons">
  <button class="edit-quest-btn" data-quest-id="${quest.questId}">✏️ Edit</button>
</div>

              </div>
            </div>
          `).join('')}
        </section>
<button id="newQuestBtn">➕ New Quest</button>

        <a class="back-link" href="?parent=true">← Back to Guild Hall</a>
      </main>
    `;
document.querySelectorAll('.edit-quest-btn').forEach(button => {
  button.addEventListener('click', () => {
    loadEditQuestForm(button.dataset.questId);
  });
  document.getElementById('newQuestBtn').addEventListener('click', () => {
  loadNewQuestForm();
});

});

  } catch (err) {
    showError("Quest manager error: " + err.message);
  }
}
async function loadEditQuestForm(questId) {
  try {
    const questSnap = await getDoc(doc(db, "quests", questId));
    const kidsSnap = await getDocs(collection(db, "kids"));

    if (!questSnap.exists()) {
      showError("Quest not found.");
      return;
    }

    const quest = questSnap.data();

    const kids = [];
    kidsSnap.forEach(docSnap => {
      kids.push({
        kidId: docSnap.id,
        ...docSnap.data()
      });
    });

    document.body.innerHTML = `
      <main class="app">
        <header class="hero compact">
          <div class="logo">✏️</div>
          <h1>Edit Quest</h1>
          <p>${quest.name}</p>
        </header>

        <section class="card form-card">
          <label>Quest Name</label>
          <input id="questName" value="${quest.name || ''}">

          <label>Assigned Kid</label>
          <select id="questKid">
            ${kids.map(kid => `
              <option value="${kid.kidId}" ${quest.kidId === kid.kidId ? 'selected' : ''}>
                ${kid.name}
              </option>
            `).join('')}
          </select>

          <label>Type</label>
          <select id="questType">
            <option value="daily" ${quest.type === 'daily' ? 'selected' : ''}>Daily Quest</option>
            <option value="bonus" ${quest.type === 'bonus' ? 'selected' : ''}>Side Quest</option>
          </select>

          <label>Time</label>
          <input id="questTime" value="${quest.time || 'Anytime'}">

          <label>XP</label>
          <input id="questXp" type="number" value="${quest.xp || 0}">

          <label>Gold</label>
          <input id="questGold" type="number" value="${quest.gold || 0}">

          <label>Helper Bonus</label>
          <input id="questHelperBonus" type="number" value="${quest.helperBonus || 0}">

          <label class="checkbox-row">
            <input id="questActive" type="checkbox" ${quest.active ? 'checked' : ''}>
            Active
          </label>

          <button id="saveQuestBtn">Save Quest</button>
        </section>

        <a class="back-link" href="?parent=true&manager=true">← Back to Quest Manager</a>
      </main>
    `;

    document.getElementById('saveQuestBtn').addEventListener('click', async () => {
      await updateDoc(doc(db, "quests", questId), {
        name: document.getElementById('questName').value,
        kidId: document.getElementById('questKid').value,
        type: document.getElementById('questType').value,
        time: document.getElementById('questTime').value,
        xp: Number(document.getElementById('questXp').value || 0),
        gold: Number(document.getElementById('questGold').value || 0),
        helperBonus: Number(document.getElementById('questHelperBonus').value || 0),
        active: document.getElementById('questActive').checked
      });

      loadQuestManager();
    });
  } catch (err) {
    showError("Edit quest error: " + err.message);
  }
}
async function loadNewQuestForm() {
  const kidsSnap = await getDocs(collection(db, "kids"));

  const kids = [];
  kidsSnap.forEach(docSnap => {
    kids.push({
      kidId: docSnap.id,
      ...docSnap.data()
    });
  });

  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact">
        <div class="logo">➕</div>
        <h1>New Quest</h1>
        <p>Create a new chore quest</p>
      </header>

      <section class="card form-card">
        <label>Quest Name</label>
        <input id="questName" value="">

        <label>Assigned Kid</label>
        <select id="questKid">
          ${kids.map(kid => `
            <option value="${kid.kidId}">${kid.name}</option>
          `).join('')}
        </select>

        <label>Type</label>
        <select id="questType">
          <option value="daily">Daily Quest</option>
          <option value="bonus">Side Quest</option>
        </select>

        <label>Time</label>
        <input id="questTime" value="Anytime">

        <label>XP</label>
        <input id="questXp" type="number" value="5">

        <label>Gold</label>
        <input id="questGold" type="number" value="5">

        <label>Helper Bonus</label>
        <input id="questHelperBonus" type="number" value="3">

        <label class="checkbox-row">
          <input id="questActive" type="checkbox" checked>
          Active
        </label>

        <button id="saveQuestBtn">Create Quest</button>
      </section>

      <a class="back-link" href="?parent=true&manager=true">← Back to Quest Manager</a>
    </main>
  `;

  document.getElementById('saveQuestBtn').addEventListener('click', async () => {
    await addDoc(collection(db, "quests"), {
      name: document.getElementById('questName').value,
      kidId: document.getElementById('questKid').value,
      type: document.getElementById('questType').value,
      time: document.getElementById('questTime').value,
      xp: Number(document.getElementById('questXp').value || 0),
      gold: Number(document.getElementById('questGold').value || 0),
      helperBonus: Number(document.getElementById('questHelperBonus').value || 0),
      active: document.getElementById('questActive').checked,
      status: "Ready",
      completedBy: "",
      lastResetDate: getTodayKey()
    });

    loadQuestManager();
  });
}
