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
  signInWithRedirect,
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
const KID_UNLOCK_TIME_KEY = "chorequestUnlockedAt";
const KID_SESSION_MINUTES = 30;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;
const ANYONE_ID = "ANYONE";


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
  copper: { name: "Copper", tradeValue: 1, multiplier: 1, color: "#b87333", glow: "rgba(184,115,51,.35)" },
  iron: { name: "Iron", tradeValue: 2, multiplier: 2, color: "#8b949e", glow: "rgba(139,148,158,.35)" },
  silver: { name: "Silver", tradeValue: 4, multiplier: 3, color: "#d7e1ea", glow: "rgba(215,225,234,.4)" },
  gold: { name: "Gold", tradeValue: 8, multiplier: 5, color: "#f6c945", glow: "rgba(246,201,69,.45)" },
  mythril: { name: "Mythril", tradeValue: 16, multiplier: 7, color: "#72e7ff", glow: "rgba(114,231,255,.5)" }
};

const ITEM_TYPES = {
  wizard_hat: { name: "Wizard Hat", slot: "head", icon: "🧙", bonuses: { wisdom: 1, luck: 1 } },
  knight_helmet: { name: "Knight Helmet", slot: "head", icon: "🪖", bonuses: { strength: 1, courage: 1 } },
  adventure_tunic: { name: "Adventure Tunic", slot: "body", icon: "🥋", bonuses: { courage: 1, kindness: 1 } },
  guardian_armor: { name: "Guardian Armor", slot: "body", icon: "🛡️", bonuses: { strength: 1, kindness: 1 } },
  swift_boots: { name: "Swift Boots", slot: "feet", icon: "👢", bonuses: { agility: 1, luck: 1 } },
  royal_boots: { name: "Royal Boots", slot: "feet", icon: "🥾", bonuses: { courage: 1, luck: 1 } },
  lucky_amulet: { name: "Lucky Amulet", slot: "accessory", icon: "📿", bonuses: { luck: 2 } },
  heart_charm: { name: "Heart Charm", slot: "accessory", icon: "💖", bonuses: { kindness: 2 } },
  hero_cape: { name: "Hero Cape", slot: "cape", icon: "🦸", bonuses: { courage: 2 } },
  moon_cape: { name: "Moon Cape", slot: "cape", icon: "🌙", bonuses: { wisdom: 1, luck: 1 } },
  wooden_wand: { name: "Wooden Wand", slot: "tool", icon: "🪄", bonuses: { wisdom: 2 } },
  training_sword: { name: "Training Sword", slot: "tool", icon: "🗡️", bonuses: { strength: 2 } },
  tiny_dragon: { name: "Tiny Dragon", slot: "companion", icon: "🐉", bonuses: { courage: 1, luck: 1 } },
  baby_unicorn: { name: "Baby Unicorn", slot: "companion", icon: "🦄", bonuses: { kindness: 1, luck: 1 } }
};

const EQUIPMENT_SLOTS = {
  head: "Head",
  body: "Body",
  feet: "Feet",
  accessory: "Accessory",
  cape: "Cape",
  tool: "Weapon / Tool",
  companion: "Companion"
};

function createItem(itemType, grade = "copper") {
  const def = ITEM_TYPES[itemType];
  const gradeDef = ITEM_GRADES[grade] || ITEM_GRADES.copper;
  return {
    instanceId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    itemType,
    name: `${gradeDef.name} ${def.name}`,
    slot: def.slot,
    grade,
    tradeValue: gradeDef.tradeValue,
    bonuses: Object.fromEntries(Object.entries(def.bonuses).map(([key, value]) => [key, value * gradeDef.multiplier])),
    equipped: false,
    tradeable: true
  };
}

function starterInventory() {
  return [
    createItem("wizard_hat", "copper"),
    createItem("swift_boots", "iron"),
    createItem("lucky_amulet", "silver"),
    createItem("hero_cape", "copper"),
    createItem("training_sword", "copper")
  ];
}

