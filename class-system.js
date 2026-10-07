const pct = value => Number(value || 0) / 100;

export const CLASS_REWARD_LEVELS = [1, 3, 5, 7, 9];
export const SUPPORT_CLASS_1_LEVEL = 5;
export const SUPPORT_CLASS_2_LEVEL = 20;

const C = (name, category, maxLevel, role, icon, style, primary, secondary, unlock, rewards, visibility = "visible") => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  name, category, maxLevel, role, icon, style, primary, secondary, unlock, rewards, visibility
});

const RAW_CLASSES = [
  C("Noob","Starter",5,"Tutorial generalist","🙂","hybrid","luck","courage",[],{
    1:"Beginner Bonk — a cheap starter attack",
    3:"Choose a Path — Fighter and Mage unlock",
    5:"Jack of All Trades ★ — +1 max SP and +5% class XP earned"
  }),
  C("Fighter","Basic",9,"Physical foundation","⚔️","physical","strength","courage",[["noob",3]],{
    1:"Heavy Swing — basic SP strike",
    3:"Combat Drills — +3% physical damage",
    5:"Warrior / Rogue / Brawler / Ranger unlock milestone",
    7:"Second Wind — self-heal",
    9:"Veteran ★ — first Defend each battle restores +1 extra SP"
  }),
  C("Mage","Basic",9,"Magic foundation","🪄","magic","wisdom","luck",[["noob",3]],{
    1:"Arc Bolt — basic spell",
    3:"Mana Well — +1 max SP",
    5:"Acolyte / Elementalist / Time Mage / Alchemist unlock milestone",
    7:"Mana Surge — restore SP",
    9:"Arcane Memory ★ — first spell each battle costs 1 less SP"
  }),
  C("Warrior","Core",9,"Durable physical","🗡️","physical","strength","courage",[["fighter",3]],{
    1:"Power Strike",
    3:"Battle Hardened — +4% max HP",
    5:"Armor Break",
    7:"Second Wind",
    9:"Warrior Mastery ★ — +4% physical damage globally"
  }),
  C("Rogue","Core",9,"Speed, crits, utility","🗡️","speed","agility","luck",[["fighter",3]],{
    1:"Flurry",
    3:"Quick Hands — +3% crit chance",
    5:"Shadowstep",
    7:"Lucky Stab",
    9:"Rogue Mastery ★ — first crit each battle restores 1 SP"
  }),
  C("Brawler","Core",9,"Fast melee combos","🥊","physical","strength","agility",[["fighter",3]],{
    1:"Haymaker",
    3:"Tough Knuckles — +3% physical damage",
    5:"Combo Rush",
    7:"Adrenaline",
    9:"Brawler Mastery ★ — basic Attack has a small chance to strike twice"
  }),
  C("Ranger","Core",9,"Ranged mobility","🏹","speed","agility","kindness",[["fighter",3]],{
    1:"Piercing Shot",
    3:"Trail Instinct — +3% dodge",
    5:"Quick Volley",
    7:"Field Mend",
    9:"Ranger Mastery ★ — +5% companion trigger chance globally"
  }),
  C("Acolyte","Core",9,"Healing and protection","💚","support","kindness","wisdom",[["mage",3]],{
    1:"Mend",
    3:"Helping Hand — +5% healing",
    5:"Ward",
    7:"Kind Mend",
    9:"Acolyte Mastery ★ — healing grants a small shield"
  }),
  C("Elementalist","Core",9,"Elemental offense","🔥","magic","wisdom","agility",[["mage",3]],{
    1:"Ember",
    3:"Element Study — +3% magic damage",
    5:"Element Shift",
    7:"Storm Burst",
    9:"Elementalist Mastery ★ — weakness hits deal +10% damage"
  }),
  C("Time Mage","Core",9,"Tempo and SP control","⏳","speed","wisdom","agility",[["mage",3]],{
    1:"Haste",
    3:"Measured Step — +3% dodge",
    5:"Delay",
    7:"Quickened Mind",
    9:"Time Mastery ★ — small chance an SP skill refunds 1 SP"
  }),
  C("Alchemist","Core",9,"Mixtures and transformation","⚗️","utility","wisdom","luck",[["mage",3]],{
    1:"Tonic Toss",
    3:"Efficient Brewing — consumables +5%",
    5:"Catalyst",
    7:"Volatile Mix",
    9:"Alchemist Mastery ★ — first consumable each battle does not consume an item"
  }),
  C("Gardener","Odd Job",9,"Restoration and nature","🌱","support","kindness","courage",[["noob",5]],{
    1:"Prune",
    3:"Green Thumb — food healing +5%",
    5:"Cultivate",
    7:"Deep Roots",
    9:"Master Gardener ★ — all healing received +5% globally"
  }),
  C("Cook","Odd Job",9,"Food and buffs","🍳","utility","kindness","luck",[["noob",5]],{
    1:"Snack Toss",
    3:"Seasoned — food energy effects +5%",
    5:"Quick Meal",
    7:"Flambé",
    9:"Master Cook ★ — first food used each adventure grants +1 SP"
  }),
  C("Accountant","Odd Job",9,"Gold and analysis","🧮","utility","wisdom","luck",[["noob",5]],{
    1:"Balance Books",
    3:"Tax Deduction — +3% Gold earned",
    5:"Audit",
    7:"Compound Interest",
    9:"Certified Accountant ★ — +7% Gold globally"
  }),
  C("Clown","Odd Job",9,"Chaos and luck","🤡","chaos","luck","agility",[["noob",5]],{
    1:"Pie Toss",
    3:"Comic Timing — +2% crit and dodge",
    5:"Juggle",
    7:"Pratfall",
    9:"Master Clown ★ — harmful random outcomes are less likely"
  }),
  C("Fisher","Odd Job",9,"Loot and patience","🎣","utility","luck","courage",[["noob",5]],{
    1:"Hook",
    3:"Patient Angler — +4% equipment drop chance",
    5:"Net Cast",
    7:"Big Catch",
    9:"Master Fisher ★ — first loot roll each day gets a small rarity bonus"
  }),
  C("Blacksmith","Odd Job",9,"Gear and defense","🔨","physical","strength","courage",[["noob",5]],{
    1:"Hammer Blow",
    3:"Tempered Gear — +2% equipment stat effectiveness",
    5:"Reinforce",
    7:"Forge Edge",
    9:"Master Smith ★ — equipped items gain a tiny stat bonus"
  }),
  C("Knight","Advanced",9,"Tank and defense","🛡️","physical","courage","strength",[["warrior",5]],{
    1:"Shield Slam",
    3:"Plate Training — +5% max HP",
    5:"Cover",
    7:"Fortress",
    9:"Knight Mastery ★ — Defend also grants a small barrier next turn"
  }),
  C("Berserker","Advanced",9,"High-risk damage","🪓","physical","strength","courage",[["warrior",5],["brawler",3]],{
    1:"Rage",
    3:"Blood Rush — +5% physical damage below 50% HP",
    5:"Reckless Swing",
    7:"Frenzy",
    9:"Berserker Mastery ★ — low-HP damage bonus becomes stronger"
  }),
  C("Monk","Advanced",9,"Martial spirit","🙏","hybrid","agility","kindness",[["brawler",5],["acolyte",3]],{
    1:"Palm Strike",
    3:"Centered — +1 SP after Defend once per battle",
    5:"Meditate",
    7:"Inner Wave",
    9:"Monk Mastery ★ — +3% dodge and healing globally"
  }),
  C("Pirate","Advanced",9,"Aggressive treasure hunter","🏴‍☠️","physical","agility","luck",[["fighter",5],["fisher",3]],{
    1:"Cutlass Rush",
    3:"Plunder — +5% Gold and loot",
    5:"Broadside",
    7:"Captain's Gamble",
    9:"Pirate Mastery ★ — victory has a small chance to award bonus loot"
  }),
  C("Druid","Hybrid",9,"Nature magic and healing","🌿","support","kindness","wisdom",[["gardener",5],["elementalist",3]],{
    1:"Thorn Lash",
    3:"Natural Bond — +5% companion triggers",
    5:"Rejuvenate",
    7:"Tempest Grove",
    9:"Druid Mastery ★ — healing and elemental weakness damage +5%"
  }),
  C("Spellsword","Hybrid",9,"Melee and magic","⚔️","hybrid","strength","wisdom",[["warrior",5],["mage",5]],{
    1:"Spellblade",
    3:"Arcane Edge — +3% physical and magic damage",
    5:"Elemental Slash",
    7:"Mana Guard",
    9:"Spellsword Mastery ★ — first physical skill after a spell costs 1 less SP"
  }),
  C("Arcane Archer","Hybrid",9,"Ranged elemental damage","🎯","hybrid","agility","wisdom",[["ranger",5],["elementalist",3]],{
    1:"Arc Shot",
    3:"Charged Arrows — +5% weakness damage",
    5:"Frost Arrow",
    7:"Storm Volley",
    9:"Arcane Archer Mastery ★ — ranged crits restore 1 SP once per battle"
  }),
  C("Paladin","Hybrid",9,"Tank and healing","✨","support","courage","kindness",[["warrior",5],["acolyte",5]],{
    1:"Radiant Strike",
    3:"Graceful Guard — guarding improves healing next turn",
    5:"Lay on Hands",
    7:"Sanctuary",
    9:"Paladin Mastery ★ — once per battle survive a lethal hit at 1 HP"
  }),
  C("Illusionist","Hybrid",9,"Control and dodge","🪞","magic","wisdom","agility",[["clown",5],["mage",5]],{
    1:"Mirror Trick",
    3:"Misdirection — +5% dodge",
    5:"Phantom Double",
    7:"Confounding Flash",
    9:"Illusionist Mastery ★ — first enemy attack each battle has extra miss chance"
  }),
  C("Arithmetician","Hybrid",9,"Math magic and economy","➗","magic","wisdom","luck",[["accountant",5],["time-mage",3]],{
    1:"Calculated Strike",
    3:"Perfect Ledger — +5% Gold",
    5:"Prime Target",
    7:"Compound Cast",
    9:"Arithmetician Mastery ★ — every 3rd SP skill costs 1 less SP"
  }),
  C("Beastmaster","Hybrid",9,"Companion specialist","🐾","companion","kindness","agility",[["ranger",5],["gardener",3]],{
    1:"Command",
    3:"Bonded — +8% companion trigger chance",
    5:"Pack Tactics",
    7:"Wild Aid",
    9:"Beastmaster Mastery ★ — equip one extra companion effect in adventure calculations"
  }),
  C("Battle Chef","Hybrid",9,"Food-powered bruiser","🍲","physical","strength","kindness",[["cook",5],["brawler",3]],{
    1:"Pan Smash",
    3:"Full Stomach — food grants a tiny battle buff",
    5:"Spicy Combo",
    7:"Emergency Snack",
    9:"Battle Chef Mastery ★ — first food effect each battle is doubled"
  }),
  C("Rune Smith","Hybrid",9,"Magical equipment","🔱","hybrid","strength","wisdom",[["blacksmith",5],["mage",5]],{
    1:"Rune Hammer",
    3:"Etched Gear — +3% equipment stat effectiveness",
    5:"Ward Rune",
    7:"Overcharge Weapon",
    9:"Rune Smith Mastery ★ — first equipped-item bonus of each stat gains +1"
  }),
  C("Jester","Hybrid",9,"Luck manipulation","🃏","chaos","luck","agility",[["clown",5],["rogue",5]],{
    1:"Wild Card",
    3:"Loaded Dice — +4% crit",
    5:"Mockery",
    7:"Grand Finale",
    9:"Jester Mastery ★ — once per battle reroll a failed companion trigger"
  }),
  C("Elemental Avatar","Secret Prestige",9,"Martial elemental master","🌪️","hybrid","wisdom","agility",[["monk",5],["elementalist",5]],{
    1:"Flame Form",
    3:"Flowing Stance — +4% dodge",
    5:"Stone Guard",
    7:"Gale Step",
    9:"Avatar Mastery ★ — freely rotate elemental stance after using a skill"
  },"secret"),
  C("Velocity Hero","Secret Prestige",9,"Extreme speed","⚡","speed","agility","luck",[["brawler",5],["time-mage",5]],{
    1:"Velocity Strike",
    3:"Speed Force — +6% dodge",
    5:"Afterimage",
    7:"Time Break",
    9:"Velocity Mastery ★ — small chance basic Attack grants an immediate extra action"
  },"secret"),
  C("Hyde","Secret Prestige",9,"Transformation bruiser","🧪","physical","strength","courage",[["berserker",5],["alchemist",5]],{
    1:"Transform",
    3:"Unstable Strength — +6% physical damage",
    5:"Rampage",
    7:"Chemical Recovery",
    9:"Hyde Mastery ★ — transformation penalties are reduced and bonuses increase"
  },"secret"),
  C("Ascendant","Secret Prestige",9,"Escalating transformation","🌟","physical","strength","agility",[["monk",5],["berserker",5]],{
    1:"Awaken",
    3:"Rising Power — damage rises slightly as HP falls",
    5:"Second Form",
    7:"Limit Break",
    9:"Ascendant Mastery ★ — once per battle enter an empowered form below 35% HP"
  },"secret"),
  C("Rubber Buccaneer","Secret Prestige",9,"Elastic pirate bruiser","🏴‍☠️","speed","agility","luck",[["pirate",5],["brawler",5]],{
    1:"Long-Reach Punch",
    3:"Unbound Body — +5% dodge",
    5:"Spring Rush",
    7:"Captain's Barrage",
    9:"Rubber Buccaneer Mastery ★ — counterattack chance after dodging"
  },"secret"),
  C("Dragon Knight","Prestige",9,"Boss-hunting armored striker","🐉","hybrid","strength","courage",[["knight",5],["elementalist",5]],{
    1:"Dragon Lance",
    3:"Scaled Guard — +5% max HP",
    5:"Elemental Dive",
    7:"Dragon Ward",
    9:"Dragon Knight Mastery ★ — bonus damage against elite/boss enemies"
  },"prestige"),
  C("Summoner","Prestige",9,"Major companion effects","🔮","companion","kindness","wisdom",[["beastmaster",5],["mage",5]],{
    1:"Call Ally",
    3:"Deep Bond — +10% companion trigger chance",
    5:"Twin Call",
    7:"Grand Summon",
    9:"Summoner Mastery ★ — first companion trigger each battle is guaranteed"
  },"prestige"),
  C("Sage","Prestige",9,"Endgame support magic","📚","support","wisdom","kindness",[["druid",5],["arithmetician",5]],{
    1:"Insight",
    3:"Old Wisdom — +1 max SP",
    5:"Perfect Remedy",
    7:"Grand Formula",
    9:"Sage Mastery ★ — first support/heal skill each battle costs 1 less SP"
  },"prestige"),
  C("Chronomancer","Prestige",9,"Advanced time control","🕰️","speed","wisdom","agility",[["time-mage",5],["arithmetician",5]],{
    1:"Accelerate",
    3:"Temporal Sense — +4% dodge",
    5:"Rewind",
    7:"Stopwatch",
    9:"Chronomancer Mastery ★ — once per battle repeat the last non-heal skill at reduced power"
  },"prestige")
];

