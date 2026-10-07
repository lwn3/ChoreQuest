import "./firebase.js?v=20260802-2105";

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
  signInWithRedirect,
  signInWithCustomToken,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  functions,
  httpsCallable
} = window.ChoreQuestFirebase;

// Parent accounts
const ADMIN_EMAIL = "lawrencewnelson3@gmail.com";
const CO_PARENT_EMAIL = "anitanelson1987@gmail.com";

/* -------------------------------------------------
   AUTHENTICATION, ROUTING, AND PIN ACCESS
------------------------------------------------- */

const PARENT_EMAILS = [ADMIN_EMAIL, CO_PARENT_EMAIL];
const KID_UNLOCK_KEY = "chorequestUnlockedKid";
const KID_UNLOCK_TIME_KEY = "chorequestUnlockedAt";
const KID_SESSION_MINUTES = 30;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;
const ANYONE_ID = "ANYONE";

const listChildProfilesCall = httpsCallable(functions, "listChildProfiles");
const loginChildCall = httpsCallable(functions, "loginChild");
const setChildPinCall = httpsCallable(functions, "setChildPin");
const consumeFoodCall = httpsCallable(functions, "consumeFood");
const runAdventureCall = httpsCallable(functions, "runAdventure");
const startBattleCall = httpsCallable(functions, "startBattleLegacy");
const battleActionCall = httpsCallable(functions, "battleActionLegacy");

async function getChildIdentity(user = auth.currentUser) {
  if (!user) return null;
  try {
    const token = await user.getIdTokenResult();
    if (token.claims.role !== "child" || !token.claims.kidId) return null;
    return { kidId: String(token.claims.kidId) };
  } catch {
    return null;
  }
}

async function getPublicKids() {
  const result = await listChildProfilesCall();
  const profiles = result?.data?.profiles;
  return Array.isArray(profiles) ? profiles : [];
}

async function userCanAccessKid(kidId) {
  if (isParentUser(auth.currentUser)) return true;
  const identity = await getChildIdentity(auth.currentUser);
  return identity?.kidId === kidId;
}


const THEME_PREF_KEY = "chorequestTheme";

function storedThemePreference() {
  const stored = localStorage.getItem(THEME_PREF_KEY);
  return stored === "day" || stored === "night" ? stored : "";
}

function resolvedThemePreference() {
  const stored = storedThemePreference();
  if (stored) return stored;
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? "day" : "night";
}

function applyThemePreference() {
  const resolved = resolvedThemePreference();
  document.body.classList.add("kid-theme");
  document.body.classList.toggle("day-theme", resolved === "day");
  document.body.classList.toggle("night-theme", resolved === "night");

  const control = document.getElementById("themeModeControl");
  if (control) {
    const target = resolved === "day" ? "night" : "day";
    control.dataset.current = resolved;
    control.setAttribute("aria-label", `Switch to ${target} mode`);
    control.setAttribute("title", `Switch to ${target} mode`);
    const icon = control.querySelector(".theme-knob-icon");
    if (icon) icon.textContent = target === "day" ? "☀️" : "🌙";
  }
}

function ensureThemeControls() {
  if (document.getElementById("themeModeControl")) return;

  const control = document.createElement("button");
  control.id = "themeModeControl";
  control.className = "theme-mode-control";
  control.type = "button";
  control.innerHTML = '<span class="theme-knob-icon">🌙</span>';
  document.body.appendChild(control);

  control.addEventListener("click", () => {
    const current = resolvedThemePreference();
    localStorage.setItem(THEME_PREF_KEY, current === "day" ? "night" : "day");
    applyThemePreference();
  });

  applyThemePreference();
}

let themeControlObserver = null;

function setAppTheme(mode = "default") {
  document.body.classList.add("kid-theme");
  document.body.classList.toggle("parent-theme", mode === "parent");
  applyThemePreference();

  if (!themeControlObserver) {
    themeControlObserver = new MutationObserver(() => {
      if (!document.getElementById("themeModeControl")) ensureThemeControls();
    });
    themeControlObserver.observe(document.body, { childList: true });
  }

  requestAnimationFrame(ensureThemeControls);
}

/* -------------------------------------------------
   CLASS SYSTEM FOUNDATION
------------------------------------------------- */

const CLASS_DEFINITIONS = {
  warrior: {
    name: "Warrior", icon: "⚔️", description: "Brave, strong, and dependable.",
    base: { strength: 8, wisdom: 3, agility: 5, kindness: 4, luck: 3, courage: 8 },
    growth: { strength: 2, wisdom: 0, agility: 1, kindness: 0, luck: 0, courage: 1 },
    abilities: [
      { level: 1, name: "Brave Start", text: "A warrior begins every quest with courage." },
      { level: 5, name: "Iron Will", text: "A badge of determination earned at Level 5." },
      { level: 10, name: "Guardian Strike", text: "An advanced warrior title and effect." },
      { level: 15, name: "Champion's Resolve", text: "The mark of a true champion." }
    ],
    branch1: [{ id: "knight", name: "Knight", icon: "🛡️" }, { id: "berserker", name: "Berserker", icon: "🪓" }],
    branch2: {
      knight: [{ id: "paladin", name: "Paladin" }, { id: "dragon-knight", name: "Dragon Knight" }],
      berserker: [{ id: "champion", name: "Champion" }, { id: "warlord", name: "Warlord" }]
    }
  },
  rogue: {
    name: "Rogue", icon: "🗡️", description: "Quick, clever, and independent.",
    base: { strength: 4, wisdom: 4, agility: 9, kindness: 3, luck: 7, courage: 5 },
    growth: { strength: 0, wisdom: 0, agility: 2, kindness: 0, luck: 1, courage: 1 },
    abilities: [
      { level: 1, name: "Quick Step", text: "A nimble beginning for every adventure." },
      { level: 5, name: "Clever Hands", text: "Unlocks a special rogue badge." },
      { level: 10, name: "Shadow Dash", text: "An advanced speed-themed effect." },
      { level: 15, name: "Master of Fortune", text: "The ultimate rogue title." }
    ],
    branch1: [{ id: "scout", name: "Scout", icon: "👣" }, { id: "trickster", name: "Trickster", icon: "🎭" }],
    branch2: {
      scout: [{ id: "pathfinder", name: "Pathfinder" }, { id: "shadow-runner", name: "Shadow Runner" }],
      trickster: [{ id: "illusion-rogue", name: "Illusion Rogue" }, { id: "fortune-master", name: "Fortune Master" }]
    }
  },
  mage: {
    name: "Mage", icon: "🧙", description: "Wise, creative, and full of magic.",
    base: { strength: 2, wisdom: 10, agility: 4, kindness: 5, luck: 6, courage: 4 },
    growth: { strength: 0, wisdom: 2, agility: 0, kindness: 0, luck: 1, courage: 1 },
    abilities: [
      { level: 1, name: "Spark", text: "A tiny magical spark follows completed quests." },
      { level: 5, name: "Wisdom Aura", text: "A glowing badge of knowledge." },
      { level: 10, name: "Enchanted Helper", text: "A teamwork-themed magical title." },
      { level: 15, name: "Arcane Mastery", text: "The mark of a master spellcaster." }
    ],
    branch1: [{ id: "elementalist", name: "Elementalist", icon: "🔥" }, { id: "enchanter", name: "Enchanter", icon: "✨" }],
    branch2: {
      elementalist: [{ id: "fire-mage", name: "Fire Mage" }, { id: "frost-mage", name: "Frost Mage" }],
      enchanter: [{ id: "illusionist", name: "Illusionist" }, { id: "rune-master", name: "Rune Master" }]
    }
  },
  ranger: {
    name: "Ranger", icon: "🏹", description: "An animal friend and outdoor adventurer.",
    base: { strength: 5, wisdom: 5, agility: 8, kindness: 7, luck: 4, courage: 5 },
    growth: { strength: 0, wisdom: 1, agility: 2, kindness: 1, luck: 0, courage: 0 },
    abilities: [
      { level: 1, name: "Animal Friend", text: "A companion-themed starting badge." },
      { level: 5, name: "Trail Sense", text: "Shows a ranger's growing awareness." },
      { level: 10, name: "Companion Call", text: "Unlocks an advanced companion title." },
      { level: 15, name: "Wild Guardian", text: "The final ranger mastery title." }
    ],
    branch1: [{ id: "beast-friend", name: "Beast Friend", icon: "🐾" }, { id: "pathfinder", name: "Pathfinder", icon: "🧭" }],
    branch2: {
      "beast-friend": [{ id: "beast-master", name: "Beast Master" }, { id: "spirit-ranger", name: "Spirit Ranger" }],
      pathfinder: [{ id: "forest-warden", name: "Forest Warden" }, { id: "storm-ranger", name: "Storm Ranger" }]
    }
  },
  guardian: {
    name: "Guardian", icon: "🛡️", description: "Kind, helpful, and protective.",
    base: { strength: 6, wisdom: 5, agility: 3, kindness: 10, luck: 3, courage: 7 },
    growth: { strength: 1, wisdom: 0, agility: 0, kindness: 2, luck: 0, courage: 1 },
    abilities: [
      { level: 1, name: "Helping Hand", text: "Celebrates teamwork and kindness." },
      { level: 5, name: "Kindness Shield", text: "A protective helper badge." },
      { level: 10, name: "Team Aura", text: "An advanced teamwork title." },
      { level: 15, name: "Family Guardian", text: "The highest guardian honor." }
    ],
    branch1: [{ id: "protector", name: "Protector", icon: "🛡️" }, { id: "healer", name: "Healer", icon: "💚" }],
    branch2: {
      protector: [{ id: "sentinel", name: "Sentinel" }, { id: "royal-guard", name: "Royal Guard" }],
      healer: [{ id: "light-keeper", name: "Light Keeper" }, { id: "heart-mender", name: "Heart Mender" }]
    }
  },
  royal: {
    name: "Royal Adventurer", icon: "👑", description: "Confident, imaginative, and born to lead.",
    base: { strength: 4, wisdom: 5, agility: 4, kindness: 7, luck: 9, courage: 7 },
    growth: { strength: 0, wisdom: 1, agility: 0, kindness: 1, luck: 2, courage: 1 },
    abilities: [
      { level: 1, name: "Royal Welcome", text: "A bright beginning for a royal adventurer." },
      { level: 5, name: "Magical Heritage", text: "Choose a unicorn or dragon path." },
      { level: 10, name: "Royal Aura", text: "An advanced royal effect and title." },
      { level: 15, name: "Legendary Crown", text: "The final royal mastery reward." }
    ],
    branch1: [{ id: "unicorn-princess", name: "Unicorn Princess", icon: "🦄" }, { id: "dragon-prince", name: "Dragon Prince", icon: "🐉" }],
    branch2: {
      "unicorn-princess": [{ id: "rainbow-queen", name: "Rainbow Queen" }, { id: "starlight-guardian", name: "Starlight Guardian" }],
      "dragon-prince": [{ id: "flame-king", name: "Flame King" }, { id: "dragon-rider", name: "Dragon Rider" }]
    }
  }
};

const STAT_KEYS = ["strength", "wisdom", "agility", "kindness", "luck", "courage"];


const ITEM_GRADES = {
  poor: { name: "Poor", tradeValue: 1, multiplier: 0.75, color: "#7f8795", glow: "rgba(127,135,149,.2)" },
  common: { name: "Common", tradeValue: 2, multiplier: 1, color: "#c5d0df", glow: "rgba(197,208,223,.22)" },
  good: { name: "Good", tradeValue: 4, multiplier: 1.5, color: "#52d273", glow: "rgba(82,210,115,.28)" },
  rare: { name: "Rare", tradeValue: 8, multiplier: 2.25, color: "#4da3ff", glow: "rgba(77,163,255,.35)" },
  legendary: { name: "Legendary", tradeValue: 18, multiplier: 3.5, color: "#f6c945", glow: "rgba(246,201,69,.48)" },
  mythic: { name: "Mythic", tradeValue: 32, multiplier: 5, color: "#c879ff", glow: "rgba(200,121,255,.55)" }
};

const LEGACY_GRADE_TO_RARITY = {
  wood: "common",
  copper: "good",
  iron: "good",
  silver: "rare",
  gold: "legendary",
  mythril: "mythic"
};

function normalizeRarity(value) {
  const raw = String(value || "common").toLowerCase();
  return ITEM_GRADES[raw] ? raw : (LEGACY_GRADE_TO_RARITY[raw] || "common");
}

const ITEM_TYPES = {
  // --- WOOD TIER: MAIN HAND ---
  wooden_sword: { name: "Sword", slot: "main_hand", icon: "\ud83d\udde1\ufe0f", iconFile: "wooden_sword.webp", bonuses: { strength: 2 } },
  stick: { name: "Wand", slot: "main_hand", icon: "\ud83e\udeb5", iconFile: "stick.webp", bonuses: { wisdom: 1, luck: 1 } },
  branch: { name: "Staff", slot: "main_hand", icon: "\ud83c\udf3f", iconFile: "branch.webp", bonuses: { wisdom: 2 } },
  wooden_bow: { name: "Bow", slot: "main_hand", icon: "\ud83c\udff9", iconFile: "wooden_bow.webp", bonuses: { agility: 2 } },
  wooden_axe: { name: "Axe", slot: "main_hand", icon: "\ud83e\ude93", iconFile: "wooden_axe.webp", bonuses: { strength: 2, courage: 1 } },

  // --- WOOD TIER: OFF HAND ---
  wooden_shield: { name: "Shield", slot: "off_hand", icon: "\ud83d\udee1\ufe0f", iconFile: "wooden_shield.webp", bonuses: { strength: 1, courage: 1 } },
  wooden_tome: { name: "Spellbook", slot: "off_hand", icon: "\ud83d\udcd6", iconFile: "wooden_tome.webp", bonuses: { wisdom: 2 } },
  carved_rune_slate: { name: "Magic Focus", slot: "off_hand", icon: "\ud83e\udea8", iconFile: "carved_rune_slate.webp", bonuses: { wisdom: 1, kindness: 1 } },

  // --- WOOD TIER: HEAD ---
  bark_cap: { name: "Cap", slot: "head", icon: "\ud83c\udf44", iconFile: "bark_cap.webp", bonuses: { courage: 1 } },
  wooden_helmet: { name: "Helmet", slot: "head", icon: "\ud83e\ude96", iconFile: "wooden_helmet.webp", bonuses: { strength: 1, courage: 1 } },
  wooden_circlet: { name: "Circlet", slot: "head", icon: "\u2b55", iconFile: "wooden_circlet.webp", bonuses: { wisdom: 1 } },
  wooden_hat: { name: "Hat", slot: "head", icon: "\ud83c\udfa9", iconFile: "wooden_hat.webp", bonuses: { luck: 1 } },
  wood_crown: { name: "Crown", slot: "head", icon: "\ud83d\udc51", iconFile: "wood_crown.webp", bonuses: { courage: 1, luck: 1 } },

  // --- WOOD TIER: BODY ---
  wooden_tunic: { name: "Tunic", slot: "body", icon: "\ud83e\udd4b", iconFile: "wooden_tunic.webp", bonuses: { courage: 1, kindness: 1 } },
  wooden_robes: { name: "Robes", slot: "body", icon: "\ud83d\udc58", iconFile: "wooden_robes.webp", bonuses: { wisdom: 2 } },

  // --- WOOD TIER: FEET ---
  wooden_boots: { name: "Boots", slot: "feet", icon: "\ud83d\udc62", iconFile: "wooden_boots.webp", bonuses: { strength: 1 } },
  wooden_shoes: { name: "Shoes", slot: "feet", icon: "\ud83d\udc5e", iconFile: "wooden_shoes.webp", bonuses: { agility: 1 } },
  wooden_slippers: { name: "Slippers", slot: "feet", icon: "\ud83e\udd7f", iconFile: "wooden_slippers.webp", bonuses: { luck: 1, agility: 1 } },

  // --- WOOD TIER: CAPE ---
  leaf_cape: { name: "Cape", slot: "cape", icon: "\ud83c\udf42", iconFile: "leaf_cape.webp", bonuses: { agility: 1, courage: 1 } },
  moss_cloak: { name: "Cloak", slot: "cape", icon: "\ud83c\udf3f", iconFile: "moss_cloak.webp", bonuses: { kindness: 1, wisdom: 1 } },

  // --- WOOD TIER: ACCESSORY ---
  wooden_pendant: { name: "Pendant", slot: "accessory", icon: "\ud83e\ude99", iconFile: "wooden_pendant.webp", bonuses: { luck: 1 } },
  acorn_charm: { name: "Charm", slot: "accessory", icon: "\ud83c\udf30", iconFile: "acorn_charm.webp", bonuses: { luck: 2 } },
  pinecone_amulet: { name: "Amulet", slot: "accessory", icon: "\ud83c\udf32", iconFile: "pinecone_amulet.webp", bonuses: { kindness: 1, courage: 1 } },

  // --- LEGACY TEST ITEMS ---
  wooden_medallion: { name: "Medallion", slot: "accessory", icon: "🪙", iconFile: "wooden_pendant.webp", bonuses: { luck: 1 } },
  acorn_pendant: { name: "Pendant", slot: "accessory", icon: "🌰", iconFile: "acorn_charm.webp", bonuses: { luck: 2 } },
  twine_quiver: { name: "Quiver", slot: "accessory", icon: "🧵", iconFile: "pinecone_amulet.webp", bonuses: { agility: 1 } },
  willow_ring: { name: "Ring", slot: "accessory", icon: "💍", iconFile: "wooden_pendant.webp", bonuses: { kindness: 2 } }
};

const INVENTORY_VERSION = 3;
const STARTER_ITEM_TYPES = [
  "wooden_sword",
  "stick",
  "branch",
  "wooden_bow",
  "wooden_axe",
  "wooden_shield",
  "wooden_tome",
  "carved_rune_slate",
  "bark_cap",
  "wooden_helmet",
  "wooden_circlet",
  "wooden_hat",
  "wood_crown",
  "wooden_tunic",
  "wooden_robes",
  "wooden_boots",
  "wooden_shoes",
  "wooden_slippers",
  "leaf_cape",
  "moss_cloak",
  "wooden_pendant",
  "acorn_charm",
  "pinecone_amulet"
];

const STARTER_EQUIPMENT_TYPES = {
  head: "bark_cap",
  body: "wooden_tunic",
  feet: "wooden_boots",
  cape: "leaf_cape",
  main_hand: "wooden_sword",
  off_hand: "wooden_shield"
};

const EQUIPMENT_SLOTS = {
  head: "Head",
  body: "Body",
  feet: "Feet",
  accessory: "Accessory",
  cape: "Cape",
  main_hand: "Main Hand",
  off_hand: "Off Hand"
};

function createItem(itemType, rarity = "common") {
  const def = ITEM_TYPES[itemType];
  if (!def) throw new Error(`Unknown item type: ${itemType}`);
  const normalizedRarity = normalizeRarity(rarity);
  const rarityDef = ITEM_GRADES[normalizedRarity];
  const scaledBonuses = Object.fromEntries(Object.entries(def.bonuses).map(([key, value]) => [
    key,
    Math.max(1, Math.round(Number(value || 0) * rarityDef.multiplier))
  ]));
  return {
    instanceId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    itemType,
    name: normalizedRarity === "common" ? def.name : `${rarityDef.name} ${def.name}`,
    slot: def.slot,
    grade: normalizedRarity,
    rarity: normalizedRarity,
    tradeValue: rarityDef.tradeValue,
    bonuses: scaledBonuses,
    equipped: false,
    tradeable: true
  };
}

function starterInventory() {
  return STARTER_ITEM_TYPES.map(itemType => createItem(itemType, "common"));
}

function normalizeStoredItem(item) {
  if (!item || typeof item !== "object") return item;
  const def = ITEM_TYPES[item.itemType];
  if (!def) return item;
  const rarity = normalizeRarity(item.rarity || item.grade);
  const rarityDef = ITEM_GRADES[rarity];
  const bonuses = item.bonuses && typeof item.bonuses === "object"
    ? item.bonuses
    : Object.fromEntries(Object.entries(def.bonuses).map(([key, value]) => [
      key,
      Math.max(1, Math.round(Number(value || 0) * rarityDef.multiplier))
    ]));
  return {
    ...item,
    name: rarity === "common" ? def.name : `${rarityDef.name} ${def.name}`,
    slot: def.slot,
    grade: rarity,
    rarity,
    tradeValue: Number(item.tradeValue || rarityDef.tradeValue),
    bonuses
  };
}

async function ensureInventoryInitialized(kid) {
  const hasCurrentVersion = Number(kid.inventoryVersion || 0) >= INVENTORY_VERSION;
  if (hasCurrentVersion && Array.isArray(kid.inventory) && kid.equipment && typeof kid.equipment === "object") return kid;

  const inventory = (Array.isArray(kid.inventory) ? kid.inventory : []).map(normalizeStoredItem).filter(Boolean);
  const equipment = Object.fromEntries(
    Object.entries(kid.equipment && typeof kid.equipment === "object" ? kid.equipment : {})
      .map(([slot, item]) => [slot, normalizeStoredItem(item)])
      .filter(([, item]) => Boolean(item))
  );

  const ownedCommonTypes = new Set([
    ...inventory.filter(item => normalizeRarity(item.rarity || item.grade) === "common").map(item => item.itemType),
    ...Object.values(equipment).filter(item => normalizeRarity(item?.rarity || item?.grade) === "common").map(item => item.itemType)
  ]);

  STARTER_ITEM_TYPES.forEach(itemType => {
    if (!ownedCommonTypes.has(itemType)) inventory.push(createItem(itemType, "common"));
  });

  Object.entries(STARTER_EQUIPMENT_TYPES).forEach(([slot, itemType]) => {
    if (equipment[slot]) return;
    const inventoryIndex = inventory.findIndex(item => item.itemType === itemType && normalizeRarity(item.rarity || item.grade) === "common");
    if (inventoryIndex < 0) return;
    const [item] = inventory.splice(inventoryIndex, 1);
    equipment[slot] = { ...item, equipped: true };
  });

  const normalizedInventory = inventory.map(item => ({ ...item, equipped: false }));
  await updateDoc(doc(db, "kids", kid.kidId), {
    inventory: normalizedInventory,
    equipment,
    inventoryVersion: INVENTORY_VERSION
  });
  return { ...kid, inventory: normalizedInventory, equipment, inventoryVersion: INVENTORY_VERSION };
}

