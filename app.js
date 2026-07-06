import "./firebase.js";

const {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  auth,
  googleProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} = window.ChoreQuestFirebase;

const API_URL = 'https://script.google.com/macros/s/AKfycbwwtxIFj6BaOWinXmPV2BTgdsUdRvqpqtp_0bzoSJv2_C3E2PoHLbKRBj4oH-RPEAUy/exec';

// Hardcoded parent emails for security routing
const ADMIN_EMAIL = 'lawrencewnelson3@gmail.com';
const CO_PARENT_EMAIL = 'anitanelson1987@gmail.com';

// Handle initial authentication listener
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    renderLoginScreen();
    return;
  }

  const email = user.email.toLowerCase();

  // Route Parents
  if (email === ADMIN_EMAIL || email === CO_PARENT_EMAIL) {
    const params = new URLSearchParams(window.location.search);
    const isManager = params.get('manager') === 'true';

    if (isManager) {
      if (email === ADMIN_EMAIL) {
        loadQuestManager(user);
      } else {
        alert("Access Denied: Only the Guild Master can manage quest blueprints.");
        window.history.replaceState({}, document.title, window.location.pathname);
        loadParentDashboard(user);
      }
    } else {
      loadParentDashboard(user);
    }
    return;
  }

  // Route Kids by matching Firestore email field
  try {
    const kidsRef = collection(db, "kids");
    const q = query(kidsRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      document.body.innerHTML = `
        <main class="app">
          <section class="card">
            <h2>Halt, Traveler!</h2>
            <p>Your email (${email}) is not registered to a character slot. Ask your parent to register you in Firestore.</p>
            <button onclick="window.ChoreQuestFirebase.signOut(window.ChoreQuestFirebase.auth)">Sign Out</button>
          </section>
        </main>
      `;
      return;
    }

    // Match found
    const kidDoc = querySnapshot.docs[0];
    loadKidDashboard(kidDoc.id);
  } catch (err) {
    showError("Authentication Routing Error: " + err.message);
  }
});

function renderLoginScreen() {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">⚔️</div>
        <h1>ChoreQuest</h1>
        <p>Complete quests. Earn XP. Unlock rewards.</p>
      </header>
      <section class="card" style="text-align: center; padding: 30px 20px;">
        <h2 style="margin-bottom: 20px;">Enter the Realm</h2>
        <button id="loginBtn" style="font-size: 18px; padding: 12px 24px; cursor: pointer;">Sign In with Google</button>
      </section>
    </main>
  `;

  document.getElementById('loginBtn').addEventListener('click', async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  });
}

function renderSignOutHeader(user) {
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 10px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 15px; font-size: 12px;">
      <span>Logged in: <strong>${user.displayName || user.email}</strong></span>
      <a href="#" id="signOutLink" style="color: #f87171; text-decoration: none; font-weight: bold;">Leave Party</a>
    </div>
  `;
}