async function ensureInventoryInitialized(kid) {
  if (kid.inventoryVersion >= 1 && Array.isArray(kid.inventory) && kid.equipment && typeof kid.equipment === "object") return kid;
  const inventory = Array.isArray(kid.inventory) ? kid.inventory : starterInventory();
  const equipment = kid.equipment && typeof kid.equipment === "object" ? kid.equipment : {};
  await updateDoc(doc(db, "kids", kid.kidId), {
    inventory,
    equipment,
    inventoryVersion: 1
  });
  return { ...kid, inventory, equipment, inventoryVersion: 1 };
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

function itemIcon(item) {
  return ITEM_TYPES[item?.itemType]?.icon || "🎁";
}

function gradePalette(grade) {
  const palettes = {
    copper: { main: "#b87333", light: "#e3a56a", dark: "#74421f", glow: "rgba(184,115,51,.35)" },
    iron: { main: "#727b86", light: "#b9c0c8", dark: "#3e4650", glow: "rgba(185,192,200,.3)" },
    silver: { main: "#c9d5e3", light: "#f3f7ff", dark: "#74859a", glow: "rgba(201,213,227,.4)" },
    gold: { main: "#e5b93f", light: "#ffe98a", dark: "#8d6514", glow: "rgba(255,214,79,.45)" },
    mythril: { main: "#6dd8e8", light: "#d7fbff", dark: "#267f97", glow: "rgba(109,216,232,.55)" }
  };
  return palettes[grade] || palettes.copper;
}

function avatarLayerForItem(item) {
  if (!item) return "";

  const palette = gradePalette(item.grade);
  const label = escapeAttribute(item.name || "Equipped item");

  // Every item is drawn on the same 520 x 640 coordinate system as the mannequin.
  // The character uses a relaxed three-quarter pose so both hands remain available.

  if (item.slot === "cape") {
    return `<g aria-label="${label}" data-slot="cape" filter="url(#gearShadow)">
      <path d="M190 190 C159 223 148 321 156 470 C181 505 210 510 238 492 L248 224 C225 216 207 205 190 190Z"
        fill="url(#capeLeft-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
      <path d="M286 191 C318 217 350 286 363 445 C340 485 310 501 278 492 L267 224 C276 216 281 204 286 191Z"
        fill="url(#capeRight-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
      <path d="M191 190 Q238 220 286 191" fill="none" stroke="${palette.light}" stroke-width="8" opacity=".7"/>
      <path d="M170 250 Q180 372 173 454 M343 250 Q330 363 342 438" fill="none" stroke="${palette.light}" stroke-width="4" opacity=".35"/>
    </g>`;
  }

  if (item.slot === "body") {
    const armor = item.itemType === "guardian_armor";
    return armor
      ? `<g aria-label="${label}" data-slot="body" filter="url(#gearShadow)">
          <path d="M205 195 Q228 174 251 188 Q276 172 307 197 L320 327 Q284 360 235 349 Q207 345 190 323Z"
            fill="url(#metal-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
          <path d="M227 187 Q251 219 276 184" fill="none" stroke="${palette.light}" stroke-width="7"/>
          <path d="M252 210 V343 M202 260 Q251 281 311 254" fill="none" stroke="${palette.dark}" stroke-width="5" opacity=".65"/>
          <circle cx="254" cy="254" r="19" fill="${palette.light}" stroke="${palette.dark}" stroke-width="5"/>
          <path d="M245 254 L252 262 L266 245" fill="none" stroke="${palette.dark}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`
      : `<g aria-label="${label}" data-slot="body" filter="url(#gearShadow)">
          <path d="M205 194 Q227 176 251 188 Q276 174 306 197 L317 329 Q282 355 236 348 Q207 344 192 322Z"
            fill="url(#cloth-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
          <path d="M227 187 Q252 218 276 184" fill="none" stroke="${palette.light}" stroke-width="7"/>
          <path d="M211 272 Q254 294 307 269" fill="none" stroke="${palette.light}" stroke-width="4" opacity=".55"/>
          <path d="M252 210 V341" stroke="${palette.dark}" stroke-width="4" opacity=".45"/>
        </g>`;
  }

  if (item.slot === "feet") {
    return `<g aria-label="${label}" data-slot="feet" filter="url(#gearShadow)">
      <path d="M210 434 C214 420 245 418 251 434 L247 522 C243 545 217 553 190 545 C178 538 183 525 195 513Z"
        fill="url(#leather-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
      <path d="M271 430 C279 418 309 420 315 436 L326 510 C347 522 348 540 330 547 C301 554 276 543 270 522Z"
        fill="url(#leather-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
      <path d="M203 450 Q229 462 249 449 M276 447 Q300 459 318 448" fill="none" stroke="${palette.light}" stroke-width="7" opacity=".75"/>
      <path d="M188 522 Q219 537 247 518 M273 518 Q303 537 335 520" fill="none" stroke="${palette.dark}" stroke-width="8"/>
      <path d="M214 473 H244 M279 471 H319" stroke="${palette.light}" stroke-width="4" opacity=".42"/>
    </g>`;
  }

  if (item.slot === "accessory") {
    const charmMarkup = item.itemType === "heart_charm"
      ? `<path d="M255 264 C238 253 241 239 251 239 C256 239 259 242 261 246 C263 242 267 239 272 239 C282 239 285 253 268 264 L261 270Z" fill="${palette.dark}"/>`
      : `<path d="M255 238 L268 253 L255 268 L242 253Z" fill="${palette.dark}"/>`;
    return `<g aria-label="${label}" data-slot="accessory" filter="url(#gearShadow)">
      <path d="M226 197 Q252 255 284 192" fill="none" stroke="${palette.light}" stroke-width="5"/>
      <circle cx="255" cy="253" r="18" fill="url(#metal-${item.grade})" stroke="${palette.light}" stroke-width="4"/>
      ${charmMarkup}
    </g>`;
  }

  if (item.slot === "head") {
    const isWizard = item.itemType === "wizard_hat";
    return isWizard
      ? `<g aria-label="${label}" data-slot="head" filter="url(#gearShadow)">
          <path d="M241 -4 C266 13 286 40 291 70 C267 57 243 57 220 70 C225 40 231 14 241 -4Z"
            fill="url(#cloth-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
          <path d="M224 47 Q257 65 286 44" fill="none" stroke="${palette.light}" stroke-width="6" opacity=".5"/>
          <path d="M183 79 C202 63 288 59 327 79 C338 85 335 98 322 102 C278 114 211 114 177 99 C166 94 170 84 183 79Z"
            fill="url(#cloth-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
          <path d="M185 85 Q252 103 324 82" fill="none" stroke="${palette.light}" stroke-width="4" opacity=".42"/>
        </g>`
      : `<g aria-label="${label}" data-slot="head" filter="url(#gearShadow)">
          <path d="M199 88 C201 46 308 42 316 87 L300 106 C270 115 225 112 195 100Z"
            fill="url(#metal-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
          <path d="M258 49 V106" stroke="${palette.light}" stroke-width="6" opacity=".7"/>
          <path d="M205 90 Q254 105 308 87" fill="none" stroke="${palette.dark}" stroke-width="6"/>
          <path d="M203 95 L192 132 M307 91 L319 126" stroke="${palette.main}" stroke-width="13" stroke-linecap="round"/>
        </g>`;
  }

  if (item.slot === "tool") {
    const wand = item.itemType === "wooden_wand";
    return wand
      ? `<g aria-label="${label}" data-slot="tool" filter="url(#gearShadow)">
          <g transform="rotate(-18 437 292)">
            <rect x="432" y="193" width="11" height="124" rx="5" fill="${palette.dark}"/>
            <circle cx="438" cy="182" r="15" fill="url(#metal-${item.grade})" stroke="${palette.light}" stroke-width="5"/>
            <path d="M438 151 L445 170 L465 170 L449 181 L455 201 L438 189 L421 201 L427 181 L411 170 L431 170Z" fill="${palette.light}"/>
          </g>
        </g>`
      : `<g aria-label="${label}" data-slot="tool" filter="url(#gearShadow)">
          <g transform="rotate(18 435 304)">
            <rect x="429" y="290" width="13" height="54" rx="6" fill="${palette.dark}"/>
            <circle cx="435" cy="338" r="8" fill="${palette.main}" stroke="${palette.light}" stroke-width="3"/>
            <rect x="405" y="281" width="61" height="12" rx="6" fill="${palette.main}" stroke="${palette.light}" stroke-width="3"/>
            <path d="M435 282 L419 130 L435 92 L451 130Z" fill="url(#metal-${item.grade})" stroke="${palette.dark}" stroke-width="5"/>
            <path d="M435 110 V270" stroke="white" stroke-width="4" opacity=".55"/>
          </g>
        </g>`;
  }

  if (item.slot === "companion") {
    return `<g aria-label="${label}" data-slot="companion" filter="url(#gearShadow)">
      <ellipse cx="447" cy="488" rx="43" ry="38" fill="url(#cloth-${item.grade})" stroke="${palette.light}" stroke-width="5"/>
      <text x="447" y="502" text-anchor="middle" font-size="43">${itemIcon(item)}</text>
    </g>`;
  }

  return "";
}

function renderVectorLayeredAvatar(kid, equipment) {
  const skin = kid.avatarSkinColor || "#efb17e";
  const skinLight = "#ffd0a5";
  const skinShadow = "#cf8355";
  const hair = kid.avatarHairColor || "#5b3525";
  const hairLight = "#8a5635";
  const hasMythril = Object.values(equipment || {}).some(item => item?.grade === "mythril");
  const glow = hasMythril
    ? "drop-shadow(0 0 20px rgba(109,216,232,.52))"
    : "drop-shadow(0 18px 28px rgba(0,0,0,.34))";
  const childName = String(kid.name || kid.displayName || "").trim().toLowerCase();
  const handedness = kid.handedness || (childName === "wesley" ? "left" : "right");
  const mirrorTransform = handedness === "left" ? "translate(520 0) scale(-1 1)" : "";

  const equippedGrades = [...new Set(Object.values(equipment || {}).map(item => item?.grade).filter(Boolean))];
  const gradientGrades = [...new Set(["copper", "iron", "silver", "gold", "mythril", ...equippedGrades])];
  const gradientDefs = gradientGrades.map(grade => {
    const p = gradePalette(grade);
    return `
      <linearGradient id="metal-${grade}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p.light}"/><stop offset=".48" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/>
      </linearGradient>
      <linearGradient id="cloth-${grade}" x1="0" y1="0" x2=".9" y2="1">
        <stop offset="0" stop-color="${p.light}"/><stop offset=".32" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/>
      </linearGradient>
      <linearGradient id="leather-${grade}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p.light}"/><stop offset=".28" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/>
      </linearGradient>
      <linearGradient id="capeLeft-${grade}" x1="0" y1="0" x2="1" y2=".2">
        <stop offset="0" stop-color="${p.dark}"/><stop offset=".55" stop-color="${p.main}"/><stop offset="1" stop-color="${p.light}"/>
      </linearGradient>
      <linearGradient id="capeRight-${grade}" x1="0" y1="0" x2="1" y2=".2">
        <stop offset="0" stop-color="${p.light}"/><stop offset=".45" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/>
      </linearGradient>`;
  }).join("");

  return `
    <div aria-label="Illustrated layered character avatar" style="width:min(100%,420px);margin:4px auto 0;filter:${glow};">
      <svg viewBox="0 0 520 640" role="img" aria-label="Relaxed three-quarter character wearing equipped items" style="display:block;width:100%;height:auto;overflow:visible;">
        <defs>
          <filter id="gearShadow" x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".38"/>
          </filter>
          <filter id="bodyShadow" x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".28"/>
          </filter>
          <linearGradient id="skinBase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${skinLight}"/><stop offset=".5" stop-color="${skin}"/><stop offset="1" stop-color="${skinShadow}"/>
          </linearGradient>
          <linearGradient id="tankTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f6f7fb"/><stop offset="1" stop-color="#cfd5df"/>
          </linearGradient>
          <linearGradient id="hairBase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${hairLight}"/><stop offset=".5" stop-color="${hair}"/><stop offset="1" stop-color="#321d17"/>
          </linearGradient>
          ${gradientDefs}
        </defs>

        <g${mirrorTransform ? ` transform="${mirrorTransform}"` : ""}>
          ${avatarLayerForItem(equipment?.cape)}

          <g data-layer="base-mannequin" filter="url(#bodyShadow)">
            <!-- rear leg for three-quarter stance -->
            <path d="M267 345 C286 342 302 352 306 374 L314 493 C313 517 297 529 279 522 L261 385 C257 363 257 350 267 345Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <path d="M282 500 C306 499 332 511 338 528 C342 541 327 548 302 546 C277 545 263 538 265 525Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>

            <!-- front leg -->
            <path d="M222 345 C241 342 258 351 260 375 L251 501 C248 520 232 530 214 521 L203 383 C201 362 207 350 222 345Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <path d="M217 500 C239 503 253 514 254 529 C254 541 238 547 211 545 C186 543 174 535 181 522 C189 508 199 501 217 500Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>

            <!-- neck -->
            <path d="M231 164 C231 184 236 195 251 199 C268 198 278 184 276 163Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>

            <!-- relaxed off-hand arm, held away from body -->
            <path d="M201 207 C181 204 169 215 165 235 L148 329 C146 349 155 364 170 367 C185 369 194 357 194 340 L210 248 C214 224 212 211 201 207Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <path d="M158 345 C148 360 150 382 165 391 C179 400 194 389 194 370 C192 352 180 341 158 345Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <path d="M163 370 Q174 378 187 369" fill="none" stroke="${skinShadow}" stroke-width="3" opacity=".6"/>

            <!-- main-hand arm angled outward -->
            <path d="M304 207 C324 202 340 211 349 229 L382 271 C395 286 397 300 387 309 C376 319 362 313 350 301 L311 260 C295 241 292 216 304 207Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <path d="M381 271 C398 270 420 283 434 299 C443 310 442 324 432 332 C420 340 408 333 398 321 L376 305 C364 294 367 276 381 271Z"
              fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <path d="M410 306 Q420 310 431 305" fill="none" stroke="${skinShadow}" stroke-width="3" opacity=".55"/>

            <!-- fitted tank top painted into the mannequin -->
            <path d="M205 197 Q226 179 238 191 Q251 204 264 190 Q279 178 305 199 L314 327 Q286 351 250 350 Q219 350 194 326Z"
              fill="url(#tankTop)" stroke="#d5dae4" stroke-width="4"/>
            <path d="M229 190 Q251 221 275 188" fill="none" stroke="#c7ccd7" stroke-width="5"/>
            <path d="M204 255 Q250 274 309 250" fill="none" stroke="#ffffff" stroke-width="5" opacity=".45"/>
            <path d="M205 312 Q252 329 309 307" fill="none" stroke="#bdc4d0" stroke-width="3" opacity=".45"/>

            <!-- fitted briefs painted into the mannequin -->
            <path d="M196 323 Q251 343 316 321 L306 376 Q280 389 258 371 L246 358 L233 374 Q215 389 202 373Z"
              fill="url(#tankTop)" stroke="#cfd5df" stroke-width="4"/>
            <path d="M205 337 Q253 354 307 335" fill="none" stroke="#bfc6d2" stroke-width="3"/>
            <path d="M246 352 V374" stroke="#c3cad6" stroke-width="3"/>

            <!-- face and ears -->
            <ellipse cx="250" cy="115" rx="69" ry="73" fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <ellipse cx="184" cy="121" rx="15" ry="22" fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <ellipse cx="313" cy="116" rx="14" ry="21" fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>

            <!-- illustrated hair -->
            <path d="M183 108 C181 61 208 35 253 38 C292 39 316 62 318 102 C303 84 288 73 273 68 C266 84 248 93 228 88 C213 105 199 111 183 108Z"
              fill="url(#hairBase)" stroke="#392119" stroke-width="4"/>
            <path d="M207 55 Q237 43 263 54 M279 58 Q300 70 307 89" fill="none" stroke="${hairLight}" stroke-width="7" opacity=".55" stroke-linecap="round"/>
            <path d="M220 78 Q234 100 255 83 Q269 94 283 75" fill="url(#hairBase)"/>

            <!-- expressive face -->
            <path d="M207 110 Q223 101 238 109" fill="none" stroke="#4a2a22" stroke-width="5" stroke-linecap="round"/>
            <path d="M264 106 Q280 98 294 107" fill="none" stroke="#4a2a22" stroke-width="5" stroke-linecap="round"/>
            <ellipse cx="225" cy="122" rx="10" ry="13" fill="#ffffff"/>
            <ellipse cx="280" cy="118" rx="10" ry="13" fill="#ffffff"/>
            <ellipse cx="228" cy="123" rx="5" ry="8" fill="#2d201c"/>
            <ellipse cx="282" cy="119" rx="5" ry="8" fill="#2d201c"/>
            <circle cx="230" cy="120" r="2" fill="#ffffff"/>
            <circle cx="284" cy="116" r="2" fill="#ffffff"/>
            <path d="M255 122 Q260 137 251 141" fill="none" stroke="${skinShadow}" stroke-width="3" stroke-linecap="round"/>
            <path d="M229 151 Q251 167 276 148" fill="none" stroke="#8f4b42" stroke-width="4" stroke-linecap="round"/>
            <path d="M205 145 Q214 151 222 145 M286 141 Q296 146 303 139" fill="none" stroke="#e99a7c" stroke-width="3" opacity=".55"/>

            <!-- subtle anatomy and fabric highlights -->
            <path d="M177 235 Q190 246 201 239 M321 230 Q334 242 344 238" fill="none" stroke="${skinLight}" stroke-width="5" opacity=".42" stroke-linecap="round"/>
            <path d="M218 398 Q232 408 247 400 M273 396 Q290 407 304 397" fill="none" stroke="${skinLight}" stroke-width="5" opacity=".36" stroke-linecap="round"/>
          </g>

          ${avatarLayerForItem(equipment?.body)}
          ${avatarLayerForItem(equipment?.accessory)}
          ${avatarLayerForItem(equipment?.head)}
          ${avatarLayerForItem(equipment?.feet)}
          ${avatarLayerForItem(equipment?.tool)}

          <!-- Fingers over the equipped main-hand grip -->
          ${equipment?.tool ? `<g filter="url(#gearShadow)">
            <path d="M420 295 Q434 293 441 304 Q447 316 438 326 Q427 334 417 325 Q410 315 420 295Z" fill="url(#skinBase)" stroke="${skinShadow}" stroke-width="3"/>
            <path d="M420 305 Q431 310 440 305 M420 314 Q431 319 440 314" fill="none" stroke="${skinShadow}" stroke-width="2.5" opacity=".6"/>
          </g>` : ""}

          ${avatarLayerForItem(equipment?.companion)}
        </g>
      </svg>
    </div>`;
}

const ILLUSTRATED_AVATAR_ASSETS = {
  boy: "assets/avatar/boy-starter-full.png",
  girl: "assets/avatar/girl-starter-full.png"
};

const GIRL_AVATAR_NAMES = new Set(["ava", "autumn"]);
const BOY_AVATAR_NAMES = new Set(["wesley", "cammron", "cameron"]);

function getAvatarBodyType(kid) {
  const saved = String(kid?.avatarBodyType || "").toLowerCase();
  if (saved === "girl" || saved === "boy") return saved;
  const name = String(kid?.name || "").trim().toLowerCase();
  if (GIRL_AVATAR_NAMES.has(name)) return "girl";
  if (BOY_AVATAR_NAMES.has(name)) return "boy";
  return "boy";
}

function hasIllustratedStarterLoadout(equipment) {
  const required = {
    head: "wizard_hat",
    feet: "swift_boots",
    accessory: "lucky_amulet",
    cape: "hero_cape",
    tool: "training_sword"
  };
  return Object.entries(required).every(([slot, itemType]) => equipment?.[slot]?.itemType === itemType);
}

function renderIllustratedCompositeAvatar(kid) {
  const bodyType = getAvatarBodyType(kid);
  const asset = ILLUSTRATED_AVATAR_ASSETS[bodyType] || ILLUSTRATED_AVATAR_ASSETS.boy;
  const isLeftHanded = String(kid?.name || "").trim().toLowerCase() === "wesley" || String(kid?.handedness || "").toLowerCase() === "left";
  return `
    <div aria-label="Illustrated ${bodyType} character avatar" style="width:min(100%,440px);margin:8px auto 0;">
      <div style="position:relative;border-radius:26px;overflow:hidden;background:linear-gradient(180deg,#202944,#111a33);box-shadow:0 18px 40px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.08);">
        <img
          src="${asset}"
          alt="Illustrated three-quarter ${bodyType} adventurer wearing the equipped starter gear"
          style="display:block;width:100%;height:auto;transform:${isLeftHanded ? "scaleX(-1)" : "none"};transform-origin:center;"
        >
      </div>
    </div>`;
}

function renderLayeredAvatar(kid, equipment) {
  if (hasIllustratedStarterLoadout(equipment)) {
    return renderIllustratedCompositeAvatar(kid);
  }
  return renderVectorLayeredAvatar(kid, equipment);
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
    await signInWithRedirect(auth, googleProvider);
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
    document.getElementById('openParentBtn')?.addEventListener('click', openParentDashboardFromCurrentSession);
  } catch (err) {
    showError("Could not load profiles: " + err.message);
  }
}