function itemIcon(item) {
  const def = ITEM_TYPES[item?.itemType];
  const fallback = escapeHtml(def?.icon || "🎁");
  const rarity = normalizeRarity(item?.rarity || item?.grade);
  if (!def?.iconFile || ["poor", "common", "good"].includes(rarity)) {
    return `<span class="equipment-item-icon-fallback rarity-${rarity}">${fallback}</span>`;
  }

  const src = `assets/equipment-icons/wood/${def.iconFile}?v=3`;
  return `
    <img class="equipment-item-icon-image rarity-${rarity}" src="${escapeAttribute(src)}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">
    <span class="equipment-item-icon-fallback rarity-${rarity}" hidden>${fallback}</span>`;
}

function equipmentBonuses(equipment) {
  const total = Object.fromEntries(STAT_KEYS.map(key => [key, 0]));
  Object.values(equipment || {}).forEach(item => {
    Object.entries(item?.bonuses || {}).forEach(([key, value]) => {
      if (key in total) total[key] += Number(value || 0);
    });
  });
  return total;
}

function formatBonuses(item) {
  const entries = Object.entries(item?.bonuses || {}).filter(([, value]) => Number(value) !== 0);
  return entries.length ? entries.map(([key, value]) => `+${value} ${key[0].toUpperCase()}${key.slice(1)}`).join(" • ") : "Cosmetic item";
}


const MAX_ENERGY = 30;
const MAX_SLEEPINESS = 8;

const CANDY_FOODS = {
  gummy_bears: { name: "Gummy Bears", icon: "🍬", energy: 3 },
  chocolate_bar: { name: "Chocolate Bar", icon: "🍫", energy: 6 },
  lollipop: { name: "Lollipop", icon: "🍭", energy: 10 },
  streak_bubble_gum: { name: "Streak Bubble Gum", icon: "🫧", energy: 15, streakOnly: true }
};

const AUTUMN_FOODS = {
  apple_slices: { name: "Apple Slices", icon: "🍎", energy: 3 },
  rice_ball: { name: "Rice Ball", icon: "🍙", energy: 6 },
  dumplings: { name: "Dumplings", icon: "🥟", energy: 10 },
  streak_ramen: { name: "Streak Ramen Packet", icon: "🍜", energy: 15, streakOnly: true }
};

function foodCatalogForKid(kid) {
  return String(kid?.name || "").trim().toLowerCase() === "autumn" ? AUTUMN_FOODS : CANDY_FOODS;
}

function regularFoodIdsForKid(kid) {
  return Object.entries(foodCatalogForKid(kid)).filter(([, food]) => !food.streakOnly).map(([id]) => id);
}

function streakFoodIdForKid(kid) {
  return String(kid?.name || "").trim().toLowerCase() === "autumn" ? "streak_ramen" : "streak_bubble_gum";
}

function questFoodTier(quest) {
  const saved = String(quest?.foodTier || "").toLowerCase();
  if (["small", "medium", "large"].includes(saved)) return saved;
  const difficulty = Number(quest?.xp || 0);
  if (difficulty >= 60) return "large";
  if (difficulty >= 30) return "medium";
  return "small";
}

function questFoodTierLabel(quest) {
  return {
    small: "Small snack",
    medium: "Medium snack",
    large: "Large snack"
  }[questFoodTier(quest)];
}

function questFoodRewardId(kid, quest, isFullReward = true) {
  const ids = regularFoodIdsForKid(kid);
  if (!isFullReward) return ids[0];
  const tier = questFoodTier(quest);
  if (tier === "large") return ids[2];
  if (tier === "medium") return ids[1];
  return ids[0];
}

function foodInventoryHtml(kid) {
  const inventory = kid?.foodInventory && typeof kid.foodInventory === "object" ? kid.foodInventory : {};
  const catalog = foodCatalogForKid(kid);
  const entries = Object.entries(catalog).filter(([id]) => Number(inventory[id] || 0) > 0);
  if (!entries.length) return '<p class="energy-empty">Complete approved quests to earn adventure food.</p>';
  return entries.map(([id, food]) => `
    <button class="food-use-btn" type="button" data-food-id="${escapeAttribute(id)}">
      <span>${food.icon}</span>
      <strong>${escapeHtml(food.name)}</strong>
      <small>+${food.energy} Energy • x${Number(inventory[id] || 0)}</small>
    </button>`).join("");
}

function currentSleepiness(kid) {
  return kid?.sleepinessDate === getTodayKey() ? Number(kid.sleepiness || 0) : 0;
}


/* -------------------------------------------------
   STATIC CHARACTER PORTRAIT
------------------------------------------------- */

const CHARACTER_PORTRAIT_FILES = {
  ava: "ava-character.webp",
  autumn: "autumn-character.webp",
  wesley: "wesley-character.webp"
};

function getCharacterPortraitSource(kid) {
  const saved = String(kid?.portraitFile || "").trim();
  if (saved) {
    return saved.startsWith("assets/") ? saved : `assets/portraits/${saved}`;
  }

  const name = String(kid?.name || "").trim().toLowerCase();
  const filename = CHARACTER_PORTRAIT_FILES[name];
  return filename ? `assets/portraits/${filename}` : "";
}

function renderCharacterThumbnail(kid) {
  const src = getCharacterPortraitSource(kid);
  const fallback = escapeHtml(kid?.avatar || "🧙");
  if (!src) return `<span class="character-thumbnail-fallback">${fallback}</span>`;

  return `
    <img
      class="character-thumbnail-image"
      src="${escapeAttribute(src)}"
      alt=""
      onerror="this.hidden=true;this.nextElementSibling.hidden=false;"
    >
    <span class="character-thumbnail-fallback" hidden>${fallback}</span>`;
}

function renderCharacterPortrait(kid) {
  const src = getCharacterPortraitSource(kid);
  const fallback = escapeHtml(kid?.avatar || "🧙");

  return `
    <div class="character-portrait-frame">
      ${src ? `
        <img
          class="character-portrait-image"
          src="${escapeAttribute(src)}"
          alt="${escapeAttribute(kid.name || "Adventurer")} character portrait"
          onerror="this.hidden=true;this.nextElementSibling.hidden=false;"
        >
        <div class="character-portrait-fallback" hidden>${fallback}</div>`
        : `<div class="character-portrait-fallback">${fallback}</div>`}
    </div>`;
}

function isParentUser(user) {
  return Boolean(user && PARENT_EMAILS.includes(String(user.email || "").toLowerCase()));
}

function waitForAuthUser() {
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function openParentDashboardFromCurrentSession() {
  const user = auth.currentUser || await waitForAuthUser();
  if (isParentUser(user)) {
    window.history.replaceState({}, document.title, window.location.pathname);
    await loadParentDashboard(user);
    return;
  }
  await startParentSignIn();
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
    const isMod = params.get("mod") === "true";

    if (!user) {
      await loadUserDashboard(null);
      return;
    }

    if (!isParentUser(user)) {
  const signedInEmail = String(user.email || "(no email)").toLowerCase();

  document.body.innerHTML = `
    <main class="app">
      <section class="card">
        <h2>Parent account not authorized</h2>
        <p>Firebase signed in as:</p>
        <p><strong>${escapeHtml(signedInEmail)}</strong></p>
        <p>This email is not currently listed as a parent account.</p>
        <button id="unauthorizedSignOutBtn" type="button">
          Sign Out
        </button>
      </section>
    </main>
  `;

  document
    .getElementById("unauthorizedSignOutBtn")
    .addEventListener("click", async () => {
      await signOut(auth);
      await loadUserDashboard(null);
    });

  return;
}

    if (isMod) {
      if (String(user?.email || "").toLowerCase() === ADMIN_EMAIL) {
        await loadModLab(user);
      } else {
        await loadParentDashboard(user);
      }
    } else if (isManager) {
      await loadQuestManager(user);
    } else if (isFamily) {
      await loadFamilyAccounts(user);
    } else {
      await loadParentDashboard(user);
    }
  });
}

let parentSignInInProgress = false;

async function startParentSignIn() {
  if (parentSignInInProgress) return;
  parentSignInInProgress = true;

  try {
    sessionStorage.removeItem(KID_UNLOCK_KEY);
    sessionStorage.removeItem(KID_UNLOCK_TIME_KEY);

    if (auth.currentUser) {
      await signOut(auth);
    }

    googleProvider.setCustomParameters({
      prompt: "select_account",
    });

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    const result = await signInWithPopup(auth, googleProvider);

    if (!isParentUser(result.user)) {
      await signOut(auth);
      showError("That Google account is not authorized as a parent.");
      return;
    }

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    await loadParentDashboard(result.user);
  } catch (err) {
    if (
      err?.code === "auth/popup-closed-by-user" ||
      err?.code === "auth/cancelled-popup-request"
    ) {
      return;
    }

    showError("Parent sign in failed: " + err.message);
  } finally {
    parentSignInInProgress = false;
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
    let kids;
    if (isParentUser(user)) {
      const kidsSnap = await getDocs(collection(db, "kids"));
      kids = [];
      kidsSnap.forEach(docSnap => {
        const kid = { kidId: docSnap.id, ...docSnap.data() };
        if (kid.active !== false) kids.push(kid);
      });
    } else {
      kids = await getPublicKids();
    }
    kids.sort((a, b) =>
      String(a.name || a.kidId).localeCompare(String(b.name || b.kidId))
    );

    document.body.innerHTML = `
      <main class="app">
        ${isParentUser(user) ? renderSignOutHeader(user) : ""}
        <header class="hero"><div class="logo">🛡️</div><h1>Choose Your Character</h1><p>Select a profile to enter the realm.</p></header>
        <section class="character-select">
          ${kids.map(kid => `
            <button class="character-card-btn kid-select-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}">
              <div class="avatar">${renderCharacterThumbnail(kid)}</div>
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
    document.getElementById('openParentBtn')?.addEventListener('click', openParentDashboardFromCurrentSession);
  } catch (err) {
    showError("Could not load profiles: " + err.message);
  }
}

async function loadChildSelector() {
  setAppTheme("kid");
  document.body.innerHTML = `<main class="app"><section class="card"><p>Loading profiles...</p></section></main>`;
  try {
    const kids = await getPublicKids();
    const activeKids = kids.filter(kid => kid.active !== false);
    document.body.innerHTML = `
      <main class="app">
        <header class="hero"><div class="logo">🛡️</div><h1>Choose Your Character</h1><p>Select a child profile.</p></header>
        <section class="character-select">
          ${activeKids.map(kid => `
            <button class="character-card-btn child-only-select-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}">
              <div class="avatar">${renderCharacterThumbnail(kid)}</div>
              <strong>${escapeHtml(kid.name || kid.kidId)}</strong>
              <span>${escapeHtml(kid.classTitle || `Level ${kid.level || 1} Adventurer`)}</span>
            </button>`).join("")}
        </section>
      </main>`;
    document.querySelectorAll('.child-only-select-btn').forEach(button => {
      button.addEventListener('click', () => {
        const selectedKidId = button.dataset.kidId;
        window.history.replaceState({}, document.title, `?kid=${encodeURIComponent(selectedKidId)}`);
        loadKidEntry(selectedKidId);
      });
    });
  } catch (err) {
    showError("Could not load child profiles: " + err.message);
  }
}

function isKidUnlocked(kidId) {
  const unlockedKid = sessionStorage.getItem(KID_UNLOCK_KEY);
  const unlockedAt = Number(sessionStorage.getItem(KID_UNLOCK_TIME_KEY) || 0);
  const stillValid = Date.now() - unlockedAt < KID_SESSION_MINUTES * 60 * 1000;
  if (unlockedKid === kidId && stillValid) return true;
  sessionStorage.removeItem(KID_UNLOCK_KEY);
  sessionStorage.removeItem(KID_UNLOCK_TIME_KEY);
  return false;
}

