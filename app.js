import "./firebase.js";

const {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
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
   AUTHENTICATION AND ROUTING
------------------------------------------------- */

function initializeAuthRouter() {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      renderLoginScreen();
      return;
    }

    const email = String(user.email || "").toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const isManager = params.get("manager") === "true";

    if (email === ADMIN_EMAIL) {
      if (isManager) {
        await loadQuestManager(user);
      } else {
        await loadParentDashboard(user);
      }
      return;
    }

    if (email === CO_PARENT_EMAIL) {
      if (isManager) {
        alert("Only the Guild Master can manage quest blueprints.");
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }

      await loadParentDashboard(user);
      return;
    }

    await loadUserDashboard(user);
  });
}

function renderLoginScreen() {
  if (document.getElementById("googleSignInBtn")) return;

  document.body.innerHTML = `
    <main class="app">
      <header class="hero">
        <div class="logo">⚔️</div>
        <h1>ChoreQuest</h1>
        <p>Complete quests. Earn XP. Unlock rewards.</p>
      </header>

      <section class="card login-card">
        <h2>Enter the Realm</h2>
        <button id="googleSignInBtn" class="btn-primary" type="button">
          Sign In with Google
        </button>
      </section>
    </main>
  `;

  document
    .getElementById("googleSignInBtn")
    .addEventListener("click", async () => {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        showError("Sign in failed: " + err.message);
      }
    });
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
    } catch (err) {
      alert("Sign out failed: " + err.message);
    }
  });
}

/* -------------------------------------------------
   CHARACTER SELECTION
------------------------------------------------- */

async function loadUserDashboard(user) {
  document.body.innerHTML = `
    <main class="app">
      ${renderSignOutHeader(user)}

      <header class="hero">
        <div class="logo">🛡️</div>
        <h1>Choose Your Character</h1>
        <p>Select your profile to enter the realm.</p>
      </header>

      <section class="card">
        <p>Loading adventurers...</p>
      </section>
    </main>
  `;

  attachSignOutEvent();

  try {
    const kidsSnap = await getDocs(collection(db, "kids"));
    const kids = [];

    kidsSnap.forEach(docSnap => {
      const kid = {
        kidId: docSnap.id,
        ...docSnap.data()
      };

      if (kid.active !== false) {
        kids.push(kid);
      }
    });

    kids.sort((a, b) => a.kidId.localeCompare(b.kidId));

    document.body.innerHTML = `
      <main class="app">
        ${renderSignOutHeader(user)}

        <header class="hero">
          <div class="logo">🛡️</div>
          <h1>Choose Your Character</h1>
          <p>Select your profile to enter the realm.</p>
        </header>

        <section class="character-select">
          ${kids
            .map(
              kid => `
                <button
                  class="character-card-btn kid-select-btn"
                  type="button"
                  data-kid-id="${escapeAttribute(kid.kidId)}"
                >
                  <div class="avatar">${kid.avatar || "🧙"}</div>
                  <strong>${escapeHtml(kid.name || kid.kidId)}</strong>
                  <span>${escapeHtml(
                    kid.classTitle || `Level ${kid.level || 1} Adventurer`
                  )}</span>
                </button>
              `
            )
            .join("")}
        </section>
      </main>
    `;

    attachSignOutEvent();

    document.querySelectorAll(".kid-select-btn").forEach(button => {
      button.addEventListener("click", () => {
        loadKidDashboard(button.dataset.kidId);
      });
    });
  } catch (err) {
    showError("Could not load characters: " + err.message);
  }
}

/* -------------------------------------------------
   KID DASHBOARD
------------------------------------------------- */

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

    quests.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );

    document.body.innerHTML = `
      <main class="app">
        ${renderSignOutHeader(user)}

        <header class="hero compact">
          <div class="logo">📋</div>
          <h1>Quest Manager</h1>
          <p>${quests.length} quest blueprints</p>
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
                          ${quest.type === "daily" ? "⚔️" : "🗺️"}
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

                          <small class="status status-ready">
                            ${escapeHtml(
                              kidNames[quest.kidId] || quest.kidId || "Unassigned"
                            )}
                            • +${Number(quest.xp || 0)} XP
                            • +${Number(quest.gold || 0)} Gold
                          </small>
                        </div>

                        <div class="parent-buttons">
                          <button
                            class="edit-quest-btn"
                            type="button"
                            data-quest-id="${escapeAttribute(quest.questId)}"
                          >
                            ✏️
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
            active: document.getElementById("questActive").checked
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
            status: "Ready",
            completedBy: "",
            lastResetDate: getTodayKey()
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