const STYLE_STATS = {
  physical: {strength:4,wisdom:0,agility:1,kindness:0,luck:0,courage:3},
  magic: {strength:0,wisdom:4,agility:1,kindness:1,luck:2,courage:0},
  speed: {strength:1,wisdom:1,agility:4,kindness:0,luck:3,courage:0},
  support: {strength:0,wisdom:2,agility:0,kindness:4,luck:1,courage:2},
  hybrid: {strength:2,wisdom:2,agility:2,kindness:1,luck:1,courage:2},
  utility: {strength:1,wisdom:2,agility:1,kindness:2,luck:3,courage:1},
  chaos: {strength:1,wisdom:1,agility:2,kindness:1,luck:4,courage:1},
  companion: {strength:1,wisdom:1,agility:2,kindness:4,luck:2,courage:1}
};

const titleCase = value => String(value || "").replace(/(^|[-_\s])([a-z])/g, (_,a,b) => (a ? " " : "") + b.toUpperCase());

function rewardName(text) {
  return String(text || "").split(" — ")[0].replace(/ ★.*$/,"").trim();
}

function extractPercent(text) {
  const match = String(text || "").match(/([0-9]+)%/);
  return match ? pct(match[1]) : 0;
}

function activeSkillFor(def, level, text) {
  if (!text || /unlock milestone|choose a path|mastery|★/i.test(text)) return null;
  const name = rewardName(text);
  const lower = String(text).toLowerCase();
  const nameLower = name.toLowerCase();
  const kind = ["magic","support","companion"].includes(def.style) ? "magic" : def.style === "hybrid" ? "hybrid" : "physical";
  const skill = {
    id: `${def.id}-${level}`,
    classId: def.id,
    level,
    name,
    icon: def.icon,
    cost: level === 1 ? 3 : level === 5 ? 4 : 5,
    kind: kind === "hybrid" ? (level === 5 ? "magic" : "physical") : kind,
    multiplier: level === 1 ? 1.55 : level === 5 ? 1.9 : 2.25,
    text: String(text)
  };

  if (/mend|heal|recovery|remedy|rejuvenate|meditate|lay on hands|snack|meal|tonic/i.test(nameLower)) {
    delete skill.kind;
    delete skill.multiplier;
    skill.healPct = level >= 7 ? 0.34 : level >= 5 ? 0.28 : 0.20;
  }
  if (/mana surge|quickened mind|insight|balance books|compound interest/i.test(nameLower)) {
    delete skill.kind;
    delete skill.multiplier;
    skill.spRestore = level >= 7 ? 4 : 3;
  }
  if (/guard|ward|fortress|cover|reinforce|stone guard|afterimage|sanctuary/i.test(nameLower)) {
    skill.guardTurns = level >= 7 ? 2 : 1;
    if (/afterimage/i.test(nameLower)) skill.evasionTurns = 2;
    if (!/slam|strike|lance|hammer/i.test(nameLower)) {
      delete skill.kind;
      delete skill.multiplier;
    }
  }
  if (/haste|gale step|accelerate|shadowstep/i.test(nameLower)) {
    skill.evasionTurns = 2;
    if (/haste|accelerate/i.test(nameLower)) skill.spRestore = 1;
  }
  if (/armor break|piercing|prime target|dragon lance|elemental dive|rune hammer|hammer blow/i.test(nameLower)) {
    skill.armorPierce = level >= 5 ? 0.55 : 0.35;
  }
  if (/lucky|gamble|wild card|grand finale|calculated|velocity|spring rush/i.test(nameLower)) {
    skill.critBonus = level >= 7 ? 0.18 : 0.10;
  }
  if (/rage|transform|awaken|second form|catalyst|forge edge|overcharge/i.test(nameLower)) {
    skill.damageBuffPct = level >= 7 ? 0.25 : 0.16;
    skill.damageBuffTurns = 2;
  }
  if (/flame|ember|frost|storm|element|tempest|arc shot|inner wave|radiant|grand formula/i.test(nameLower)) {
    skill.kind = "magic";
  }
  if (/flambé|broadside|volatile mix|big catch|pie toss|juggle|pratfall/i.test(nameLower)) {
    skill.kind = "physical";
    skill.critBonus = Number(skill.critBonus || 0) + 0.06;
  }
  if (/command|pack tactics|call ally|twin call|grand summon|wild aid/i.test(nameLower)) {
    delete skill.kind;
    delete skill.multiplier;
    skill.companionBoost = level >= 7 ? 0.22 : level >= 5 ? 0.16 : 0.10;
    if (/wild aid/i.test(nameLower)) skill.healPct = 0.24;
  }
  if (/delay|mockery|confounding flash|mirror trick|phantom double|net cast/i.test(nameLower)) {
    skill.enemyAttackDebuff = level >= 7 ? 0.22 : 0.15;
    skill.enemyAttackDebuffTurns = 2;
  }
  return skill;
}

