/* eslint-disable max-len, require-jsdoc */
"use strict";

const crypto = require("crypto");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");

initializeApp();
setGlobalOptions({region: "us-central1", maxInstances: 3});

const db = getFirestore();
const PARENT_EMAILS = new Set([
  "lawrencewnelson3@gmail.com",
  "anitanelson1987@gmail.com",
]);
const MAX_ATTEMPTS = 5;
const LOCK_MILLISECONDS = 15 * 60 * 1000;

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function sameHash(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireParent(request) {
  const email = String(request.auth?.token?.email || "").toLowerCase();
  if (!request.auth || !PARENT_EMAILS.has(email)) {
    throw new HttpsError("permission-denied", "Parent access required.");
  }
}

function cleanKidId(value) {
  const kidId = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,10}$/.test(kidId)) {
    throw new HttpsError("invalid-argument", "Invalid child profile code.");
  }
  return kidId;
}

function cleanPin(value) {
  const pin = String(value || "").trim();
  if (!/^\d{4}$/.test(pin)) {
    throw new HttpsError("invalid-argument", "PIN must be exactly 4 digits.");
  }
  return pin;
}

exports.listChildProfiles = onCall({maxInstances: 3}, async () => {
  const snapshot = await db.collection("kids").get();
  const profiles = [];

  snapshot.forEach((document) => {
    const data = document.data();
    if (data.active === false) return;
    profiles.push({
      kidId: document.id,
      name: data.name || document.id,
      avatar: data.avatar || "🧙",
      portraitFile: data.portraitFile || "",
      classTitle: data.classTitle || "Adventurer",
      classPath: data.classPath || "",
      level: Number(data.level || 1),
      active: data.active !== false,
      pinConfigured: Boolean(data.pinConfigured || data.pinHash),
    });
  });

  profiles.sort((a, b) => a.name.localeCompare(b.name));
  return {profiles};
});