function getPinSecurity(kidId) {
  try {
    return JSON.parse(localStorage.getItem(`chorequestPinSecurity:${kidId}`)) || { attempts: 0, lockedUntil: 0 };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function setPinSecurity(kidId, value) {
  localStorage.setItem(`chorequestPinSecurity:${kidId}`, JSON.stringify(value));
}

function clearPinSecurity(kidId) {
  localStorage.removeItem(`chorequestPinSecurity:${kidId}`);
}

async function hashPin(pin) {
  const bytes = new TextEncoder().encode(String(pin));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loadKidEntry(kidId) {
  setAppTheme("kid");
  try {
    const user = auth.currentUser || await waitForAuthUser();

    if (isParentUser(user)) {
      sessionStorage.setItem(KID_UNLOCK_KEY, kidId);
      sessionStorage.setItem(KID_UNLOCK_TIME_KEY, String(Date.now()));
      await loadKidDashboard(kidId);
      return;
    }

    const identity = await getChildIdentity(user);
    if (identity?.kidId === kidId) {
      sessionStorage.setItem(KID_UNLOCK_KEY, kidId);
      sessionStorage.setItem(KID_UNLOCK_TIME_KEY, String(Date.now()));
      await loadKidDashboard(kidId);
      return;
    }

    if (user) await signOut(auth);

    const profiles = await getPublicKids();
    const kid = profiles.find(profile => profile.kidId === kidId);
    if (!kid) {
      showError("Profile not found: " + kidId);
      return;
    }

    document.body.innerHTML = `
      <main class="app">
        <header class="hero compact"><div class="logo character-logo">${renderCharacterThumbnail(kid)}</div><h1>${escapeHtml(kid.name || kidId)}</h1><p>Enter your 4-digit PIN</p></header>
        <section class="card form-card">
          ${kid.pinConfigured ? `
            <div class="form-field"><label for="kidPin">PIN</label><input id="kidPin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" autocomplete="off"></div>
            <button id="unlockKidBtn" type="button">Continue</button>
            <p id="pinMessage" aria-live="polite"></p>`
          : '<p>This profile does not have a PIN yet. Ask a parent to set one in Family Accounts.</p>'}
          <button id="backHomeBtn" type="button">← Choose another profile</button>
        </section>
      </main>`;

    document.getElementById("backHomeBtn").addEventListener("click", () => {
      sessionStorage.removeItem(KID_UNLOCK_KEY);
      sessionStorage.removeItem(KID_UNLOCK_TIME_KEY);
      window.history.replaceState({}, document.title, window.location.pathname);
      loadChildSelector();
    });

    const unlock = async () => {
      const input = document.getElementById("kidPin");
      const message = document.getElementById("pinMessage");
      const pin = input?.value.trim() || "";
      if (!/^\d{4}$/.test(pin)) {
        message.textContent = "Enter a 4-digit PIN.";
        return;
      }

      const button = document.getElementById("unlockKidBtn");
      button.disabled = true;
      message.textContent = "Checking PIN...";

      try {
        const result = await loginChildCall({ kidId, pin });
        await signInWithCustomToken(auth, result.data.token);
        clearPinSecurity(kidId);
        sessionStorage.setItem(KID_UNLOCK_KEY, kidId);
        sessionStorage.setItem(KID_UNLOCK_TIME_KEY, String(Date.now()));
        await loadKidDashboard(kidId);
      } catch (err) {
        input.value = "";
        const code = String(err?.code || "");
        if (code.includes("resource-exhausted")) {
          message.textContent = "Too many attempts. Try again in 15 minutes.";
        } else if (code.includes("permission-denied")) {
          message.textContent = "That PIN is not correct.";
          } else {
            const errorCode = String(err?.code || "unknown");
            const errorMessage = String(err?.message || "No error message");

            message.textContent =
              `Sign-in failed: ${errorCode} — ${errorMessage}`;

            console.error("Child sign-in failed:", err);
          }
        button.disabled = false;
      }
    };

    document.getElementById("unlockKidBtn")?.addEventListener("click", unlock);
    document.getElementById("kidPin")?.addEventListener("keydown", event => {
      if (event.key === "Enter") unlock();
    });
  } catch (err) {
    showError("Could not open profile: " + err.message);
  }
}


/* -------------------------------------------------
   QUEST SCHEDULING HELPERS
------------------------------------------------- */

const WEEKDAY_OPTIONS = [
  { value: 0, short: "Sun", long: "Sunday" },
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" }
];

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return `week-${getLocalDateKey(d)}`;
}

function getQuestScheduleType(quest) {
  const value = String(quest.scheduleType || quest.type || "interval");
  if (value === "daily") return "interval";
  if (value === "weekly") return "interval";
  if (["interval", "weekdays", "one-time"].includes(value)) return value;
  return "interval";
}

function getQuestIntervalDays(quest) {
  if (String(quest.scheduleType || quest.type) === "weekly") return 7;
  if (String(quest.scheduleType || quest.type) === "daily") return 1;
  return Math.max(1, Number(quest.intervalDays || 1));
}

function questStartDateKey(quest) {
  return quest.startDate || quest.dueDate || String(quest.createdAt || "").slice(0, 10) || getTodayKey();
}

function daysBetweenDateKeys(fromKey, toKey) {
  const from = dateFromKey(fromKey);
  const to = dateFromKey(toKey);
  return Math.round((to - from) / 86400000);
}

function getQuestPeriodKey(quest, date = new Date()) {
  const scheduleType = getQuestScheduleType(quest);
  if (scheduleType === "one-time") return `one-time:${quest.dueDate || questStartDateKey(quest)}`;
  return getLocalDateKey(date);
}

function isQuestScheduledToday(quest, date = new Date()) {
  const scheduleType = getQuestScheduleType(quest);
  const todayKey = getLocalDateKey(date);

  if (scheduleType === "one-time") {
    return !quest.dueDate || quest.dueDate === todayKey;
  }

  if (scheduleType === "weekdays") {
    const startKey = questStartDateKey(quest);
    if (daysBetweenDateKeys(startKey, todayKey) < 0) return false;
    const weekdays = Array.isArray(quest.weekdays) ? quest.weekdays.map(Number) : [];
    return weekdays.includes(date.getDay());
  }

  const intervalDays = getQuestIntervalDays(quest);
  const startKey = questStartDateKey(quest);
  const diff = daysBetweenDateKeys(startKey, todayKey);
  return diff >= 0 && diff % intervalDays === 0;
}

function isQuestCompletedForCurrentPeriod(quest, history, date = new Date()) {
  const periodKey = getQuestPeriodKey(quest, date);
  return history.some(item => {
    if (item.questId !== quest.choreId) return false;
    if (item.periodKey) return item.periodKey === periodKey;
    if (getQuestScheduleType(quest) === "one-time") return true;
    return item.questDate === getLocalDateKey(date);
  });
}

function isSubmissionForCurrentPeriod(quest, submission, date = new Date()) {
  if (submission.questId !== quest.choreId || submission.status !== "Pending") return false;
  const periodKey = getQuestPeriodKey(quest, date);
  if (submission.periodKey) return submission.periodKey === periodKey;
  return submission.questDate === getLocalDateKey(date);
}

function scheduleLabel(quest) {
  const scheduleType = getQuestScheduleType(quest);
  if (scheduleType === "weekdays") {
    const selected = Array.isArray(quest.weekdays) ? quest.weekdays.map(Number) : [];
    const names = WEEKDAY_OPTIONS.filter(day => selected.includes(day.value)).map(day => day.short);
    return names.length ? `Every ${names.join(", ")}` : "Selected weekdays";
  }
  if (scheduleType === "one-time") return quest.dueDate ? `Once on ${quest.dueDate}` : "One time";
  const interval = getQuestIntervalDays(quest);
  return interval === 1 ? "Every day" : `Every ${interval} days`;
}

function dueLabel(quest) {
  const datePart = quest.dueDate ? `Due ${quest.dueDate}` : "";
  const timePart = quest.dueTime ? `${datePart ? " at " : "Due "}${quest.dueTime}` : "";
  if (datePart || timePart) return `${datePart}${timePart}`;
  return quest.time || "Anytime";
}

function weekdayCheckboxes(selectedDays = []) {
  const selected = selectedDays.map(Number);
  return WEEKDAY_OPTIONS.map(day => `
    <label class="weekday-chip">
      <input class="quest-weekday" type="checkbox" value="${day.value}" ${selected.includes(day.value) ? "checked" : ""}>
      <span>${day.short}</span>
    </label>`).join("");
}

function attachScheduleFormBehavior() {
  const scheduleSelect = document.getElementById("questScheduleType");
  const weekdayBox = document.getElementById("weekdayOptions");
  const intervalBox = document.getElementById("intervalOptions");
  const dueDateLabel = document.getElementById("questDueDateLabel");
  if (!scheduleSelect) return;

  const sync = () => {
    const value = scheduleSelect.value;
    if (weekdayBox) weekdayBox.hidden = value !== "weekdays";
    if (intervalBox) intervalBox.hidden = value !== "interval";
    if (dueDateLabel) dueDateLabel.textContent = value === "one-time" ? "Due date" : "Start date";
  };

  scheduleSelect.addEventListener("change", sync);
  sync();
}

function getSelectedWeekdays() {
  return Array.from(document.querySelectorAll(".quest-weekday:checked")).map(input => Number(input.value));
}

function questHierarchyDepth(quest, byId) {
  let depth = 0;
  let parentId = quest.parentQuestId;
  const seen = new Set();
  while (parentId && byId[parentId] && depth < 4 && !seen.has(parentId)) {
    seen.add(parentId);
    depth += 1;
    parentId = byId[parentId].parentQuestId;
  }
  return depth;
}

function sortQuestsForManager(quests) {
  const byId = Object.fromEntries(quests.map(q => [q.questId, q]));
  const children = new Map();
  quests.forEach(q => {
    const parent = q.parentQuestId && byId[q.parentQuestId] ? q.parentQuestId : "__root__";
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(q);
  });
  children.forEach(list => list.sort((a,b) => String(a.name || "").localeCompare(String(b.name || ""))));
  const result = [];
  const walk = parentId => {
    (children.get(parentId) || []).forEach(q => {
      result.push(q);
      walk(q.questId);
    });
  };
  walk("__root__");
  return result;
}

/* -------------------------------------------------
   AUTOMATIC STREAK TRACKING
------------------------------------------------- */

function getKidStreakMode(kid) {
  if (kid.streakMode === "participation" || kid.streakMode === "main") return kid.streakMode;
  const name = String(kid.name || "").toLowerCase();
  return ["ava", "wesley"].includes(name) ? "participation" : "main";
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function shiftDateKey(dateKey, amount) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + amount);
  return getLocalDateKey(date);
}

function streakEligibleMainQuests(quests, kidId, date) {
  return quests.filter(quest => {
    if (quest.archived === true || quest.active === false) return false;
    if (quest.kidId !== kidId) return false;
    const scheduleType = getQuestScheduleType(quest);
    if (!["interval", "weekdays"].includes(scheduleType)) return false;
    return isQuestScheduledToday(quest, date);
  });
}

function historyForDate(history, dateKey) {
  return history.filter(item => item.questDate === dateKey);
}

function didKidQualifyForStreak(kid, quests, history, dateKey) {
  const dailyHistory = historyForDate(history, dateKey);
  const mode = getKidStreakMode(kid);

  if (mode === 'participation') {
    return {
      requiredDay: true,
      qualified: dailyHistory.some(item =>
        Array.isArray(item.participantIds) && item.participantIds.includes(kid.kidId)
      )
    };
  }

  const date = dateFromKey(dateKey);
  const required = streakEligibleMainQuests(quests, kid.kidId, date);
  if (required.length === 0) return { requiredDay: false, qualified: false };

  const completedIds = new Set(
    dailyHistory
      .filter(item => item.assignedKidId === kid.kidId)
      .map(item => item.questId)
  );

  return {
    requiredDay: true,
    qualified: required.every(quest => completedIds.has(quest.choreId))
  };
}

function calculateCurrentStreak(kid, quests, history, todayKey = getTodayKey()) {
  let streak = 0;
  let cursor = todayKey;
  let checked = 0;
  let latestQualifiedDate = '';

  const todayResult = didKidQualifyForStreak(kid, quests, history, cursor);
  if (todayResult.requiredDay && todayResult.qualified) {
    streak += 1;
    latestQualifiedDate = cursor;
  }
  cursor = shiftDateKey(cursor, -1);

  while (checked < 365) {
    checked += 1;
    const result = didKidQualifyForStreak(kid, quests, history, cursor);
    if (!result.requiredDay) {
      cursor = shiftDateKey(cursor, -1);
      continue;
    }
    if (!result.qualified) break;
    streak += 1;
    if (!latestQualifiedDate) latestQualifiedDate = cursor;
    cursor = shiftDateKey(cursor, -1);
  }

  return { streak, latestQualifiedDate };
}

async function refreshAllStreaks() {
  const [kidsSnap, questSnap, history] = await Promise.all([
    getDocs(collection(db, "kids")),
    getDocs(collection(db, "quests")),
    getAllHistory()
  ]);

  const kids = [];
  kidsSnap.forEach(item => kids.push({ kidId: item.id, ...item.data() }));
  const quests = [];
  questSnap.forEach(item => quests.push({ choreId: item.id, ...item.data() }));

  const todayKey = getTodayKey();
  const updates = [];
  kids.forEach(kid => {
    if (kid.modProfile === true) return;
    const result = calculateCurrentStreak(kid, quests, history, todayKey);
    const current = Number(kid.currentStreak || 0);
    const best = Math.max(Number(kid.bestStreak || 0), result.streak);
    const todayResult = didKidQualifyForStreak(kid, quests, history, todayKey);
    const shouldAwardBonus = todayResult.requiredDay && todayResult.qualified && kid.lastStreakBonusDate !== todayKey;

    const patch = {};
    if (current !== result.streak) patch.currentStreak = result.streak;
    if (Number(kid.bestStreak || 0) !== best) patch.bestStreak = best;
    if ((kid.lastStreakDate || "") !== result.latestQualifiedDate) patch.lastStreakDate = result.latestQualifiedDate;

    if (shouldAwardBonus) {
      const foodId = streakFoodIdForKid(kid);
      const foodInventory = kid.foodInventory && typeof kid.foodInventory === "object" ? { ...kid.foodInventory } : {};
      foodInventory[foodId] = Number(foodInventory[foodId] || 0) + 1;
      patch.foodInventory = foodInventory;
      patch.lastStreakBonusDate = todayKey;
      patch.lastStreakBonusItem = foodId;
    }

    if (Object.keys(patch).length) {
      patch.streakUpdatedAt = new Date().toISOString();
      updates.push(updateDoc(doc(db, "kids", kid.kidId), patch));
    }
  });
  await Promise.all(updates);
}

/* -------------------------------------------------
   KID DASHBOARD, MAIN QUESTS, SIDE QUESTS, AND HELPERS
------------------------------------------------- */

async function getAllKids() {
  if (!isParentUser(auth.currentUser)) return getPublicKids();
  const snap = await getDocs(collection(db, "kids"));
  const kids = [];
  snap.forEach(d => {
    const kid = { kidId: d.id, ...d.data() };
    if (kid.active !== false) kids.push(kid);
  });
  return kids.sort((a, b) =>
    String(a.name || a.kidId).localeCompare(String(b.name || b.kidId))
  );
}

async function getAllSubmissions() {
  const snap = await getDocs(collection(db, "questSubmissions"));
  const items = [];
  snap.forEach(d => items.push({ submissionId: d.id, ...d.data() }));
  return items;
}

async function getAllHistory() {
  const snap = await getDocs(collection(db, "questHistory"));
  const items = [];
  snap.forEach(d => items.push({ historyId: d.id, ...d.data() }));
  return items;
}

async function getTodaySubmissions() {
  const today = getTodayKey();
  return (await getAllSubmissions()).filter(item => item.questDate === today);
}

async function getTodayHistory() {
  const today = getTodayKey();
  return (await getAllHistory()).filter(item => item.questDate === today);
}

async function loadKidDashboard(kidId) {
  setAppTheme("kid");
  if (!await userCanAccessKid(kidId)) {
    await loadKidEntry(kidId);
    return;
  }

  document.body.innerHTML = `<main class="app"><header class="hero"><div class="logo">⚔️</div><h1>Loading...</h1><p>Gathering today's quests...</p></header></main>`;

  try {
    if (isParentUser(auth.currentUser)) {
      await resetDailyQuestsIfNeeded();
      await refreshAllStreaks();
    }
    const [kidSnap, questSnap, kids, submissions, history] = await Promise.all([
      getDoc(doc(db, "kids", kidId)),
      getDocs(collection(db, "quests")),
      getAllKids(),
      getAllSubmissions(),
      getAllHistory()
    ]);

    if (!kidSnap.exists()) { showError("Kid not found: " + kidId); return; }
    const kid = { kidId, ...kidSnap.data() };
    const mainQuests = [];
    const sideQuests = [];

    questSnap.forEach(d => {
      const quest = { choreId: d.id, ...d.data() };
      if (quest.archived === true || quest.active === false) return;
      if (!isQuestScheduledToday(quest)) return;

      quest.completedToday = isQuestCompletedForCurrentPeriod(quest, history);
      quest.pendingByCurrentKid = submissions.some(item =>
        isSubmissionForCurrentPeriod(quest, item) &&
        Array.isArray(item.participantIds) &&
        item.participantIds.includes(kidId)
      );
      quest.rewardMode = quest.kidId === kidId ? "full" : "half";

      if (quest.kidId === kidId) {
        mainQuests.push(quest);
      } else if (quest.allowHelpers !== false && !quest.completedToday) {
        sideQuests.push(quest);
      }
    });

    const allScheduledQuests = [...mainQuests, ...sideQuests];
    const byQuestId = Object.fromEntries(allScheduledQuests.map(item => [item.choreId, item]));
    allScheduledQuests.forEach(quest => {
      const requirements = parentQuestRequirements(quest, allScheduledQuests);
      quest.dueChildCount = requirements.dueChildren.length;
      quest.incompleteChildCount = requirements.incomplete.length;
      quest.isLockedBySubtasks = requirements.incomplete.length > 0;
      quest.parentName = quest.parentQuestId ? (byQuestId[quest.parentQuestId]?.name || "") : "";
    });

    renderDashboard(kid, mainQuests, sideQuests, kids);
  } catch (err) {
    showError("Firebase error: " + err.message);
  }
}

function renderDashboard(kid, mainQuests, sideQuests, allKids) {
  setAppTheme("kid");
  const xp = Number(kid.xp || 0);
  const gold = Number(kid.gold || 0);
  const streak = Number(kid.currentStreak || 0);
  const bestStreak = Number(kid.bestStreak || 0);
  const level = Math.max(1, Number(kid.level || 1));
  const xpNeeded = 100;
  const xpIntoLevel = xp % xpNeeded;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100));
  const completedMain = mainQuests.filter(q => q.completedToday).length;

  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact">
        <div class="logo character-logo">${renderCharacterThumbnail(kid)}</div>
        <h1>${escapeHtml(kid.name || kid.kidId)}</h1>
        <p>${escapeHtml(kid.classTitle || "")}</p>
        <small class="class-path">${escapeHtml(kid.classPath || "")}</small>
      </header>

      <section class="card character-card">
        <div class="level-row">
          <div><span class="label">Level</span><strong>${level}</strong></div>
          <div><span class="label">Gold</span><strong>${gold}</strong></div>
          <div><span class="label">Streak</span><strong>${streak}🔥</strong><small style="display:block;color:var(--text-soft);margin-top:4px;">Best ${bestStreak}</small></div>
        </div>
        <div class="xp-bar"><div class="xp-fill" style="width:${progressPercent}%"></div></div>
        <p class="xp-text">${xpIntoLevel} / ${xpNeeded} XP to next level</p>
      </section>

      <section class="card adventure-resource-card">
        <div class="adventure-resource-head">
          <div><span>⚡ Energy</span><strong>${Math.min(MAX_ENERGY, Number(kid.energy ?? MAX_ENERGY))} / ${MAX_ENERGY}</strong></div>
          <div><span>😴 Sleepiness</span><strong>${currentSleepiness(kid)} / ${MAX_SLEEPINESS}</strong></div>
        </div>
        <div class="food-inventory">${foodInventoryHtml(kid)}</div>
        <button id="openAdventureBtn" type="button" style="width:100%;margin-top:12px;">🗺️ Adventure</button>
      </section>

      <section class="card">
        <h2>⚔️ Main Quests</h2>
        <p class="xp-text">${completedMain} of ${mainQuests.length} completed today</p>
        ${mainQuests.length === 0 ? "<p>No Main Quests assigned yet.</p>" : mainQuests.map(q => questCard(q, kid.kidId)).join("")}
      </section>

      <section class="card side-card">
        <h2>🗺️ Side Quests</h2>
        <p class="xp-text">Helping earns half of the quest reward. Group rewards are divided between participants.</p>
        ${sideQuests.length === 0 ? "<p>No Side Quests available right now.</p>" : sideQuests.map(q => questCard(q, kid.kidId)).join("")}
      </section>

      <button id="openClassBtn" type="button" style="width:100%;margin-bottom:12px;">🧙 Character & Class</button>
      <button id="switchCharacterBtn" type="button">${isParentUser(auth.currentUser) ? "← Back to Guild Hall" : "🔒 Lock Profile"}</button>
    </main>`;

  document.querySelectorAll(".complete-btn").forEach(button => {
    button.addEventListener("click", () => openQuestSubmission(button.dataset.choreId, kid.kidId, allKids));
  });
  document.querySelectorAll(".food-use-btn").forEach(button => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await consumeFoodCall({ kidId: kid.kidId, foodId: button.dataset.foodId });
        await loadKidDashboard(kid.kidId);
      } catch (err) {
        alert(err?.message || "Could not use that food.");
        button.disabled = false;
      }
    });
  });
  document.getElementById("openAdventureBtn")?.addEventListener("click", () => loadAdventureScreen(kid.kidId));
  document.getElementById("openClassBtn").addEventListener("click", () => loadClassScreen(kid.kidId));
  document.getElementById("switchCharacterBtn").addEventListener("click", async () => {
    sessionStorage.removeItem(KID_UNLOCK_KEY);
    sessionStorage.removeItem(KID_UNLOCK_TIME_KEY);

    if (isParentUser(auth.currentUser)) {
      window.history.replaceState({}, document.title, window.location.pathname);
      await loadParentDashboard(auth.currentUser);
      return;
    }

    await signOut(auth);
    window.history.replaceState({}, document.title, `?kid=${encodeURIComponent(kid.kidId)}`);
    await loadKidEntry(kid.kidId);
  });
}


async function loadClassScreen(kidId) {
  setAppTheme("kid");
  try {
    const kidSnap = await getDoc(doc(db, "kids", kidId));
    if (!kidSnap.exists()) { showError("Child profile not found."); return; }
    let kid = { kidId, ...kidSnap.data() };
    kid = await ensureInventoryInitialized(kid);
    if (!kid.classId || !CLASS_DEFINITIONS[kid.classId]) {
      renderStartingClassSelection(kid);
      return;
    }
    renderClassScreen(kid);
  } catch (err) {
    showError("Could not load class screen: " + err.message);
  }
}

function renderStartingClassSelection(kid) {
  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact"><div class="logo">🌟</div><h1>Choose Your Class</h1><p>${escapeHtml(kid.name || "Adventurer")}, choose the path that sounds most like you.</p></header>
      <section class="character-select">
        ${Object.entries(CLASS_DEFINITIONS).map(([id, c]) => `
          <button class="character-card-btn choose-class-btn" type="button" data-class-id="${id}">
            <div class="avatar">${c.icon}</div><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.description)}</span>
          </button>`).join("")}
      </section>
      <button id="classBackBtn" type="button" style="width:100%;margin-top:16px;">← Back</button>
    </main>`;
  document.querySelectorAll(".choose-class-btn").forEach(button => button.addEventListener("click", async () => {
    const classId = button.dataset.classId;
    const def = CLASS_DEFINITIONS[classId];
    if (!confirm(`Choose ${def.name} as your starting class?`)) return;
    await updateDoc(doc(db, "kids", kid.kidId), {
      classId,
      classTitle: def.name,
      classPath: def.name,
      classBranch1: "",
      classBranch2: "",
      classChosenAt: new Date().toISOString()
    });
    await loadClassScreen(kid.kidId);
  }));
  document.getElementById("classBackBtn").addEventListener("click", () => loadKidDashboard(kid.kidId));
}

function getBaseClassStats(kid) {
  const def = CLASS_DEFINITIONS[kid.classId];
  const level = Math.max(1, Number(kid.level || 1));
  const stats = {};
  STAT_KEYS.forEach(key => {
    stats[key] = Number(def.base[key] || 0) + Math.max(0, level - 1) * Number(def.growth[key] || 0);
  });
  stats.hp = 20 + level * 5;
  return stats;
}

function getClassStats(kid) {
  const stats = getBaseClassStats(kid);
  const gear = equipmentBonuses(kid.equipment || {});
  STAT_KEYS.forEach(key => {
    stats[key] += Number(gear[key] || 0);
  });
  return stats;
}

function getCurrentClassTitle(kid) {
  const def = CLASS_DEFINITIONS[kid.classId];
  if (!def) return kid.classTitle || "Adventurer";
  if (kid.classBranch2) {
    const all = Object.values(def.branch2 || {}).flat();
    return all.find(x => x.id === kid.classBranch2)?.name || kid.classTitle || def.name;
  }
  if (kid.classBranch1) return def.branch1.find(x => x.id === kid.classBranch1)?.name || def.name;
  return def.name;
}