function passiveFor(def, level, text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  const p = {id:`${def.id}-passive-${level}`, classId:def.id, level, name:rewardName(text), text:String(text)};
  const amount = extractPercent(text);

  if (lower.includes("physical damage")) p.physicalDamageBonus = amount || 0.03;
  if (lower.includes("magic damage")) p.magicDamageBonus = amount || 0.03;
  if (lower.includes("max hp")) p.maxHpMultiplier = 1 + (amount || 0.04);
  if (lower.includes("dodge")) p.dodgeBonus = amount || 0.03;
  if (lower.includes("crit")) p.critBonus = amount || 0.03;
  if (lower.includes("healing")) p.healBonus = amount || 0.05;
  if (lower.includes("gold")) p.goldMultiplier = 1 + (amount || 0.05);
  if (lower.includes("companion trigger")) p.companionProcBonus = amount || 0.05;
  if (lower.includes("max sp")) {
    const match = String(text).match(/\+([0-9]+) max sp/i);
    p.maxSpBonus = match ? Number(match[1]) : 1;
  }
  if (lower.includes("equipment stat")) p.equipmentBonusPct = amount || 0.02;
  if (lower.includes("drop chance") || lower.includes("loot")) p.lootBonus = amount || 0.04;
  if (lower.includes("weakness")) p.weaknessDamageBonus = amount || 0.05;
  if (lower.includes("class xp")) p.classXpMultiplier = 1.05;

  if (level === def.maxLevel) {
    const custom = {
      noob:{maxSpBonus:1,classXpMultiplier:1.05},
      fighter:{defendSpBonus:1},
      mage:{firstSpellDiscount:1},
      warrior:{physicalDamageBonus:0.04},
      rogue:{critRefund:1},
      brawler:{basicDoubleChance:0.10},
      ranger:{companionProcBonus:0.05},
      acolyte:{healShieldPct:0.10},
      elementalist:{weaknessDamageBonus:0.10},
      "time-mage":{skillSpRefundChance:0.12},
      alchemist:{consumableFree:1},
      gardener:{healingReceivedBonus:0.05},
      cook:{foodSpBonus:1},
      accountant:{goldMultiplier:1.07},
      clown:{chaosSafety:0.20},
      fisher:{lootBonus:0.08},
      blacksmith:{equipmentBonusPct:0.03},
      knight:{defendBarrierPct:0.10},
      berserker:{lowHpDamageBonus:0.12},
      monk:{dodgeBonus:0.03,healBonus:0.03},
      pirate:{bonusLootChance:0.12},
      druid:{healBonus:0.05,weaknessDamageBonus:0.05},
      spellsword:{crossClassDiscount:1},
      "arcane-archer":{rangedCritRefund:1},
      paladin:{lethalSave:1},
      illusionist:{firstAttackMissBonus:0.25},
      arithmetician:{everyThirdDiscount:1},
      beastmaster:{extraCompanion:1},
      "battle-chef":{foodDouble:1},
      "rune-smith":{equipmentFlatBonus:1},
      jester:{companionReroll:1},
      "elemental-avatar":{elementCycle:1},
      "velocity-hero":{extraActionChance:0.10},
      hyde:{transformMastery:1},
      ascendant:{lowHpEmpower:1},
      "rubber-buccaneer":{dodgeCounterChance:0.20},
      "dragon-knight":{bossDamageBonus:0.20},
      summoner:{guaranteedFirstCompanion:1},
      sage:{firstSupportDiscount:1},
      chronomancer:{repeatSkill:1}
    }[def.id];
    Object.assign(p, custom || {});
  }
  return p;
}

