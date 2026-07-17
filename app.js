import "./firebase.js";

const {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
  auth,
  googleProvider,
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} = window.ChoreQuestFirebase;

// Parent accounts
const ADMIN_EMAIL = "lawrencewnelson3@gmail.com";
const CO_PARENT_EMAIL = "anitanelson1987@gmail.com";

/* -------------------------------------------------
   AUTHENTICATION, ROUTING, AND PIN ACCESS
------------------------------------------------- */

const PARENT_EMAILS = [ADMIN_EMAIL, CO_PARENT_EMAIL];
const KID_UNLOCK_KEY = "chorequestUnlockedKid";

function isParentUser(user) {
  return Boolean(user && PARENT_EMAILS.includes(String(user.email || "").toLowerCase()));
}

function initializeAuthRouter() {
  const params = new URLSearchParams(window.location.search);
  const kidId = params.get("kid");

  if (kidId) {
    loadKidEntry(kidId);
    return;
  }

  onAuthStateChanged(auth, async user => {
    const isManager = params.get("manager") === "true";
    const isFamily = params.get("family") === "true";

    if (!user) {
      await loadUserDashboard(null);
      return;
    }

    if (!isParentUser(user)) {
      await signOut(auth);
      await loadUserDashboard(null);
      return;
    }

    if (isManager) {
      await loadQuestManager(user);
    } else if (isFamily) {
      await loadFamilyAccounts(user);
    } else {
      await loadParentDashboard(user);
    }
  });
}

async function startParentSignIn() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    showError("Parent sign in failed: " + err.message);
  }
}

function renderLoginScreen() {
  loadUserDashboard(null);
}

function renderSignOutHeader(user) {
  if (!user) return "";
  const displayName = user.displayName || user.email || "Signed in";
  return `
    <div class="account-header">
      <span>${escapeHtml(displayName)}</span>
      <button id="signOutBtn" type="button">Sign Out</button>
    </div>
  `;
}

function attachSignOutEvent() {
  const button = document.getElementById("signOutBtn");
  if (!button) return;
  button.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.history.replaceState({}, document.title, window.location.pathname);
      await loadUserDashboard(null);
    } catch (err) {
      alert("Sign out failed: " + err.message);
    }
  });
}

/* -------------------------------------------------
   CHARACTER SELECTION
------------------------------------------------- */

async function loadUserDashboard(user = auth.currentUser) {
  document.body.innerHTML = `<main class="app"><section class="card"><p>Loading profiles...</p></section></main>`;
  try {
    const kidsSnap = await getDocs(collection(db, "kids"));
    const kids = [];
    kidsSnap.forEach(docSnap => {
      const kid = { kidId: docSnap.id, ...docSnap.data() };
      if (kid.active !== false) kids.push(kid);
    });
    kids.sort((a,b) => String(a.name || a.kidId).localeCompare(String(b.name || b.kidId)));

    document.body.innerHTML = `
      <main class="app">
        ${isParentUser(user) ? renderSignOutHeader(user) : ""}
        <header class="hero"><div class="logo">🛡️</div><h1>Choose Your Character</h1><p>Select a profile to enter the realm.</p></header>
        <section class="character-select">
          ${kids.map(kid => `
            <button class="character-card-btn kid-select-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}">
              <div class="avatar">${kid.avatar || "🧙"}</div>
              <strong>${escapeHtml(kid.name || kid.kidId)}</strong>
              <span>${escapeHtml(kid.classTitle || `Level ${kid.level || 1} Adventurer`)}</span>
            </button>`).join("")}
        </section>
        <section class="card login-card" style="margin-top:18px;">
          <h2>Parent Portal</h2>
          ${isParentUser(user)
            ? '<button id="openParentBtn" type="button">Open Guild Hall</button>'
            : '<button id="googleSignInBtn" type="button">Parent Sign In with Google</button>'}
        </section>
      </main>`;

    attachSignOutEvent();
    document.querySelectorAll('.kid-select-btn').forEach(button => {
      button.addEventListener('click', () => {
        window.history.pushState({}, document.title, `?kid=${encodeURIComponent(button.dataset.kidId)}`);
        loadKidEntry(button.dataset.kidId);
      });
    });
    document.getElementById('googleSignInBtn')?.addEventListener('click', startParentSignIn);
    document.getElementById('openParentBtn')?.addEventListener('click', () => loadParentDashboard(auth.currentUser));
  } catch (err) {
    showError("Could not load profiles: " + err.message);
  }
}

function isKidUnlocked(kidId) {
  return sessionStorage.getItem(KID_UNLOCK_KEY) === kidId;
}

