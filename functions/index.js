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