const DEFINITIONS = {};
RAW_CLASSES.forEach(raw => {
  const bias = {...(STYLE_STATS[raw.style] || STYLE_STATS.hybrid)};
  bias[raw.primary] = Number(bias[raw.primary] || 0) + 1;
  bias[raw.secondary] = Number(bias[raw.secondary] || 0) + 1;

  const activeSkills = [1,5,7]
    .map(level => activeSkillFor(raw, level, raw.rewards[level]))
    .filter(Boolean);
  const passives = [];
  if (raw.rewards[3] && !/unlock/i.test(raw.rewards[3])) passives.push(passiveFor(raw,3,raw.rewards[3]));
  const capstoneText = raw.rewards[raw.maxLevel];
  if (capstoneText) passives.push(passiveFor(raw,raw.maxLevel,capstoneText));

  DEFINITIONS[raw.id] = {
    ...raw,
    spriteId: raw.id,
    statBias: bias,
    activeSkills,
    passives,
    branches: []
  };
});

Object.values(DEFINITIONS).forEach(def => {
  def.unlock.forEach(([prereq]) => {
    if (DEFINITIONS[prereq]) DEFINITIONS[prereq].branches.push(def.id);
  });
});

export const CLASS_DEFINITIONS = DEFINITIONS;
export const CLASS_IDS = Object.keys(CLASS_DEFINITIONS);