async function loadChildSelector() {
  document.body.innerHTML = `<main class="app"><section class="card"><p>Loading profiles...</p></section></main>`;
  try {
    const kids = await getAllKids();
    const activeKids = kids.filter(kid => kid.active !== false);
    document.body.innerHTML = `
      <main class="app">
        <header class="hero"><div class="logo">🛡️</div><h1>Choose Your Character</h1><p>Select a child profile.</p></header>
        <section class="character-select">
          ${activeKids.map(kid => `
            <button class="character-card-btn child-only-select-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}">
              <div class="avatar">${kid.avatar || "🧙"}</div>
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
      sessionStorage.removeItem(KID_UNLOCK_KEY);
      sessionStorage.removeItem(KID_UNLOCK_TIME_KEY);
      window.history.replaceState({}, document.title, window.location.pathname);
      loadChildSelector();
    });

    const unlock = async () => {
      const input = document.getElementById('kidPin');
      const message = document.getElementById('pinMessage');
      const pin = input?.value.trim() || '';
      if (!/^\d{4}$/.test(pin)) { message.textContent = 'Enter a 4-digit PIN.'; return; }
      const security = getPinSecurity(kidId);
      if (security.lockedUntil > Date.now()) {
        const minutes = Math.ceil((security.lockedUntil - Date.now()) / 60000);
        message.textContent = `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
        return;
      }
      if (await hashPin(pin) !== kid.pinHash) {
        const attempts = Number(security.attempts || 0) + 1;
        const lockedUntil = attempts >= PIN_MAX_ATTEMPTS ? Date.now() + PIN_LOCK_MINUTES * 60000 : 0;
        setPinSecurity(kidId, { attempts: lockedUntil ? 0 : attempts, lockedUntil });
        input.value = '';
        message.textContent = lockedUntil
          ? `Too many attempts. Locked for ${PIN_LOCK_MINUTES} minutes.`
          : `That PIN is not correct. ${PIN_MAX_ATTEMPTS - attempts} attempt${PIN_MAX_ATTEMPTS - attempts === 1 ? '' : 's'} left.`;
        return;
      }
      clearPinSecurity(kidId);
      sessionStorage.setItem(KID_UNLOCK_KEY, kidId);
      sessionStorage.setItem(KID_UNLOCK_TIME_KEY, String(Date.now()));
      await loadKidDashboard(kidId);
    };
    document.getElementById('unlockKidBtn')?.addEventListener('click', unlock);
    document.getElementById('kidPin')?.addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
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
  const value = quest.scheduleType || quest.type || "daily";
  if (["daily", "weekdays", "weekly", "one-time"].includes(value)) return value;
  return "one-time";
}

function getQuestPeriodKey(quest, date = new Date()) {
  const scheduleType = getQuestScheduleType(quest);
  if (scheduleType === "weekly") return getWeekKey(date);
  if (scheduleType === "one-time") return "one-time";
  return getLocalDateKey(date);
}

function isQuestScheduledToday(quest, date = new Date()) {
  const scheduleType = getQuestScheduleType(quest);
  if (scheduleType === "weekdays") {
    const weekdays = Array.isArray(quest.weekdays) ? quest.weekdays.map(Number) : [];
    return weekdays.includes(date.getDay());
  }
  return true;
}

function isQuestCompletedForCurrentPeriod(quest, history, date = new Date()) {
  const periodKey = getQuestPeriodKey(quest, date);
  return history.some(item => {
    if (item.questId !== quest.choreId) return false;
    if (item.periodKey) return item.periodKey === periodKey;
    if (getQuestScheduleType(quest) === "weekly") {
      return getWeekKey(new Date(`${item.questDate || getTodayKey()}T12:00:00`)) === periodKey;
    }
    if (getQuestScheduleType(quest) === "one-time") return true;
    return item.questDate === getTodayKey();
  });
}

function isSubmissionForCurrentPeriod(quest, submission, date = new Date()) {
  if (submission.questId !== quest.choreId || submission.status !== "Pending") return false;
  const periodKey = getQuestPeriodKey(quest, date);
  if (submission.periodKey) return submission.periodKey === periodKey;
  return submission.questDate === getTodayKey();
}

function scheduleLabel(quest) {
  const scheduleType = getQuestScheduleType(quest);
  if (scheduleType === "weekdays") {
    const selected = Array.isArray(quest.weekdays) ? quest.weekdays.map(Number) : [];
    const names = WEEKDAY_OPTIONS.filter(day => selected.includes(day.value)).map(day => day.short);
    return names.length ? names.join(", ") : "Selected weekdays";
  }
  if (scheduleType === "weekly") return "Weekly";
  if (scheduleType === "one-time") return "One-Time";
  return "Daily";
}

function dueLabel(quest) {
  if (quest.dueTime) return `Due ${quest.dueTime}`;
  return quest.time || "Anytime";
}

function weekdayCheckboxes(selectedDays = []) {
  const selected = selectedDays.map(Number);
  return WEEKDAY_OPTIONS.map(day => `
    <label style="display:flex;align-items:center;gap:7px;margin-right:10px;">
      <input class="quest-weekday" type="checkbox" value="${day.value}" ${selected.includes(day.value) ? "checked" : ""}>
      ${day.short}
    </label>`).join("");
}

function attachScheduleFormBehavior() {
  const scheduleSelect = document.getElementById("questScheduleType");
  const weekdayBox = document.getElementById("weekdayOptions");
  if (!scheduleSelect || !weekdayBox) return;
  const sync = () => { weekdayBox.style.display = scheduleSelect.value === "weekdays" ? "flex" : "none"; };
  scheduleSelect.addEventListener("change", sync);
  sync();
}

function getSelectedWeekdays() {
  return Array.from(document.querySelectorAll(".quest-weekday:checked")).map(input => Number(input.value));
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
    if (!['daily', 'weekdays'].includes(scheduleType)) return false;
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
    getDocs(collection(db, 'kids')),
    getDocs(collection(db, 'quests')),
    getAllHistory()
  ]);

  const kids = [];
  kidsSnap.forEach(item => kids.push({ kidId: item.id, ...item.data() }));
  const quests = [];
  questSnap.forEach(item => quests.push({ choreId: item.id, ...item.data() }));

  const updates = [];
  kids.forEach(kid => {
    const result = calculateCurrentStreak(kid, quests, history);
    const current = Number(kid.currentStreak || 0);
    const best = Math.max(Number(kid.bestStreak || 0), result.streak);
    if (current !== result.streak || Number(kid.bestStreak || 0) !== best || (kid.lastStreakDate || '') !== result.latestQualifiedDate) {
      updates.push(updateDoc(doc(db, 'kids', kid.kidId), {
        currentStreak: result.streak,
        bestStreak: best,
        lastStreakDate: result.latestQualifiedDate,
        streakUpdatedAt: new Date().toISOString()
      }));
    }
  });
  await Promise.all(updates);
}

/* -------------------------------------------------
   KID DASHBOARD, MAIN QUESTS, SIDE QUESTS, AND HELPERS
------------------------------------------------- */

async function getAllKids() {
  const snap = await getDocs(collection(db, "kids"));
  const kids = [];
  snap.forEach(d => {
    const kid = { kidId: d.id, ...d.data() };
    if (kid.active !== false) kids.push(kid);
  });
  return kids.sort((a, b) => String(a.name || a.kidId).localeCompare(String(b.name || b.kidId)));
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
  if (!isKidUnlocked(kidId)) {
    await loadKidEntry(kidId);
    return;
  }

  document.body.innerHTML = `<main class="app"><header class="hero"><div class="logo">⚔️</div><h1>Loading...</h1><p>Gathering today's quests...</p></header></main>`;

  try {
    await resetDailyQuestsIfNeeded();
    await refreshAllStreaks();
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

    renderDashboard(kid, mainQuests, sideQuests, kids);
  } catch (err) {
    showError("Firebase error: " + err.message);
  }
}

function renderDashboard(kid, mainQuests, sideQuests, allKids) {
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
        <div class="logo">${kid.avatar || "🧙"}</div>
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
  document.getElementById("openClassBtn").addEventListener("click", () => loadClassScreen(kid.kidId));
  document.getElementById("switchCharacterBtn").addEventListener("click", async () => {
    sessionStorage.removeItem(KID_UNLOCK_KEY);
    sessionStorage.removeItem(KID_UNLOCK_TIME_KEY);

    if (isParentUser(auth.currentUser)) {
      window.history.replaceState({}, document.title, window.location.pathname);
      await loadParentDashboard(auth.currentUser);
      return;
    }

    window.history.replaceState({}, document.title, `?kid=${encodeURIComponent(kid.kidId)}`);
    await loadKidEntry(kid.kidId);
  });
}


async function loadClassScreen(kidId) {
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

function getClassStats(kid) {
  const def = CLASS_DEFINITIONS[kid.classId];
  const level = Math.max(1, Number(kid.level || 1));
  const gear = equipmentBonuses(kid.equipment || {});
  const stats = {};
  STAT_KEYS.forEach(key => {
    stats[key] = Number(def.base[key] || 0) + Math.max(0, level - 1) * Number(def.growth[key] || 0) + Number(gear[key] || 0);
  });
  stats.hp = 20 + level * 5;
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

function radarChartSvg(stats) {
  const labels = ["STR", "WIS", "AGI", "KIND", "LUCK", "COUR"];
  const values = STAT_KEYS.map(k => Number(stats[k] || 0));
  const max = Math.max(20, ...values);
  const cx = 150, cy = 145, radius = 100;
  const point = (i, value) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 6;
    const r = radius * value / max;
    return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
  };
  const outer = labels.map((_, i) => point(i, max)).join(" ");
  const middle = labels.map((_, i) => point(i, max * .5)).join(" ");
  const data = values.map((v, i) => point(i, v)).join(" ");
  const axes = labels.map((label, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 6;
    const x = cx + Math.cos(angle) * 120;
    const y = cy + Math.sin(angle) * 120;
    return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle)*radius}" y2="${cy + Math.sin(angle)*radius}" stroke="rgba(255,255,255,.18)"/><text x="${x}" y="${y}" fill="currentColor" font-size="12" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  }).join("");
  return `<svg viewBox="0 0 300 290" role="img" aria-label="Character stat radar chart" style="width:100%;max-width:380px;display:block;margin:auto;color:var(--text);">
    <polygon points="${outer}" fill="none" stroke="rgba(255,255,255,.28)"/>
    <polygon points="${middle}" fill="none" stroke="rgba(255,255,255,.12)"/>
    ${axes}
    <polygon points="${data}" fill="rgba(118,103,255,.34)" stroke="var(--primary)" stroke-width="3"/>
  </svg>`;
}

function renderClassScreen(kid) {
  const def = CLASS_DEFINITIONS[kid.classId];
  const level = Math.max(1, Number(kid.level || 1));
  const stats = getClassStats(kid);
  const title = getCurrentClassTitle(kid);
  const unlocked = def.abilities.filter(a => level >= a.level);
  const locked = def.abilities.filter(a => level < a.level);
  const equipped = kid.equipment && typeof kid.equipment === "object" ? kid.equipment : {};
  const inventory = Array.isArray(kid.inventory) ? kid.inventory : [];
  const gearBonuses = equipmentBonuses(equipped);
  const canChooseBranch1 = level >= 5 && !kid.classBranch1;
  const canChooseBranch2 = level >= 10 && kid.classBranch1 && !kid.classBranch2;

  const equippedCards = Object.entries(EQUIPMENT_SLOTS).map(([slot, label]) => {
    const item = equipped[slot];
    if (!item) return `<div class="quest"><div class="quest-icon">➕</div><div class="quest-info"><strong>${label}</strong><span>Nothing equipped</span></div></div>`;
    const grade = ITEM_GRADES[item.grade] || ITEM_GRADES.copper;
    return `<div class="quest"><div class="quest-icon" style="box-shadow:0 0 18px ${grade.glow};">${itemIcon(item)}</div><div class="quest-info"><strong>${escapeHtml(item.name || "Item")}</strong><span>${label} • ${grade.name}</span><small class="status status-ready">${escapeHtml(formatBonuses(item))}</small></div><button class="unequip-item-btn" data-slot="${slot}" type="button">Unequip</button></div>`;
  }).join("");

  const inventoryCards = inventory.length ? inventory.map(item => {
    const grade = ITEM_GRADES[item.grade] || ITEM_GRADES.copper;
    return `<div class="quest inventory-item-card" data-slot="${escapeAttribute(item.slot || "other")}" data-grade="${escapeAttribute(item.grade || "copper")}">
      <div class="quest-icon" style="border-color:${grade.color};box-shadow:0 0 16px ${grade.glow};">${itemIcon(item)}</div>
      <div class="quest-info"><strong>${escapeHtml(item.name || "Item")}</strong><span>${escapeHtml(EQUIPMENT_SLOTS[item.slot] || item.slot || "Item")} • ${grade.name} • Value ${Number(item.tradeValue || grade.tradeValue)}</span><small class="status status-ready">${escapeHtml(formatBonuses(item))}</small></div>
      <button class="equip-item-btn" data-item-id="${escapeAttribute(item.instanceId)}" type="button">Equip</button>
    </div>`;
  }).join("") : '<p class="inventory-empty-message">Your inventory is empty.</p>';

  document.body.innerHTML = `
    <main class="app">
      <header class="hero compact"><div class="logo">${def.icon}</div><h1>${escapeHtml(kid.name || kid.kidId)}</h1><p>${escapeHtml(title)} • Level ${level}</p><small class="class-path">${escapeHtml([def.name, kid.classBranch1 && getCurrentClassTitle({...kid,classBranch2:""}), kid.classBranch2 && title].filter(Boolean).join(" → "))}</small></header>
      <section class="card character-card">
        <h2>Character</h2>
        ${renderLayeredAvatar(kid, equipped)}
        <p class="xp-text">Base Outfit: fitted white tank top and briefs are built into the mannequin.</p>
      </section>
      <section class="card"><h2>Stats</h2>${radarChartSvg(stats)}
        <div class="level-row"><div><span class="label">HP</span><strong>${stats.hp}</strong></div><div><span class="label">Class</span><strong style="font-size:1rem;">${escapeHtml(def.name)}</strong></div><div><span class="label">Rebirths</span><strong>${Number(kid.rebirths || 0)}</strong></div></div>
        <p class="xp-text">Gear bonuses: ${STAT_KEYS.map(key => `${key.slice(0,3).toUpperCase()} +${gearBonuses[key] || 0}`).join(" • ")}</p>
      </section>
      <section class="card"><h2>Abilities & Spells</h2>
        ${unlocked.map(a => `<div class="quest"><div class="quest-icon">✨</div><div class="quest-info"><strong>${escapeHtml(a.name)}</strong><span>Unlocked at Level ${a.level}</span><small class="status status-approved">${escapeHtml(a.text)}</small></div></div>`).join("")}
        ${locked.map(a => `<div class="quest"><div class="quest-icon">🔒</div><div class="quest-info"><strong>${escapeHtml(a.name)}</strong><span>Unlocks at Level ${a.level}</span></div></div>`).join("")}
      </section>
      ${canChooseBranch1 ? `<section class="card"><h2>Choose Your Level 5 Path</h2>${def.branch1.map(b => `<button class="choose-branch1-btn" data-branch-id="${b.id}" type="button" style="width:100%;margin-bottom:10px;">${b.icon} ${escapeHtml(b.name)}</button>`).join("")}</section>` : ""}
      ${canChooseBranch2 ? `<section class="card"><h2>Choose Your Level 10 Path</h2>${(def.branch2[kid.classBranch1] || []).map(b => `<button class="choose-branch2-btn" data-branch-id="${b.id}" type="button" style="width:100%;margin-bottom:10px;">🌟 ${escapeHtml(b.name)}</button>`).join("")}</section>` : ""}
      <section class="card"><h2>Equipped Gear</h2>${equippedCards}</section>
      <section class="card"><h2>Inventory</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <label class="form-field"><span>Slot</span><select id="inventorySlotFilter"><option value="all">All slots</option>${Object.entries(EQUIPMENT_SLOTS).map(([id,label]) => `<option value="${id}">${label}</option>`).join("")}</select></label>
          <label class="form-field"><span>Grade</span><select id="inventoryGradeFilter"><option value="all">All grades</option>${Object.entries(ITEM_GRADES).map(([id,g]) => `<option value="${id}">${g.name}</option>`).join("")}</select></label>
        </div>
        <div id="inventoryList">${inventoryCards}</div>
        <p id="noFilteredItems" style="display:none;color:var(--text-soft);">No items match those filters.</p>
      </section>
      <button id="classScreenBackBtn" type="button" style="width:100%;">← Back to Quests</button>
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

  document.querySelectorAll(".equip-item-btn").forEach(button => button.addEventListener("click", async () => {
    const item = inventory.find(entry => entry.instanceId === button.dataset.itemId);
    if (!item) return;
    const nextInventory = inventory.filter(entry => entry.instanceId !== item.instanceId);
    const nextEquipment = { ...equipped };
    if (nextEquipment[item.slot]) nextInventory.push({ ...nextEquipment[item.slot], equipped: false });
    nextEquipment[item.slot] = { ...item, equipped: true };
    await updateDoc(doc(db, "kids", kid.kidId), { inventory: nextInventory, equipment: nextEquipment });
    await loadClassScreen(kid.kidId);
  }));

  document.querySelectorAll(".unequip-item-btn").forEach(button => button.addEventListener("click", async () => {
    const slot = button.dataset.slot;
    const item = equipped[slot];
    if (!item) return;
    const nextEquipment = { ...equipped };
    delete nextEquipment[slot];
    await updateDoc(doc(db, "kids", kid.kidId), { inventory: [...inventory, { ...item, equipped: false }], equipment: nextEquipment });
    await loadClassScreen(kid.kidId);
  }));

  const applyInventoryFilters = () => {
    const slot = document.getElementById("inventorySlotFilter").value;
    const grade = document.getElementById("inventoryGradeFilter").value;
    let shown = 0;
    document.querySelectorAll(".inventory-item-card").forEach(card => {
      const visible = (slot === "all" || card.dataset.slot === slot) && (grade === "all" || card.dataset.grade === grade);
      card.style.display = visible ? "grid" : "none";
      if (visible) shown++;
    });
    document.getElementById("noFilteredItems").style.display = inventory.length && shown === 0 ? "block" : "none";
  };
  document.getElementById("inventorySlotFilter").addEventListener("change", applyInventoryFilters);
  document.getElementById("inventoryGradeFilter").addEventListener("change", applyInventoryFilters);
  document.getElementById("classScreenBackBtn").addEventListener("click", () => loadKidDashboard(kid.kidId));
}

function questCard(quest, currentKidId) {
  const isMain = quest.kidId === currentKidId;
  const displayXp = isMain ? Number(quest.xp || 0) : Math.round(Number(quest.xp || 0) / 2);
  const displayGold = isMain ? Number(quest.gold || 0) : Math.round(Number(quest.gold || 0) / 2);
  return `
    <div class="quest">
      <div class="quest-icon">${quest.completedToday ? "✅" : iconForQuest(quest.name || "")}</div>
      <div class="quest-info">
        <strong>${escapeHtml(quest.name || "Unnamed Quest")}</strong>
        <span>${escapeHtml(scheduleLabel(quest))} • ${escapeHtml(dueLabel(quest))} • +${displayXp} XP • +${displayGold} Gold${isMain ? "" : " helper pool"}</span>
        <small class="status ${quest.completedToday ? "status-approved" : quest.pendingByCurrentKid ? "status-pending" : "status-ready"}">
          ${quest.completedToday ? "Completed for this schedule" : quest.pendingByCurrentKid ? "Your claim is awaiting approval" : isMain ? "Your responsibility" : quest.kidId === ANYONE_ID ? "Available to anyone" : "Help another adventurer"}
        </small>
      </div>
      ${quest.completedToday ? '<button class="approved" disabled>Done</button>' : quest.pendingByCurrentKid ? '<button class="disabled" disabled>Claimed</button>' : `<button class="complete-btn" type="button" data-chore-id="${escapeAttribute(quest.choreId)}">Complete</button>`}
    </div>`;
}

async function openQuestSubmission(choreId, currentKidId, allKids) {
  try {
    const questSnap = await getDoc(doc(db, "quests", choreId));
    if (!questSnap.exists()) { alert("Quest not found."); return; }
    const quest = { choreId, ...questSnap.data() };
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
        fullXp: Number(quest.xp || 0),
        fullGold: Number(quest.gold || 0)
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
  const isGuildMaster = String(user?.email || "").toLowerCase() === ADMIN_EMAIL;
  const pending = data.submissions.filter(s => s.status === "Pending");
  document.body.innerHTML = `
    <main class="app">
      ${renderSignOutHeader(user)}
      <header class="hero compact"><div class="logo">🛡️</div><h1>Guild Hall</h1><p>Quest Review & Family Progress</p></header>
      <section class="card">
        <h2>Adventurers</h2>
        ${data.kids.map(kid => {
          const main = data.quests.filter(q => q.kidId === kid.kidId);
          const doneIds = new Set(data.history.filter(h => Array.isArray(h.participantIds) && h.participantIds.includes(kid.kidId)).map(h => h.questId));
          const doneMain = main.filter(q => doneIds.has(q.choreId)).length;
          const pct = main.length ? Math.round(doneMain / main.length * 100) : 0;
          return `<button class="character-card-btn child-detail-btn" type="button" data-kid-id="${escapeAttribute(kid.kidId)}" style="margin-bottom:12px;">
            <div class="avatar">${kid.avatar || "🧙"}</div><strong>${escapeHtml(kid.name || kid.kidId)}</strong>
            <span>Level ${Number(kid.level || 1)} • ${Number(kid.gold || 0)} Gold • ${Number(kid.currentStreak || 0)}🔥 streak • Best ${Number(kid.bestStreak || 0)} • ${doneMain}/${main.length} Main Quests (${pct}%)</span>
          </button>`;
        }).join("")}
      </section>
      <section class="card">
        <h2>Quest Review</h2>
        ${pending.length === 0 ? "<p>No quests pending approval.</p>" : pending.map(item => {
          const names = item.participantIds.map(id => data.kids.find(k => k.kidId === id)?.name || id);
          return `<div class="quest"><div class="quest-icon">📜</div><div class="quest-info">
            <strong>${escapeHtml(item.questName || "Quest")}</strong>
            <span>${item.isSideQuest ? "Side Quest" : "Main Quest"} • ${escapeHtml(names.join(", "))}</span>
            <small class="status status-pending">Submitted ${formatDateTime(item.submittedAt)}</small>
          </div><div class="parent-buttons">
            <button class="approve-submission-btn" type="button" data-submission-id="${escapeAttribute(item.submissionId)}">✅</button>
            <button class="reject-submission-btn" type="button" data-submission-id="${escapeAttribute(item.submissionId)}">❌</button>
          </div></div>`;
        }).join("")}
      </section>
      ${isGuildMaster ? '<a class="character parent-link" href="?manager=true"><div class="avatar">📋</div><div><strong>Quest Manager</strong><span>View and manage blueprints</span></div></a>' : ''}
      <a class="character parent-link" href="?family=true"><div class="avatar">👨‍👩‍👧‍👦</div><div><strong>Family Accounts</strong><span>Create profiles and set or reset PINs</span></div></a>
    </main>`;
  attachSignOutEvent();
  document.querySelectorAll('.approve-submission-btn').forEach(b => b.addEventListener('click', () => approveSubmission(b.dataset.submissionId)));
  document.querySelectorAll('.reject-submission-btn').forEach(b => b.addEventListener('click', () => rejectSubmission(b.dataset.submissionId)));
  document.querySelectorAll('.child-detail-btn').forEach(b => b.addEventListener('click', () => loadChildDetail(b.dataset.kidId, user)));
}

async function approveSubmission(submissionId) {
  try {
    const subRef = doc(db, "questSubmissions", submissionId);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) { alert("Submission not found."); return; }
    const submission = { submissionId, ...subSnap.data() };
    if (submission.status !== "Pending") { alert("This submission was already reviewed."); return; }
    const questSnap = await getDoc(doc(db, "quests", submission.questId));
    if (!questSnap.exists()) { alert("Quest not found."); return; }
    const quest = questSnap.data();
    const participants = Array.from(new Set(submission.participantIds || [submission.submittedBy]));
    const isFullReward = quest.kidId !== ANYONE_ID && participants.includes(quest.kidId) && submission.submittedBy === quest.kidId;
    const rewardPoolXp = isFullReward ? Number(quest.xp || 0) : Math.round(Number(quest.xp || 0) / 2);
    const rewardPoolGold = isFullReward ? Number(quest.gold || 0) : Math.round(Number(quest.gold || 0) / 2);
    const xpShares = splitWholeReward(rewardPoolXp, participants.length);
    const goldShares = splitWholeReward(rewardPoolGold, participants.length);

    for (let i = 0; i < participants.length; i++) {
      const kidRef = doc(db, "kids", participants[i]);
      const kidSnap = await getDoc(kidRef);
      if (!kidSnap.exists()) continue;
      const kid = kidSnap.data();
      const newXp = Number(kid.xp || 0) + xpShares[i];
      await updateDoc(kidRef, {
        xp: newXp,
        gold: Number(kid.gold || 0) + goldShares[i],
        level: Math.floor(newXp / 100) + 1,
        lifetimeQuests: Number(kid.lifetimeQuests || 0) + 1
      });
    }

    const approvedAt = new Date().toISOString();
    await updateDoc(subRef, { status: "Approved", approvedAt, rewardPoolXp, rewardPoolGold, xpShares, goldShares });
    await addDoc(collection(db, "questHistory"), {
      questId: submission.questId, questName: submission.questName || quest.name || "Quest",
      assignedKidId: quest.kidId || ANYONE_ID, submittedBy: submission.submittedBy,
      participantIds: participants, questDate: submission.questDate || getTodayKey(),
      periodKey: submission.periodKey || getQuestPeriodKey({ ...quest, choreId: submission.questId }),
      scheduleType: submission.scheduleType || getQuestScheduleType(quest),
      approvedAt, rewardPoolXp, rewardPoolGold, xpShares, goldShares,
      isSideQuest: !isFullReward
    });

    const todaySubs = await getTodaySubmissions();
    await Promise.all(todaySubs.filter(s => s.questId === submission.questId && s.submissionId !== submissionId && s.status === "Pending")
      .map(s => updateDoc(doc(db, "questSubmissions", s.submissionId), { status: "Rejected", rejectedAt: approvedAt, rejectionReason: "Completed by another group" })));
    await updateDoc(doc(db, "quests", submission.questId), {
      status: "Approved",
      completedBy: submission.submittedBy,
      approvedAt,
      active: getQuestScheduleType(quest) === "one-time" ? false : quest.active !== false
    });
    await refreshAllStreaks();
    await loadParentDashboard(auth.currentUser);
  } catch (err) { alert("Could not approve submission: " + err.message); }
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
      <header class="hero compact"><div class="logo">${kid.avatar || "🧙"}</div><h1>${escapeHtml(kid.name || kidId)}</h1><p>Today's progress</p></header>
      <section class="card character-card"><div class="level-row">
        <div><span class="label">Current Streak</span><strong>${Number(kid.currentStreak || 0)}🔥</strong></div>
        <div><span class="label">Best Streak</span><strong>${Number(kid.bestStreak || 0)}</strong></div>
        <div><span class="label">Rule</span><strong style="font-size:1rem;">${getKidStreakMode(kid) === 'participation' ? 'Participate' : 'Main Quests'}</strong></div>
      </div></section>
      <section class="card"><h2>Main Quests</h2>${main.length ? main.map(q => {
        const done=doneByQuest.has(q.choreId); const pending=pendingForKid.some(s=>s.questId===q.choreId);
        return `<div class="quest"><div class="quest-icon">${done?'✅':pending?'⏳':'⬜'}</div><div class="quest-info"><strong>${escapeHtml(q.name||'Quest')}</strong><span>+${Number(q.xp||0)} XP • +${Number(q.gold||0)} Gold</span><small class="status ${done?'status-approved':pending?'status-pending':'status-ready'}">${done?'Completed':pending?'Pending approval':'Still remaining'}</small></div></div>`;
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
          <div class="form-field"><label for="editKidBodyType">Illustrated Character</label><select id="editKidBodyType">
            <option value="auto" ${!['boy','girl'].includes(String(kid.avatarBodyType || '').toLowerCase()) ? 'selected' : ''}>Automatic by name</option>
            <option value="boy" ${String(kid.avatarBodyType || '').toLowerCase() === 'boy' ? 'selected' : ''}>Boy adventurer</option>
            <option value="girl" ${String(kid.avatarBodyType || '').toLowerCase() === 'girl' ? 'selected' : ''}>Girl adventurer</option>
          </select></div>
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
        avatarBodyType: document.getElementById('editKidBodyType').value === 'auto' ? '' : document.getElementById('editKidBodyType').value,
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
        <div class="form-field"><label>Illustrated Character</label><select id="newKidBodyType">
          <option value="auto">Automatic by name</option>
          <option value="boy">Boy adventurer</option>
          <option value="girl">Girl adventurer</option>
        </select></div>
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
      avatarBodyType: document.getElementById('newKidBodyType').value === 'auto' ? '' : document.getElementById('newKidBodyType').value,
      classTitle: document.getElementById('newKidClass').value.trim() || 'Adventurer',
      classPath: document.getElementById('newKidPath').value.trim(),
      streakMode: document.getElementById('newKidStreakMode').value,
      level: 1, xp: 0, gold: 0, currentStreak: 0, bestStreak: 0, lastStreakDate: '', lifetimeQuests: 0,
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
      kidNames[ANYONE_ID] = "Anyone";
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
                              scheduleLabel(quest)
                            }
                            • ${escapeHtml(dueLabel(quest))}
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
                <option value="ANYONE" ${quest.kidId === ANYONE_ID ? "selected" : ""}>Anyone / Random Household Quest</option>
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
            "Schedule",
            `
              <select id="questScheduleType" style="width:100%; box-sizing:border-box; padding:10px;">
                <option value="daily" ${getQuestScheduleType(quest) === "daily" ? "selected" : ""}>Daily</option>
                <option value="weekdays" ${getQuestScheduleType(quest) === "weekdays" ? "selected" : ""}>Selected Weekdays</option>
                <option value="weekly" ${getQuestScheduleType(quest) === "weekly" ? "selected" : ""}>Weekly</option>
                <option value="one-time" ${getQuestScheduleType(quest) === "one-time" ? "selected" : ""}>One-Time</option>
              </select>
            `
          )}

          <div id="weekdayOptions" style="display:none;flex-wrap:wrap;gap:6px;">${weekdayCheckboxes(quest.weekdays || [])}</div>

          ${formField(
            "Due Time (optional)",
            `<input id="questDueTime" type="time" value="${escapeAttribute(quest.dueTime || "")}" style="width:100%; box-sizing:border-box; padding:10px;">`
          )}

          ${formField(
            "Timeframe Note",
            `<input id="questTime" value="${escapeAttribute(quest.time || "Anytime")}" placeholder="Before bed, after school..." style="width:100%; box-sizing:border-box; padding:10px;">`
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

          <label style="display:flex; align-items:center; gap:8px;">
            <input id="questAllowHelpers" type="checkbox" ${quest.allowHelpers !== false ? "checked" : ""}>
            Allow other children and group helpers
          </label>

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
    attachScheduleFormBehavior();

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
            type: document.getElementById("questScheduleType").value,
            scheduleType: document.getElementById("questScheduleType").value,
            weekdays: getSelectedWeekdays(),
            dueTime: document.getElementById("questDueTime").value,
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
            allowHelpers: document.getElementById("questAllowHelpers").checked,
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
                <option value="ANYONE">Anyone / Random Household Quest</option>
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
            "Schedule",
            `
              <select id="questScheduleType" style="width:100%; box-sizing:border-box; padding:10px;">
                <option value="daily">Daily</option>
                <option value="weekdays">Selected Weekdays</option>
                <option value="weekly">Weekly</option>
                <option value="one-time">One-Time</option>
              </select>
            `
          )}

          <div id="weekdayOptions" style="display:none;flex-wrap:wrap;gap:6px;">${weekdayCheckboxes([])}</div>

          ${formField(
            "Due Time (optional)",
            `<input id="questDueTime" type="time" style="width:100%; box-sizing:border-box; padding:10px;">`
          )}

          ${formField(
            "Timeframe Note",
            `<input id="questTime" value="Anytime" placeholder="Before bed, after school..." style="width:100%; box-sizing:border-box; padding:10px;">`
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

          <label style="display:flex; align-items:center; gap:8px;">
            <input id="questAllowHelpers" type="checkbox" checked>
            Allow other children and group helpers
          </label>

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
    attachScheduleFormBehavior();

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
            type: document.getElementById("questScheduleType").value,
            scheduleType: document.getElementById("questScheduleType").value,
            weekdays: getSelectedWeekdays(),
            dueTime: document.getElementById("questDueTime").value,
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
            allowHelpers: document.getElementById("questAllowHelpers").checked,
            archived: false,
            status: "Ready",
            completedBy: "",
            lastResetDate: getTodayKey(),
            lastResetPeriod: getQuestPeriodKey({ scheduleType: document.getElementById("questScheduleType").value }),
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