function radarChartSvg(stats, comparisonStats = null) {
  const labels = ["STR", "WIS", "AGI", "KIND", "LUCK", "COUR"];
  const currentValues = STAT_KEYS.map(key => Number(stats?.[key] || 0));
  const comparisonValues = comparisonStats ? STAT_KEYS.map(key => Number(comparisonStats?.[key] || 0)) : [];
  const max = Math.max(20, ...currentValues, ...comparisonValues);
  const cx = 150;
  const cy = 145;
  const radius = 96;

  const point = (index, value) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 6;
    const r = radius * Math.max(0, value) / max;
    return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
  };

  const ring = fraction => labels.map((_, index) => point(index, max * fraction)).join(" ");
  const currentPoints = currentValues.map((value, index) => point(index, value)).join(" ");
  const comparisonPoints = comparisonValues.map((value, index) => point(index, value)).join(" ");

  const axes = labels.map((label, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 6;
    const axisX = cx + Math.cos(angle) * radius;
    const axisY = cy + Math.sin(angle) * radius;
    const labelX = cx + Math.cos(angle) * 120;
    const labelY = cy + Math.sin(angle) * 120;
    return `
      <line x1="${cx}" y1="${cy}" x2="${axisX}" y2="${axisY}" class="stat-radar-axis"/>
      <text x="${labelX}" y="${labelY}" class="stat-radar-label" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  }).join("");

  return `
    <svg class="stat-radar" viewBox="0 0 300 290" role="img" aria-label="Character attribute radar chart">
      <polygon points="${ring(1)}" class="stat-radar-ring outer"/>
      <polygon points="${ring(.75)}" class="stat-radar-ring"/>
      <polygon points="${ring(.5)}" class="stat-radar-ring"/>
      <polygon points="${ring(.25)}" class="stat-radar-ring"/>
      ${axes}
      <polygon points="${currentPoints}" class="stat-radar-shape current"/>
      ${comparisonStats ? `<polygon points="${comparisonPoints}" class="stat-radar-shape proposed"/>` : ""}
    </svg>`;
}

function statComparisonTableHtml(currentStats, proposedStats = null) {
  return STAT_KEYS.map(key => {
    const current = Number(currentStats?.[key] || 0);
    const proposed = proposedStats ? Number(proposedStats?.[key] || 0) : current;
    const delta = proposed - current;
    const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
    const deltaText = delta === 0 ? "" : `${delta > 0 ? "+" : ""}${delta}`;
    return `
      <div class="stat-number-row">
        <span class="stat-number-name">${statAbbreviation(key)}</span>
        <strong>${current}</strong>
        ${proposedStats ? `
          <span class="stat-number-arrow">→</span>
          <strong class="${deltaClass}">${proposed}</strong>
          <small class="${deltaClass}">${deltaText}</small>` : ""}
      </div>`;
  }).join("");
}

const EQUIPMENT_SLOT_ICONS = {
  head: "🪖",
  body: "🥋",
  feet: "👢",
  accessory: "💍",
  cape: "🧥",
  main_hand: "⚔️",
  off_hand: "🛡️",
  companion: "🐾"
};

function displayItemName(item) {
  if (!item) return "Nothing equipped";
  const definition = ITEM_TYPES[item.itemType];
  if (!definition) return item.name || "Unknown Item";
  const rarity = normalizeRarity(item.rarity || item.grade);
  return rarity === "common" ? definition.name : `${ITEM_GRADES[rarity].name} ${definition.name}`;
}

function statAbbreviation(key) {
  return {
    strength: "STR",
    wisdom: "WIS",
    agility: "AGI",
    kindness: "KIND",
    luck: "LUCK",
    courage: "COUR"
  }[key] || key.toUpperCase();
}

function equipmentComparisonHtml(candidate, current) {
  const candidateBonuses = candidate?.bonuses || {};
  const currentBonuses = current?.bonuses || {};
  const changes = STAT_KEYS.map(key => ({
    key,
    change: Number(candidateBonuses[key] || 0) - Number(currentBonuses[key] || 0)
  })).filter(entry => entry.change !== 0);

  if (!changes.length) return '<span class="equipment-delta neutral">No stat change</span>';

  return changes.map(({ key, change }) => `
    <span class="equipment-delta ${change > 0 ? "positive" : "negative"}">
      ${change > 0 ? "+" : ""}${change} ${statAbbreviation(key)}
    </span>`).join("");
}

function renderEquippedLoadout(equipment) {
  return Object.entries(EQUIPMENT_SLOTS).map(([slot, label]) => {
    const item = equipment?.[slot] || null;
    const grade = item ? ITEM_GRADES[normalizeRarity(item.rarity || item.grade)] : null;
    return `
      <button class="loadout-slot ${item ? "filled" : "empty"}" type="button" data-loadout-slot="${slot}" aria-label="${escapeAttribute(label)}">
        <span class="loadout-slot-label">${escapeHtml(label)}</span>
        <span class="loadout-slot-icon" ${grade ? `style="border-color:${grade.color};box-shadow:0 0 16px ${grade.glow};"` : ""}>
          ${item ? itemIcon(item) : (EQUIPMENT_SLOT_ICONS[slot] || "＋")}
        </span>
        <strong>${escapeHtml(item ? displayItemName(item) : "Empty")}</strong>
        <small>${item ? escapeHtml(formatBonuses(item)) : "Tap to equip"}</small>
      </button>`;
  }).join("");
}

function renderActiveCompanions(kid) {
  const active = Array.isArray(kid?.activeCompanions) ? kid.activeCompanions.slice(0, 2) : [];
  const slots = [0, 1].map(index => {
    const companion = active[index];
    if (!companion) {
      return `
        <div class="companion-slot empty">
          <div class="companion-icon">🐾</div>
          <div>
            <small>Companion ${index + 1}</small>
            <strong>Empty</strong>
            <span>Future tamed companions can be assigned here.</span>
          </div>
        </div>`;
    }
    const name = companion.name || "Companion";
    const icon = companion.icon || "🐾";
    const ability = companion.abilityName || companion.ability || "Companion ability";
    const text = companion.abilityText || companion.description || "Provides a special battle effect.";
    return `
      <div class="companion-slot">
        <div class="companion-icon">${escapeHtml(icon)}</div>
        <div>
          <small>Active companion</small>
          <strong>${escapeHtml(name)}</strong>
          <span><b>${escapeHtml(ability)}:</b> ${escapeHtml(text)}</span>
        </div>
      </div>`;
  }).join("");

  return `
    <div class="companion-summary">
      <p>Bring up to <strong>2</strong> companions. They support your class with special abilities rather than replacing your character in battle.</p>
      <div class="companion-slot-list">${slots}</div>
    </div>`;
}

function renderClassScreen(kid) {
  const def = CLASS_DEFINITIONS[kid.classId];
  const level = Math.max(1, Number(kid.level || 1));
  const stats = getClassStats(kid);
  const baseStats = getBaseClassStats(kid);
  const title = getCurrentClassTitle(kid);
  const combatProgression = classCombatProgression(kid.classId);
  const unlocked = combatProgression.skills.filter(a => level >= a.level);
  const locked = combatProgression.skills.filter(a => level < a.level);
  const perkCards = classPerkCards(kid);
  const equipped = kid.equipment && typeof kid.equipment === "object" ? kid.equipment : {};
  const equippedGearCount = Object.keys(EQUIPMENT_SLOTS).filter(slot => equipped[slot]).length;
  const inventory = Array.isArray(kid.inventory) ? kid.inventory : [];
  const gearBonuses = equipmentBonuses(equipped);
  const canChooseBranch1 = level >= 5 && !kid.classBranch1;
  const canChooseBranch2 = level >= 10 && kid.classBranch1 && !kid.classBranch2;

  const equipmentRows = Object.entries(EQUIPMENT_SLOTS).map(([slot, label]) => {
    const item = equipped[slot];
    const grade = item ? ITEM_GRADES[normalizeRarity(item.rarity || item.grade)] : null;
    return `
      <button class="equipment-slot-row" type="button" data-equipment-slot="${slot}">
        <span class="equipment-slot-icon" ${grade ? `style="border-color:${grade.color};box-shadow:0 0 14px ${grade.glow};"` : ""}>
          ${item ? itemIcon(item) : EQUIPMENT_SLOT_ICONS[slot] || "➕"}
        </span>
        <span class="equipment-slot-copy">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(displayItemName(item))}</strong>
          <span>${item ? escapeHtml(formatBonuses(item)) : "Select an item"}</span>
        </span>
        <span class="equipment-slot-arrow">›</span>
      </button>`;
  }).join("");

  const statRows = STAT_KEYS.map(key => `
    <div class="jrpg-stat-row">
      <span>${statAbbreviation(key)}</span>
      <strong>${Number(stats[key] || 0)}</strong>
      <small>Gear +${Number(gearBonuses[key] || 0)}</small>
    </div>`).join("");

  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact">
        <div class="logo">${def.icon}</div>
        <h1>${escapeHtml(kid.name || kid.kidId)}</h1>
        <p>${escapeHtml(title)} • Level ${level}</p>
        <small class="class-path">${escapeHtml([def.name, kid.classBranch1 && getCurrentClassTitle({...kid,classBranch2:""}), kid.classBranch2 && title].filter(Boolean).join(" → "))}</small>
      </header>

      <section class="ff9-character-summary">
        ${renderCharacterPortrait(kid)}
        <div class="ff9-character-details">
          <div><span>Class</span><strong>${escapeHtml(title)}</strong></div>
          <div><span>Level</span><strong>${level}</strong></div>
          <div><span>HP</span><strong>${stats.hp}</strong></div>
          <div><span>Gold</span><strong>${Number(kid.gold || 0)}</strong></div>
          <div><span>SP</span><strong>${Number(kid.sp || 0)}</strong></div>
          <div><span>Rebirths</span><strong>${Number(kid.rebirths || 0)}</strong></div>
        </div>
      </section>

      <section class="character-quick-panels">
        <div class="character-quick-tabs">
          <button class="quick-panel-btn" type="button" data-panel-target="gearQuickPanel">
            ⚔️ Gear <span>${equippedGearCount}/${Object.keys(EQUIPMENT_SLOTS).length}</span>
          </button>
          <button class="quick-panel-btn" type="button" data-panel-target="companionQuickPanel">
            🐾 Companions <span>${Math.min(2, Array.isArray(kid.activeCompanions) ? kid.activeCompanions.length : 0)}/2</span>
          </button>
        </div>
        <div id="gearQuickPanel" class="quick-panel-card" hidden>
          <div class="jrpg-section-heading">
            <div><h2>Current Gear</h2><p>Your equipped items at a glance.</p></div>
          </div>
          <div class="loadout-grid">${renderEquippedLoadout(equipped)}</div>
        </div>
        <div id="companionQuickPanel" class="quick-panel-card" hidden>
          <div class="jrpg-section-heading">
            <div><h2>Companions</h2><p>Tamed allies provide special battle abilities and utility.</p></div>
          </div>
          ${renderActiveCompanions(kid)}
        </div>
      </section>

      <section class="card jrpg-menu-card attribute-overview-card">
        <div class="jrpg-section-heading">
          <div><h2>Attributes</h2><p>Level growth plus equipment bonuses.</p></div>
        </div>
        <div class="attribute-overview">
          <div class="stat-radar-wrap">
            ${radarChartSvg(baseStats, stats)}
            <div class="stat-radar-legend">
              <span class="current">Base stats</span>
              <span class="proposed">With gear</span>
            </div>
          </div>
        </div>
        <div class="jrpg-stat-grid">${statRows}</div>
      </section>

      <section class="card class-ability-card">
        <div class="jrpg-section-heading">
          <div><h2>Abilities & Perks</h2><p>Your class grows into a different battle style as you level.</p></div>
        </div>
        <div class="class-perk-list">
          ${perkCards.map(perk => `
            <div class="class-perk-row">
              <span>◆</span>
              <div><small>${escapeHtml(perk.source)}</small><strong>${escapeHtml(perk.name)}</strong><p>${escapeHtml(perk.text)}</p></div>
            </div>`).join("")}
        </div>
        <div class="class-skill-list">
          ${unlocked.map(a => `
            <div class="class-skill-row unlocked">
              <span class="class-skill-icon">${a.icon || "✨"}</span>
              <div><strong>${escapeHtml(a.name)}</strong><span>Level ${a.level} • ${Number(a.cost || 0)} SP</span><small>${escapeHtml(a.text)}</small></div>
            </div>`).join("")}
          ${locked.map(a => `
            <div class="class-skill-row locked">
              <span class="class-skill-icon">🔒</span>
              <div><strong>${escapeHtml(a.name)}</strong><span>Unlocks at Level ${a.level}</span><small>${escapeHtml(a.text)}</small></div>
            </div>`).join("")}
        </div>
      </section>

      <section class="card jrpg-menu-card">
        <div class="jrpg-section-heading">
          <div>
            <h2>Equipment</h2>
            <p>Choose a slot, then select a compatible item.</p>
          </div>
          <span>${equippedGearCount}/${Object.keys(EQUIPMENT_SLOTS).length}</span>
        </div>
        <div class="equipment-slot-list">${equipmentRows}</div>
      </section>

      <section id="equipmentChooserHost" class="card equipment-chooser-host">
        <div class="equipment-chooser-empty">
          <span>☝️</span>
          <p>Select an equipment slot above.</p>
        </div>
      </section>

      ${canChooseBranch1 ? `<section class="card"><h2>Choose Your Level 5 Path</h2>${def.branch1.map(b => `<button class="choose-branch1-btn" data-branch-id="${b.id}" type="button" style="width:100%;margin-bottom:10px;">${b.icon} ${escapeHtml(b.name)}</button>`).join("")}</section>` : ""}
      ${canChooseBranch2 ? `<section class="card"><h2>Choose Your Level 10 Path</h2>${(def.branch2[kid.classBranch1] || []).map(b => `<button class="choose-branch2-btn" data-branch-id="${b.id}" type="button" style="width:100%;margin-bottom:10px;">🌟 ${escapeHtml(b.name)}</button>`).join("")}</section>` : ""}

      <button id="classScreenBackBtn" type="button" style="width:100%;">← Back</button>
    </main>`;

  document.querySelectorAll(".choose-branch1-btn").forEach(button => button.addEventListener("click", async () => {
    const branch = def.branch1.find(b => b.id === button.dataset.branchId);
    if (!branch || !confirm(`Choose the ${branch.name} path?`)) return;
    await updateDoc(doc(db, "kids", kid.kidId), { classBranch1: branch.id, classTitle: branch.name, classPath: `${def.name} → ${branch.name}` });
    await loadClassScreen(kid.kidId);
  }));

  document.querySelectorAll(".choose-branch2-btn").forEach(button => button.addEventListener("click", async () => {
    const branch = (def.branch2[kid.classBranch1] || []).find(b => b.id === button.dataset.branchId);
    if (!branch || !confirm(`Choose the ${branch.name} path?`)) return;
    const first = def.branch1.find(b => b.id === kid.classBranch1)?.name || def.name;
    await updateDoc(doc(db, "kids", kid.kidId), { classBranch2: branch.id, classTitle: branch.name, classPath: `${def.name} → ${first} → ${branch.name}` });
    await loadClassScreen(kid.kidId);
  }));

  const chooserHost = document.getElementById("equipmentChooserHost");

  const openEquipmentChooser = slot => {
    const currentItem = equipped[slot] || null;
    const matchingItems = inventory.filter(item => item.slot === slot);
    const slotLabel = EQUIPMENT_SLOTS[slot] || slot;
    let selectedItem = null;

    const renderChooser = () => {
      let proposedStats = null;
      if (selectedItem) {
        const proposedEquipment = { ...equipped, [slot]: selectedItem };
        proposedStats = getClassStats({ ...kid, equipment: proposedEquipment });
      }

      chooserHost.innerHTML = `
        <div class="jrpg-section-heading">
          <div><h2>${escapeHtml(slotLabel)}</h2><p>${matchingItems.length} compatible item${matchingItems.length === 1 ? "" : "s"} available.</p></div>
          <button id="closeEquipmentChooserBtn" class="equipment-close-btn" type="button">✕</button>
        </div>

        ${currentItem ? `
          <div class="equipment-current-item">
            <span class="equipment-slot-icon">${itemIcon(currentItem)}</span>
            <div><small>Currently equipped</small><strong>${escapeHtml(displayItemName(currentItem))}</strong><span>${escapeHtml(formatBonuses(currentItem))}</span></div>
            <button id="removeEquipmentBtn" type="button">Remove</button>
          </div>` : '<p class="equipment-none-equipped">Nothing is currently equipped in this slot.</p>'}

        <div class="equipment-preview-card ${selectedItem ? "active" : ""}">
          <div class="equipment-preview-heading">
            <div>
              <small>${selectedItem ? "Previewing" : "Equipment comparison"}</small>
              <strong>${selectedItem ? escapeHtml(displayItemName(selectedItem)) : "Choose an item below"}</strong>
            </div>
            ${selectedItem ? '<button id="confirmEquipBtn" type="button">Equip Selected</button>' : ""}
          </div>
          <div class="equipment-preview-grid">
            <div class="stat-radar-wrap">
              ${radarChartSvg(stats, proposedStats)}
              <div class="stat-radar-legend">
                <span class="current">Current</span>
                ${selectedItem ? '<span class="proposed">With item</span>' : ""}
              </div>
            </div>
            <div class="stat-number-list">
              ${statComparisonTableHtml(stats, proposedStats)}
            </div>
          </div>
        </div>

        <div class="equipment-choice-list">
          ${matchingItems.length ? matchingItems.map(item => {
            const grade = ITEM_GRADES[normalizeRarity(item.rarity || item.grade)];
            const isSelected = selectedItem?.instanceId === item.instanceId;
            return `
              <button class="equipment-choice-row ${isSelected ? "selected" : ""}" type="button" data-item-id="${escapeAttribute(item.instanceId)}">
                <span class="equipment-slot-icon" style="border-color:${grade.color};box-shadow:0 0 14px ${grade.glow};">${itemIcon(item)}</span>
                <span class="equipment-choice-copy">
                  <strong>${escapeHtml(displayItemName(item))}</strong>
                  <small>${grade.name} • ${escapeHtml(formatBonuses(item))}</small>
                  <span class="equipment-delta-list">${equipmentComparisonHtml(item, currentItem)}</span>
                </span>
                <span class="equipment-choice-action">${isSelected ? "Selected" : "Preview"}</span>
              </button>`;
          }).join("") : '<div class="equipment-chooser-empty"><span>🎒</span><p>No compatible items are in the inventory yet.</p></div>'}
        </div>`;

      document.querySelectorAll(".equipment-slot-row").forEach(row => {
        row.classList.toggle("selected", row.dataset.equipmentSlot === slot);
      });

      document.getElementById("closeEquipmentChooserBtn")?.addEventListener("click", () => {
        chooserHost.innerHTML = '<div class="equipment-chooser-empty"><span>☝️</span><p>Select an equipment slot above.</p></div>';
        document.querySelectorAll(".equipment-slot-row").forEach(row => row.classList.remove("selected"));
      });

      document.getElementById("removeEquipmentBtn")?.addEventListener("click", async () => {
        const nextEquipment = { ...equipped };
        delete nextEquipment[slot];
        await updateDoc(doc(db, "kids", kid.kidId), {
          inventory: [...inventory, { ...currentItem, equipped: false }],
          equipment: nextEquipment
        });
        await loadClassScreen(kid.kidId);
      });

      document.querySelectorAll(".equipment-choice-row").forEach(button => {
        button.addEventListener("click", () => {
          selectedItem = inventory.find(entry => entry.instanceId === button.dataset.itemId) || null;
          renderChooser();
        });
      });

      document.getElementById("confirmEquipBtn")?.addEventListener("click", async () => {
        if (!selectedItem) return;
        const nextInventory = inventory.filter(entry => entry.instanceId !== selectedItem.instanceId);
        const nextEquipment = { ...equipped };
        if (nextEquipment[slot]) nextInventory.push({ ...nextEquipment[slot], equipped: false });
        nextEquipment[slot] = { ...selectedItem, equipped: true };
        await updateDoc(doc(db, "kids", kid.kidId), { inventory: nextInventory, equipment: nextEquipment });
        await loadClassScreen(kid.kidId);
      });
    };

    renderChooser();
    chooserHost.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  document.querySelectorAll(".quick-panel-btn").forEach(button => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.panelTarget;
      document.querySelectorAll(".quick-panel-card").forEach(panel => {
        panel.hidden = panel.id === targetId ? !panel.hidden : true;
      });
      document.querySelectorAll(".quick-panel-btn").forEach(tab => {
        const panel = document.getElementById(tab.dataset.panelTarget);
        tab.classList.toggle("active", panel && !panel.hidden);
      });
    });
  });

  document.querySelectorAll(".equipment-slot-row").forEach(button => {
    button.addEventListener("click", () => openEquipmentChooser(button.dataset.equipmentSlot));
  });

  document.querySelectorAll(".loadout-slot").forEach(button => {
    button.addEventListener("click", () => {
      openEquipmentChooser(button.dataset.loadoutSlot);
      document.getElementById("equipmentChooserHost")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.getElementById("classScreenBackBtn").addEventListener("click", () => loadKidDashboard(kid.kidId));
}

function scheduledDescendantsForQuest(parentQuestId, allQuests, date = new Date()) {
  const result = [];
  const walk = parentId => {
    allQuests.filter(item => item.parentQuestId === parentId).forEach(child => {
      if (child.archived !== true && child.active !== false && isQuestScheduledToday(child, date)) {
        result.push(child);
      }
      walk(child.choreId);
    });
  };
  walk(parentQuestId);
  return result;
}

function parentQuestRequirements(quest, allQuests) {
  const dueChildren = scheduledDescendantsForQuest(quest.choreId, allQuests);
  const incomplete = dueChildren.filter(child => !child.completedToday);
  return { dueChildren, incomplete };
}

function questCard(quest, currentKidId) {
  const isMain = quest.kidId === currentKidId;
  const isSubtask = Boolean(quest.parentQuestId);
  const locked = !quest.completedToday && !quest.pendingByCurrentKid && Boolean(quest.isLockedBySubtasks);
  const rewardText = isSubtask
    ? "Reward is bundled with the parent task"
    : quest.dueChildCount
      ? `Includes this task + ${quest.dueChildCount} due subtask reward${quest.dueChildCount === 1 ? "" : "s"}`
      : "Adventure food on approval";

  let statusText = isMain ? "Your responsibility" : quest.kidId === ANYONE_ID ? "Available to anyone" : "Help another adventurer";
  if (quest.completedToday) statusText = "Completed for this schedule";
  else if (quest.pendingByCurrentKid) statusText = "Your claim is awaiting approval";
  else if (locked) statusText = `Finish ${quest.incompleteChildCount} due subtask${quest.incompleteChildCount === 1 ? "" : "s"} first`;

  return `
    <div class="quest ${isSubtask ? "quest-subtask" : ""} ${locked ? "quest-locked" : ""}">
      <div class="quest-icon">${quest.completedToday ? "✅" : locked ? "🔒" : iconForQuest(quest.name || "")}</div>
      <div class="quest-info">
        <strong>${escapeHtml(quest.name || "Unnamed Quest")}</strong>
        <span>${escapeHtml(scheduleLabel(quest))} • ${escapeHtml(dueLabel(quest))} • ${escapeHtml(rewardText)}${isMain ? "" : " • helper snack"}</span>
        <small class="status ${quest.completedToday ? "status-approved" : quest.pendingByCurrentKid ? "status-pending" : "status-ready"}">${escapeHtml(statusText)}</small>
      </div>
      ${quest.completedToday
        ? '<button class="approved" disabled>Done</button>'
        : quest.pendingByCurrentKid
          ? '<button class="disabled" disabled>Claimed</button>'
          : locked
            ? '<button class="disabled" disabled>Locked</button>'
            : `<button class="complete-btn" type="button" data-chore-id="${escapeAttribute(quest.choreId)}">Complete</button>`}
    </div>`;
}

async function openQuestSubmission(choreId, currentKidId, allKids) {
  setAppTheme("kid");
  try {
    const questSnap = await getDoc(doc(db, "quests", choreId));
    if (!questSnap.exists()) { alert("Quest not found."); return; }
    const quest = { choreId, ...questSnap.data() };
    const [allQuestSnap, history] = await Promise.all([
      getDocs(collection(db, "quests")),
      getAllHistory()
    ]);
    const scheduled = [];
    allQuestSnap.forEach(item => {
      const candidate = { choreId: item.id, ...item.data() };
      if (candidate.archived === true || candidate.active === false || !isQuestScheduledToday(candidate)) return;
      candidate.completedToday = isQuestCompletedForCurrentPeriod(candidate, history);
      scheduled.push(candidate);
    });
    const required = scheduledDescendantsForQuest(choreId, scheduled);
    const incomplete = required.filter(item => !item.completedToday);
    if (incomplete.length) {
      alert(`Finish today's subtasks first: ${incomplete.map(item => item.name || "Subtask").join(", ")}`);
      await loadKidDashboard(currentKidId);
      return;
    }
    const helpersAllowed = quest.allowHelpers !== false;
    document.body.innerHTML = `
      <main class="app">
        <header class="hero compact"><div class="logo">🤝</div><h1>${escapeHtml(quest.name || "Quest")}</h1><p>Who worked on this quest?</p></header>
        <section class="card form-card">
          <label style="display:flex;align-items:center;gap:10px;"><input type="checkbox" checked disabled> ${escapeHtml(allKids.find(k => k.kidId === currentKidId)?.name || currentKidId)} (you)</label>
          ${helpersAllowed ? allKids.filter(k => k.kidId !== currentKidId).map(k => `<label style="display:flex;align-items:center;gap:10px;"><input class="helper-checkbox" type="checkbox" value="${escapeAttribute(k.kidId)}"> ${escapeHtml(k.name || k.kidId)}</label>`).join("") : '<p>This quest does not allow helpers.</p>'}
          <button id="submitQuestBtn" type="button">Submit for Approval</button>
          <button id="cancelSubmissionBtn" type="button">Cancel</button>
        </section>
      </main>`;

    document.getElementById("submitQuestBtn").addEventListener("click", async () => {
      const participantIds = [currentKidId, ...Array.from(document.querySelectorAll(".helper-checkbox:checked")).map(i => i.value)];
      const today = getTodayKey();
      const existing = await getTodaySubmissions();
      if (existing.some(s => s.questId === choreId && s.status === "Pending" && Array.isArray(s.participantIds) && s.participantIds.includes(currentKidId))) {
        alert("You already have a pending claim for this quest.");
        await loadKidDashboard(currentKidId);
        return;
      }
      await addDoc(collection(db, "questSubmissions"), {
        questId: choreId,
        questName: quest.name || "Unnamed Quest",
        assignedKidId: quest.kidId || ANYONE_ID,
        submittedBy: currentKidId,
        participantIds,
        status: "Pending",
        questDate: today,
        periodKey: getQuestPeriodKey(quest),
        scheduleType: getQuestScheduleType(quest),
        submittedAt: new Date().toISOString(),
        isSideQuest: quest.kidId !== currentKidId,
        foodTier: questFoodTier(quest)
      });
      showToast(getCompletionMessage());
      setTimeout(() => loadKidDashboard(currentKidId), 600);
    });
    document.getElementById("cancelSubmissionBtn").addEventListener("click", () => loadKidDashboard(currentKidId));
  } catch (err) {
    showError("Could not submit quest: " + err.message);
  }
}


function statusLabel(status) {
  if (!status) return "Ready";
  if (status === "Not Started") return "Ready";
  if (status === "Available" || status === "available") return "Ready";
  if (status === "Pending") return "Awaiting approval";
  if (status === "Approved") return "Completed";
  if (status === "Rejected") return "Rejected";
  if (status === "Archived") return "Archived";
  return String(status);
}

function statusClass(status) {
  if (status === "Pending") return "status-pending";
  if (status === "Approved") return "status-approved";
  if (status === "Rejected") return "status-rejected";
  return "status-ready";
}

function iconForQuest(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("zeus") || lower.includes("dog")) return "🐕";
  if (lower.includes("cat")) return "🐈";
  if (lower.includes("dish")) return "🍽️";
  if (lower.includes("litter") || lower.includes("sweep")) return "🧹";
  if (lower.includes("garbage") || lower.includes("trash")) return "🗑️";
  if (lower.includes("vacuum")) return "🧽";
  if (lower.includes("laundry")) return "🧺";
  if (lower.includes("room") || lower.includes("toy")) return "🧸";
  return "📜";
}

function getCompletionMessage() {
  const kidName = document.querySelector("h1")?.textContent || "";
  if (kidName === "Autumn") return "✨ Quest submitted with sparkles!";
  if (kidName === "Cammron") return "🥊 Quest punched into review!";
  if (kidName === "Ava") return "🦄 Quest sent with unicorn magic!";
  if (kidName === "Wesley") return "🐉 Quest sent with dragon fire!";
  return "Quest submitted for approval!";
}

function showToast(message) {
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

/* -------------------------------------------------
   DAILY RESET
------------------------------------------------- */

function getTodayKey() {
  return getLocalDateKey(new Date());
}

async function resetDailyQuestsIfNeeded() {
  const questSnap = await getDocs(collection(db, "quests"));
  const resets = [];

  questSnap.forEach(docSnap => {
    const quest = { choreId: docSnap.id, ...docSnap.data() };
    if (quest.archived === true || quest.active === false) return;
    const periodKey = getQuestPeriodKey(quest);
    if (quest.lastResetPeriod === periodKey) return;

    resets.push(updateDoc(doc(db, "quests", docSnap.id), {
      status: "Ready",
      completedBy: "",
      lastResetDate: getTodayKey(),
      lastResetPeriod: periodKey
    }));
  });

  await Promise.all(resets);
}

/* -------------------------------------------------
   ADVENTURES AND GUILDMASTER TEST LAB
------------------------------------------------- */

const CLASS_COMBAT_PROGRESSION = {
  warrior: {
    passive: {level: 1, name: "Battle Hardened", text: "+10% maximum HP.", maxHpMultiplier: 1.10},
    skills: [
      {level: 1, id: "power_strike", name: "Power Strike", icon: "💥", cost: 3, kind: "physical", multiplier: 1.8, text: "A heavy physical strike."},
      {level: 5, id: "armor_break", name: "Armor Break", icon: "🔨", cost: 4, kind: "physical", multiplier: 1.55, armorPierce: 0.55, text: "Ignores much of the enemy's defense."},
      {level: 10, id: "second_wind", name: "Second Wind", icon: "❤️", cost: 5, healPct: 0.32, text: "Recover 32% of maximum HP."},
      {level: 15, id: "heroic_strike", name: "Heroic Strike", icon: "⚔️", cost: 7, kind: "physical", multiplier: 2.7, text: "A powerful finishing attack."}
    ]
  },
  rogue: {
    passive: {level: 1, name: "Opportunist", text: "+7% critical-hit chance.", critBonus: 0.07},
    skills: [
      {level: 1, id: "flurry", name: "Flurry", icon: "🗡️", cost: 3, kind: "physical", multiplier: 1.65, critBonus: 0.08, text: "Fast attack with extra critical chance."},
      {level: 5, id: "shadowstep", name: "Shadowstep", icon: "🌑", cost: 4, kind: "physical", multiplier: 1.35, evasionTurns: 2, text: "Attack and greatly improve dodge for 2 turns."},
      {level: 10, id: "lucky_stab", name: "Lucky Stab", icon: "🍀", cost: 5, kind: "physical", multiplier: 2.0, critBonus: 0.25, text: "A risky strike with very high critical chance."},
      {level: 15, id: "phantom_flurry", name: "Phantom Flurry", icon: "👤", cost: 7, kind: "physical", multiplier: 2.55, critBonus: 0.12, text: "A rapid master-level attack."}
    ]
  },
  mage: {
    passive: {level: 1, name: "Mana Well", text: "+2 maximum SP.", maxSpBonus: 2},
    skills: [
      {level: 1, id: "arc_bolt", name: "Arc Bolt", icon: "✨", cost: 3, kind: "magic", multiplier: 1.85, text: "A focused magical blast."},
      {level: 5, id: "mana_surge", name: "Mana Surge", icon: "💠", cost: 0, spRestore: 4, text: "Restore 4 SP. Does not deal damage."},
      {level: 10, id: "fireball", name: "Fireball", icon: "🔥", cost: 5, kind: "magic", multiplier: 2.35, text: "Heavy magical damage."},
      {level: 15, id: "starfall", name: "Starfall", icon: "🌠", cost: 8, kind: "magic", multiplier: 3.0, text: "A master spell with massive damage."}
    ]
  },
  ranger: {
    passive: {level: 1, name: "Trail Instinct", text: "+5% dodge chance.", dodgeBonus: 0.05},
    skills: [
      {level: 1, id: "piercing_shot", name: "Piercing Shot", icon: "🏹", cost: 3, kind: "physical", multiplier: 1.75, armorPierce: 0.45, text: "A shot that cuts through defense."},
      {level: 5, id: "quick_volley", name: "Quick Volley", icon: "🎯", cost: 4, kind: "physical", multiplier: 1.95, critBonus: 0.08, text: "A fast, accurate volley."},
      {level: 10, id: "field_mend", name: "Field Mend", icon: "🌿", cost: 5, healPct: 0.28, text: "Recover 28% of maximum HP."},
      {level: 15, id: "perfect_shot", name: "Perfect Shot", icon: "🏹", cost: 7, kind: "physical", multiplier: 2.65, armorPierce: 0.65, text: "A master shot that largely ignores armor."}
    ]
  },
  guardian: {
    passive: {level: 1, name: "Protector", text: "Defending reduces damage even further.", guardMultiplier: 0.35},
    skills: [
      {level: 1, id: "shield_bash", name: "Shield Bash", icon: "🛡️", cost: 3, kind: "physical", multiplier: 1.55, guardNext: true, text: "Attack and brace for the next hit."},
      {level: 5, id: "kind_mend", name: "Kind Mend", icon: "💚", cost: 4, healPct: 0.34, kindnessHeal: true, text: "Heal yourself; Kindness improves the effect."},
      {level: 10, id: "bulwark", name: "Bulwark", icon: "🏰", cost: 5, guardTurns: 2, text: "Greatly reduce damage for 2 turns."},
      {level: 15, id: "guardian_smite", name: "Guardian Smite", icon: "🌟", cost: 7, kind: "physical", multiplier: 2.35, guardNext: true, text: "Heavy damage while protecting yourself."}
    ]
  },
  royal: {
    passive: {level: 1, name: "Fortune's Favor", text: "+10% Gold and better loot rolls.", goldMultiplier: 1.10, lootBonus: 0.10},
    skills: [
      {level: 1, id: "radiant_burst", name: "Radiant Burst", icon: "👑", cost: 3, kind: "magic", multiplier: 1.75, text: "A bright magical attack."},
      {level: 5, id: "rally", name: "Rally", icon: "📣", cost: 4, healPct: 0.18, spRestore: 2, text: "Recover HP and 2 SP."},
      {level: 10, id: "fortune_strike", name: "Fortune Strike", icon: "💎", cost: 5, kind: "magic", multiplier: 2.1, critBonus: 0.20, text: "A high-critical magical strike."},
      {level: 15, id: "royal_decree", name: "Royal Decree", icon: "✨", cost: 7, kind: "magic", multiplier: 2.6, healPct: 0.12, text: "Heavy damage and a small heal."}
    ]
  }
};

function classCombatProgression(classId) {
  return CLASS_COMBAT_PROGRESSION[classId] || CLASS_COMBAT_PROGRESSION.warrior;
}

const CLASS_BRANCH_PERKS = {
  knight: {name: "Knight Training", text: "+8% maximum HP.", maxHpMultiplier: 1.08},
  berserker: {name: "Berserker Fury", text: "+10% physical damage.", physicalDamageBonus: 0.10},
  paladin: {name: "Paladin Grace", text: "Healing is 15% stronger.", healBonus: 0.15},
  "dragon-knight": {name: "Dragon Blood", text: "+5% critical chance.", critBonus: 0.05},
  champion: {name: "Champion's Force", text: "+12% physical damage.", physicalDamageBonus: 0.12},
  warlord: {name: "Warlord's Presence", text: "+12% Gold from battles.", goldMultiplier: 1.12},

  scout: {name: "Scout Reflexes", text: "+5% dodge chance.", dodgeBonus: 0.05},
  trickster: {name: "Trickster's Luck", text: "+6% critical chance.", critBonus: 0.06},
  pathfinder: {name: "Pathfinder's Eye", text: "Better equipment drop chance.", lootBonus: 0.10},
  "shadow-runner": {name: "Shadow Runner", text: "+10% physical damage.", physicalDamageBonus: 0.10},
  "illusion-rogue": {name: "Illusion Feint", text: "+7% dodge chance.", dodgeBonus: 0.07},
  "fortune-master": {name: "Fortune Master", text: "Better rarity rolls and +10% Gold.", lootBonus: 0.12, goldMultiplier: 1.10},

  elementalist: {name: "Elemental Force", text: "+10% magic damage.", magicDamageBonus: 0.10},
  enchanter: {name: "Deep Mana", text: "+2 maximum SP.", maxSpBonus: 2},
  "fire-mage": {name: "Burning Power", text: "+15% magic damage.", magicDamageBonus: 0.15},
  "frost-mage": {name: "Cold Focus", text: "+5% dodge and +1 maximum SP.", dodgeBonus: 0.05, maxSpBonus: 1},
  illusionist: {name: "Mirage", text: "+8% dodge chance.", dodgeBonus: 0.08},
  "rune-master": {name: "Rune Mastery", text: "+3 maximum SP.", maxSpBonus: 3},

  "beast-friend": {name: "Beast Bond", text: "Companion abilities trigger more often.", companionProcBonus: 0.08},
  "forest-warden": {name: "Forest Warden", text: "+8% maximum HP and stronger healing.", maxHpMultiplier: 1.08, healBonus: 0.08},
  "storm-ranger": {name: "Storm Aim", text: "+8% critical chance.", critBonus: 0.08},
  "beast-master": {name: "Beast Mastery", text: "Companion abilities trigger much more often.", companionProcBonus: 0.14},
  "spirit-ranger": {name: "Spirit Bond", text: "+2 maximum SP and stronger healing.", maxSpBonus: 2, healBonus: 0.10},

  protector: {name: "Protector Training", text: "+10% maximum HP.", maxHpMultiplier: 1.10},
  healer: {name: "Healing Hands", text: "Healing is 18% stronger.", healBonus: 0.18},
  sentinel: {name: "Sentinel Wall", text: "+12% maximum HP.", maxHpMultiplier: 1.12},
  "royal-guard": {name: "Royal Guard", text: "+5% dodge and stronger guarding.", dodgeBonus: 0.05},
  "light-keeper": {name: "Light Keeper", text: "+2 maximum SP and stronger healing.", maxSpBonus: 2, healBonus: 0.12},
  "heart-mender": {name: "Heart Mender", text: "Healing is 25% stronger.", healBonus: 0.25},

  "unicorn-princess": {name: "Unicorn Grace", text: "Healing is 12% stronger.", healBonus: 0.12},
  "dragon-prince": {name: "Dragon Spirit", text: "+10% magic damage.", magicDamageBonus: 0.10},
  "rainbow-queen": {name: "Rainbow Fortune", text: "Better rarity rolls.", lootBonus: 0.12},
  "starlight-guardian": {name: "Starlight Ward", text: "+8% maximum HP and +5% dodge.", maxHpMultiplier: 1.08, dodgeBonus: 0.05},
  "flame-king": {name: "Flame Crown", text: "+15% magic damage.", magicDamageBonus: 0.15},
  "dragon-rider": {name: "Dragon Rider", text: "+8% critical chance and +8% Gold.", critBonus: 0.08, goldMultiplier: 1.08}
};

function combinedCombatPerks(kid) {
  const base = {...classCombatProgression(kid.classId).passive};
  [kid.classBranch1, kid.classBranch2].filter(Boolean).forEach(branchId => {
    const perk = CLASS_BRANCH_PERKS[branchId];
    if (!perk) return;
    ["critBonus", "dodgeBonus", "lootBonus", "healBonus", "physicalDamageBonus", "magicDamageBonus", "maxSpBonus", "companionProcBonus"].forEach(key => {
      if (perk[key]) base[key] = Number(base[key] || 0) + Number(perk[key]);
    });
    if (perk.maxHpMultiplier) base.maxHpMultiplier = Number(base.maxHpMultiplier || 1) * Number(perk.maxHpMultiplier);
    if (perk.goldMultiplier) base.goldMultiplier = Number(base.goldMultiplier || 1) * Number(perk.goldMultiplier);
  });
  return base;
}

function classPerkCards(kid) {
  const progression = classCombatProgression(kid.classId);
  const perks = [{...progression.passive, source: "Class perk"}];
  [kid.classBranch1, kid.classBranch2].filter(Boolean).forEach(branchId => {
    const perk = CLASS_BRANCH_PERKS[branchId];
    if (perk) perks.push({...perk, source: "Path perk"});
  });
  return perks;
}

function unlockedCombatSkills(kid) {
  const level = Math.max(1, Number(kid.level || 1));
  return classCombatProgression(kid.classId).skills.filter(skill => level >= skill.level);
}

function companionBattleEffects(kid) {
  return (Array.isArray(kid.activeCompanions) ? kid.activeCompanions : []).slice(0, 2).map(companion => {
    const raw = String(companion.effectId || companion.abilityId || companion.abilityName || companion.ability || "").toLowerCase();
    let effect = raw;
    if (raw.includes("double")) effect = "double_cast";
    else if (raw.includes("shield") || raw.includes("break")) effect = "shield_breaker";
    else if (raw.includes("guard")) effect = "guard";
    else if (raw.includes("second") || raw.includes("wind") || raw.includes("heal")) effect = "second_wind";
    else if (raw.includes("treasure") || raw.includes("loot")) effect = "treasure_nose";
    return {
      name: companion.name || "Companion",
      icon: companion.icon || "🐾",
      effect
    };
  });
}

const LOCAL_BATTLE_ADVENTURES = {
  forest: {
    energy: 5, sleep: 1, xp: 15, gold: 10, dropChance: 0.32,
    rarityWeights: {poor: 30, common: 55, good: 14, rare: 1},
    enemies: [
      {name: "Moss Slime", icon: "🟢", hp: 24, attack: 5, physicalDefense: 2, magicDefense: 0, weakness: "magic", trait: "Soft Body"},
      {name: "Trail Goblin", icon: "👺", hp: 30, attack: 6, physicalDefense: 2, magicDefense: 2, dodge: 0.05, trait: "Nimble"},
      {name: "Bramble Boar", icon: "🐗", hp: 36, attack: 7, physicalDefense: 3, magicDefense: 1, weakness: "magic", trait: "Charging"}
    ]
  },
  ruins: {
    energy: 8, sleep: 2, xp: 28, gold: 20, dropChance: 0.48,
    rarityWeights: {poor: 10, common: 48, good: 34, rare: 7, legendary: 1},
    enemies: [
      {name: "Ruins Skeleton", icon: "💀", hp: 40, attack: 8, physicalDefense: 4, magicDefense: 2, weakness: "magic", trait: "Brittle Armor"},
      {name: "Stone Beetle", icon: "🪲", hp: 48, attack: 7, physicalDefense: 7, magicDefense: 1, weakness: "magic", trait: "Armored"},
      {name: "Dust Bandit", icon: "🥷", hp: 43, attack: 9, physicalDefense: 3, magicDefense: 3, dodge: 0.08, trait: "Evasive"}
    ]
  },
  vault: {
    energy: 12, sleep: 3, xp: 45, gold: 35, dropChance: 0.68,
    rarityWeights: {common: 25, good: 42, rare: 25, legendary: 7, mythic: 1},
    enemies: [
      {name: "Arcane Wisp", icon: "🔵", hp: 58, attack: 10, physicalDefense: 2, magicDefense: 7, weakness: "physical", trait: "Magic Ward"},
      {name: "Vault Sentinel", icon: "🗿", hp: 72, attack: 11, physicalDefense: 8, magicDefense: 4, weakness: "magic", trait: "Heavy Armor"},
      {name: "Crystal Drake", icon: "🐉", hp: 82, attack: 12, physicalDefense: 6, magicDefense: 6, dodge: 0.03, trait: "Elite"}
    ]
  }
};

function weightedBattleRarity(weights, luckBonus = 0) {
  const adjusted = {...weights};
  if (luckBonus > 0) {
    adjusted.rare = Number(adjusted.rare || 0) + luckBonus * 30;
    adjusted.legendary = Number(adjusted.legendary || 0) + luckBonus * 12;
    adjusted.mythic = Number(adjusted.mythic || 0) + luckBonus * 3;
  }
  const entries = Object.entries(adjusted).filter(([, value]) => Number(value) > 0);
  const total = entries.reduce((sum, [, value]) => sum + Number(value), 0);
  let roll = Math.random() * total;
  for (const [rarity, value] of entries) {
    roll -= Number(value);
    if (roll <= 0) return rarity;
  }
  return "common";
}

function rollBattleDrop(kid, adventureId, companionEffects = []) {
  const adventure = LOCAL_BATTLE_ADVENTURES[adventureId] || LOCAL_BATTLE_ADVENTURES.forest;
  const luck = Number(getClassStats(kid).luck || 0);
  const hasTreasureCompanion = companionEffects.some(effect => effect.effect === "treasure_nose");
  const chance = Math.min(0.90, adventure.dropChance + luck * 0.004 + (hasTreasureCompanion ? 0.18 : 0));
  if (Math.random() > chance) return null;
  const rarity = weightedBattleRarity(adventure.rarityWeights, luck * 0.002 + (hasTreasureCompanion ? 0.08 : 0));
  const itemTypes = Object.keys(ITEM_TYPES);
  return createItem(itemTypes[Math.floor(Math.random() * itemTypes.length)], rarity);
}

async function startLocalBattle(kidId, adventureId) {
  const adventure = LOCAL_BATTLE_ADVENTURES[adventureId];
  if (!adventure) throw new Error("Unknown adventure.");

  const kidSnap = await getDoc(doc(db, "kids", kidId));
  if (!kidSnap.exists()) throw new Error("Adventurer not found.");
  const kid = {kidId, ...kidSnap.data()};
  const energy = Math.min(MAX_ENERGY, Number(kid.energy ?? MAX_ENERGY));
  const sleepiness = currentSleepiness(kid);

  if (energy < adventure.energy) throw new Error("Not enough energy. Eat some quest food first.");
  if (sleepiness + adventure.sleep > MAX_SLEEPINESS) throw new Error("Too sleepy to adventure again today.");

  const stats = getClassStats(kid);
  const level = Math.max(1, Number(kid.level || 1));
  const progression = classCombatProgression(kid.classId);
  const passive = combinedCombatPerks(kid);
  const skills = unlockedCombatSkills(kid);
  const companions = companionBattleEffects(kid);
  const baseHp = 30 + level * 3 + Math.round(Number(stats.courage || 0) * 3.5);
  const maxHp = Math.round(baseHp * Number(passive.maxHpMultiplier || 1));
  const maxSp = Math.min(36, 5 + Math.floor(level / 2) + Math.floor(Number(stats.wisdom || 0) / 3) + Number(passive.maxSpBonus || 0));
  const magicBasic = Number(stats.wisdom || 0) > Number(stats.strength || 0);
  const baseEnemy = adventure.enemies[Math.floor(Math.random() * adventure.enemies.length)];
  const enemy = {
    ...baseEnemy,
    maxHp: Math.round(baseEnemy.hp + Math.max(0, level - 1) * 5.5),
    attack: Math.round(baseEnemy.attack + Math.max(0, level - 1) * 0.75),
    physicalDefense: Math.round(Number(baseEnemy.physicalDefense || 0) + Math.max(0, level - 1) * 0.30),
    magicDefense: Math.round(Number(baseEnemy.magicDefense || 0) + Math.max(0, level - 1) * 0.30)
  };

  await updateDoc(doc(db, "kids", kidId), {
    energy: energy - adventure.energy,
    sleepiness: sleepiness + adventure.sleep,
    sleepinessDate: getTodayKey(),
    lastAdventureAt: new Date().toISOString()
  });

  const openingLog = [`${kid.name || kidId} encountered ${enemy.name}!`];
  companions.forEach(companion => openingLog.push(`${companion.icon} ${companion.name} is ready to help.`));

  return {
    local: true,
    adventureId,
    status: "active",
    turn: 1,
    playerStats: stats,
    classId: kid.classId,
    passive,
    companions,
    companionUsed: {},
    player: {
      name: kid.name || kidId,
      hp: maxHp,
      maxHp,
      sp: maxSp,
      maxSp,
      basicName: magicBasic ? "Spark" : "Attack",
      basicKind: magicBasic ? "magic" : "physical",
      skills,
      guardTurns: 0,
      evasionTurns: 0
    },
    enemy: {
      name: enemy.name,
      icon: enemy.icon,
      trait: enemy.trait || "",
      weakness: enemy.weakness || "",
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      attack: enemy.attack,
      physicalDefense: enemy.physicalDefense,
      magicDefense: enemy.magicDefense,
      dodge: Number(enemy.dodge || 0)
    },
    log: openingLog,
    rewards: null
  };
}

async function resolveLocalBattleAction(kidId, battle, action, skillId = "") {
  if (battle.status !== "active") return battle;

  const stats = battle.playerStats || {};
  const player = {...battle.player};
  const enemy = {...battle.enemy};
  const log = [...(battle.log || [])];
  const companions = Array.isArray(battle.companions) ? battle.companions : [];
  const companionUsed = {...(battle.companionUsed || {})};
  let guarding = Number(player.guardTurns || 0) > 0;
  let selectedSkill = null;

  if (action === "defend") {
    guarding = true;
    player.guardTurns = Math.max(1, Number(player.guardTurns || 0));
    player.sp = Math.min(Number(player.maxSp || 0), Number(player.sp || 0) + 1);
    log.push(`${player.name} defends and recovers 1 SP.`);
  } else {
    const isSkill = action === "skill";
    selectedSkill = isSkill
      ? (player.skills || []).find(skill => skill.id === skillId)
      : null;
    if (isSkill && !selectedSkill) throw new Error("That ability is not available.");
    if (isSkill && Number(player.sp || 0) < Number(selectedSkill.cost || 0)) throw new Error("Not enough SP.");

    const skill = selectedSkill || {};
    if (isSkill) player.sp = Number(player.sp || 0) - Number(skill.cost || 0);

    if (Number(skill.spRestore || 0) > 0) {
      player.sp = Math.min(Number(player.maxSp || 0), player.sp + Number(skill.spRestore || 0));
      log.push(`${player.name} uses ${skill.name} and restores ${skill.spRestore} SP.`);
    }

    if (Number(skill.healPct || 0) > 0) {
      let healPct = Number(skill.healPct || 0);
      if (skill.kindnessHeal) healPct += Math.min(0.18, Number(stats.kindness || 0) * 0.004);
      healPct += Number(battle.passive?.healBonus || 0);
      const heal = Math.max(1, Math.round(Number(player.maxHp || 0) * healPct));
      player.hp = Math.min(Number(player.maxHp || 0), Number(player.hp || 0) + heal);
      log.push(`${player.name} uses ${skill.name} and recovers ${heal} HP.`);
    }

    if (Number(skill.guardTurns || 0) > 0) {
      player.guardTurns = Math.max(Number(player.guardTurns || 0), Number(skill.guardTurns));
      guarding = true;
      log.push(`${player.name} is protected for ${skill.guardTurns} turns.`);
    }
    if (skill.guardNext) {
      player.guardTurns = Math.max(Number(player.guardTurns || 0), 1);
      guarding = true;
    }
    if (Number(skill.evasionTurns || 0) > 0) {
      player.evasionTurns = Math.max(Number(player.evasionTurns || 0), Number(skill.evasionTurns));
      log.push(`${player.name} becomes harder to hit.`);
    }

    if (!isSkill || skill.kind) {
      const kind = isSkill ? skill.kind : player.basicKind;
      const statValue = kind === "magic" ? Number(stats.wisdom || 0) : Number(stats.strength || 0);
      const multiplier = isSkill ? Number(skill.multiplier || 1.5) : 1;
      const rawDefense = kind === "magic" ? Number(enemy.magicDefense || 0) : Number(enemy.physicalDefense || 0);
      let armorPierce = Number(skill.armorPierce || 0);
      const breaker = companions.find(companion => companion.effect === "shield_breaker");
      if (breaker && !companionUsed.shield_breaker && isSkill) {
        armorPierce = Math.max(armorPierce, 0.60);
        companionUsed.shield_breaker = true;
        log.push(`${breaker.icon} ${breaker.name} uses Shield Breaker!`);
      }
      const defense = rawDefense * (1 - Math.min(0.9, armorPierce));
      const weaknessMultiplier = enemy.weakness === kind ? 1.25 : 1;
      const damageBonus = kind === "magic"
        ? Number(battle.passive?.magicDamageBonus || 0)
        : Number(battle.passive?.physicalDamageBonus || 0);
      const variance = 0.9 + Math.random() * 0.2;
      let damage = Math.max(1, Math.round(((statValue * multiplier + Number(stats.agility || 0) * 0.15) * variance - defense) * weaknessMultiplier * (1 + damageBonus)));
      const passiveCrit = Number(battle.passive?.critBonus || 0);
      const critChance = Math.min(0.45, 0.04 + Number(stats.luck || 0) * 0.006 + passiveCrit + Number(skill.critBonus || 0));
      const crit = Math.random() < critChance;
      if (crit) damage = Math.round(damage * 1.6);
      if (Math.random() < Number(enemy.dodge || 0)) {
        damage = 0;
        log.push(`${enemy.name} dodges ${player.name}'s attack!`);
      } else {
        enemy.hp = Math.max(0, Number(enemy.hp || 0) - damage);
        log.push(`${player.name} uses ${isSkill ? skill.name : player.basicName} for ${damage} damage${crit ? " — critical hit!" : ""}${weaknessMultiplier > 1 ? " — weakness!" : "!"}`);

        const doubleCaster = companions.find(companion => companion.effect === "double_cast");
        const doubleChance = Math.min(0.45, 0.12 + Number(stats.kindness || 0) * 0.004 + Number(battle.passive?.companionProcBonus || 0));
        if (doubleCaster && isSkill && kind === "magic" && Math.random() < doubleChance && Number(enemy.hp || 0) > 0) {
          const echoDamage = Math.max(1, Math.round(damage * 0.65));
          enemy.hp = Math.max(0, Number(enemy.hp || 0) - echoDamage);
          log.push(`${doubleCaster.icon} ${doubleCaster.name} echoes the spell for ${echoDamage} damage!`);
        }
      }
    }
  }

  let status = "active";
  let rewards = null;

  if (Number(enemy.hp || 0) <= 0) {
    status = "won";
    const adventure = LOCAL_BATTLE_ADVENTURES[battle.adventureId] || LOCAL_BATTLE_ADVENTURES.forest;
    const rewardRoll = 0.9 + Math.random() * 0.2;
    const kidSnap = await getDoc(doc(db, "kids", kidId));
    const kid = {kidId, ...(kidSnap.data() || {})};
    const oldLevel = Math.max(1, Number(kid.level || 1));
    const goldMultiplier = Number(battle.passive?.goldMultiplier || 1);
    const xp = Math.max(1, Math.round(adventure.xp * rewardRoll));
    const gold = Math.max(1, Math.round(adventure.gold * rewardRoll * goldMultiplier));
    const newXp = Number(kid.xp || 0) + xp;
    const level = Math.floor(newXp / 100) + 1;
    const dropCompanions = [...companions];
    if (Number(battle.passive?.lootBonus || 0) > 0) {
      dropCompanions.push({effect: "treasure_nose"});
    }
    const drop = rollBattleDrop(kid, battle.adventureId, dropCompanions);
    const inventory = Array.isArray(kid.inventory) ? [...kid.inventory] : [];
    if (drop) inventory.push(drop);

    await updateDoc(doc(db, "kids", kidId), {
      xp: newXp,
      gold: Number(kid.gold || 0) + gold,
      level,
      inventory
    });

    rewards = {xp, gold, level, levelUp: level > oldLevel, drop};
    log.push(`${enemy.name} is defeated! +${xp} XP, +${gold} Gold.`);
    if (drop) log.push(`Treasure found: ${displayItemName(drop)}!`);
  } else {
    const passiveDodge = Number(battle.passive?.dodgeBonus || 0);
    const evasionBonus = Number(player.evasionTurns || 0) > 0 ? 0.18 : 0;
    const dodgeChance = Math.min(0.42, Number(stats.agility || 0) * 0.006 + passiveDodge + evasionBonus);

    if (Math.random() < dodgeChance) {
      log.push(`${player.name} dodges ${enemy.name}'s attack!`);
    } else {
      const courageReduction = Math.floor(Number(stats.courage || 0) * 0.16);
      let enemyDamage = Math.max(1, Math.round(Number(enemy.attack || 1) * (0.9 + Math.random() * 0.2)) - courageReduction);
      if (guarding) {
        const guardMultiplier = Number(battle.passive?.guardMultiplier || 0.5);
        enemyDamage = Math.max(1, Math.ceil(enemyDamage * guardMultiplier));
      }

      const guardCompanion = companions.find(companion => companion.effect === "guard");
      if (guardCompanion && !companionUsed.guard) {
        enemyDamage = Math.max(1, Math.ceil(enemyDamage / 2));
        companionUsed.guard = true;
        log.push(`${guardCompanion.icon} ${guardCompanion.name} jumps in to guard!`);
      }

      player.hp = Math.max(0, Number(player.hp || 0) - enemyDamage);
      log.push(`${enemy.name} hits for ${enemyDamage} damage${guarding ? " through your guard." : "."}`);
    }

    const secondWind = companions.find(companion => companion.effect === "second_wind");
    if (secondWind && !companionUsed.second_wind && Number(player.hp || 0) > 0 && Number(player.hp || 0) <= Number(player.maxHp || 0) * 0.30) {
      const heal = Math.max(1, Math.round(Number(player.maxHp || 0) * 0.20));
      player.hp = Math.min(Number(player.maxHp || 0), Number(player.hp || 0) + heal);
      companionUsed.second_wind = true;
      log.push(`${secondWind.icon} ${secondWind.name} uses Second Wind and restores ${heal} HP!`);
    }

    if (Number(player.hp || 0) <= 0) {
      status = "lost";
      log.push(`${player.name} is defeated and returns to the Guild Hall.`);
    }
  }

  if (Number(player.guardTurns || 0) > 0) player.guardTurns -= 1;
  if (Number(player.evasionTurns || 0) > 0) player.evasionTurns -= 1;

  return {
    ...battle,
    status,
    turn: Number(battle.turn || 1) + 1,
    player,
    enemy,
    companionUsed,
    log: log.slice(-14),
    rewards
  };
}

async function loadAdventureScreen(kidId) {
  setAppTheme("kid");
  try {
    const kidSnap = await getDoc(doc(db, "kids", kidId));
    if (!kidSnap.exists()) { showError("Adventurer not found."); return; }
    let kid = { kidId, ...kidSnap.data() };
    kid = await ensureInventoryInitialized(kid);
    const stats = kid.classId && CLASS_DEFINITIONS[kid.classId] ? getClassStats(kid) : null;
    const energy = Math.min(MAX_ENERGY, Number(kid.energy ?? MAX_ENERGY));
    const sleepy = currentSleepiness(kid);
    const adventures = [
      { id: "forest", name: "Whispering Woods", icon: "🌲", energy: 5, sleep: 1, note: "A short hunt with modest rewards." },
      { id: "ruins", name: "Old Ruins", icon: "🏚️", energy: 8, sleep: 2, note: "Tougher enemies and better treasure." },
      { id: "vault", name: "Arcane Vault", icon: "🔮", energy: 12, sleep: 3, note: "A dangerous run with the best current rewards." }
    ];

    document.body.innerHTML = `
      <main class="app">
        <header class="hero compact"><div class="logo">🗺️</div><h1>Adventure</h1><p>${escapeHtml(kid.name || kidId)} • choose an expedition</p></header>
        <section class="card adventure-resource-card">
          <div class="adventure-resource-head">
            <div><span>⚡ Energy</span><strong>${energy} / ${MAX_ENERGY}</strong></div>
            <div><span>😴 Sleepiness</span><strong>${sleepy} / ${MAX_SLEEPINESS}</strong></div>
          </div>
          ${stats ? `<p class="xp-text">Battle rating uses your level, class attributes, and equipped gear.</p>` : ""}
        </section>
        <section class="adventure-list">
          ${adventures.map(adventure => {
            const unavailable = energy < adventure.energy || sleepy + adventure.sleep > MAX_SLEEPINESS;
            return `
              <button class="adventure-option" type="button" data-adventure-id="${adventure.id}" ${unavailable ? "disabled" : ""}>
                <span class="adventure-icon">${adventure.icon}</span>
                <span class="adventure-copy">
                  <strong>${adventure.name}</strong>
                  <small>${adventure.note}</small>
                  <span>⚡ ${adventure.energy} Energy • 😴 +${adventure.sleep}</span>
                </span>
                <span class="equipment-slot-arrow">›</span>
              </button>`;
          }).join("")}
        </section>
        ${sleepy >= MAX_SLEEPINESS ? '<section class="card"><p>😴 Too sleepy to adventure again today. Sleepiness resets tomorrow.</p></section>' : ""}
        <button id="adventureBackBtn" type="button" style="width:100%;margin-top:12px;">← Back to Quests</button>
      </main>`;

    document.querySelectorAll(".adventure-option").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const battle = await startLocalBattle(kidId, button.dataset.adventureId);
          await renderBattleScreen(kidId, battle);
        } catch (err) {
          alert(err?.message || "Adventure could not start.");
          button.disabled = false;
        }
      });
    });
    document.getElementById("adventureBackBtn")?.addEventListener("click", () => loadKidDashboard(kidId));
  } catch (err) {
    showError("Could not load adventure: " + err.message);
  }
}