export function classLevelFor(kid, classId) {
  const levels = kid?.classLevels && typeof kid.classLevels === "object" ? kid.classLevels : {};
  if (Number(levels[classId] || 0) > 0) return Number(levels[classId]);
  if (kid?.classId === classId) return 1;
  if (classId === "noob" && !kid?.classId) return 1;
  return 0;
}

export function classXpFor(kid, classId) {
  return Number(kid?.classXp?.[classId] || 0);
}

export function classXpNeededForLevel(level) {
  const n = Math.max(1, Number(level || 1)) - 1;
  return 25 * n + 5 * n * Math.max(0, n - 1) / 2;
}

export function classLevelFromXp(xp, maxLevel = 9) {
  let level = 1;
  while (level < maxLevel && Number(xp || 0) >= classXpNeededForLevel(level + 1)) level += 1;
  return level;
}

export function classRequirementText(def) {
  if (!def?.unlock?.length) return "Starting class";
  return def.unlock.map(([id, level]) => `${CLASS_DEFINITIONS[id]?.name || titleCase(id)} Lv ${level}`).join(" + ");
}

export function classIsUnlocked(kid, classId) {
  const def = CLASS_DEFINITIONS[classId];
  if (!def) return false;
  if (classId === "noob") return true;
  return def.unlock.every(([id, level]) => classLevelFor(kid, id) >= Number(level));
}

