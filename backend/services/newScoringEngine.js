/**
 * newScoringEngine.js
 * Risk-domain (A: cosine alignment) + test-coverage (C) recommendation engine.
 * Implements NewScoringExplained.md. Config-driven:
 *   - data/new_questions.json     (option -> domainPoints + indicatedNeeds + effects)
 *   - data/new_scoringlogic.json  (weights, testRegistry+aliases, adequacy, burden, genderMap)
 *   - data/new_fortis_packages.json (the packages; profiles DERIVED from their test lists)
 *   - data/AHClisting.json        (oracle codes for the M/F variant)
 *
 * Package profiles and coverage are computed from the package test lists via the
 * testRegistry aliases — nothing is hand-authored per package.
 *
 * Output shape mirrors the legacy engine plus a `ranked` array and diagnostics.
 */

const questionsDoc = require('../data/new_questions.json');
const logic        = require('../data/new_scoringlogic.json');
const packagesDoc  = require('../data/new_fortis_packages.json');
const ahcListing   = require('../data/AHClisting.json');

const DOMAINS = ['M', 'C', 'O', 'G', 'X'];
const REG = logic.testRegistry;

// ---- option lookup: optionId -> { question, option } -----------------------
const OPTION = {};
for (const q of questionsDoc.questions) {
  for (const o of q.options) OPTION[o.id] = { q, o };
}

// ---- alias index: package/registry string -> registry id -------------------
const ALIAS_TO_ID = {};
for (const [id, entry] of Object.entries(REG)) {
  for (const a of entry.aliases) ALIAS_TO_ID[a.trim().toLowerCase()] = id;
}
function resolveId(name) {
  return ALIAS_TO_ID[String(name).trim().toLowerCase()] || null;
}

// ---- per-test importance for coverage = max domain importance --------------
function importanceOf(id) {
  const d = REG[id] && REG[id].domains;
  return d ? Math.max(...Object.values(d)) : 1;
}

// ---- package -> set of registry ids it contains (incl. _dataGaps) ----------
function packageItemIds(pkg) {
  const items = []
    .concat(pkg.consultations || [], pkg.investigations || [], pkg.diagnostics || []);
  if (pkg._dataGaps && Array.isArray(pkg._dataGaps.missingFromSheet)) {
    items.push(...pkg._dataGaps.missingFromSheet); // count as present
  }
  const ids = new Set();
  for (const it of items) {
    const id = resolveId(it);
    if (id) ids.add(id);
  }
  return ids;
}