async function renderBattleScreen(kidId, battle) {
  setAppTheme("kid");
  try {
    const kidSnap = await getDoc(doc(db, "kids", kidId));
    const kid = kidSnap.exists() ? {kidId, ...kidSnap.data()} : {kidId, name: battle?.player?.name || kidId, avatar: "⚔️"};
    const player = battle?.player || {};
    const enemy = battle?.enemy || {};
    const skills = Array.isArray(player.skills) ? player.skills : [];
    const companions = Array.isArray(battle.companions) ? battle.companions : [];
    const playerHpPct = player.maxHp ? Math.max(0, Math.min(100, Math.round(Number(player.hp || 0) / Number(player.maxHp) * 100))) : 0;
    const enemyHpPct = enemy.maxHp ? Math.max(0, Math.min(100, Math.round(Number(enemy.hp || 0) / Number(enemy.maxHp) * 100))) : 0;
    const spPct = player.maxSp ? Math.max(0, Math.min(100, Math.round(Number(player.sp || 0) / Number(player.maxSp) * 100))) : 0;
    const finished = battle.status === "won" || battle.status === "lost";
    const won = battle.status === "won";
    const rewardDrop = battle.rewards?.drop || null;

    document.body.innerHTML = `
      <main class="app battle-app">
        <header class="hero compact battle-hero">
          <div class="logo">⚔️</div>
          <h1>Battle</h1>
          <p>Turn ${Number(battle.turn || 1)}</p>
        </header>

        <section class="battle-stage">
          <article class="battle-fighter enemy">
            <div class="battle-enemy-art">${escapeHtml(enemy.icon || "👾")}</div>
            <strong>${escapeHtml(enemy.name || "Monster")}</strong>
            ${enemy.trait ? `<span class="battle-trait">${escapeHtml(enemy.trait)}</span>` : ""}
            <div class="battle-meter"><div class="battle-meter-fill hp" style="width:${enemyHpPct}%"></div></div>
            <small>HP ${Number(enemy.hp || 0)} / ${Number(enemy.maxHp || 0)}</small>
          </article>

          <div class="battle-versus">VS</div>

          <article class="battle-fighter player">
            <div class="battle-player-art">${renderCharacterThumbnail(kid)}</div>
            <strong>${escapeHtml(player.name || kid.name || kidId)}</strong>
            <div class="battle-meter"><div class="battle-meter-fill hp" style="width:${playerHpPct}%"></div></div>
            <small>HP ${Number(player.hp || 0)} / ${Number(player.maxHp || 0)}</small>
            <div class="battle-meter sp"><div class="battle-meter-fill sp" style="width:${spPct}%"></div></div>
            <small>SP ${Number(player.sp || 0)} / ${Number(player.maxSp || 0)}</small>
          </article>
        </section>

        ${companions.length ? `
          <section class="battle-companion-strip">
            ${companions.map(companion => `<span title="${escapeAttribute(companion.effect || "")}">${escapeHtml(companion.icon)} ${escapeHtml(companion.name)}</span>`).join("")}
          </section>` : ""}

        <section class="card battle-log-card">
          <h2>Battle Log</h2>
          <div class="battle-log">${(battle.log || []).slice(-7).map(line => `<p>${escapeHtml(line)}</p>`).join("")}</div>
        </section>

        ${finished ? `
          <section class="card battle-result-card ${won ? "victory" : "defeat"}">
            <h2>${won ? "🏆 Victory!" : "💤 Defeated"}</h2>
            ${won && battle.rewards ? `
              <div class="battle-reward-grid">
                <div><span>XP</span><strong>+${Number(battle.rewards.xp || 0)}</strong></div>
                <div><span>Gold</span><strong>+${Number(battle.rewards.gold || 0)}</strong></div>
                <div><span>Level</span><strong>${Number(battle.rewards.level || kid.level || 1)}</strong></div>
              </div>
              ${battle.rewards.levelUp ? '<div class="level-up-banner">⬆️ Level Up!</div>' : ""}
              ${rewardDrop ? `
                <div class="battle-loot-drop">
                  <span class="equipment-slot-icon">${itemIcon(rewardDrop)}</span>
                  <div><small>Equipment found</small><strong>${escapeHtml(displayItemName(rewardDrop))}</strong><span>${escapeHtml(formatBonuses(rewardDrop))}</span></div>
                </div>` : '<p class="battle-no-drop">No equipment dropped this time.</p>'}
            ` : '<p>You return safely, but this adventure gives no battle rewards.</p>'}
            <button id="battleContinueBtn" type="button">Continue Adventure</button>
          </section>
        ` : `
          <section class="battle-actions">
            <button class="battle-action-btn basic" type="button" data-battle-action="basic">
              <span>⚔️</span><strong>${escapeHtml(player.basicName || "Attack")}</strong><small>Free basic action</small>
            </button>
            <button class="battle-action-btn defend" type="button" data-battle-action="defend">
              <span>🛡️</span><strong>Defend</strong><small>Reduce damage • +1 SP</small>
            </button>
            ${skills.map(skill => `
              <button class="battle-action-btn skill" type="button" data-battle-action="skill" data-skill-id="${escapeAttribute(skill.id)}" ${Number(player.sp || 0) < Number(skill.cost || 0) ? "disabled" : ""}>
                <span>${skill.icon || "✨"}</span>
                <strong>${escapeHtml(skill.name)}</strong>
                <small>${Number(skill.cost || 0)} SP • ${escapeHtml(skill.text || "")}</small>
              </button>`).join("")}
          </section>
        `}

        <button id="battleRetreatBtn" type="button" class="battle-retreat-btn">${finished ? "← Back to Adventures" : "Retreat from Battle"}</button>
      </main>`;

    document.querySelectorAll(".battle-action-btn").forEach(button => {
      button.addEventListener("click", async () => {
        document.querySelectorAll(".battle-action-btn").forEach(item => { item.disabled = true; });
        try {
          const nextBattle = await resolveLocalBattleAction(
            kidId,
            battle,
            button.dataset.battleAction,
            button.dataset.skillId || ""
          );
          await renderBattleScreen(kidId, nextBattle);
        } catch (err) {
          alert(err?.message || "That battle action failed.");
          await renderBattleScreen(kidId, battle);
        }
      });
    });

    document.getElementById("battleContinueBtn")?.addEventListener("click", () => loadAdventureScreen(kidId));
    document.getElementById("battleRetreatBtn")?.addEventListener("click", () => loadAdventureScreen(kidId));
  } catch (err) {
    showError("Could not render battle: " + err.message);
  }
}