exports.loginChild = onCall({maxInstances: 3}, async (request) => {
  const kidId = cleanKidId(request.data?.kidId);
  const pin = cleanPin(request.data?.pin);
  const ip = String(request.rawRequest?.ip || "unknown");
  const securityId = sha256(`${kidId}|${ip}`);
  const securityRef = db.collection("childLoginSecurity").doc(securityId);
  const kidRef = db.collection("kids").doc(kidId);
  const authRef = db.collection("childAuth").doc(kidId);

  const result = await db.runTransaction(async (transaction) => {
    const [securitySnap, kidSnap, authSnap] = await Promise.all([
      transaction.get(securityRef),
      transaction.get(kidRef),
      transaction.get(authRef),
    ]);

    if (!kidSnap.exists || kidSnap.data().active === false) {
      throw new HttpsError("permission-denied", "Invalid profile or PIN.");
    }

    const security = securitySnap.exists ? securitySnap.data() : {};
    const lockedUntil = Number(security.lockedUntil || 0);
    if (lockedUntil > Date.now()) {
      throw new HttpsError("resource-exhausted", "Too many attempts.");
    }

    const kidData = kidSnap.data();
    const storedHash = authSnap.exists ? authSnap.data().pinHash : kidData.pinHash;
    const suppliedHash = sha256(pin);

    if (!sameHash(storedHash, suppliedHash)) {
      const attempts = Number(security.attempts || 0) + 1;
      transaction.set(securityRef, {
        kidId,
        attempts: attempts >= MAX_ATTEMPTS ? 0 : attempts,
        lockedUntil: attempts >= MAX_ATTEMPTS ? Date.now() + LOCK_MILLISECONDS : 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new HttpsError(
          attempts >= MAX_ATTEMPTS ? "resource-exhausted" : "permission-denied",
          "Invalid profile or PIN.",
      );
    }

    transaction.delete(securityRef);

    if (!authSnap.exists && kidData.pinHash) {
      transaction.set(authRef, {
        pinHash: kidData.pinHash,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(kidRef, {
        pinHash: FieldValue.delete(),
        pinConfigured: true,
      });
    }

    return {name: kidData.name || kidId};
  });

  const token = await getAuth().createCustomToken(`child_${kidId}`, {
    role: "child",
    kidId,
  });

  return {token, kidId, name: result.name};
});

exports.setChildPin = onCall({maxInstances: 2}, async (request) => {
  requireParent(request);
  const kidId = cleanKidId(request.data?.kidId);
  const pin = cleanPin(request.data?.pin);
  const kidRef = db.collection("kids").doc(kidId);
  const kidSnap = await kidRef.get();

  if (!kidSnap.exists) {
    throw new HttpsError("not-found", "Child profile not found.");
  }

  const batch = db.batch();
  batch.set(db.collection("childAuth").doc(kidId), {
    pinHash: sha256(pin),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(kidRef, {
    pinHash: FieldValue.delete(),
    pinConfigured: true,
    pinUpdatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return {success: true};
});


const MAX_ENERGY = 30;
const MAX_SLEEPINESS = 8;

const FOOD_ENERGY = {
  gummy_bears: 3,
  chocolate_bar: 6,
  lollipop: 10,
  streak_bubble_gum: 15,
  apple_slices: 3,
  rice_ball: 6,
  dumplings: 10,
  streak_ramen: 15,
};

const ADVENTURES = {
  forest: {energy: 5, sleepiness: 1, enemyPower: 42, xp: 15, gold: 10},
  ruins: {energy: 8, sleepiness: 2, enemyPower: 60, xp: 28, gold: 20},
  vault: {energy: 12, sleepiness: 3, enemyPower: 82, xp: 45, gold: 35},
};

const CLASS_STATS = {
  warrior: {
    base: {strength: 8, wisdom: 3, agility: 5, kindness: 4, luck: 3, courage: 8},
    growth: {strength: 2, wisdom: 0, agility: 1, kindness: 0, luck: 0, courage: 1},
  },
  rogue: {
    base: {strength: 4, wisdom: 4, agility: 9, kindness: 3, luck: 7, courage: 5},
    growth: {strength: 0, wisdom: 0, agility: 2, kindness: 0, luck: 1, courage: 1},
  },
  mage: {
    base: {strength: 2, wisdom: 10, agility: 4, kindness: 5, luck: 6, courage: 4},
    growth: {strength: 0, wisdom: 2, agility: 0, kindness: 0, luck: 1, courage: 1},
  },
  ranger: {
    base: {strength: 5, wisdom: 5, agility: 8, kindness: 7, luck: 4, courage: 5},
    growth: {strength: 0, wisdom: 1, agility: 2, kindness: 1, luck: 0, courage: 0},
  },
  guardian: {
    base: {strength: 6, wisdom: 5, agility: 3, kindness: 10, luck: 3, courage: 7},
    growth: {strength: 1, wisdom: 0, agility: 0, kindness: 2, luck: 0, courage: 1},
  },
  royal: {
    base: {strength: 4, wisdom: 5, agility: 4, kindness: 7, luck: 9, courage: 7},
    growth: {strength: 0, wisdom: 1, agility: 0, kindness: 1, luck: 2, courage: 1},
  },
};

function chicagoDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function authorizedKidId(request) {
  const requested = cleanKidId(request.data?.kidId);
  const email = String(request.auth?.token?.email || "").toLowerCase();
  if (request.auth && PARENT_EMAILS.has(email)) return requested;
  if (
    request.auth?.token?.role === "child" &&
    String(request.auth?.token?.kidId || "") === requested
  ) {
    return requested;
  }
  throw new HttpsError("permission-denied", "Adventurer access required.");
}

function calculateCombatStats(kid) {
  const def = CLASS_STATS[kid.classId] || CLASS_STATS.warrior;
  const level = Math.max(1, Number(kid.level || 1));
  const keys = ["strength", "wisdom", "agility", "kindness", "luck", "courage"];
  const stats = {};

  keys.forEach((key) => {
    stats[key] =
      Number(def.base[key] || 0) +
      Math.max(0, level - 1) * Number(def.growth[key] || 0);
  });

  Object.values(kid.equipment || {}).forEach((item) => {
    Object.entries(item?.bonuses || {}).forEach(([key, value]) => {
      if (Object.prototype.hasOwnProperty.call(stats, key)) {
        stats[key] += Number(value || 0);
      }
    });
  });

  return stats;
}

function combatPower(stats) {
  return (
    stats.strength * 1.25 +
    stats.wisdom * 1.25 +
    stats.agility +
    stats.kindness * 0.4 +
    stats.luck * 0.6 +
    stats.courage * 1.1
  );
}

exports.consumeFood = onCall({maxInstances: 3}, async (request) => {
  const kidId = authorizedKidId(request);
  const foodId = String(request.data?.foodId || "");
  const energyValue = FOOD_ENERGY[foodId];

  if (!energyValue) {
    throw new HttpsError("invalid-argument", "Unknown food item.");
  }

  const kidRef = db.collection("kids").doc(kidId);

  const result = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(kidRef);
    if (!snap.exists) throw new HttpsError("not-found", "Adventurer not found.");

    const kid = snap.data();
    const inventory = {...(kid.foodInventory || {})};
    const count = Number(inventory[foodId] || 0);
    if (count <= 0) throw new HttpsError("failed-precondition", "You do not have that food.");

    const currentEnergy = Math.min(MAX_ENERGY, Number(kid.energy ?? MAX_ENERGY));
    if (currentEnergy >= MAX_ENERGY) {
      throw new HttpsError("failed-precondition", "Energy is already full.");
    }

    inventory[foodId] = count - 1;
    const energy = Math.min(MAX_ENERGY, currentEnergy + energyValue);
    transaction.update(kidRef, {foodInventory: inventory, energy});
    return {energy, foodInventory: inventory};
  });

  return result;
});

exports.runAdventure = onCall({maxInstances: 3}, async (request) => {
  const kidId = authorizedKidId(request);
  const adventureId = String(request.data?.adventureId || "");
  const adventure = ADVENTURES[adventureId];
  if (!adventure) throw new HttpsError("invalid-argument", "Unknown adventure.");

  const kidRef = db.collection("kids").doc(kidId);
  const today = chicagoDateKey();
  const battleRoll = 0.85 + Math.random() * 0.3;
  const rewardRoll = 0.9 + Math.random() * 0.2;

  const result = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(kidRef);
    if (!snap.exists) throw new HttpsError("not-found", "Adventurer not found.");

    const kid = snap.data();
    const energy = Math.min(MAX_ENERGY, Number(kid.energy ?? MAX_ENERGY));
    const sleepiness = kid.sleepinessDate === today ? Number(kid.sleepiness || 0) : 0;

    if (energy < adventure.energy) {
      throw new HttpsError("failed-precondition", "Not enough energy. Eat some quest food first.");
    }
    if (sleepiness + adventure.sleepiness > MAX_SLEEPINESS) {
      throw new HttpsError("failed-precondition", "Too sleepy to adventure again today.");
    }

    const stats = calculateCombatStats(kid);
    const power = combatPower(stats) * battleRoll;
    const won = power >= adventure.enemyPower;

    const update = {
      energy: energy - adventure.energy,
      sleepiness: sleepiness + adventure.sleepiness,
      sleepinessDate: today,
      lastAdventureAt: FieldValue.serverTimestamp(),
    };

    let xp = 0;
    let gold = 0;
    let level = Math.max(1, Number(kid.level || 1));
    if (won) {
      xp = Math.max(1, Math.round(adventure.xp * rewardRoll));
      gold = Math.max(1, Math.round(adventure.gold * rewardRoll));
      const newXp = Number(kid.xp || 0) + xp;
      level = Math.floor(newXp / 100) + 1;
      update.xp = newXp;
      update.gold = Number(kid.gold || 0) + gold;
      update.level = level;
    }

    transaction.update(kidRef, update);

    return {
      won,
      xp,
      gold,
      level,
      energy: update.energy,
      sleepiness: update.sleepiness,
      playerPower: Math.round(power),
      enemyPower: adventure.enemyPower,
    };
  });

  return result;
});


const BATTLE_ENEMIES = {
  forest: [
    {id: "slime", name: "Moss Slime", icon: "🟢", hp: 24, attack: 5, defense: 1},
    {id: "goblin", name: "Trail Goblin", icon: "👺", hp: 30, attack: 6, defense: 2},
  ],
  ruins: [
    {id: "skeleton", name: "Ruins Skeleton", icon: "💀", hp: 40, attack: 8, defense: 3},
    {id: "beetle", name: "Stone Beetle", icon: "🪲", hp: 48, attack: 7, defense: 5},
  ],
  vault: [
    {id: "wisp", name: "Arcane Wisp", icon: "🔵", hp: 58, attack: 10, defense: 5},
    {id: "sentinel", name: "Vault Sentinel", icon: "🗿", hp: 72, attack: 11, defense: 7},
  ],
};

const BATTLE_SKILLS = {
  warrior: {id: "power_strike", name: "Power Strike", cost: 3, kind: "physical", multiplier: 1.8},
  rogue: {id: "flurry", name: "Flurry", cost: 3, kind: "physical", multiplier: 1.65},
  mage: {id: "arc_bolt", name: "Arc Bolt", cost: 3, kind: "magic", multiplier: 1.85},
  ranger: {id: "piercing_shot", name: "Piercing Shot", cost: 3, kind: "physical", multiplier: 1.75},
  guardian: {id: "shield_bash", name: "Shield Bash", cost: 3, kind: "physical", multiplier: 1.55},
  royal: {id: "radiant_burst", name: "Radiant Burst", cost: 3, kind: "magic", multiplier: 1.75},
};

function battlePlayerProfile(kid) {
  const stats = calculateCombatStats(kid);
  const level = Math.max(1, Number(kid.level || 1));
  const maxHp = 30 + level * 3 + Math.round(stats.courage * 3.5);
  const maxSp = Math.min(30, 5 + Math.floor(level / 2) + Math.floor(stats.wisdom / 3));
  const magicBasic = stats.wisdom > stats.strength;
  const skill = BATTLE_SKILLS[kid.classId] || BATTLE_SKILLS.warrior;
  return {stats, level, maxHp, maxSp, magicBasic, skill};
}

function scaledEnemy(adventureId, level) {
  const options = BATTLE_ENEMIES[adventureId] || BATTLE_ENEMIES.forest;
  const base = options[Math.floor(Math.random() * options.length)];
  const levelOffset = Math.max(0, level - 1);
  return {
    ...base,
    maxHp: Math.round(base.hp + levelOffset * 5.5),
    attack: Math.round(base.attack + levelOffset * 0.75),
    defense: Math.round(base.defense + levelOffset * 0.35),
  };
}

function publicBattleState(data, sessionId) {
  return {
    sessionId,
    status: data.status,
    turn: Number(data.turn || 1),
    player: {
      name: data.playerName,
      hp: Number(data.playerHp || 0),
      maxHp: Number(data.playerMaxHp || 0),
      sp: Number(data.playerSp || 0),
      maxSp: Number(data.playerMaxSp || 0),
      basicName: data.basicName,
      skill: data.skill,
    },
    enemy: {
      name: data.enemyName,
      icon: data.enemyIcon,
      hp: Number(data.enemyHp || 0),
      maxHp: Number(data.enemyMaxHp || 0),
    },
    log: Array.isArray(data.log) ? data.log.slice(-8) : [],
    rewards: data.rewards || null,
  };
}

exports.startBattle = onCall({maxInstances: 3}, async (request) => {
  const kidId = authorizedKidId(request);
  const adventureId = String(request.data?.adventureId || "");
  const adventure = ADVENTURES[adventureId];
  if (!adventure) throw new HttpsError("invalid-argument", "Unknown adventure.");

  const kidRef = db.collection("kids").doc(kidId);
  const battleRef = db.collection("battleSessions").doc();
  const today = chicagoDateKey();

  const result = await db.runTransaction(async (transaction) => {
    const kidSnap = await transaction.get(kidRef);
    if (!kidSnap.exists) throw new HttpsError("not-found", "Adventurer not found.");

    const kid = kidSnap.data();
    const energy = Math.min(MAX_ENERGY, Number(kid.energy ?? MAX_ENERGY));
    const sleepiness = kid.sleepinessDate === today ? Number(kid.sleepiness || 0) : 0;
    if (energy < adventure.energy) {
      throw new HttpsError("failed-precondition", "Not enough energy. Eat some quest food first.");
    }
    if (sleepiness + adventure.sleepiness > MAX_SLEEPINESS) {
      throw new HttpsError("failed-precondition", "Too sleepy to adventure again today.");
    }

    const profile = battlePlayerProfile(kid);
    const enemy = scaledEnemy(adventureId, profile.level);
    const data = {
      kidId,
      adventureId,
      status: "active",
      turn: 1,
      playerName: kid.name || kidId,
      playerHp: profile.maxHp,
      playerMaxHp: profile.maxHp,
      playerSp: profile.maxSp,
      playerMaxSp: profile.maxSp,
      playerStats: profile.stats,
      basicName: profile.magicBasic ? "Spark" : "Attack",
      basicKind: profile.magicBasic ? "magic" : "physical",
      skill: profile.skill,
      enemyName: enemy.name,
      enemyIcon: enemy.icon,
      enemyHp: enemy.maxHp,
      enemyMaxHp: enemy.maxHp,
      enemyAttack: enemy.attack,
      enemyDefense: enemy.defense,
      guarding: false,
      rewards: null,
      log: [`${kid.name || kidId} encountered ${enemy.name}!`],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.update(kidRef, {
      energy: energy - adventure.energy,
      sleepiness: sleepiness + adventure.sleepiness,
      sleepinessDate: today,
      lastAdventureAt: FieldValue.serverTimestamp(),
    });
    transaction.create(battleRef, data);
    return publicBattleState(data, battleRef.id);
  });

  return result;
});

exports.battleAction = onCall({maxInstances: 3}, async (request) => {
  const kidId = authorizedKidId(request);
  const sessionId = String(request.data?.sessionId || "");
  const action = String(request.data?.action || "");
  if (!sessionId) throw new HttpsError("invalid-argument", "Battle session required.");
  if (!["basic", "skill", "defend"].includes(action)) {
    throw new HttpsError("invalid-argument", "Unknown battle action.");
  }

  const battleRef = db.collection("battleSessions").doc(sessionId);
  const kidRef = db.collection("kids").doc(kidId);

  const result = await db.runTransaction(async (transaction) => {
    const [battleSnap, kidSnap] = await Promise.all([
      transaction.get(battleRef),
      transaction.get(kidRef),
    ]);
    if (!battleSnap.exists) throw new HttpsError("not-found", "Battle not found.");
    if (!kidSnap.exists) throw new HttpsError("not-found", "Adventurer not found.");

    const battle = battleSnap.data();
    if (battle.kidId !== kidId) throw new HttpsError("permission-denied", "That is not your battle.");
    if (battle.status !== "active") return publicBattleState(battle, sessionId);

    const stats = battle.playerStats || {};
    let playerHp = Number(battle.playerHp || 0);
    let playerSp = Number(battle.playerSp || 0);
    let enemyHp = Number(battle.enemyHp || 0);
    let guarding = false;
    const log = Array.isArray(battle.log) ? [...battle.log] : [];
    const luck = Number(stats.luck || 0);
    const critChance = Math.min(0.28, 0.04 + luck * 0.006);
    const crit = Math.random() < critChance;

    if (action === "defend") {
      guarding = true;
      playerSp = Math.min(Number(battle.playerMaxSp || 0), playerSp + 1);
      log.push(`${battle.playerName} defends and recovers 1 SP.`);
    } else {
      const isSkill = action === "skill";
      const skill = battle.skill || BATTLE_SKILLS.warrior;
      if (isSkill && playerSp < Number(skill.cost || 0)) {
        throw new HttpsError("failed-precondition", "Not enough SP.");
      }

      const kind = isSkill ? skill.kind : battle.basicKind;
      const statValue = kind === "magic" ? Number(stats.wisdom || 0) : Number(stats.strength || 0);
      const multiplier = isSkill ? Number(skill.multiplier || 1.5) : 1;
      const defense = Number(battle.enemyDefense || 0);
      const variance = 0.9 + Math.random() * 0.2;
      let damage = Math.max(1, Math.round((statValue * multiplier + Number(stats.agility || 0) * 0.15) * variance - defense));
      if (crit) damage = Math.round(damage * 1.6);
      enemyHp = Math.max(0, enemyHp - damage);
      if (isSkill) playerSp -= Number(skill.cost || 0);
      const actionName = isSkill ? skill.name : battle.basicName;
      log.push(`${battle.playerName} uses ${actionName} for ${damage} damage${crit ? " — critical hit!" : "!"}`);
    }

    let status = "active";
    let rewards = null;

    if (enemyHp <= 0) {
      status = "won";
      const adventure = ADVENTURES[battle.adventureId] || ADVENTURES.forest;
      const rewardRoll = 0.9 + Math.random() * 0.2;
      const xp = Math.max(1, Math.round(adventure.xp * rewardRoll));
      const gold = Math.max(1, Math.round(adventure.gold * rewardRoll));
      const kid = kidSnap.data();
      const newXp = Number(kid.xp || 0) + xp;
      const newLevel = Math.floor(newXp / 100) + 1;
      rewards = {xp, gold, level: newLevel};
      transaction.update(kidRef, {
        xp: newXp,
        gold: Number(kid.gold || 0) + gold,
        level: newLevel,
      });
      log.push(`${battle.enemyName} is defeated! +${xp} XP, +${gold} Gold.`);
    } else {
      const dodgeChance = Math.min(0.25, Number(stats.agility || 0) * 0.006);
      if (Math.random() < dodgeChance) {
        log.push(`${battle.playerName} dodges ${battle.enemyName}'s attack!`);
      } else {
        const courageReduction = Math.floor(Number(stats.courage || 0) * 0.16);
        let enemyDamage = Math.max(1, Math.round(Number(battle.enemyAttack || 1) * (0.9 + Math.random() * 0.2)) - courageReduction);
        if (guarding) enemyDamage = Math.max(1, Math.ceil(enemyDamage / 2));
        playerHp = Math.max(0, playerHp - enemyDamage);
        log.push(`${battle.enemyName} hits for ${enemyDamage} damage${guarding ? " through your guard." : "."}`);
      }

      if (playerHp <= 0) {
        status = "lost";
        log.push(`${battle.playerName} is defeated and returns to the Guild Hall.`);
      }
    }

    const patch = {
      status,
      turn: Number(battle.turn || 1) + 1,
      playerHp,
      playerSp,
      enemyHp,
      guarding: false,
      log: log.slice(-12),
      rewards,
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.update(battleRef, patch);
    return publicBattleState({...battle, ...patch}, sessionId);
  });

  return result;
});