async function hashPin(pin) {
  const bytes = new TextEncoder().encode(String(pin));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loadKidEntry(kidId) {
  if (isKidUnlocked(kidId)) {
    await loadKidDashboard(kidId);
    return;
  }

  try {
    const kidSnap = await getDoc(doc(db, "kids", kidId));
    if (!kidSnap.exists()) { showError("Profile not found: " + kidId); return; }
    const kid = { kidId, ...kidSnap.data() };

    document.body.innerHTML = `
      <main class="app">
        <header class="hero compact"><div class="logo">${kid.avatar || "🧙"}</div><h1>${escapeHtml(kid.name || kidId)}</h1><p>Enter your 4-digit PIN</p></header>
        <section class="card form-card">
          ${kid.pinHash ? `
            <div class="form-field"><label for="kidPin">PIN</label><input id="kidPin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" autocomplete="off"></div>
            <button id="unlockKidBtn" type="button">Enter the Realm</button>
            <p id="pinMessage" aria-live="polite"></p>`
          : '<p>This profile does not have a PIN yet. Ask a parent to set one in Family Accounts.</p>'}
          <button id="backHomeBtn" type="button">← Choose Another Profile</button>
        </section>
      </main>`;

    document.getElementById('backHomeBtn').addEventListener('click', () => {
      window.history.pushState({}, document.title, window.location.pathname);
      loadUserDashboard(auth.currentUser);
    });

    const unlock = async () => {
      const input = document.getElementById('kidPin');
      const message = document.getElementById('pinMessage');
      const pin = input?.value.trim() || '';
      if (!/^\d{4}$/.test(pin)) { message.textContent = 'Enter a 4-digit PIN.'; return; }
      if (await hashPin(pin) !== kid.pinHash) { input.value = ''; message.textContent = 'That PIN is not correct.'; return; }
      sessionStorage.setItem(KID_UNLOCK_KEY, kidId);
      await loadKidDashboard(kidId);
    };
    document.getElementById('unlockKidBtn')?.addEventListener('click', unlock);
    document.getElementById('kidPin')?.addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
  } catch (err) {
    showError("Could not open profile: " + err.message);
  }
}

/* -------------------------------------------------
   KID DASHBOARD
------------------------------------------------- */

async function loadKidDashboard(kidId) {
  if (!isKidUnlocked(kidId)) {
    await loadKidEntry(kidId);
    return;
  }

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
    await resetDailyQuestsIfNeeded();

    const kidSnap = await getDoc(doc(db, "kids", kidId));

    if (!kidSnap.exists()) {
      showError("Kid not found: " + kidId);
      return;
    }

    const kid = {
      kidId,
      ...kidSnap.data()
    };

    const questSnap = await getDocs(collection(db, "quests"));
    const quests = [];
    const sideQuests = [];

    questSnap.forEach(docSnap => {
      const quest = {
        choreId: docSnap.id,
        ...docSnap.data()
      };

      if (quest.archived === true) return;
      if (quest.active === false) return;
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
  const progressPercent = Math.min(
    100,
    Math.round((xpIntoLevel / xpNeeded) * 100)
  );

  document.body.innerHTML = `
    <main class="app">
      ${renderSignOutHeader(auth.currentUser)}

      <header class="hero compact">
        <div class="logo">${kid.avatar || "🧙"}</div>
        <h1>${escapeHtml(kid.name || kid.kidId)}</h1>
        <p>${escapeHtml(kid.classTitle || "")}</p>
        <small class="class-path">${escapeHtml(kid.classPath || "")}</small>
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

        <p class="xp-text">
          ${xpIntoLevel} / ${xpNeeded} XP to next level
        </p>
      </section>

      <section class="card">
        <h2>⚔️ Daily Quests</h2>
        ${
          quests.length === 0
            ? "<p>No daily quests available right now.</p>"
            : quests.map(questCard).join("")
        }
      </section>

      <section class="card side-card">
        <h2>🗺️ Side Quests</h2>
        ${
          sideQuests.length === 0
            ? "<p>No side quests available right now.</p>"
            : sideQuests.map(questCard).join("")
        }
      </section>

      <button id="switchCharacterBtn" type="button">
        ← Switch Character
      </button>
    </main>
  `;

  attachSignOutEvent();

  document.querySelectorAll(".complete-btn").forEach(button => {
    button.addEventListener("click", () => {
      completeQuest(button.dataset.choreId, kid.kidId);
    });
  });

  document
    .getElementById("switchCharacterBtn")
    .addEventListener("click", () => {
      sessionStorage.removeItem(KID_UNLOCK_KEY);
      window.history.pushState({}, document.title, window.location.pathname);
      loadUserDashboard(auth.currentUser);
    });
}

function questCard(quest) {
  return `
    <div class="quest">
      <div class="quest-icon">
        ${iconForQuest(quest.name || "")}
      </div>

      <div class="quest-info">
        <strong>${escapeHtml(quest.name || "Unnamed Quest")}</strong>
        <span>
          ${escapeHtml(quest.time || "Anytime")}
          • +${Number(quest.xp || 0)} XP
          • +${Number(quest.gold || 0)} Gold
        </span>

        <small class="status ${statusClass(quest.status)}">
          ${escapeHtml(statusLabel(quest.status))}
        </small>
      </div>

      ${buttonForQuest(quest)}
    </div>
  `;
}

function buttonForQuest(quest) {
  const status = quest.status || "Ready";

  if (
    status === "Ready" ||
    status === "Not Started" ||
    status === "Available" ||
    status === "available"
  ) {
    return `
      <button
        class="complete-btn"
        type="button"
        data-chore-id="${escapeAttribute(quest.choreId)}"
      >
        Complete
      </button>
    `;
  }

  if (status === "Pending") {
    return `<button class="disabled" disabled>Pending</button>`;
  }

  if (status === "Approved") {
    return `<button class="approved" disabled>Done</button>`;
  }

  return `
    <button class="disabled" disabled>
      ${escapeHtml(status)}
    </button>
  `;
}

function statusLabel(status) {
  if (!status) return "Ready";
  if (status === "Not Started") return "Ready";
  if (status === "Available" || status === "available") return "Ready";
  if (status === "Pending") return "Awaiting approval";
  if (status === "Approved") return "Completed";
  if (status === "Archived") return "Archived";
  return status;
}

function statusClass(status) {
  if (status === "Pending") return "status-pending";
  if (status === "Approved") return "status-approved";
  return "status-ready";
}

function iconForQuest(name) {
  const lower = String(name || "").toLowerCase();

  if (lower.includes("zeus")) return "🐕";
  if (lower.includes("cat")) return "🐈";
  if (lower.includes("dish")) return "🍽️";
  if (lower.includes("litter")) return "🧹";
  if (lower.includes("garbage") || lower.includes("trash")) return "🗑️";
  if (lower.includes("vacuum")) return "🧽";
  if (lower.includes("laundry")) return "🧺";
  if (lower.includes("room")) return "🛏️";

  return "📜";
}

async function completeQuest(choreId, currentKidId) {
  try {
    await updateDoc(doc(db, "quests", choreId), {
      status: "Pending",
      completedBy: currentKidId
    });

    showToast(getCompletionMessage());

    setTimeout(() => {
      loadKidDashboard(currentKidId);
    }, 700);
  } catch (err) {
    alert("Could not submit quest: " + err.message);
  }
}

function getCompletionMessage() {
  const kidName = document.querySelector("h1")?.textContent || "";

  if (kidName === "Autumn") {
    return "✨ Quest submitted with sparkles!";
  }

  if (kidName === "Cammron") {
    return "🥊 Quest punched into review!";
  }

  return "Quest submitted for approval!";
}

function showToast(message) {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 1800);
}

/* -------------------------------------------------
   DAILY RESET
------------------------------------------------- */

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function resetDailyQuestsIfNeeded() {
  const today = getTodayKey();
  const questSnap = await getDocs(collection(db, "quests"));
  const resets = [];

  questSnap.forEach(docSnap => {
    const quest = docSnap.data();

    if (quest.archived === true) return;
    if (quest.active === false) return;
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

/* -------------------------------------------------
   PARENT DASHBOARD
------------------------------------------------- */

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
    await resetDailyQuestsIfNeeded();

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

    const pending = [];

    questSnap.forEach(docSnap => {
      const quest = {
        choreId: docSnap.id,
        ...docSnap.data()
      };

      if (quest.archived === true) return;
      if (quest.status !== "Pending") return;

      pending.push({
        logId: quest.choreId,
        choreName: quest.name,
        assignedKid: kidNames[quest.kidId] || quest.kidId,
        completedBy:
          kidNames[quest.completedBy] ||
          quest.completedBy ||
          kidNames[quest.kidId] ||
          quest.kidId
      });
    });

    renderParentDashboard({ kids, pending }, user);
  } catch (err) {
    showError("Firebase parent error: " + err.message);
  }
}

function renderParentDashboard(data, user) {
  const email = String(user?.email || "").toLowerCase();
  const isGuildMaster = email === ADMIN_EMAIL;

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

        ${data.kids
          .map(
            kid => `
              <div class="quest">
                <div class="quest-icon">${kid.avatar || "🧙"}</div>

                <div class="quest-info">
                  <strong>${escapeHtml(kid.name || kid.kidId)}</strong>
                  <span>
                    Level ${Number(kid.level || 1)}
                    • ${Number(kid.gold || 0)} Gold
                    • ${Number(kid.currentStreak || 0)}🔥
                  </span>

                  <small class="status status-ready">
                    ${Number(kid.lifetimeQuests || 0)} lifetime quests
                  </small>
                </div>
              </div>
            `
          )
          .join("")}
      </section>

      <section class="card">
        <h2>Quest Review</h2>

        ${
          data.pending.length === 0
            ? "<p>No quests pending approval.</p>"
            : data.pending
                .map(
                  item => `
                    <div class="quest">
                      <div class="quest-icon">📜</div>

                      <div class="quest-info">
                        <strong>${escapeHtml(item.choreName)}</strong>
                        <span>Assigned: ${escapeHtml(item.assignedKid)}</span>

                        <small class="status status-pending">
                          Completed by ${escapeHtml(item.completedBy)}
                        </small>
                      </div>

                      <div class="parent-buttons">
                        <button
                          class="approve-quest-btn"
                          type="button"
                          data-log-id="${escapeAttribute(item.logId)}"
                        >
                          ✅
                        </button>

                        <button
                          class="reject-quest-btn"
                          type="button"
                          data-log-id="${escapeAttribute(item.logId)}"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  `
                )
                .join("")
        }
      </section>

      ${
        isGuildMaster
          ? `
            <a class="character parent-link" href="?manager=true">
              <div class="avatar">📋</div>

              <div>
                <strong>Quest Manager</strong>
                <span>View and manage blueprints</span>
              </div>
            </a>
          `
          : ""
      }

      <a class="character parent-link" href="?family=true">
        <div class="avatar">👨‍👩‍👧‍👦</div>
        <div><strong>Family Accounts</strong><span>Create profiles and set or reset PINs</span></div>
      </a>
    </main>
  `;

  attachSignOutEvent();

  document.querySelectorAll(".approve-quest-btn").forEach(button => {
    button.addEventListener("click", () => {
      approveQuest(button.dataset.logId);
    });
  });

  document.querySelectorAll(".reject-quest-btn").forEach(button => {
    button.addEventListener("click", () => {
      rejectQuest(button.dataset.logId);
    });
  });
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

    const oldLevel = Number(kid.level || 1);
    const newXp = Number(kid.xp || 0) + Number(quest.xp || 0);
    const newGold = Number(kid.gold || 0) + Number(quest.gold || 0);
    const newLevel = Math.floor(newXp / 100) + 1;

    await updateDoc(questRef, {
      status: "Approved",
      approvedAt: new Date().toISOString()
    });

    await updateDoc(kidRef, {
      xp: newXp,
      gold: newGold,
      level: newLevel,
      lifetimeQuests: Number(kid.lifetimeQuests || 0) + 1
    });

    if (newLevel > oldLevel) {
      alert(`${kid.name} leveled up to Level ${newLevel}! 🎉`);
    }

    await loadParentDashboard(auth.currentUser);
  } catch (err) {
    alert("Could not approve quest: " + err.message);
  }
}

async function rejectQuest(logId) {
  try {
    await updateDoc(doc(db, "quests", logId), {
      status: "Ready",
      completedBy: ""
    });

    await loadParentDashboard(auth.currentUser);
  } catch (err) {
    alert("Could not reject quest: " + err.message);
  }
}

/* -------------------------------------------------
   FAMILY ACCOUNTS
------------------------------------------------- */

async function loadFamilyAccounts(user) {
  if (!isParentUser(user)) { await loadUserDashboard(null); return; }
  try {
    const kidsSnap = await getDocs(collection(db, "kids"));
    const kids = [];
    kidsSnap.forEach(docSnap => kids.push({ kidId: docSnap.id, ...docSnap.data() }));
    kids.sort((a,b) => a.kidId.localeCompare(b.kidId));
    document.body.innerHTML = `
      <main class="app">
        ${renderSignOutHeader(user)}
        <header class="hero compact"><div class="logo">👨‍👩‍👧‍👦</div><h1>Family Accounts</h1><p>Create profiles and manage child PINs.</p></header>
        <section class="card">
          ${kids.map(kid => `
            <div class="quest">
              <div class="quest-icon">${kid.avatar || "🧙"}</div>
              <div class="quest-info"><strong>${escapeHtml(kid.name || kid.kidId)}</strong><span>${escapeHtml(kid.kidId)} • ${kid.pinHash ? 'PIN set' : 'PIN not set'}</span><small class="status ${kid.active === false ? 'status-pending' : 'status-ready'}">${kid.active === false ? 'Disabled' : 'Active'}</small></div>
              <div class="parent-buttons">
                <button class="set-pin-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}">🔢 PIN</button>
                <button class="toggle-kid-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}" data-active="${kid.active !== false}">${kid.active === false ? 'Enable' : 'Disable'}</button>
              </div>
            </div>`).join('')}
        </section>
        <button id="newKidBtn" type="button" style="width:100%; margin-bottom:12px;">➕ Create Child Profile</button>
        <button id="familyBackBtn" type="button" style="width:100%;">← Back to Guild Hall</button>
      </main>`;
    attachSignOutEvent();
    document.querySelectorAll('.set-pin-btn').forEach(button => button.addEventListener('click', () => loadPinForm(button.dataset.kidId, user)));
    document.querySelectorAll('.toggle-kid-btn').forEach(button => button.addEventListener('click', async () => {
      await updateDoc(doc(db, 'kids', button.dataset.kidId), { active: button.dataset.active !== 'true' });
      await loadFamilyAccounts(user);
    }));
    document.getElementById('newKidBtn').addEventListener('click', () => loadNewKidForm(user, kids));
    document.getElementById('familyBackBtn').addEventListener('click', () => { window.history.pushState({}, document.title, window.location.pathname); loadParentDashboard(user); });
  } catch (err) { showError('Family accounts error: ' + err.message); }
}

async function loadPinForm(kidId, user) {
  const kidSnap = await getDoc(doc(db, 'kids', kidId));
  if (!kidSnap.exists()) { showError('Profile not found.'); return; }
  const kid = kidSnap.data();
  document.body.innerHTML = `
    <main class="app">${renderSignOutHeader(user)}
      <header class="hero compact"><div class="logo">🔢</div><h1>Set PIN</h1><p>${escapeHtml(kid.name || kidId)}</p></header>
      <section class="card form-card">
        <div class="form-field"><label for="newPin">New 4-digit PIN</label><input id="newPin" type="password" inputmode="numeric" maxlength="4"></div>
        <div class="form-field"><label for="confirmPin">Confirm PIN</label><input id="confirmPin" type="password" inputmode="numeric" maxlength="4"></div>
        <button id="savePinBtn" type="button">Save PIN</button>
        <button id="cancelPinBtn" type="button">Cancel</button>
      </section>
    </main>`;
  attachSignOutEvent();
  document.getElementById('savePinBtn').addEventListener('click', async () => {
    const pin = document.getElementById('newPin').value.trim();
    const confirm = document.getElementById('confirmPin').value.trim();
    if (!/^\d{4}$/.test(pin)) { alert('PIN must be exactly 4 digits.'); return; }
    if (pin !== confirm) { alert('The PINs do not match.'); return; }
    await updateDoc(doc(db, 'kids', kidId), { pinHash: await hashPin(pin), pinUpdatedAt: new Date().toISOString() });
    await loadFamilyAccounts(user);
  });
  document.getElementById('cancelPinBtn').addEventListener('click', () => loadFamilyAccounts(user));
}

function getNextKidId(kids) {
  const max = kids.reduce((n,k) => Math.max(n, Number(String(k.kidId).replace(/\D/g,'')) || 0), 0);
  return `K${String(max + 1).padStart(3, '0')}`;
}

function loadNewKidForm(user, kids) {
  const suggestedId = getNextKidId(kids);
  document.body.innerHTML = `
    <main class="app">${renderSignOutHeader(user)}
      <header class="hero compact"><div class="logo">➕</div><h1>New Child Profile</h1></header>
      <section class="card form-card">
        <div class="form-field"><label>Profile Code</label><input id="newKidId" value="${suggestedId}" maxlength="10"></div>
        <div class="form-field"><label>Name</label><input id="newKidName"></div>
        <div class="form-field"><label>Avatar Emoji</label><input id="newKidAvatar" value="🧙"></div>
        <div class="form-field"><label>Class Title</label><input id="newKidClass" value="Adventurer"></div>
        <div class="form-field"><label>4-digit PIN</label><input id="newKidPin" type="password" inputmode="numeric" maxlength="4"></div>
        <button id="createKidBtn" type="button">Create Profile</button>
        <button id="cancelKidBtn" type="button">Cancel</button>
      </section>
    </main>`;
  attachSignOutEvent();
  document.getElementById('createKidBtn').addEventListener('click', async () => {
    const kidId = document.getElementById('newKidId').value.trim().toUpperCase();
    const name = document.getElementById('newKidName').value.trim();
    const pin = document.getElementById('newKidPin').value.trim();
    if (!/^[A-Z0-9_-]{2,10}$/.test(kidId)) { alert('Use 2-10 letters or numbers for the profile code.'); return; }
    if (!name) { alert('Enter a name.'); return; }
    if (!/^\d{4}$/.test(pin)) { alert('PIN must be exactly 4 digits.'); return; }
    const existing = await getDoc(doc(db, 'kids', kidId));
    if (existing.exists()) { alert('That profile code already exists.'); return; }
    await setDoc(doc(db, 'kids', kidId), {
      name, avatar: document.getElementById('newKidAvatar').value.trim() || '🧙',
      classTitle: document.getElementById('newKidClass').value.trim() || 'Adventurer',
      classPath: '', level: 1, xp: 0, gold: 0, currentStreak: 0, lifetimeQuests: 0,
      active: true, pinHash: await hashPin(pin), pinUpdatedAt: new Date().toISOString(), createdAt: new Date().toISOString()
    });
    await loadFamilyAccounts(user);
  });
  document.getElementById('cancelKidBtn').addEventListener('click', () => loadFamilyAccounts(user));
}

/* -------------------------------------------------
   QUEST MANAGER
------------------------------------------------- */

async function loadQuestManager(user) {
  const email = String(user?.email || "").toLowerCase();

  if (email !== ADMIN_EMAIL) {
    showError("Only the Guild Master can manage quest blueprints.");
    return;
  }

  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact">
        <div class="logo">📋</div>
        <h1>Quest Manager</h1>
        <p>Loading blueprints...</p>
      </header>
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

    quests.sort((a, b) => {
      const archiveCompare =
        Number(Boolean(a.archived)) - Number(Boolean(b.archived));

      if (archiveCompare !== 0) return archiveCompare;

      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    const activeCount = quests.filter(quest => quest.archived !== true).length;
    const archivedCount = quests.length - activeCount;

    document.body.innerHTML = `
      <main class="app">
        ${renderSignOutHeader(user)}

        <header class="hero compact">
          <div class="logo">📋</div>
          <h1>Quest Manager</h1>
          <p>
            ${activeCount} active blueprint${activeCount === 1 ? "" : "s"}
            • ${archivedCount} archived
          </p>
        </header>

        <section class="card">
          ${
            quests.length === 0
              ? "<p>No quests have been created yet.</p>"
              : quests
                  .map(
                    quest => `
                      <div class="quest">
                        <div class="quest-icon">
                          ${quest.archived === true
                            ? "📦"
                            : quest.type === "daily"
                              ? "⚔️"
                              : "🗺️"}
                        </div>

                        <div class="quest-info">
                          <strong>${escapeHtml(
                            quest.name || "Unnamed Quest"
                          )}</strong>

                          <span>
                            ${
                              quest.type === "daily"
                                ? "Daily Quest"
                                : "Side Quest"
                            }
                            • ${escapeHtml(quest.time || "Anytime")}
                          </span>

                          <small class="status ${
                            quest.archived === true
                              ? "status-pending"
                              : statusClass(quest.status)
                          }">
                            ${quest.archived === true
                              ? "Archived"
                              : escapeHtml(
                                  kidNames[quest.kidId] ||
                                    quest.kidId ||
                                    "Unassigned"
                                ) +
                                ` • +${Number(quest.xp || 0)} XP` +
                                ` • +${Number(quest.gold || 0)} Gold` +
                                ` • ${escapeHtml(statusLabel(quest.status))}`
                            }
                          </small>
                        </div>

                        <div class="parent-buttons">
                          <button
                            class="edit-quest-btn"
                            type="button"
                            data-quest-id="${escapeAttribute(quest.questId)}"
                            ${quest.archived === true ? "disabled" : ""}
                            title="Edit quest"
                          >
                            ✏️
                          </button>

                          <button
                            class="archive-quest-btn"
                            type="button"
                            data-quest-id="${escapeAttribute(quest.questId)}"
                            data-archived="${quest.archived === true ? "true" : "false"}"
                            title="${quest.archived === true ? "Restore quest" : "Archive quest"}"
                          >
                            ${quest.archived === true ? "♻️" : "📦"}
                          </button>

                          <button
                            class="delete-quest-btn"
                            type="button"
                            data-quest-id="${escapeAttribute(quest.questId)}"
                            data-quest-name="${escapeAttribute(
                              quest.name || "Unnamed Quest"
                            )}"
                            title="Permanently delete quest"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    `
                  )
                  .join("")
          }
        </section>

        <button
          id="newQuestBtn"
          type="button"
          style="width:100%; margin-bottom:15px;"
        >
          ➕ New Quest Blueprint
        </button>

        <button id="backToGuildHallBtn" type="button">
          ← Back to Guild Hall
        </button>
      </main>
    `;

    attachSignOutEvent();

    document.querySelectorAll(".edit-quest-btn").forEach(button => {
      button.addEventListener("click", () => {
        loadEditQuestForm(button.dataset.questId);
      });
    });

    document.querySelectorAll(".archive-quest-btn").forEach(button => {
      button.addEventListener("click", () => {
        const isArchived = button.dataset.archived === "true";
        archiveQuest(button.dataset.questId, !isArchived);
      });
    });

    document.querySelectorAll(".delete-quest-btn").forEach(button => {
      button.addEventListener("click", () => {
        deleteQuest(button.dataset.questId, button.dataset.questName);
      });
    });

    document
      .getElementById("newQuestBtn")
      .addEventListener("click", () => {
        loadNewQuestForm();
      });

    document
      .getElementById("backToGuildHallBtn")
      .addEventListener("click", () => {
        window.history.pushState({}, document.title, window.location.pathname);
        loadParentDashboard(auth.currentUser);
      });
  } catch (err) {
    showError("Quest manager error: " + err.message);
  }
}

async function archiveQuest(questId, shouldArchive) {
  try {
    const questRef = doc(db, "quests", questId);
    const questSnap = await getDoc(questRef);

    if (!questSnap.exists()) {
      alert("Quest not found.");
      return;
    }

    const quest = questSnap.data();

    if (quest.status === "Pending") {
      alert("Approve or reject this quest before archiving it.");
      return;
    }

    const actionText = shouldArchive ? "Archive" : "Restore";
    const confirmed = confirm(
      `${actionText} "${quest.name || "this quest"}"?`
    );

    if (!confirmed) return;

    await updateDoc(questRef, {
      archived: shouldArchive,
      active: !shouldArchive,
      status: shouldArchive ? "Archived" : "Ready",
      completedBy: "",
      updatedAt: new Date().toISOString()
    });

    await loadQuestManager(auth.currentUser);
  } catch (err) {
    alert("Could not update quest archive status: " + err.message);
  }
}

async function deleteQuest(questId, questName) {
  try {
    const questRef = doc(db, "quests", questId);
    const questSnap = await getDoc(questRef);

    if (!questSnap.exists()) {
      alert("Quest not found.");
      return;
    }

    const quest = questSnap.data();

    if (quest.status === "Pending") {
      alert("Approve or reject this quest before deleting it.");
      return;
    }

    const firstConfirmation = confirm(
      `Permanently delete "${questName || quest.name || "this quest"}"?`
    );

    if (!firstConfirmation) return;

    const secondConfirmation = confirm(
      "This cannot be undone. Delete it permanently?"
    );

    if (!secondConfirmation) return;

    await deleteDoc(questRef);
    await loadQuestManager(auth.currentUser);
  } catch (err) {
    alert("Could not delete quest: " + err.message);
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

    if (quest.archived === true) {
      alert("Restore this quest before editing it.");
      await loadQuestManager(auth.currentUser);
      return;
    }

    const kids = [];

    kidsSnap.forEach(docSnap => {
      kids.push({
        kidId: docSnap.id,
        ...docSnap.data()
      });
    });

    document.body.innerHTML = `
      <main class="app">
        ${renderSignOutHeader(auth.currentUser)}

        <header class="hero compact">
          <div class="logo">✏️</div>
          <h1>Edit Quest</h1>
          <p>${escapeHtml(quest.name || "")}</p>
        </header>

        <section
          class="card form-card"
          style="display:flex; flex-direction:column; gap:12px;"
        >
          ${formField(
            "Quest Name",
            `<input
              id="questName"
              value="${escapeAttribute(quest.name || "")}"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          ${formField(
            "Assigned Adventurer",
            `
              <select
                id="questKid"
                style="width:100%; box-sizing:border-box; padding:10px;"
              >
                ${kids
                  .map(
                    kid => `
                      <option
                        value="${escapeAttribute(kid.kidId)}"
                        ${quest.kidId === kid.kidId ? "selected" : ""}
                      >
                        ${escapeHtml(kid.name || kid.kidId)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            `
          )}

          ${formField(
            "Type",
            `
              <select
                id="questType"
                style="width:100%; box-sizing:border-box; padding:10px;"
              >
                <option
                  value="daily"
                  ${quest.type === "daily" ? "selected" : ""}
                >
                  Daily Quest
                </option>

                <option
                  value="bonus"
                  ${quest.type === "bonus" ? "selected" : ""}
                >
                  Side Quest
                </option>
              </select>
            `
          )}

          ${formField(
            "Timeframe",
            `<input
              id="questTime"
              value="${escapeAttribute(quest.time || "Anytime")}"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          ${formField(
            "XP Reward",
            `<input
              id="questXp"
              type="number"
              min="0"
              value="${Number(quest.xp || 0)}"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          ${formField(
            "Gold Reward",
            `<input
              id="questGold"
              type="number"
              min="0"
              value="${Number(quest.gold || 0)}"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          ${formField(
            "Helper Bonus",
            `<input
              id="questHelperBonus"
              type="number"
              min="0"
              value="${Number(quest.helperBonus || 0)}"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          <label
            style="display:flex; align-items:center; gap:8px;"
          >
            <input
              id="questActive"
              type="checkbox"
              ${quest.active !== false ? "checked" : ""}
            >
            Active
          </label>

          <button id="saveQuestBtn" type="button">
            Save Blueprint
          </button>
        </section>

        <button id="cancelEditBtn" type="button">
          ← Cancel
        </button>
      </main>
    `;

    attachSignOutEvent();

    document
      .getElementById("saveQuestBtn")
      .addEventListener("click", async () => {
        const name = document
          .getElementById("questName")
          .value.trim();

        if (!name) {
          alert("Please enter a quest name.");
          return;
        }

        try {
          await updateDoc(doc(db, "quests", questId), {
            name,
            kidId: document.getElementById("questKid").value,
            type: document.getElementById("questType").value,
            time:
              document.getElementById("questTime").value.trim() ||
              "Anytime",
            xp: Number(
              document.getElementById("questXp").value || 0
            ),
            gold: Number(
              document.getElementById("questGold").value || 0
            ),
            helperBonus: Number(
              document.getElementById("questHelperBonus").value || 0
            ),
            active: document.getElementById("questActive").checked,
            updatedAt: new Date().toISOString()
          });

          await loadQuestManager(auth.currentUser);
        } catch (err) {
          showError("Could not save quest: " + err.message);
        }
      });

    document
      .getElementById("cancelEditBtn")
      .addEventListener("click", () => {
        loadQuestManager(auth.currentUser);
      });
  } catch (err) {
    showError("Edit quest error: " + err.message);
  }
}

async function loadNewQuestForm() {
  try {
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
        ${renderSignOutHeader(auth.currentUser)}

        <header class="hero compact">
          <div class="logo">➕</div>
          <h1>New Quest</h1>
          <p>Create a new chore quest.</p>
        </header>

        <section
          class="card form-card"
          style="display:flex; flex-direction:column; gap:12px;"
        >
          ${formField(
            "Quest Name",
            `<input
              id="questName"
              placeholder="Defeat the Laundry Dragon..."
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          ${formField(
            "Assign To",
            `
              <select
                id="questKid"
                style="width:100%; box-sizing:border-box; padding:10px;"
              >
                ${kids
                  .map(
                    kid => `
                      <option value="${escapeAttribute(kid.kidId)}">
                        ${escapeHtml(kid.name || kid.kidId)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            `
          )}

          ${formField(
            "Type",
            `
              <select
                id="questType"
                style="width:100%; box-sizing:border-box; padding:10px;"
              >
                <option value="daily">Daily Quest</option>
                <option value="bonus">Side Quest</option>
              </select>
            `
          )}

          ${formField(
            "Timeframe",
            `<input
              id="questTime"
              value="Anytime"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          ${formField(
            "XP Reward",
            `<input
              id="questXp"
              type="number"
              min="0"
              value="5"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          ${formField(
            "Gold Reward",
            `<input
              id="questGold"
              type="number"
              min="0"
              value="5"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          ${formField(
            "Helper Bonus",
            `<input
              id="questHelperBonus"
              type="number"
              min="0"
              value="3"
              style="width:100%; box-sizing:border-box; padding:10px;"
            >`
          )}

          <label
            style="display:flex; align-items:center; gap:8px;"
          >
            <input id="questActive" type="checkbox" checked>
            Active
          </label>

          <button id="createQuestBtn" type="button">
            Create Quest Blueprint
          </button>
        </section>

        <button id="cancelNewQuestBtn" type="button">
          ← Cancel
        </button>
      </main>
    `;

    attachSignOutEvent();

    document
      .getElementById("createQuestBtn")
      .addEventListener("click", async () => {
        const name = document
          .getElementById("questName")
          .value.trim();

        if (!name) {
          alert("Please enter a quest name.");
          return;
        }

        try {
          await addDoc(collection(db, "quests"), {
            name,
            kidId: document.getElementById("questKid").value,
            type: document.getElementById("questType").value,
            time:
              document.getElementById("questTime").value.trim() ||
              "Anytime",
            xp: Number(
              document.getElementById("questXp").value || 0
            ),
            gold: Number(
              document.getElementById("questGold").value || 0
            ),
            helperBonus: Number(
              document.getElementById("questHelperBonus").value || 0
            ),
            active: document.getElementById("questActive").checked,
            archived: false,
            status: "Ready",
            completedBy: "",
            lastResetDate: getTodayKey(),
            createdAt: new Date().toISOString()
          });

          await loadQuestManager(auth.currentUser);
        } catch (err) {
          showError("Error creating quest: " + err.message);
        }
      });

    document
      .getElementById("cancelNewQuestBtn")
      .addEventListener("click", () => {
        loadQuestManager(auth.currentUser);
      });
  } catch (err) {
    showError("Could not open new quest form: " + err.message);
  }
}

function formField(label, controlHtml) {
  return `
    <div
      class="form-field"
      style="display:flex; flex-direction:column; gap:4px;"
    >
      <label style="font-weight:700;">
        ${escapeHtml(label)}
      </label>

      ${controlHtml}
    </div>
  `;
}

/* -------------------------------------------------
   ERRORS AND SAFETY
------------------------------------------------- */

function showError(message) {
  document.body.innerHTML = `
    <main class="app">
      <section class="card">
        <h2>Something went wrong</h2>
        <p>${escapeHtml(message)}</p>

        <button id="resetConnectionBtn" type="button">
          Reset Connection
        </button>
      </section>
    </main>
  `;

  document
    .getElementById("resetConnectionBtn")
    .addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error(err);
      }

      renderLoginScreen();
    });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

/* -------------------------------------------------
   INITIALIZATION
------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (getRedirectResult) {
      await getRedirectResult(auth);
    }
  } catch (err) {
    console.error("Redirect login failed:", err);
  }

  initializeAuthRouter();
});