const MOD_PROFILE_ID = "MODLAB";

async function ensureModProfile() {
  const ref = doc(db, "kids", MOD_PROFILE_ID);
  const snap = await getDoc(ref);
  if (snap.exists()) return { kidId: MOD_PROFILE_ID, ...snap.data() };

  const data = {
    name: "Guildmaster Test Adventurer",
    avatar: "🧪",
    active: false,
    classId: "warrior",
    classTitle: "Warrior",
    classPath: "Warrior",
    level: 1,
    xp: 0,
    gold: 0,
    sp: 10,
    energy: MAX_ENERGY,
    sleepiness: 0,
    sleepinessDate: getTodayKey(),
    currentStreak: 0,
    bestStreak: 0,
    inventory: [],
    equipment: {},
    inventoryVersion: INVENTORY_VERSION,
    foodInventory: {
      gummy_bears: 10,
      chocolate_bar: 10,
      lollipop: 10,
      streak_bubble_gum: 3
    },
    modProfile: true
  };
  await setDoc(ref, data);
  return { kidId: MOD_PROFILE_ID, ...data };
}

async function loadModLab(user) {
  setAppTheme("parent");
  if (String(user?.email || "").toLowerCase() !== ADMIN_EMAIL) {
    await loadParentDashboard(user);
    return;
  }

  try {
    let kid = await ensureModProfile();
    kid = await ensureInventoryInitialized(kid);
    if (!Array.isArray(kid.activeCompanions) || kid.activeCompanions.length === 0) {
      const activeCompanions = [
        {name: "Emberfox", icon: "🦊", effectId: "double_cast", abilityName: "Double Cast", abilityText: "Sometimes echoes a magic ability at reduced power."},
        {name: "Iron Beetle", icon: "🪲", effectId: "shield_breaker", abilityName: "Shield Breaker", abilityText: "Your first SP attack in battle cuts through heavy defense."}
      ];
      await updateDoc(doc(db, "kids", MOD_PROFILE_ID), {activeCompanions});
      kid = {...kid, activeCompanions};
    }
    const stats = getClassStats(kid);
    const rarityOptions = Object.keys(ITEM_GRADES);
    const slotEditors = Object.entries(EQUIPMENT_SLOTS).filter(([slot]) => slot !== "companion").map(([slot, label]) => {
      const compatible = Object.entries(ITEM_TYPES).filter(([, item]) => item.slot === slot);
      const equippedItem = kid.equipment?.[slot] || null;
      return `
        <div class="mod-gear-row">
          <div><small>${escapeHtml(label)}</small><strong>${escapeHtml(displayItemName(equippedItem))}</strong></div>
          <select class="mod-item-select" data-slot="${slot}">
            <option value="">Empty</option>
            ${compatible.map(([id, item]) => `<option value="${escapeAttribute(id)}" ${equippedItem?.itemType === id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
          </select>
          <select class="mod-rarity-select" data-slot="${slot}">
            ${rarityOptions.map(rarity => `<option value="${rarity}" ${normalizeRarity(equippedItem?.rarity || equippedItem?.grade) === rarity ? "selected" : ""}>${ITEM_GRADES[rarity].name}</option>`).join("")}
          </select>
        </div>`;
    }).join("");

    document.body.innerHTML = `
      <main class="app">
        ${renderSignOutHeader(user)}
        <header class="hero compact"><div class="logo">🧪</div><h1>Guildmaster Test Lab</h1><p>Private mod adventurer for testing real progression systems.</p></header>

        <section class="card mod-warning">
          <strong>God Mode</strong>
          <p>This inactive test profile is hidden from child character selection and is only linked from your Guild Hall account.</p>
        </section>

        <section class="card">
          <h2>Progression</h2>
          <div class="mod-control-grid">
            <label>Class
              <select id="modClassSelect">
                ${Object.entries(CLASS_DEFINITIONS).map(([id, def]) => `<option value="${id}" ${kid.classId === id ? "selected" : ""}>${escapeHtml(def.name)}</option>`).join("")}
              </select>
            </label>
            <label>Level
              <input id="modLevelInput" type="number" min="1" max="100" value="${Math.max(1, Number(kid.level || 1))}">
            </label>
            <label>Energy
              <input id="modEnergyInput" type="number" min="0" max="${MAX_ENERGY}" value="${Math.min(MAX_ENERGY, Number(kid.energy ?? MAX_ENERGY))}">
            </label>
            <label>Sleepiness
              <input id="modSleepInput" type="number" min="0" max="${MAX_SLEEPINESS}" value="${currentSleepiness(kid)}">
            </label>
            <label>SP
              <input id="modSpInput" type="number" min="0" max="999" value="${Number(kid.sp || 0)}">
            </label>
            <label>Gold
              <input id="modGoldInput" type="number" min="0" max="999999" value="${Number(kid.gold || 0)}">
            </label>
          </div>
          <button id="saveModProgressBtn" type="button" style="width:100%;margin-top:12px;">Save Progression</button>
        </section>

        <section class="card jrpg-menu-card">
          <div class="jrpg-section-heading"><div><h2>Derived Attributes</h2><p>These are calculated from class, level, and equipment.</p></div></div>
          <div class="attribute-overview"><div class="stat-radar-wrap">${radarChartSvg(stats)}</div></div>
          <div class="jrpg-stat-grid">
            ${STAT_KEYS.map(key => `<div class="jrpg-stat-row"><span>${statAbbreviation(key)}</span><strong>${Number(stats[key] || 0)}</strong></div>`).join("")}
          </div>
        </section>

        <section class="card">
          <h2>God-Mode Equipment</h2>
          <p class="xp-text">Pick any compatible item and rarity. Stats update from the selected gear.</p>
          <div class="mod-gear-list">${slotEditors}</div>
          <button id="saveModGearBtn" type="button" style="width:100%;margin-top:12px;">Apply Equipment</button>
        </section>

        <section class="card">
          <h2>Testing Shortcuts</h2>
          <div class="mod-shortcuts">
            <button id="modRefillBtn" type="button">⚡ Refill Energy</button>
            <button id="modWakeBtn" type="button">😴 Reset Sleepiness</button>
            <button id="modFoodsBtn" type="button">🍬 Add Test Food</button>
            <button id="modAdventureBtn" type="button">🗺️ Open Adventure</button>
            <button id="modCharacterBtn" type="button">🧙 Open Character Sheet</button>
          </div>
        </section>

        <button id="modBackBtn" type="button" style="width:100%;">← Back to Guild Hall</button>
      </main>`;

    attachSignOutEvent();

    document.getElementById("saveModProgressBtn").addEventListener("click", async () => {
      const classId = document.getElementById("modClassSelect").value;
      const def = CLASS_DEFINITIONS[classId];
      const level = Math.max(1, Math.min(100, Number(document.getElementById("modLevelInput").value || 1)));
      await updateDoc(doc(db, "kids", MOD_PROFILE_ID), {
        classId,
        classTitle: def.name,
        classPath: def.name,
        classBranch1: "",
        classBranch2: "",
        level,
        xp: (level - 1) * 100,
        energy: Math.max(0, Math.min(MAX_ENERGY, Number(document.getElementById("modEnergyInput").value || 0))),
        sleepiness: Math.max(0, Math.min(MAX_SLEEPINESS, Number(document.getElementById("modSleepInput").value || 0))),
        sleepinessDate: getTodayKey(),
        sp: Math.max(0, Number(document.getElementById("modSpInput").value || 0)),
        gold: Math.max(0, Number(document.getElementById("modGoldInput").value || 0))
      });
      await loadModLab(user);
    });

    document.getElementById("saveModGearBtn").addEventListener("click", async () => {
      const equipment = {};
      document.querySelectorAll(".mod-item-select").forEach(select => {
        const slot = select.dataset.slot;
        const itemType = select.value;
        if (!itemType) return;
        const raritySelect = document.querySelector(`.mod-rarity-select[data-slot="${slot}"]`);
        const rarity = raritySelect?.value || "common";
        equipment[slot] = { ...createItem(itemType, rarity), equipped: true };
      });
      await updateDoc(doc(db, "kids", MOD_PROFILE_ID), { equipment });
      await loadModLab(user);
    });

    document.getElementById("modRefillBtn").addEventListener("click", async () => {
      await updateDoc(doc(db, "kids", MOD_PROFILE_ID), { energy: MAX_ENERGY });
      await loadModLab(user);
    });
    document.getElementById("modWakeBtn").addEventListener("click", async () => {
      await updateDoc(doc(db, "kids", MOD_PROFILE_ID), { sleepiness: 0, sleepinessDate: getTodayKey() });
      await loadModLab(user);
    });
    document.getElementById("modFoodsBtn").addEventListener("click", async () => {
      const snap = await getDoc(doc(db, "kids", MOD_PROFILE_ID));
      const existing = snap.data()?.foodInventory || {};
      await updateDoc(doc(db, "kids", MOD_PROFILE_ID), {
        foodInventory: {
          ...existing,
          gummy_bears: Number(existing.gummy_bears || 0) + 5,
          chocolate_bar: Number(existing.chocolate_bar || 0) + 5,
          lollipop: Number(existing.lollipop || 0) + 5,
          streak_bubble_gum: Number(existing.streak_bubble_gum || 0) + 1
        }
      });
      await loadModLab(user);
    });
    document.getElementById("modAdventureBtn").addEventListener("click", () => loadAdventureScreen(MOD_PROFILE_ID));
    document.getElementById("modCharacterBtn").addEventListener("click", () => loadClassScreen(MOD_PROFILE_ID));
    document.getElementById("modBackBtn").addEventListener("click", () => {
      window.history.replaceState({}, document.title, window.location.pathname);
      loadParentDashboard(user);
    });
  } catch (err) {
    showError("Could not load mod lab: " + err.message);
  }
}

/* -------------------------------------------------
   PARENT DASHBOARD, SUBMISSION APPROVAL, AND CHILD DETAILS
------------------------------------------------- */

async function loadParentDashboard(user) {
  document.body.innerHTML = `<main class="app"><header class="hero"><div class="logo">🛡️</div><h1>Guild Hall</h1><p>Loading quest review...</p></header></main>`;
  try {
    await resetDailyQuestsIfNeeded();
    await refreshAllStreaks();
    const [kids, questSnap, submissions, history] = await Promise.all([
      getAllKids(), getDocs(collection(db, "quests")), getTodaySubmissions(), getTodayHistory()
    ]);
    const quests = [];
    questSnap.forEach(d => { const q = { choreId: d.id, ...d.data() }; if (q.archived !== true && q.active !== false) quests.push(q); });
    renderParentDashboard({ kids, quests, submissions, history }, user);
  } catch (err) { showError("Firebase parent error: " + err.message); }
}

function renderParentDashboard(data, user) {
  setAppTheme("parent");
  const isGuildMaster = String(user?.email || "").toLowerCase() === ADMIN_EMAIL;
  const pending = data.submissions.filter(s => s.status === "Pending");
  document.body.innerHTML = `
    <main class="app">
      ${renderSignOutHeader(user)}
      <header class="hero compact"><div class="logo">🛡️</div><h1>Guild Hall</h1><p>Quest Review & Family Progress</p></header>

      <details class="card quest-review-card" open>
        <summary>
          <span>Quest Review</span>
          <strong>${pending.length} pending</strong>
        </summary>
        ${pending.length === 0 ? "<p>No quests pending approval.</p>" : `
          <div class="bulk-review-toolbar">
            <label><input id="selectAllPendingQuests" type="checkbox" checked> Select all</label>
            <button id="approveSelectedQuestsBtn" type="button">✅ Approve Checked</button>
          </div>
          <div class="bulk-review-list">
            ${pending.map(item => {
              const names = (item.participantIds || []).map(id => data.kids.find(k => k.kidId === id)?.name || id);
              return `
                <div class="bulk-review-row">
                  <label class="bulk-review-check">
                    <input class="pending-quest-check" type="checkbox" value="${escapeAttribute(item.submissionId)}" checked>
                    <span class="quest-icon">📜</span>
                    <span class="quest-info">
                      <strong>${escapeHtml(item.questName || "Quest")}</strong>
                      <span>${item.isSideQuest ? "Side Quest" : "Main Quest"} • ${escapeHtml(names.join(", "))}</span>
                      <small class="status status-pending">Submitted ${formatDateTime(item.submittedAt)}</small>
                    </span>
                  </label>
                  <button class="reject-submission-btn compact-danger" type="button" data-submission-id="${escapeAttribute(item.submissionId)}" aria-label="Reject ${escapeAttribute(item.questName || "quest")}">✕</button>
                </div>`;
            }).join("")}
          </div>`}
      </details>

      <section class="card">
        <h2>Adventurers</h2>
        ${isGuildMaster ? `
          <a class="mod-adventurer-card" href="?mod=true">
            <div class="avatar">🧪</div>
            <div><strong>Guildmaster Test Adventurer</strong><span>God-mode testing • level, gear, energy, sleepiness</span></div>
          </a>` : ""}
        ${data.kids.map(kid => {
          const main = data.quests.filter(q => q.kidId === kid.kidId);
          const doneIds = new Set(data.history.filter(h => Array.isArray(h.participantIds) && h.participantIds.includes(kid.kidId)).map(h => h.questId));
          const doneMain = main.filter(q => doneIds.has(q.choreId)).length;
          const pct = main.length ? Math.round(doneMain / main.length * 100) : 0;
          return `<button class="character-card-btn child-detail-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}" style="margin-bottom:12px;">
            <div class="avatar">${renderCharacterThumbnail(kid)}</div><strong>${escapeHtml(kid.name || kid.kidId)}</strong>
            <span>Level ${Number(kid.level || 1)} • ${Number(kid.gold || 0)} Gold • ${Number(kid.currentStreak || 0)}🔥 streak • Best ${Number(kid.bestStreak || 0)} • ${doneMain}/${main.length} Main Quests (${pct}%)</span>
          </button>`;
        }).join("")}
      </section>

      ${isGuildMaster ? '<a class="character parent-link" href="?manager=true"><div class="avatar">📋</div><div><strong>Task Manager</strong><span>Create repeating tasks and subtasks</span></div></a>' : ''}
      <a class="character parent-link" href="?family=true"><div class="avatar">👨‍👩‍👧‍👦</div><div><strong>Family Accounts</strong><span>Create profiles and set or reset PINs</span></div></a>
    </main>`;

  attachSignOutEvent();

  document.getElementById("selectAllPendingQuests")?.addEventListener("change", event => {
    document.querySelectorAll(".pending-quest-check").forEach(check => {
      check.checked = event.target.checked;
    });
  });

  document.querySelectorAll(".pending-quest-check").forEach(check => {
    check.addEventListener("change", () => {
      const all = Array.from(document.querySelectorAll(".pending-quest-check"));
      const selectAll = document.getElementById("selectAllPendingQuests");
      if (selectAll) selectAll.checked = all.length > 0 && all.every(item => item.checked);
    });
  });

  document.getElementById("approveSelectedQuestsBtn")?.addEventListener("click", async () => {
    const selectedIds = Array.from(document.querySelectorAll(".pending-quest-check:checked")).map(check => check.value);
    if (!selectedIds.length) {
      alert("Select at least one quest to approve.");
      return;
    }
    const button = document.getElementById("approveSelectedQuestsBtn");
    button.disabled = true;
    button.textContent = "Approving...";
    try {
      for (const submissionId of selectedIds) {
        await approveSubmissionCore(submissionId);
      }
      await loadParentDashboard(auth.currentUser);
    } catch (err) {
      alert("Could not approve selected quests: " + err.message);
      await loadParentDashboard(auth.currentUser);
    }
  });

  document.querySelectorAll('.reject-submission-btn').forEach(b => b.addEventListener('click', () => rejectSubmission(b.dataset.submissionId)));
  document.querySelectorAll('.child-detail-btn').forEach(b => b.addEventListener('click', () => loadChildDetail(b.dataset.kidId, user)));
}

async function approveSubmissionCore(submissionId) {
  try {
    const subRef = doc(db, "questSubmissions", submissionId);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) return false;
    const submission = { submissionId, ...subSnap.data() };
    if (submission.status !== "Pending") return false;

    const [questSnap, allQuestSnap, history] = await Promise.all([
      getDoc(doc(db, "quests", submission.questId)),
      getDocs(collection(db, "quests")),
      getAllHistory()
    ]);

    if (!questSnap.exists()) throw new Error("Quest not found for " + (submission.questName || submissionId));
    const quest = { choreId: submission.questId, ...questSnap.data() };
    const participants = Array.from(new Set(submission.participantIds || [submission.submittedBy]));
    const isFullReward = quest.kidId !== ANYONE_ID && participants.includes(quest.kidId) && submission.submittedBy === quest.kidId;
    const rewardPoolXp = 0;
    const rewardPoolGold = 0;
    const xpShares = participants.map(() => 0);
    const goldShares = participants.map(() => 0);
    const foodRewards = [];
    const approvedAt = new Date().toISOString();
    const questDate = submission.questDate || getTodayKey();
    const periodDate = dateFromKey(questDate);

    const allQuests = [];
    allQuestSnap.forEach(item => allQuests.push({ choreId: item.id, ...item.data() }));

    const isSubtask = Boolean(quest.parentQuestId);
    let rewardQuests = [];

    if (!isSubtask) {
      const dueDescendants = scheduledDescendantsForQuest(quest.choreId, allQuests, periodDate);
      const incompleteDescendants = dueDescendants.filter(child =>
        !isQuestCompletedForCurrentPeriod(child, history, periodDate)
      );
      if (incompleteDescendants.length) {
        throw new Error("All due subtasks must be approved before the parent task can be approved.");
      }
      rewardQuests = [quest, ...dueDescendants];
    }

    if (rewardQuests.length) {
      for (let i = 0; i < participants.length; i++) {
        const kidRef = doc(db, "kids", participants[i]);
        const kidSnap = await getDoc(kidRef);
        if (!kidSnap.exists()) continue;
        const kid = { kidId: participants[i], ...kidSnap.data() };
        const foodInventory = kid.foodInventory && typeof kid.foodInventory === "object" ? { ...kid.foodInventory } : {};

        rewardQuests.forEach(rewardQuest => {
          const fullFoodReward = isFullReward && participants[i] === quest.kidId;
          const foodId = questFoodRewardId(kid, rewardQuest, fullFoodReward);
          const food = foodCatalogForKid(kid)[foodId];
          foodInventory[foodId] = Number(foodInventory[foodId] || 0) + 1;
          foodRewards.push({
            kidId: participants[i],
            questId: rewardQuest.choreId,
            foodId,
            foodName: food?.name || foodId,
            energy: Number(food?.energy || 0)
          });
        });

        await updateDoc(kidRef, {
          foodInventory,
          lifetimeQuests: Number(kid.lifetimeQuests || 0) + rewardQuests.length
        });
      }
    }

    await updateDoc(subRef, {
      status: "Approved",
      approvedAt,
      rewardPoolXp,
      rewardPoolGold,
      xpShares,
      goldShares,
      rewardDeferredToParent: isSubtask,
      bundledRewardQuestIds: rewardQuests.map(item => item.choreId)
    });

    await addDoc(collection(db, "questHistory"), {
      questId: submission.questId,
      questName: submission.questName || quest.name || "Quest",
      assignedKidId: quest.kidId || ANYONE_ID,
      submittedBy: submission.submittedBy,
      participantIds: participants,
      questDate,
      periodKey: submission.periodKey || getQuestPeriodKey(quest, periodDate),
      scheduleType: submission.scheduleType || getQuestScheduleType(quest),
      approvedAt,
      rewardPoolXp,
      rewardPoolGold,
      xpShares,
      goldShares,
      foodRewards,
      rewardDeferredToParent: isSubtask,
      bundledRewardQuestIds: rewardQuests.map(item => item.choreId),
      isSideQuest: !isFullReward
    });

    const todaySubs = await getTodaySubmissions();
    await Promise.all(todaySubs.filter(s =>
      s.questId === submission.questId &&
      s.submissionId !== submissionId &&
      s.status === "Pending"
    ).map(s => updateDoc(doc(db, "questSubmissions", s.submissionId), {
      status: "Rejected",
      rejectedAt: approvedAt,
      rejectionReason: "Completed by another group"
    })));

    await updateDoc(doc(db, "quests", submission.questId), {
      status: "Approved",
      completedBy: submission.submittedBy,
      approvedAt,
      active: getQuestScheduleType(quest) === "one-time" ? false : quest.active !== false
    });

    await refreshAllStreaks();
    return true;
  } catch (err) {
    throw err;
  }
}

async function approveSubmission(submissionId) {
  try {
    await approveSubmissionCore(submissionId);
    await loadParentDashboard(auth.currentUser);
  } catch (err) {
    alert("Could not approve submission: " + err.message);
  }
}

async function rejectSubmission(submissionId) {
  try {
    await updateDoc(doc(db, "questSubmissions", submissionId), { status: "Rejected", rejectedAt: new Date().toISOString(), rejectionReason: "Parent rejected" });
    await loadParentDashboard(auth.currentUser);
  } catch (err) { alert("Could not reject submission: " + err.message); }
}

function splitWholeReward(total, count) {
  if (!count) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

async function loadChildDetail(kidId, user) {
  try {
    const [kidSnap, questSnap, submissions, history, kids] = await Promise.all([
      getDoc(doc(db, "kids", kidId)), getDocs(collection(db, "quests")), getTodaySubmissions(), getTodayHistory(), getAllKids()
    ]);
    if (!kidSnap.exists()) { showError("Child profile not found."); return; }
    const kid = { kidId, ...kidSnap.data() };
    const main = [];
    questSnap.forEach(d => { const q={choreId:d.id,...d.data()}; if(q.archived!==true && q.active!==false && q.kidId===kidId) main.push(q); });
    const doneByQuest = new Map(history.map(h => [h.questId, h]));
    const pendingForKid = submissions.filter(s => s.status === "Pending" && Array.isArray(s.participantIds) && s.participantIds.includes(kidId));
    const recent = history.filter(h => Array.isArray(h.participantIds) && h.participantIds.includes(kidId));
    document.body.innerHTML = `<main class="app">${renderSignOutHeader(user)}
      <header class="hero compact"><div class="logo character-logo">${renderCharacterThumbnail(kid)}</div><h1>${escapeHtml(kid.name || kidId)}</h1><p>Today's progress</p></header>
      <section class="card character-card"><div class="level-row">
        <div><span class="label">Current Streak</span><strong>${Number(kid.currentStreak || 0)}🔥</strong></div>
        <div><span class="label">Best Streak</span><strong>${Number(kid.bestStreak || 0)}</strong></div>
        <div><span class="label">Rule</span><strong style="font-size:1rem;">${getKidStreakMode(kid) === 'participation' ? 'Participate' : 'Main Quests'}</strong></div>
      </div></section>
      <section class="card"><h2>Main Quests</h2>${main.length ? main.map(q => {
        const done=doneByQuest.has(q.choreId); const pending=pendingForKid.some(s=>s.questId===q.choreId);
        return `<div class="quest"><div class="quest-icon">${done?'✅':pending?'⏳':'⬜'}</div><div class="quest-info"><strong>${escapeHtml(q.name||'Quest')}</strong><span>Adventure food on approval</span><small class="status ${done?'status-approved':pending?'status-pending':'status-ready'}">${done?'Completed':pending?'Pending approval':'Still remaining'}</small></div></div>`;
      }).join('') : '<p>No Main Quests assigned.</p>'}</section>
      <section class="card"><h2>Recent Activity Today</h2>${recent.length ? recent.map(h=>`<div class="quest"><div class="quest-icon">🏆</div><div class="quest-info"><strong>${escapeHtml(h.questName||'Quest')}</strong><span>${h.isSideQuest?'Side Quest':'Main Quest'} • ${escapeHtml((h.participantIds||[]).map(id=>kids.find(k=>k.kidId===id)?.name||id).join(', '))}</span><small class="status status-approved">Approved ${formatDateTime(h.approvedAt)}</small></div></div>`).join('') : '<p>No approved quests today.</p>'}</section>
      <button id="detailBackBtn" type="button" style="width:100%;">← Back to Guild Hall</button>
    </main>`;
    attachSignOutEvent();
    document.getElementById('detailBackBtn').addEventListener('click',()=>loadParentDashboard(user));
  } catch(err){ showError('Could not load child details: '+err.message); }
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* -------------------------------------------------
   FAMILY ACCOUNTS
------------------------------------------------- */

async function loadFamilyAccounts(user) {
  setAppTheme("parent");
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
              <div class="quest-icon character-quest-icon">${renderCharacterThumbnail(kid)}</div>
              <div class="quest-info"><strong>${escapeHtml(kid.name || kid.kidId)}</strong><span>${escapeHtml(kid.kidId)} • ${kid.pinConfigured || kid.pinHash ? 'PIN set' : 'PIN not set'}</span><small class="status ${kid.active === false ? 'status-pending' : 'status-ready'}">${kid.active === false ? 'Disabled' : 'Active'}</small></div>
              <div class="parent-buttons family-account-actions" style="grid-column:1 / -1; display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; width:100%; margin-top:8px;">
                <button class="edit-kid-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}">✏️ Edit Profile</button>
                <button class="set-pin-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}">🔢 Set / Reset PIN</button>
                <button class="copy-link-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}">🔗 Copy Direct Link</button>
                <button class="toggle-kid-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}" data-active="${kid.active !== false}">${kid.active === false ? 'Enable Profile' : 'Disable Profile'}</button>
              </div>
            </div>`).join('')}
        </section>
        <button id="newKidBtn" type="button" style="width:100%; margin-bottom:12px;">➕ Create Child Profile</button>
        <button id="familyBackBtn" type="button" style="width:100%;">← Back to Guild Hall</button>
      </main>`;
    attachSignOutEvent();
    document.querySelectorAll('.edit-kid-btn').forEach(button => button.addEventListener('click', () => loadEditKidForm(button.dataset.kidId, user)));
    document.querySelectorAll('.set-pin-btn').forEach(button => button.addEventListener('click', () => loadPinForm(button.dataset.kidId, user)));
    document.querySelectorAll('.copy-link-btn').forEach(button => button.addEventListener('click', async () => {
      const url = `${window.location.origin}${window.location.pathname}?kid=${encodeURIComponent(button.dataset.kidId)}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast('Child link copied!');
      } catch {
        window.prompt('Copy this child link:', url);
      }
    }));
    document.querySelectorAll('.toggle-kid-btn').forEach(button => button.addEventListener('click', async () => {
      await updateDoc(doc(db, 'kids', button.dataset.kidId), { active: button.dataset.active !== 'true' });
      await loadFamilyAccounts(user);
    }));
    document.getElementById('newKidBtn').addEventListener('click', () => loadNewKidForm(user, kids));
    document.getElementById('familyBackBtn').addEventListener('click', () => { window.history.pushState({}, document.title, window.location.pathname); loadParentDashboard(user); });
  } catch (err) { showError('Family accounts error: ' + err.message); }
}