// ---- package -> profile vector (sum of domain importances of its items) ----
function packageProfile(pkg) {
  const v = { M: 0, C: 0, O: 0, G: 0, X: 0 };
  for (const id of packageItemIds(pkg)) {
    const d = REG[id].domains;
    for (const [dom, imp] of Object.entries(d)) v[dom] += imp;
  }
  return v;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const d of DOMAINS) { dot += a[d] * b[d]; na += a[d] * a[d]; nb += b[d] * b[d]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function burdenTierFor(totalPoints, q8delta) {
  let base = logic.burdenTier.fromTotalDomainPoints[logic.burdenTier.fromTotalDomainPoints.length - 1].tier;
  for (const band of logic.burdenTier.fromTotalDomainPoints) {
    if (totalPoints <= band.upTo) { base = band.tier; break; }
  }
  const [lo, hi] = logic.burdenTier.clamp;
  return Math.max(lo, Math.min(hi, base + (q8delta || 0)));
}

/**
 * answers: array of { questionId, answerId }  (multi-select => repeat questionId)
 * returns full recommendation with ranked packages.
 */
function computeRecommendationV2(answers) {
  const v = { M: 0, C: 0, O: 0, G: 0, X: 0 };
  const conditionDomains = new Set();   // domains touched by Q3 condition options
  const rawNeeds = [];                  // {test, strength, appliesIf}
  let sex = 'M', ageBand = 1, q8delta = 0, amplify = 0;

  for (const ans of answers) {
    const found = OPTION[ans.answerId];
    if (!found) continue;
    const { o } = found;

    if (o.domainPoints) for (const [d, p] of Object.entries(o.domainPoints)) v[d] += p;
    if (o.tag && o.tag.sex) sex = o.tag.sex;
    if (o.tag && typeof o.tag.ageBand === 'number') ageBand = o.tag.ageBand;
    if (o.indicatedNeeds) rawNeeds.push(...o.indicatedNeeds);

    // record condition domains (Q3 options carry tag.condition)
    if (o.tag && o.tag.condition && o.domainPoints) {
      for (const d of Object.keys(o.domainPoints)) conditionDomains.add(d);
    }
    // effects
    if (o.effect) {
      if (o.effect.type === 'amplifyConditionDomains') amplify = Math.max(amplify, o.effect.amount || 0);
      if (o.effect.type === 'burden') q8delta = o.effect.delta || 0;
    }
  }

  // Q4 amplifier: add to each domain that a condition contributed to
  if (amplify > 0) for (const d of conditionDomains) v[d] += amplify;

  // ---- build indicated-need weights (aggregate strength = max, cap; gate by sex/age)
  const needStrength = {};
  for (const need of rawNeeds) {
    const id = resolveId(need.test) || (REG[need.test] ? need.test : null);
    if (!id) continue;
    const c = need.appliesIf;
    if (c) {
      if (c.sex && c.sex !== sex) continue;
      if (typeof c.minAgeBand === 'number' && ageBand < c.minAgeBand) continue;
    }
    const s = Math.min(logic.coverage.indicationCap, need.strength != null ? need.strength : 1.0);
    needStrength[id] = Math.max(needStrength[id] || 0, s);
  }
  const needWeights = {};
  let needTotal = 0;
  for (const [id, s] of Object.entries(needStrength)) {
    const w = s * importanceOf(id);
    needWeights[id] = w;
    needTotal += w;
  }

  const totalPoints = DOMAINS.reduce((acc, d) => acc + v[d], 0);
  const burdenTier = burdenTierFor(totalPoints, q8delta);
  const { wA_alignment: wA, wC_coverage: wC } = logic.weights;
  const breadth = logic.adequacy.packageBreadthTier;

  // ---- score every package ---------------------------------------------------
  const ranked = packagesDoc.packages.map(pkg => {
    const p = packageProfile(pkg);
    const alignment = cosine(v, p);
    const ids = packageItemIds(pkg);
    let covered = 0;
    const covers = [], misses = [];
    for (const [id, w] of Object.entries(needWeights)) {
      if (ids.has(id)) { covered += w; covers.push(REG[id].label); }
      else misses.push(REG[id].label);
    }
    const coverage = needTotal > 0 ? covered / needTotal : 0;
    const bt = breadth[pkg.id] != null ? breadth[pkg.id] : 2;
    const adequacy = Math.max(
      logic.adequacy.floor,
      1 - logic.adequacy.slope * Math.abs(bt - burdenTier)
    );
    const fit = 100 * (wA * alignment + wC * coverage) * adequacy;
    return {
      id: pkg.id, name: pkg.name, price: pkg.price,
      fit: Math.round(fit * 10) / 10,
      alignment: Math.round(alignment * 1000) / 1000,
      coverage: Math.round(coverage * 1000) / 1000,
      adequacy: Math.round(adequacy * 1000) / 1000,
      covers, misses,
      flags: pkg._dataGaps ? [`${pkg._dataGaps.missingFromSheet.join(', ')} assumed present — confirm with Fortis`] : []
    };
  }).sort((a, b) => b.fit - a.fit ||
      logic.tiebreaker.priority.indexOf(a.id) - logic.tiebreaker.priority.indexOf(b.id));

  // ---- winner -> oracle code via gender map ---------------------------------
  const winner = ranked[0];
  const oracleCode = logic.genderMap[winner.id] ? logic.genderMap[winner.id][sex] : null;
  const ahc = ahcListing.find(p => p.oracleCode === oracleCode);

  return {
    recommendedPackage: ahc
      ? { oracleCode: ahc.oracleCode, name: ahc.name, gender: ahc.gender, price: ahc.price }
      : { packageId: winner.id, name: winner.name, price: winner.price },
    ranked,
    diagnostics: {
      patientVector: v,
      dominantDomain: DOMAINS.reduce((m, d) => (v[d] > v[m] ? d : m), 'M'),
      sex, ageBand, burdenTier,
      indicatedNeeds: Object.fromEntries(
        Object.keys(needWeights).map(id => [REG[id].label, Math.round(needWeights[id] * 100) / 100])
      )
    }
  };
}

module.exports = { computeRecommendationV2, packageProfile, _internals: { resolveId, packageItemIds } };

// ---- self-test: `node services/newScoringEngine.js` ------------------------
if (require.main === module) {
  // Worked example from NewScoringExplained.md §8:
  // 42M, hypertension (partially controlled), breathless + palpitations,
  // main concern heart, standard depth, family heart disease, sedentary.
  const answers = [
    { questionId: 'q1', answerId: 'q1_30_45' },
    { questionId: 'q2', answerId: 'q2_m' },
    { questionId: 'q3', answerId: 'q3_htn' },
    { questionId: 'q4', answerId: 'q4_partial' },
    { questionId: 'q5', answerId: 'q5_chest' },
    { questionId: 'q5', answerId: 'q5_palp' },
    { questionId: 'q6', answerId: 'q6_none' },
    { questionId: 'q7', answerId: 'q7_heart' },
    { questionId: 'q8', answerId: 'q8_standard' },
    { questionId: 'q9', answerId: 'q9_heart' },
    { questionId: 'q10', answerId: 'q10_sedentary' }
  ];
  const r = computeRecommendationV2(answers);
  console.log('Patient vector:', r.diagnostics.patientVector, '| dominant:', r.diagnostics.dominantDomain, '| burdenTier:', r.diagnostics.burdenTier);
  console.log('Recommended:', r.recommendedPackage);
  console.log('Ranked:');
  for (const p of r.ranked) console.log(`  ${p.fit.toString().padStart(5)}  ${p.name}  (align ${p.alignment}, coverage ${p.coverage}, adeq ${p.adequacy})`);
}