export function classIsVisible(kid, classId) {
  const def = CLASS_DEFINITIONS[classId];
  if (!def) return false;
  if (def.visibility === "visible") return true;
  if (classIsUnlocked(kid, classId)) return true;
  return def.unlock.some(([id, level]) => classLevelFor(kid, id) >= Math.min(5, Number(level)));
}

export function learnedClassIds(kid) {
  return CLASS_IDS.filter(id => classLevelFor(kid, id) > 0);
}

export function supportSlotCount(kid) {
  const level = Math.max(1, Number(kid?.level || 1));
  if (level >= SUPPORT_CLASS_2_LEVEL) return 2;
  if (level >= SUPPORT_CLASS_1_LEVEL) return 1;
  return 0;
}

export function learnedActiveSkills(kid, classId) {
  const def = CLASS_DEFINITIONS[classId];
  if (!def) return [];
  const level = classLevelFor(kid, classId);
  return def.activeSkills.filter(skill => level >= skill.level);
}

export function earnedPassivePerks(kid) {
  const perks = [];
  CLASS_IDS.forEach(classId => {
    const level = classLevelFor(kid, classId);
    CLASS_DEFINITIONS[classId].passives.forEach(passive => {
      if (level >= passive.level) perks.push(passive);
    });
  });
  return perks;
}

export function aggregatePassivePerks(kid) {
  const total = {
    maxHpMultiplier: 1,
    goldMultiplier: 1
  };
  earnedPassivePerks(kid).forEach(perk => {
    Object.entries(perk).forEach(([key,value]) => {
      if (["id","classId","level","name","text"].includes(key) || typeof value !== "number") return;
      if (key === "maxHpMultiplier" || key === "goldMultiplier") {
        total[key] *= value;
      } else {
        total[key] = Number(total[key] || 0) + value;
      }
    });
  });
  return total;
}

export function classXpRewardMultiplier(kid) {
  return Number(aggregatePassivePerks(kid).classXpMultiplier || 1);
}