async function loadEditKidForm(kidId, user) {
  if (!isParentUser(user)) { await loadUserDashboard(null); return; }
  try {
    const kidSnap = await getDoc(doc(db, 'kids', kidId));
    if (!kidSnap.exists()) { showError('Profile not found.'); return; }
    const kid = kidSnap.data();
    document.body.innerHTML = `
      <main class="app">${renderSignOutHeader(user)}
        <header class="hero compact"><div class="logo">✏️</div><h1>Edit Child Profile</h1><p>${escapeHtml(kid.name || kidId)}</p></header>
        <section class="card form-card">
          <div class="form-field"><label for="editKidName">Name</label><input id="editKidName" value="${escapeAttribute(kid.name || '')}"></div>
          <div class="form-field"><label for="editKidAvatar">Avatar Emoji</label><input id="editKidAvatar" value="${escapeAttribute(kid.avatar || '🧙')}"></div>
          <div class="form-field"><label for="editKidPortrait">Portrait Filename</label><input id="editKidPortrait" value="${escapeAttribute(kid.portraitFile || '')}" placeholder="cammron-character.webp"></div>
          <div class="form-field"><label for="editKidClass">Class Title</label><input id="editKidClass" value="${escapeAttribute(kid.classTitle || 'Adventurer')}"></div>
          <div class="form-field"><label for="editKidPath">Class Path</label><input id="editKidPath" value="${escapeAttribute(kid.classPath || '')}"></div>
          <div class="form-field"><label for="editKidStreakMode">Streak Rule</label><select id="editKidStreakMode">
            <option value="main" ${getKidStreakMode({ ...kid, kidId }) === 'main' ? 'selected' : ''}>Complete all scheduled Main Quests</option>
            <option value="participation" ${getKidStreakMode({ ...kid, kidId }) === 'participation' ? 'selected' : ''}>Any approved quest or helper participation</option>
          </select></div>
          <div class="form-field"><label>Direct Link</label><input value="${escapeAttribute(`${window.location.origin}${window.location.pathname}?kid=${kidId}`)}" readonly></div>
          <button id="saveKidChangesBtn" type="button">Save Profile</button>
          <button id="cancelKidChangesBtn" type="button">Cancel</button>
        </section>
      </main>`;
    attachSignOutEvent();
    document.getElementById('saveKidChangesBtn').addEventListener('click', async () => {
      const name = document.getElementById('editKidName').value.trim();
      if (!name) { alert('Enter a name.'); return; }
      await updateDoc(doc(db, 'kids', kidId), {
        name,
        avatar: document.getElementById('editKidAvatar').value.trim() || '🧙',
        portraitFile: document.getElementById('editKidPortrait').value.trim(),
        classTitle: document.getElementById('editKidClass').value.trim() || 'Adventurer',
        classPath: document.getElementById('editKidPath').value.trim(),
        streakMode: document.getElementById('editKidStreakMode').value,
        profileUpdatedAt: new Date().toISOString()
      });
      await loadFamilyAccounts(user);
    });
    document.getElementById('cancelKidChangesBtn').addEventListener('click', () => loadFamilyAccounts(user));
  } catch (err) {
    showError('Could not edit child profile: ' + err.message);
  }
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
    await setChildPinCall({ kidId, pin });
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
        <div class="form-field"><label>Portrait Filename (optional)</label><input id="newKidPortrait" placeholder="new-character.webp"></div>
        <div class="form-field"><label>Class Title</label><input id="newKidClass" value="Adventurer" placeholder="Unicorn Princess, Dragon Prince..."></div>
        <div class="form-field"><label>Class Path</label><input id="newKidPath" placeholder="Sparkle Keeper → Rainbow Guardian"></div>
        <div class="form-field"><label>Streak Rule</label><select id="newKidStreakMode">
          <option value="main">Complete all scheduled Main Quests</option>
          <option value="participation">Any approved quest or helper participation</option>
        </select></div>
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
      portraitFile: document.getElementById('newKidPortrait').value.trim(),
      classTitle: document.getElementById('newKidClass').value.trim() || 'Adventurer',
      classPath: document.getElementById('newKidPath').value.trim(),
      streakMode: document.getElementById('newKidStreakMode').value,
      level: 1, xp: 0, gold: 0, currentStreak: 0, bestStreak: 0, lastStreakDate: '', lifetimeQuests: 0,
      active: true,
      pinConfigured: false,
      createdAt: new Date().toISOString()
    });
    await setChildPinCall({ kidId, pin });
    await loadFamilyAccounts(user);
  });
  document.getElementById('cancelKidBtn').addEventListener('click', () => loadFamilyAccounts(user));
}

