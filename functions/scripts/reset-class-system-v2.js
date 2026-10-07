/* eslint-disable max-len, require-jsdoc */
"use strict";

const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");

initializeApp({projectId: "chorequest-3a721"});
const db = getFirestore();

async function main() {
  const markerRef = db.collection("systemMigrations").doc("classTreeV2Reset");
  const markerSnap = await markerRef.get();

  if (markerSnap.exists) {
    console.log("Class Tree V2 reset already completed; nothing to do.");
    return;
  }

  const kidsSnap = await db.collection("kids").get();
  const batch = db.batch();

  kidsSnap.forEach((kidDoc) => {
    batch.update(kidDoc.ref, {
      classId: "noob",
      classTitle: "Noob",
      classPath: "Noob",
      classBranch1: "",
      classBranch2: "",
      classLevels: {noob: 1},
      classXp: {noob: 0},
      supportClasses: [],
      masteredClasses: [],
      level: 1,
      xp: 0,
      gold: 0,
      sp: 0,
      inventory: [],
      equipment: {},
      inventoryVersion: 4,
      foodInventory: {},
      activeCompanions: [],
      energy: 30,
      sleepiness: 0,
      sleepinessDate: "",
      rebirths: 0,
      lastAdventureAt: FieldValue.delete(),
    });
  });

  batch.set(markerRef, {
    completedAt: FieldValue.serverTimestamp(),
    resetKidCount: kidsSnap.size,
    version: 2,
  });

  await batch.commit();
  console.log(`Class Tree V2 reset completed for ${kidsSnap.size} kid profiles.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