function attachSignOutEvent() {
  document.getElementById('signOutLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth);
  });
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

    const kid = { kidId, ...kidSnap.data() };
    const questSnap = await getDocs(collection(db, "quests"));
    await resetDailyQuestsIfNeeded();
    
    const quests = [];
    const sideQuests = [];

    questSnap.forEach(docSnap => {
      const quest = { choreId: docSnap.id, ...docSnap.data() };
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
      ${renderSignOutHeader(auth.currentUser)}
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
        ${quests.length === 0 ? '<p>No daily quests available right now.</p>' : quests.map(questCard).join('')}
      </section>

      <section class="card side-card">
        <h2>🗺 Side Quests</h2>
        ${sideQuests.length === 0 ? '<p>No side quests available right now.</p>' : sideQuests.map(questCard).join('')}
      </section>
    </main>
  `;
  
  attachSignOutEvent();
  document.querySelectorAll('.complete-btn').forEach(button => {
    button.addEventListener('click', () => {
      completeQuest(button.dataset.type, button.dataset.choreId, kid.kidId);
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
  if (quest.status === 'Pending') return `<button class="disabled" disabled>Pending</button>`;
  if (quest.status === 'Approved') return `<button class="approved" disabled>Done</button>`;
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

async function completeQuest(type, choreId, currentKidId) {
  try {
    await updateDoc(doc(db, "quests", choreId), {
      status: "Pending",
      completedBy: currentKidId
    });

    showToast(getCompletionMessage());
    setTimeout(() => { loadKidDashboard(currentKidId); }, 700);
  } catch (err) {
    alert("Could not submit quest: " + err.message);
  }
}

function showToast(message) {
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => { toast.remove(); }, 1800);
}

async function loadParentDashboard(user) {
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
      kids.push({ kidId: docSnap.id, ...docSnap.data() });
    });

    const kidNames = {};
    kids.forEach(k => { kidNames[k.kidId] = k.name; });
    
    await resetDailyQuestsIfNeeded();
    const pending = [];
    
    questSnap.forEach(docSnap => {
      const quest = { choreId: docSnap.id, ...docSnap.data() };
      if (quest.status === "Pending") {
        pending.push({
          logId: quest.choreId,
          choreName: quest.name,
          assignedKid: kidNames[quest.kidId] || quest.kidId,
          completedBy: kidNames[quest.completedBy] || quest.completedBy || kidNames[quest.kidId] || quest.kidId
        });
      }
    });

    renderParentDashboard({ kids, pending }, user);
  } catch (err) {
    showError("Firebase parent error: " + err.message);
  }
}

function renderParentDashboard(data, user) {
  const isGuildMaster = user.email.toLowerCase() === ADMIN_EMAIL;

  document.body.innerHTML = `
    <main class="app">
      ${renderSignOutHeader(user)}
      <header class="hero compact">
        <div class="logo">🛡️</div>
        <h1>Guild Hall</h1>
        <p>Quest Review & Family Progress</p>
      </header>

      <section class="card">
        <h2>Adventurers</h2>
        ${data.kids.map(k => `
          <div class="quest">
            <div class="quest-icon">${k.kidId === 'K001' ? '🐺' : '🦊'}</div>
            <div class="quest-info">
              <strong>${k.name}</strong>
              <span>Level ${k.level} • ${k.gold} Gold • ${k.currentStreak}🔥</span>
              <small class="status status-ready">${k.lifetimeQuests || 0} lifetime quests</small>
            </div>
          </div>
        `).join('')}
      </section>

      <section class="card">
        <h2>Quest Review</h2>
        ${data.pending.length === 0 ? '<p>No quests pending approval.</p>' : data.pending.map(item => `
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
            `).join('')}
      </section>

      ${isGuildMaster ? `
        <a class="character parent-link" href="?manager=true">
          <div class="avatar">📋</div>
          <div>
            <strong>Quest Manager</strong>
            <span>View and manage blueprints</span>
          </div>
        </a>
      ` : ''}
    </main>
  `;
  attachSignOutEvent();
}

function showError(message) {
  document.body.innerHTML = `
    <main class="app">
      <section class="card">
        <h2>Something went wrong</h2>
        <p>${message}</p>
        <button onclick="signOut(auth)">Reset Connection</button>
      </section>
    </main>
  `;
}

async function approveQuest(logId) {
  try {
    const questRef = doc(db, "quests", logId);
    const questSnap = await getDoc(questRef);
    if (!questSnap.exists()) { return; }

    const quest = questSnap.data();
    const kidRef = doc(db, "kids", quest.kidId);
    const kidSnap = await getDoc(kidRef);
    if (!kidSnap.exists()) { return; }

    const kid = kidSnap.data();
    await updateDoc(questRef, { status: "Approved", approvedAt: new Date().toISOString() });

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
    loadParentDashboard(auth.currentUser);
  } catch (err) {
    alert("Could not approve quest: " + err.message);
  }
}
window.approveQuest = approveQuest;

function rejectQuest(logId) {
  parentAction('rejectQuest', logId);
}
window.rejectQuest = rejectQuest;

function parentAction(action, logId) {
  const callbackName = 'parentAction_' + Date.now();
  window[callbackName] = function(data) {
    delete window[callbackName];
    if (data.error) { alert('Error: ' + data.error); return; }
    loadParentDashboard(auth.currentUser);
  };

  const script = document.createElement('script');
  script.src = API_URL + '?action=' + action + '&logId=' + encodeURIComponent(logId) + '&callback=' + callbackName;
  document.body.appendChild(script);
}

function getCompletionMessage() {
  const kidName = document.querySelector('h1')?.textContent || '';
  if (kidName === 'Autumn') return '✨ Quest submitted with sparkles!';
  if (kidName === 'Cammron') return '🥊 Quest punched into review!';
  return 'Quest submitted for approval!';
}

async function loadQuestManager(user) {
  // Ensure strict enforcement in layout layer
  if (user.email.toLowerCase() !== ADMIN_EMAIL) return;

  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact"><div class="logo">📋</div><h1>Quest Manager</h1><p>Loading...</p></header>
    </main>
  `;

  try {
    const kidsSnap = await getDocs(collection(db, "kids"));
    const questSnap = await getDocs(collection(db, "quests"));

    const kidNames = {};
    kidsSnap.forEach(docSnap => { kidNames[docSnap.id] = docSnap.data().name; });

    const quests = [];
    questSnap.forEach(docSnap => { quests.push({ questId: docSnap.id, ...docSnap.data() }); });

    document.body.innerHTML = `
      <main class="app">
        ${renderSignOutHeader(user)}
        <header class="hero compact">
          <div class="logo">📋</div>
          <h1>Quest Manager</h1>
          <p>${quests.length} blueprints active</p>
        </header>
        <section class="card">
          ${quests.map(quest => `
            <div class="quest">
              <div class="quest-icon">${quest.type === 'daily' ? '⚔️' : '🗺️'}</div>
              <div class="quest-info">
                <strong>${quest.name}</strong>
                <span>${quest.type === 'daily' ? 'Daily' : 'Side'} • ${quest.time || 'Anytime'}</span>
                <small class="status status-ready">
                  ${kidNames[quest.kidId] || quest.kidId} • +${quest.xp || 0} XP • +${quest.gold || 0} Gold
                </small>
                <div class="parent-buttons">
                  <button class="edit-quest-btn" data-quest-id="${quest.questId}">✏️</button>
                </div>
              </div>
            </div>
          `).join('')}
        </section>
        <button id="newQuestBtn" style="width:100%; margin-bottom:15px;">➕ New Quest Blueprint</button>
        <a class="back-link" href="?parent=true">← Back to Guild Hall</a>
      </main>
    `;
    
    attachSignOutEvent();
    document.querySelectorAll('.edit-quest-btn').forEach(button => {
      button.addEventListener('click', () => { loadEditQuestForm(button.dataset.questId); });
    });
    document.getElementById('newQuestBtn').addEventListener('click', loadNewQuestForm);
  } catch (err) {
    showError("Quest manager error: " + err.message);
  }
}

async function loadEditQuestForm(questId) {
  try {
    const questSnap = await getDoc(doc(db, "quests", questId));
    const kidsSnap = await getDocs(collection(db, "kids"));
    if (!questSnap.exists()) return;

    const quest = questSnap.data();
    const kids = [];
    kidsSnap.forEach(docSnap => { kids.push({ kidId: docSnap.id, ...docSnap.data() }); });

    document.body.innerHTML = `
      <main class="app">
        <header class="hero compact"><div class="logo">✏️</div><h1>Edit Quest</h1></header>
        <section class="card form-card">
          <label>Quest Name</label><input id="questName" value="${quest.name || ''}">
          <label>Assigned Adventurer</label>
          <select id="questKid">
            ${kids.map(k => `<option value="${k.kidId}" ${quest.kidId === k.kidId ? 'selected' : ''}>${k.name}</option>`).join('')}
          </select>
          <label>Type</label>
          <select id="questType">
            <option value="daily" ${quest.type === 'daily' ? 'selected' : ''}>Daily Quest</option>
            <option value="bonus" ${quest.type === 'bonus' ? 'selected' : ''}>Side Quest</option>
          </select>
          <label>Timeframe</label><input id="questTime" value="${quest.time || 'Anytime'}">
          <label>XP Reward</label><input id="questXp" type="number" value="${quest.xp || 0}">
          <label>Gold Reward</label><input id="questGold" type="number" value="${quest.gold || 0}">
          <button id="saveQuestBtn">Save Blueprint</button>
        </section>
        <a class="back-link" href="?manager=true">← Cancel</a>
      </main>
    `;

    document.getElementById('saveQuestBtn').addEventListener('click', async () => {
      await updateDoc(doc(db, "quests", questId), {
        name: document.getElementById('questName').value,
        kidId: document.getElementById('questKid').value,
        type: document.getElementById('questType').value,
        time: document.getElementById('questTime').value,
        xp: Number(document.getElementById('questXp').value || 0),
        gold: Number(document.getElementById('questGold').value || 0)
      });
      loadQuestManager(auth.currentUser);
    });
  } catch (err) {
    showError("Edit error: " + err.message);
  }
}

async function loadNewQuestForm() {
    const kidsSnap = await getDocs(collection(db, "kids"));
    const kids = [];
    kidsSnap.forEach(docSnap => { kids.push({ kidId: docSnap.id, ...docSnap.data() }); });

    document.body.innerHTML = `
        <main class="app">
            <header class="hero compact"><div class="logo">➕</div><h1>New Quest</h1></header>
            <section class="card">
                <form id="newQuestForm">
                    <label>Quest Name</label><input id="questName" required placeholder="Defeat the Laundry Dragon...">
                    <label>Assign To</label>
                    <select id="questKid" required>
                        ${kids.map(k => `<option value="${k.kidId}">${k.name}</option>`).join('')}
                    </select>
                    <label>Type</label>
                    <select id="questType">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="epic">Epic</option>
                    </select>
                    <label>Time Limit</label><input id="questTime" placeholder="Before bed, 1 hour, etc.">
                    <label>XP Reward</label><input id="questXp" type="number" value="10">
                    <label>Gold Reward</label><input id="questGold" type="number" value="5">
                    <button type="submit">Create Quest Blueprint</button>
                </form>
            </section>
            <a class="back-link" href="?manager=true">← Cancel</a>
        </main>
    `;

    document.getElementById('newQuestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "quests"), {
                name: document.getElementById('questName').value,
                kidId: document.getElementById('questKid').value,
                type: document.getElementById('questType').value,
                time: document.getElementById('questTime').value,
                xp: Number(document.getElementById('questXp').value || 0),
                gold: Number(document.getElementById('questGold').value || 0),
                status: "available"
            });
            loadQuestManager(auth.currentUser);
        } catch (err) {
            showError("Error creating quest: " + err.message);
        }
    });
}
// --- AUTHENTICATION STATE CHECK ---
function checkAuthState() {
    const { onAuthStateChanged, auth } = window.ChoreQuestFirebase;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Logged in! Head to the dashboard
            loadQuestManager(user); 
        } else {
            // Check if the login card already exists. If it does, do nothing!
            // This prevents overwriting the screen while a redirect finishes landing.
            if (document.getElementById('googleSignInBtn')) return;

            document.body.innerHTML = `
                <main class="app">
                    <header class="hero">
                        <div class="logo">⚔️</div>
                        <h1>ChoreQuest</h1>
                        <p>Complete quests. Earn XP. Unlock rewards.</p>
                    </header>
                    <section class="card login-card">
                        <h2>Enter the Realm</h2>
                        <button id="googleSignInBtn" class="btn-primary">Sign In with Google</button>
                    </section>
                </main>
            `;
            
            document.getElementById('googleSignInBtn').addEventListener('click', () => {
    const { signInWithPopup, googleProvider, auth } = window.ChoreQuestFirebase;
    
    // Attempt standard popup auth now that the script environment is stable
    signInWithPopup(auth, googleProvider)
        .then((result) => {
            // Force immediate load upon successful login
            loadQuestManager(result.user);
        })
        .catch(err => {
            showError("Sign in failed: " + err.message);
        });
        }
    });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { getRedirectResult, auth } = window.ChoreQuestFirebase;
    
    try {
        if (getRedirectResult) {
            // 1. Force the app to wait until Firebase completely handles the Google token
            await getRedirectResult(auth);
        }
    } catch (err) {
        console.error("Redirect login failed:", err);
        showError("Login error: " + err.message);
    }
    
    // 2. ONLY check the auth state and change the screen AFTER the landing is settled
    checkAuthState();
});
