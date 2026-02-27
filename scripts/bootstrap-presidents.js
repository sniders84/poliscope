// scripts/bootstrap-presidents.js
// Build base presidents-rankings.json from presidents.json with full empty schema

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROSTER_PATH = path.join(ROOT, 'data', 'presidents.json');
const RANKINGS_PATH = path.join(ROOT, 'public', 'presidents-rankings.json');

function loadPresidents() {
  const raw = fs.readFileSync(ROSTER_PATH, 'utf8');
  return JSON.parse(raw);
}

function buildEmptyMetrics() {
  return {
    crisisManagement: {
      crisisOverview: '',
      majorCrises: [],
      wartimeLeadership: [],
      domesticUnrest: [],
     disasterResponse: [],
      internationalCrises: []
    },
    domesticPolicy: {
      domesticOverview: '',
      socialPolicy: [],
      civilRights: [],
      educationPolicy: [],
      healthcarePolicy: [],
      infrastructureAndUrbanPolicy: []
    },
    economicPolicy: {
      economicOverview: '',
      fiscalPolicy: [],
      monetaryAndFinancialPolicy: [],
      tradeAndIndustrialPolicy: [],
      laborAndEmploymentPolicy: [],
      economicCrisisManagement: []
    },
    foreignPolicy: {
      foreignPolicyOverview: '',
      diplomacyAndAlliances: [],
      warAndMilitaryInterventions: [],
      internationalInstitutionsAndAgreements: [],
      humanRightsAndDemocracyPromotion: [],
      globalEconomicAndSecurityPolicy: []
    },
    judicialPolicy: {
      judicialOverview: '',
      supremeCourtAppointments: [],
      lowerCourtAppointments: [],
      judicialPhilosophyAndDoctrine: [],
      civilLibertiesAndRightsJurisprudence: [],
      separationOfPowersAndExecutiveAuthority: []
    },
    legislation: {
      legislationOverview: '',
      majorLegislativeActions: [],
      economicLegislation: [],
      domesticLegislation: [],
      foreignLegislation: [],
      governmentStructureLegislation: []
    },
    misconduct: {
      misconductOverview: '',
      corruptionAndAbuseOfPower: [],
      civilRightsAndLibertiesViolations: [],
      warCrimesAndHumanRightsAbuses: [],
      democraticNormsAndRuleOfLawErosion: []
    }
  };
}

function buildEmptyScores() {
  return {
    crisisManagement: 0,
    domesticPolicy: 0,
    economicPolicy: 0,
    foreignPolicy: 0,
    judicialPolicy: 0,
    legislation: 0,
    misconduct: 0,
    powerScore: 0,
    eraNormalizedScore: 0,
    rank: null
  };
}

function main() {
  const presidents = loadPresidents();

  const rankings = presidents.map(p => ({
    id: p.id,
    name: p.name,
    termStart: p.termStart,
    termEnd: p.termEnd,
    party: p.party,
    metrics: buildEmptyMetrics(),
    scores: buildEmptyScores()
  }));

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2), 'utf8');
  console.log(`bootstrap-presidents: wrote ${rankings.length} records to presidents-rankings.json`);
}

main();