/* -------------------------------------------------
   QUEST MANAGER
------------------------------------------------- */

function renderQuestScheduleEditor(quest = {}, quests = [], editingQuestId = "") {
  const scheduleType = getQuestScheduleType(quest);
  const intervalDays = getQuestIntervalDays(quest);
  const parentOptions = quests
    .filter(item => item.questId !== editingQuestId && item.archived !== true)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    .map(item => `<option value="${escapeAttribute(item.questId)}" ${quest.parentQuestId === item.questId ? "selected" : ""}>${escapeHtml(item.name || "Unnamed quest")}</option>`)
    .join("");

  return `
    ${formField("Subtask of (optional)", `
      <select id="questParent">
        <option value="">No parent — top-level task</option>
        ${parentOptions}
      </select>
    `)}

    ${formField("Repeat", `
      <select id="questScheduleType">
        <option value="interval" ${scheduleType === "interval" ? "selected" : ""}>Every X days</option>
        <option value="weekdays" ${scheduleType === "weekdays" ? "selected" : ""}>On selected weekdays</option>
        <option value="one-time" ${scheduleType === "one-time" ? "selected" : ""}>Does not repeat</option>
      </select>
    `)}

    <div id="intervalOptions">
      ${formField("Repeat every", `
        <div class="repeat-inline">
          <input id="questIntervalDays" type="number" min="1" max="365" value="${intervalDays}">
          <span>day${intervalDays === 1 ? "" : "s"}</span>
        </div>
      `)}
    </div>

    <div id="weekdayOptions" class="weekday-picker" hidden>
      ${weekdayCheckboxes(quest.weekdays || [])}
    </div>

    ${formField(`<span id="questDueDateLabel">${scheduleType === "one-time" ? "Due date" : "Start date"}</span>`,
      `<input id="questDueDate" type="date" value="${escapeAttribute(quest.dueDate || quest.startDate || getTodayKey())}">`,
      true
    )}

    ${formField("Due time", `<input id="questDueTime" type="time" value="${escapeAttribute(quest.dueTime || "")}">`)}

    ${formField("Notes", `<input id="questTime" value="${escapeAttribute(quest.time || "")}" placeholder="Optional note, e.g. before bed">`)}
  `;
}

function readQuestScheduleForm() {
  const scheduleType = document.getElementById("questScheduleType").value;
  const dueDate = document.getElementById("questDueDate").value;
  return {
    parentQuestId: document.getElementById("questParent").value || "",
    type: scheduleType,
    scheduleType,
    intervalDays: Math.max(1, Number(document.getElementById("questIntervalDays")?.value || 1)),
    weekdays: getSelectedWeekdays(),
    startDate: dueDate || getTodayKey(),
    dueDate,
    dueTime: document.getElementById("questDueTime").value,
    time: document.getElementById("questTime").value.trim()
  };
}

function renderQuestManagerRow(quest, allQuests, kidNames) {
  const byId = Object.fromEntries(allQuests.map(item => [item.questId, item]));
  const depth = questHierarchyDepth(quest, byId);
  const childCount = allQuests.filter(item => item.parentQuestId === quest.questId && item.archived !== true).length;
  return `
    <div class="task-manager-row ${quest.archived === true ? "archived" : ""}" style="--task-depth:${depth}">
      <div class="task-manager-main">
        <span class="task-manager-check">${quest.archived === true ? "📦" : depth ? "↳" : "○"}</span>
        <div class="task-manager-copy">
          <strong>${escapeHtml(quest.name || "Unnamed quest")}</strong>
          <span>${escapeHtml(scheduleLabel(quest))} • ${escapeHtml(dueLabel(quest))}</span>
          <small>${escapeHtml(kidNames[quest.kidId] || quest.kidId || "Unassigned")} • ${escapeHtml(questFoodTierLabel(quest))}${childCount ? ` • ${childCount} subtask${childCount === 1 ? "" : "s"}` : ""}</small>
        </div>
      </div>
      <div class="task-manager-actions">
        <button class="add-subtask-btn" type="button" data-parent-quest-id="${escapeAttribute(quest.questId)}" ${quest.archived === true ? "disabled" : ""} title="Add subtask">＋</button>
        <button class="edit-quest-btn" type="button" data-quest-id="${escapeAttribute(quest.questId)}" ${quest.archived === true ? "disabled" : ""} title="Edit">✏️</button>
        <button class="archive-quest-btn" type="button" data-quest-id="${escapeAttribute(quest.questId)}" data-archived="${quest.archived === true ? "true" : "false"}" title="${quest.archived === true ? "Restore" : "Archive"}">${quest.archived === true ? "♻️" : "📦"}</button>
        <button class="delete-quest-btn" type="button" data-quest-id="${escapeAttribute(quest.questId)}" data-quest-name="${escapeAttribute(quest.name || "Unnamed quest")}" title="Delete">🗑️</button>
      </div>
    </div>`;
}

async function loadQuestManager(user) {
  setAppTheme("parent");
  const email = String(user?.email || "").toLowerCase();

  if (email !== ADMIN_EMAIL) {
    showError("Only the Guild Master can manage quest blueprints.");
    return;
  }

  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact">
        <div class="logo">📋</div>
        <h1>Tasks</h1>
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
      kidNames[ANYONE_ID] = "Anyone";
    });

    const quests = [];

    questSnap.forEach(docSnap => {
      quests.push({
        questId: docSnap.id,
        ...docSnap.data()
      });
    });

    const orderedQuests = sortQuestsForManager(quests);

    const activeCount = quests.filter(quest => quest.archived !== true).length;
    const archivedCount = quests.length - activeCount;

    document.body.innerHTML = `
      <main class="app">
        ${renderSignOutHeader(user)}

        <header class="hero compact">
          <div class="logo">📋</div>
          <h1>Tasks</h1>
          <p>
            ${activeCount} active task${activeCount === 1 ? "" : "s"}
            • ${archivedCount} archived
          </p>
        </header>

        <section class="card">
          ${
            quests.length === 0
              ? "<p>No tasks have been created yet.</p>"
              : `<div class="task-manager-list">${orderedQuests.map(quest => renderQuestManagerRow(quest, quests, kidNames)).join("")}</div>`
          }
        </section>

        <button
          id="newQuestBtn"
          type="button"
          style="width:100%; margin-bottom:15px;"
        >
          ＋ New task
        </button>

        <button id="backToGuildHallBtn" type="button">
          ← Back to Guild Hall
        </button>
      </main>
    `;

    attachSignOutEvent();

    document.querySelectorAll(".add-subtask-btn").forEach(button => {
      button.addEventListener("click", () => {
        loadNewQuestForm(button.dataset.parentQuestId);
      });
    });

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
        loadNewQuestForm("");
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
  setAppTheme("parent");
  try {
    const [questSnap, kidsSnap, allQuestSnap] = await Promise.all([
      getDoc(doc(db, "quests", questId)),
      getDocs(collection(db, "kids")),
      getDocs(collection(db, "quests"))
    ]);

    if (!questSnap.exists()) {
      showError("Quest not found.");
      return;
    }

    const quest = { questId, ...questSnap.data() };
    if (quest.archived === true) {
      alert("Restore this quest before editing it.");
      await loadQuestManager(auth.currentUser);
      return;
    }

    const kids = [];
    kidsSnap.forEach(docSnap => kids.push({ kidId: docSnap.id, ...docSnap.data() }));
    const allQuests = [];
    allQuestSnap.forEach(docSnap => allQuests.push({ questId: docSnap.id, ...docSnap.data() }));

    document.body.innerHTML = `
      <main class="app task-editor-app">
        ${renderSignOutHeader(auth.currentUser)}
        <header class="hero compact task-editor-hero">
          <div class="logo">✓</div>
          <h1>Edit task</h1>
          <p>Set assignment, recurrence, subtasks, and reward.</p>
        </header>

        <section class="card form-card task-editor-card">
          ${formField("Task name", `<input id="questName" value="${escapeAttribute(quest.name || "")}" placeholder="Task name">`)}

          ${formField("Assigned to", `
            <select id="questKid">
              <option value="ANYONE" ${quest.kidId === ANYONE_ID ? "selected" : ""}>Anyone</option>
              ${kids.map(kid => `<option value="${escapeAttribute(kid.kidId)}" ${quest.kidId === kid.kidId ? "selected" : ""}>${escapeHtml(kid.name || kid.kidId)}</option>`).join("")}
            </select>
          `)}

          ${renderQuestScheduleEditor(quest, allQuests, questId)}

          ${formField("Adventure food reward", `
            <select id="questFoodTier">
              <option value="small" ${questFoodTier(quest) === "small" ? "selected" : ""}>Small snack</option>
              <option value="medium" ${questFoodTier(quest) === "medium" ? "selected" : ""}>Medium snack</option>
              <option value="large" ${questFoodTier(quest) === "large" ? "selected" : ""}>Large snack</option>
            </select>
          `)}

          <label class="task-toggle"><input id="questAllowHelpers" type="checkbox" ${quest.allowHelpers !== false ? "checked" : ""}><span>Allow helpers</span></label>
          <label class="task-toggle"><input id="questActive" type="checkbox" ${quest.active !== false ? "checked" : ""}><span>Active</span></label>

          <button id="saveQuestBtn" type="button" class="task-primary-btn">Save task</button>
        </section>

        <button id="cancelEditBtn" type="button">← Cancel</button>
      </main>`;

    attachSignOutEvent();
    attachScheduleFormBehavior();

    document.getElementById("saveQuestBtn").addEventListener("click", async () => {
      const name = document.getElementById("questName").value.trim();
      if (!name) {
        alert("Please enter a task name.");
        return;
      }

      const schedule = readQuestScheduleForm();
      if (schedule.scheduleType === "weekdays" && schedule.weekdays.length === 0) {
        alert("Choose at least one weekday.");
        return;
      }

      if (schedule.parentQuestId === questId) {
        alert("A task cannot be its own parent.");
        return;
      }

      try {
        await updateDoc(doc(db, "quests", questId), {
          name,
          kidId: document.getElementById("questKid").value,
          ...schedule,
          foodTier: document.getElementById("questFoodTier").value,
          active: document.getElementById("questActive").checked,
          allowHelpers: document.getElementById("questAllowHelpers").checked,
          updatedAt: new Date().toISOString()
        });
        await loadQuestManager(auth.currentUser);
      } catch (err) {
        showError("Could not save task: " + err.message);
      }
    });

    document.getElementById("cancelEditBtn").addEventListener("click", () => loadQuestManager(auth.currentUser));
  } catch (err) {
    showError("Edit task error: " + err.message);
  }
}

async function loadNewQuestForm(parentQuestId = "") {
  setAppTheme("parent");
  try {
    const [kidsSnap, allQuestSnap] = await Promise.all([
      getDocs(collection(db, "kids")),
      getDocs(collection(db, "quests"))
    ]);

    const kids = [];
    kidsSnap.forEach(docSnap => kids.push({ kidId: docSnap.id, ...docSnap.data() }));
    const allQuests = [];
    allQuestSnap.forEach(docSnap => allQuests.push({ questId: docSnap.id, ...docSnap.data() }));
    const today = getTodayKey();

    document.body.innerHTML = `
      <main class="app task-editor-app">
        ${renderSignOutHeader(auth.currentUser)}
        <header class="hero compact task-editor-hero">
          <div class="logo">＋</div>
          <h1>New task</h1>
          <p>Create a one-time or repeating household task.</p>
        </header>

        <section class="card form-card task-editor-card">
          ${formField("Task name", `<input id="questName" placeholder="e.g. Check cat litter">`)}

          ${formField("Assigned to", `
            <select id="questKid">
              <option value="ANYONE">Anyone</option>
              ${kids.map(kid => `<option value="${escapeAttribute(kid.kidId)}">${escapeHtml(kid.name || kid.kidId)}</option>`).join("")}
            </select>
          `)}

          ${renderQuestScheduleEditor({ scheduleType: "interval", intervalDays: 1, startDate: today, dueDate: today, parentQuestId }, allQuests)}

          ${formField("Adventure food reward", `
            <select id="questFoodTier">
              <option value="small">Small snack</option>
              <option value="medium" selected>Medium snack</option>
              <option value="large">Large snack</option>
            </select>
          `)}

          <label class="task-toggle"><input id="questAllowHelpers" type="checkbox" checked><span>Allow helpers</span></label>
          <label class="task-toggle"><input id="questActive" type="checkbox" checked><span>Active</span></label>

          <button id="createQuestBtn" type="button" class="task-primary-btn">Create task</button>
        </section>

        <button id="cancelNewQuestBtn" type="button">← Cancel</button>
      </main>`;

    attachSignOutEvent();
    attachScheduleFormBehavior();

    document.getElementById("createQuestBtn").addEventListener("click", async () => {
      const name = document.getElementById("questName").value.trim();
      if (!name) {
        alert("Please enter a task name.");
        return;
      }

      const schedule = readQuestScheduleForm();
      if (schedule.scheduleType === "weekdays" && schedule.weekdays.length === 0) {
        alert("Choose at least one weekday.");
        return;
      }

      try {
        await addDoc(collection(db, "quests"), {
          name,
          kidId: document.getElementById("questKid").value,
          ...schedule,
          foodTier: document.getElementById("questFoodTier").value,
          xp: 0,
          gold: 0,
          helperBonus: 0,
          active: document.getElementById("questActive").checked,
          allowHelpers: document.getElementById("questAllowHelpers").checked,
          archived: false,
          status: "Ready",
          completedBy: "",
          lastResetDate: getTodayKey(),
          lastResetPeriod: "",
          createdAt: new Date().toISOString()
        });
        await loadQuestManager(auth.currentUser);
      } catch (err) {
        showError("Error creating task: " + err.message);
      }
    });

    document.getElementById("cancelNewQuestBtn").addEventListener("click", () => loadQuestManager(auth.currentUser));
  } catch (err) {
    showError("Could not open new task form: " + err.message);
  }
}

function formField(label, controlHtml, rawLabel = false) {
  return `
    <div class="form-field">
      <label>${rawLabel ? label : escapeHtml(label)}</label>
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
    const redirectResult = await getRedirectResult(auth);

    if (redirectResult?.user) {
      if (!isParentUser(redirectResult.user)) {
        await signOut(auth);
        showError("That Google account is not authorized as a parent.");
        return;
      }

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      await loadParentDashboard(redirectResult.user);
      return;
    }
  } catch (err) {
    console.error("Redirect sign-in failed:", err);
  }

  initializeAuthRouter();
});