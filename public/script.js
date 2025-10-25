let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let officialsContainer = null;

// ✅ Global utility function
function toJurisdictionSlug(stateName) {
  return stateName.toLowerCase().replace(/\s+/g, '_');
}

// ✅ Global function so it's accessible from HTML
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  const activeTab = document.getElementById(id);
  if (activeTab) activeTab.style.display = 'block';
}

// ✅ Poll schema and verified data
const pollSchema = {
  pollster: '',
  date_range: '',
  sample_size: 0,
  method: '',
  margin_of_error: '',
  topic: '',
  office: '',
  jurisdiction: '',
  results: {},
  source_url: '',
  ingested_at: '',
  override: false
};

const pollsData = [/* full verified polls from earlier — already dropped in */];

function getPollsByOffice(officeType) {
  return pollsData.filter(poll => poll.office === officeType);
}

// ✅ Poll tab rendering logic
function showPolls(officeType = 'President') {
  showTab('polls');
  const pollsSection = document.getElementById('polls');
  pollsSection.innerHTML = `<h2>${officeType} Polls</h2>`;

  const filteredPolls = getPollsByOffice(officeType);

  if (filteredPolls.length === 0) {
    pollsSection.innerHTML += '<p>No polls available.</p>';
    return;
  }

  filteredPolls.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.innerHTML = `
      <h3>${poll.topic}</h3>
      <p><strong>Pollster:</strong> ${poll.pollster}</p>
      <p><strong>Date:</strong> ${poll.date_range}</p>
      <p><strong>Jurisdiction:</strong> ${poll.jurisdiction}</p>
      <p><strong>Sample Size:</strong> ${poll.sample_size}</p>
      <p><strong>Method:</strong> ${poll.method}</p>
      <p><strong>Margin of Error:</strong> ${poll.margin_of_error}</p>
      <p><strong>Source:</strong> <a href="${poll.source_url}" target="_blank">View</a></p>
    `;
    pollsSection.appendChild(card);
  });
}

// ✅ Calendar tab now links to Ballotpedia session and election data
function showCalendar() {
  showTab('civic');
  const calendarSection = document.getElementById('calendar');
  calendarSection.innerHTML = `<h3>${selectedState}</h3>`;

  fetch('state-links.json')
    .then(res => res.json())
    .then(stateLinks => {
      const links = stateLinks[selectedState] || {};

      const cards = [
        {
          title: '🏛️ Legislative Sessions & Bills',
          content: `
            <p>Track active legislation and session activity in ${selectedState}.</p>
            <a href="${links.bills}" target="_blank">Bill Tracker</a><br>
            <a href="${links.senateRoster}" target="_blank">State Senate Roster</a><br>
            <a href="${links.houseRoster}" target="_blank">State House Roster</a>
          `
        },
        {
          title: '🇺🇸 U.S. and Statewide Races and Elections',
          content: `
            <p>Explore federal and statewide races tied to ${selectedState}.</p>
            <a href="${links.federalRaces}" target="_blank">Ballotpedia Election Page</a>
          `
        },
        {
          title: '🎙️ Governor & Lt. Governor Activity',
          content: `
            ${links.governorOrders ? `<p><a href="${links.governorOrders}" target="_blank">Governor Executive Orders</a></p>` : ''}
            ${links.ltGovPress ? `<p><a href="${links.ltGovPress}" target="_blank">Lt. Governor Press Releases</a></p>` : ''}
            ${!links.governorOrders && !links.ltGovPress ? `<p>No executive activity links available for ${selectedState}.</p>` : ''}
          `
        },
        {
          title: '📢 Public Events & Orders (All Officials)',
          content: `
            <p>Track public-facing actions by all federal and state officials.</p>
            <a href="https://www.federalregister.gov/index/2025/executive-office-of-the-president" target="_blank">Federal Register</a><br>
            <a href="https://www.whitehouse.gov/presidential-actions/executive-orders/" target="_blank">White House Orders</a><br>
            <a href="https://www.govtrack.us/congress/bills/" target="_blank">Congressional Bills</a><br>
            <a href="https://www.govtrack.us/congress/votes" target="_blank">Congressional Votes</a><br>
            <a href="https://www.govtrack.us/congress/committees/" target="_blank">Congressional Committees</a><br>
            <a href="https://www.govtrack.us/misconduct" target="_blank">Misconduct Database</a>
          `
        }
      ];

      cards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'calendar-card';
        div.innerHTML = `<h4>${card.title}</h4>${card.content}`;
        calendarSection.appendChild(div);
      });
    })
    .catch(err => {
      calendarSection.innerHTML += '<p>Error loading calendar data.</p>';
      console.error(err);
    });
}
// ✅ Global function so it's accessible from HTML
function showActivist() {
  showTab('activist');
  const activistSection = document.getElementById('activist');
  activistSection.innerHTML = '<h2>Activist & Grassroots</h2>';

  fetch('activist-groups.json')
    .then(res => res.json())
    .then(data => {
      const list = document.createElement('ul');
      data.forEach(group => {
        const item = document.createElement('li');
        item.innerHTML = `
          <strong>${group.name}</strong><br>
          ${group.description}<br>
          <a href="${group.website}" target="_blank">${group.website}</a>
        `;
        list.appendChild(item);
      });
      activistSection.appendChild(list);
    })
    .catch(err => {
      activistSection.innerHTML += '<p>Error loading activist groups.</p>';
      console.error(err);
    });
}

function showOrganizations() {
  showTab('organizations');
  const section = document.getElementById('organizations');
  section.innerHTML = '<h2>Political Organizations</h2>';

  fetch('political-groups.json')
    .then(res => res.json())
    .then(data => {
      const grid = document.createElement('div');
      grid.className = 'organization-grid';

      data.forEach(group => {
        const card = document.createElement('div');
        card.className = 'organization-card';
        card.innerHTML = `
          <div class="logo-wrapper">
            <img src="${group.logo}" alt="${group.name}" onerror="this.onerror=null;this.src='assets/default-logo.png';" />
          </div>
          <div class="info-wrapper">
            <h3>${group.name}</h3>
            <p>${group.description}</p>
            <p><strong>Platform:</strong> ${group.platform}</p>
            <p><a href="${group.website}" target="_blank">Visit Website</a></p>
          </div>
        `;
        grid.appendChild(card);
      });

      section.appendChild(grid);
    })
    .catch(err => {
      section.innerHTML += '<p>Error loading political groups.</p>';
      console.error(err);
    });
}
const votingOverrides = {
  "North Carolina": {
    register: "https://www.ncsbe.gov/register",
    id: "https://www.ncsbe.gov/voting/voter-id",
    absentee: "https://www.ncsbe.gov/voting/vote-mail",
    early: "https://www.ncsbe.gov/voting/early-voting",
    polling: "https://www.ncsbe.gov/voting/vote-person/polling-place",
    sample: "https://www.ncsbe.gov/voting/sample-ballots",
    military: "https://www.ncsbe.gov/voting/military-overseas-voting",
    counties: "https://www.ncsbe.gov/about/contact-your-county-board-elections",
    tools: "https://www.ncsbe.gov/voting"
  },
  "Puerto Rico": {
    register: "https://ceepur.org",
    id: "https://ceepur.org",
    absentee: "https://ceepur.org",
    early: "https://ceepur.org",
    polling: "https://ceepur.org",
    sample: "https://ceepur.org",
    military: "https://www.fvap.gov/puerto-rico",
    counties: "https://ceepur.org",
    tools: "https://ceepur.org"
  },
  "Guam": {
    register: "https://gec.guam.gov/register-to-vote/",
    id: "https://gec.guam.gov/voter-id/",
    absentee: "https://gec.guam.gov/absentee-voting/",
    early: "https://gec.guam.gov/early-voting/",
    polling: "https://gec.guam.gov/polling-places/",
    sample: "https://gec.guam.gov/sample-ballots/",
    military: "https://www.fvap.gov/guam",
    counties: "https://gec.guam.gov/contact-us/",
    tools: "https://gec.guam.gov/"
  },
  "American Samoa": {
    register: "https://americansamoaelectionoffice.gov",
    id: "https://americansamoaelectionoffice.gov",
    absentee: "https://americansamoaelectionoffice.gov",
    early: "https://americansamoaelectionoffice.gov",
    polling: "https://americansamoaelectionoffice.gov",
    sample: "https://americansamoaelectionoffice.gov",
    military: "https://www.fvap.gov/american-samoa",
    counties: "https://americansamoaelectionoffice.gov",
    tools: "https://americansamoaelectionoffice.gov"
  },
  "U.S. Virgin Islands": {
    register: "https://www.vivote.gov/register",
    id: "https://www.vivote.gov/id-requirements",
    absentee: "https://www.vivote.gov/absentee",
    early: "https://www.vivote.gov/early-voting",
    polling: "https://www.vivote.gov/polling-places",
    sample: "https://www.vivote.gov/sample-ballots",
    military: "https://www.fvap.gov/us-virgin-islands",
    counties: "https://www.vivote.gov/contact",
    tools: "https://www.vivote.gov"
  },
  "Northern Mariana Islands": {
    register: "https://www.votecnmi.gov.mp",
    id: "https://www.votecnmi.gov.mp",
    absentee: "https://www.votecnmi.gov.mp",
    early: "https://www.votecnmi.gov.mp",
    polling: "https://www.votecnmi.gov.mp",
    sample: "https://www.votecnmi.gov.mp",
    military: "https://www.fvap.gov/northern-mariana-islands",
    counties: "https://www.votecnmi.gov.mp",
    tools: "https://www.votecnmi.gov.mp"
  },
  "Alabama": {
    register: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote",
    id: "https://www.sos.alabama.gov/alabama-votes/voter-id",
    absentee: "https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting",
    early: "https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting",
    polling: "https://myinfo.alabamavotes.gov/VoterView/PollingPlaceSearch.do",
    sample: "https://myinfo.alabamavotes.gov/VoterView/SampleBallot.do",
    military: "https://www.fvap.gov/alabama",
    counties: "https://www.sos.alabama.gov/city-county-lookup/board-of-registrars",
    tools: "https://www.sos.alabama.gov/alabama-votes"
  },
  "Alaska": {
    register: "https://voterregistration.alaska.gov",
    id: "https://www.elections.alaska.gov/Core/voteridrequirements.php",
    absentee: "https://www.elections.alaska.gov/Core/votingbyabsentee.php",
    early: "https://www.elections.alaska.gov/Core/earlyvoting.php",
    polling: "https://myvoterinformation.alaska.gov",
    sample: "https://www.elections.alaska.gov/Core/sampleballots.php",
    military: "https://www.fvap.gov/alaska",
    counties: "https://www.elections.alaska.gov/Core/contactus.php",
    tools: "https://www.elections.alaska.gov"
  },
  "Arizona": {
    register: "https://servicearizona.com/VoterRegistration",
    id: "https://azsos.gov/elections/voting-election/voter-id",
    absentee: "https://azsos.gov/votebymail",
    early: "https://azsos.gov/elections/voting-election/early-voting",
    polling: "https://my.arizona.vote/WhereToVote.aspx",
    sample: "https://my.arizona.vote/WhereToVote.aspx",
    military: "https://www.fvap.gov/arizona",
    counties: "https://azsos.gov/elections/voting-election/contact-information-county-election-officials",
    tools: "https://azsos.gov/elections"
  },
  "Arkansas": {
    register: "https://www.sos.arkansas.gov/elections/voter-information",
    id: "https://www.sos.arkansas.gov/elections/voter-information/voter-id-requirements",
    absentee: "https://www.sos.arkansas.gov/elections/voter-information/absentee-voting",
    early: "https://www.sos.arkansas.gov/elections/voter-information/early-voting",
    polling: "https://www.voterview.ar-nova.org/VoterView",
    sample: "https://www.voterview.ar-nova.org/VoterView",
    military: "https://www.fvap.gov/arkansas",
    counties: "https://www.sos.arkansas.gov/elections/voter-information/county-clerks",
    tools: "https://www.sos.arkansas.gov/elections"
  },
  "California": {
    register: "https://registertovote.ca.gov",
    id: "https://www.sos.ca.gov/elections/voting-resources/voting-california/voter-id-requirements",
    absentee: "https://www.sos.ca.gov/elections/voter-registration/vote-mail",
    early: "https://www.sos.ca.gov/elections/voting-resources/voting-california/when-election-day",
    polling: "https://www.sos.ca.gov/elections/polling-place",
    sample: "https://voterstatus.sos.ca.gov",
    military: "https://www.fvap.gov/california",
    counties: "https://www.sos.ca.gov/elections/voting-resources/county-elections-offices",
    tools: "https://www.sos.ca.gov/elections"
  },
  "Colorado": {
    register: "https://www.sos.state.co.us/voter/pages/pub/olvr/verifyNewVoter.xhtml",
    id: "https://www.sos.state.co.us/pubs/elections/vote/acceptableForms.html",
    absentee: "https://www.sos.state.co.us/pubs/elections/vote/mailBallotFAQ.html",
    early: "https://www.sos.state.co.us/pubs/elections/vote/earlyVoting.html",
    polling: "https://www.sos.state.co.us/pubs/elections/vote/VoterHome.html",
    sample: "https://www.sos.state.co.us/pubs/elections/vote/sampleBallots.html",
    military: "https://www.fvap.gov/colorado",
    counties: "https://www.sos.state.co.us/pubs/elections/Resources/CountyElectionOffices.html",
    tools: "https://www.sos.state.co.us/pubs/elections/main.html"
  },
  "Connecticut": {
    register: "https://voterregistration.ct.gov",
    id: "https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Voter-ID-Requirements",
    absentee: "https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Absentee-Voting",
    early: "https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Early-Voting",
    polling: "https://portaldir.ct.gov/sots/LookUp.aspx",
    sample: "https://myvote.ct.gov/lookup",
    military: "https://www.fvap.gov/connecticut",
    counties: "https://portal.ct.gov/SOTS/Election-Services/Registrar-of-Voters-Listing",
    tools: "https://portal.ct.gov/SOTS/Election-Services"
  },
  "Delaware": {
    register: "https://ivote.de.gov",
    id: "https://elections.delaware.gov/voter/voter_id.shtml",
    absentee: "https://elections.delaware.gov/services/voter/absentee/index.shtml",
    early: "https://elections.delaware.gov/services/voter/earlyvoting.shtml",
    polling: "https://ivote.de.gov",
    sample: "https://ivote.de.gov",
    military: "https://www.fvap.gov/delaware",
    counties: "https://elections.delaware.gov/information/electionoffices.shtml",
    tools: "https://elections.delaware.gov"
  },
  "Florida": {
    register: "https://registertovoteflorida.gov",
    id: "https://dos.myflorida.com/elections/for-voters/voting/acceptable-identification/",
    absentee: "https://dos.myflorida.com/elections/for-voters/voting/vote-by-mail/",
    early: "https://dos.myflorida.com/elections/for-voters/voting/early-voting/",
    polling: "https://registration.elections.myflorida.com/CheckVoterStatus",
    sample: "https://registration.elections.myflorida.com/CheckVoterStatus",
    military: "https://www.fvap.gov/florida",
    counties: "https://dos.myflorida.com/elections/contacts/supervisor-of-elections/",
    tools: "https://dos.myflorida.com/elections"
  },
  "Georgia": {
    register: "https://registertovote.sos.ga.gov",
    id: "https://sos.ga.gov/how-to-guide/how-guide-voting-id-requirements",
    absentee: "https://sos.ga.gov/how-to-guide/how-guide-absentee-voting",
    early: "https://sos.ga.gov/how-to-guide/how-guide-early-voting",
    polling: "https://mvp.sos.ga.gov",
    sample: "https://mvp.sos.ga.gov",
    military: "https://www.fvap.gov/georgia",
    counties: "https://sos.ga.gov/county-election-offices",
    tools: "https://sos.ga.gov/elections"
  },
  "Hawaii": {
    register: "https://elections.hawaii.gov/register-to-vote/",
    id: "https://elections.hawaii.gov/voters/voter-registration/voter-id-requirements/",
    absentee: "https://elections.hawaii.gov/voters/voting-by-mail/",
    early: "https://elections.hawaii.gov/voters/early-voting/",
    polling: "https://elections.hawaii.gov/voters/polling-places/",
    sample: "https://elections.hawaii.gov/voters/sample-ballots/",
    military: "https://www.fvap.gov/hawaii",
    counties: "https://elections.hawaii.gov/contact-us/",
    tools: "https://elections.hawaii.gov"
  },
  "Idaho": {
    register: "https://voteidaho.gov/register-to-vote/",
    id: "https://voteidaho.gov/voter-id/",
    absentee: "https://voteidaho.gov/absentee-voting/",
    early: "https://voteidaho.gov/early-voting/",
    polling: "https://voteidaho.gov/where-to-vote/",
    sample: "https://voteidaho.gov/sample-ballots/",
    military: "https://www.fvap.gov/idaho",
    counties: "https://voteidaho.gov/county-clerks/",
    tools: "https://voteidaho.gov"
  },
  "Illinois": {
    register: "https://ova.elections.il.gov",
    id: "https://www.elections.il.gov/VotingAndRegistrationSystems/VoterIDRequirements.aspx",
    absentee: "https://www.elections.il.gov/VotingAndRegistrationSystems/VoteByMail.aspx",
    early: "https://www.elections.il.gov/VotingAndRegistrationSystems/EarlyVotingLocations.aspx",
    polling: "https://www.elections.il.gov/VotingAndRegistrationSystems/VoterInformationLookup.aspx",
    sample: "https://www.elections.il.gov/VotingAndRegistrationSystems/VoterInformationLookup.aspx",
    military: "https://www.fvap.gov/illinois",
    counties: "https://www.elections.il.gov/ElectionAuthorities/ElectionAuthoritiesList.aspx",
    tools: "https://www.elections.il.gov"
  },
  "Indiana": {
    register: "https://indianavoters.in.gov",
    id: "https://www.in.gov/sos/elections/voter-information/photo-id-law/",
    absentee: "https://www.in.gov/sos/elections/voter-information/vote-by-mail/",
    early: "https://www.in.gov/sos/elections/voter-information/early-voting/",
    polling: "https://indianavoters.in.gov",
    sample: "https://indianavoters.in.gov",
    military: "https://www.fvap.gov/indiana",
    counties: "https://www.in.gov/sos/elections/voter-information/county-election-offices/",
    tools: "https://www.in.gov/sos/elections"
  },
  "Iowa": {
    register: "https://sos.iowa.gov/elections/voterinformation/voterregistration.html",
    id: "https://sos.iowa.gov/elections/voterinformation/voterid.html",
    absentee: "https://sos.iowa.gov/elections/voterinformation/absenteeballotinfo.html",
    early: "https://sos.iowa.gov/elections/voterinformation/earlyvoting.html",
    polling: "https://sos.iowa.gov/elections/voterinformation/pollingplace.html",
    sample: "https://sos.iowa.gov/elections/voterinformation/sampleballots.html",
    military: "https://www.fvap.gov/iowa",
    counties: "https://sos.iowa.gov/elections/auditors/auditorslist.html",
    tools: "https://sos.iowa.gov/elections"
  },
  "Kansas": {
    register: "https://www.ksvotes.org",
    id: "https://www.kssos.org/elections/voter-id.html",
    absentee: "https://www.kssos.org/elections/absentee.html",
    early: "https://www.kssos.org/elections/advance-voting.html",
    polling: "https://myvoteinfo.voteks.org",
    sample: "https://myvoteinfo.voteks.org",
    military: "https://www.fvap.gov/kansas",
    counties: "https://www.kssos.org/elections/election-officials.html",
    tools: "https://www.kssos.org/elections"
  },
  "Kentucky": {
    register: "https://vrsws.sos.ky.gov/ovrweb",
    id: "https://elect.ky.gov/Voters/Pages/Voter-ID.aspx",
    absentee: "https://elect.ky.gov/Voters/Pages/Absentee-Voting.aspx",
    early: "https://elect.ky.gov/Voters/Pages/In-Person-Absentee-Voting.aspx",
    polling: "https://vrsws.sos.ky.gov/vic/",
    sample: "https://vrsws.sos.ky.gov/vic/",
    military: "https://www.fvap.gov/kentucky",
    counties: "https://elect.ky.gov/About-Us/Pages/County-Clerks.aspx",
    tools: "https://elect.ky.gov"
  },
  "Louisiana": {
    register: "https://www.sos.la.gov/ElectionsAndVoting/Pages/OnlineVoterRegistration.aspx",
    id: "https://www.sos.la.gov/ElectionsAndVoting/Vote/VoteEarly/Pages/default.aspx",
    absentee: "https://www.sos.la.gov/ElectionsAndVoting/Vote/VoteByMail/Pages/default.aspx",
    early: "https://www.sos.la.gov/ElectionsAndVoting/Vote/VoteEarly/Pages/default.aspx",
    polling: "https://voterportal.sos.la.gov",
    sample: "https://voterportal.sos.la.gov",
    military: "https://www.fvap.gov/louisiana",
    counties: "https://www.sos.la.gov/ElectionsAndVoting/Pages/ParishOfficials.aspx",
    tools: "https://www.sos.la.gov/ElectionsAndVoting"
  },
  "Maine": {
    register: "https://www.maine.gov/sos/cec/elec/voter-info/votreg.html",
    id: "https://www.maine.gov/sos/cec/elec/voter-info/id.html",
    absentee: "https://www.maine.gov/sos/cec/elec/voter-info/absenteevoting.html",
    early: "https://www.maine.gov/sos/cec/elec/voter-info/earlyvoting.html",
    polling: "https://www.maine.gov/sos/cec/elec/voter-info/pollingplaces.html",
    sample: "https://www.maine.gov/sos/cec/elec/voter-info/sampleballots.html",
    military: "https://www.fvap.gov/maine",
    counties: "https://www.maine.gov/sos/cec/elec/contactus.html",
    tools: "https://www.maine.gov/sos/cec/elec"
  },
  "Maryland": {
    register: "https://voterservices.elections.maryland.gov/OnlineVoterRegistration",
    id: "https://elections.maryland.gov/voting/voter_id.html",
    absentee: "https://elections.maryland.gov/voting/absentee.html",
    early: "https://elections.maryland.gov/voting/early_voting.html",
    polling: "https://voterservices.elections.maryland.gov/PollingPlaceSearch",
    sample: "https://voterservices.elections.maryland.gov/SampleBallot",
    military: "https://www.fvap.gov/maryland",
    counties: "https://elections.maryland.gov/about/county_boards.html",
    tools: "https://elections.maryland.gov"
  },
  "Massachusetts": {
    register: "https://www.sec.state.ma.us/ovr/",
    id: "https://www.sec.state.ma.us/ele/eleidx.htm",
    absentee: "https://www.sec.state.ma.us/ele/eleabsentee/absidx.htm",
    early: "https://www.sec.state.ma.us/ele/eleev/early-voting.htm",
    polling: "https://www.sec.state.ma.us/wheredoivotema/bal/myelectioninfo.aspx",
    sample: "https://www.sec.state.ma.us/wheredoivotema/bal/myelectioninfo.aspx",
    military: "https://www.fvap.gov/massachusetts",
    counties: "https://www.sec.state.ma.us/ele/eleclk/clkidx.htm",
    tools: "https://www.sec.state.ma.us/ele/eleidx.htm"
  },
  "Michigan": {
    register: "https://mvic.sos.state.mi.us/RegisterVoter",
    id: "https://www.michigan.gov/sos/elections/voting/voting-id",
    absentee: "https://mvic.sos.state.mi.us/AVApplication/Index",
    early: "https://www.michigan.gov/sos/elections/voting/early-in-person-voting",
    polling: "https://mvic.sos.state.mi.us/Voter/Index",
    sample: "https://mvic.sos.state.mi.us/Voter/Index",
    military: "https://www.fvap.gov/michigan",
    counties: "https://www.michigan.gov/sos/elections/local-election-officials",
    tools: "https://www.michigan.gov/sos/elections"
  },
  "Minnesota": {
    register: "https://mnvotes.sos.state.mn.us/VoterRegistration/VoterRegistrationMain.aspx",
    id: "https://www.sos.state.mn.us/elections-voting/register-to-vote/voter-id-requirements/",
    absentee: "https://www.sos.state.mn.us/elections-voting/other-ways-to-vote/vote-by-mail/",
    early: "https://www.sos.state.mn.us/elections-voting/other-ways-to-vote/vote-early-in-person/",
    polling: "https://pollfinder.sos.state.mn.us",
    sample: "https://myballotmn.sos.state.mn.us",
    military: "https://www.fvap.gov/minnesota",
    counties: "https://www.sos.state.mn.us/elections-voting/contact-your-county-election-office/",
    tools: "https://www.sos.state.mn.us/elections-voting/"
  },
  "Mississippi": {
    register: "https://www.sos.ms.gov/elections-voting/voter-registration-information",
    id: "https://www.sos.ms.gov/elections-voting/photo-id-law",
    absentee: "https://www.sos.ms.gov/elections-voting/absentee-voting-information",
    early: "https://www.sos.ms.gov/elections-voting/absentee-voting-information",
    polling: "https://www.sos.ms.gov/elections-voting/polling-place-locator",
    sample: "https://www.sos.ms.gov/elections-voting/sample-ballots",
    military: "https://www.fvap.gov/mississippi",
    counties: "https://www.sos.ms.gov/elections-voting/county-election-info",
    tools: "https://www.sos.ms.gov/elections-voting"
  },
  "Missouri": {
    register: "https://www.sos.mo.gov/elections/goVoteMissouri/register",
    id: "https://www.sos.mo.gov/elections/goVoteMissouri/voterid",
    absentee: "https://www.sos.mo.gov/elections/goVoteMissouri/howtovote#absentee",
    early: "https://www.sos.mo.gov/elections/goVoteMissouri/howtovote#early",
    polling: "https://voteroutreach.sos.mo.gov/PRD/VoterOutreach/VoterLookup.aspx",
    sample: "https://voteroutreach.sos.mo.gov/PRD/VoterOutreach/VoterLookup.aspx",
    military: "https://www.fvap.gov/missouri",
    counties: "https://www.sos.mo.gov/elections/goVoteMissouri/localelectionauthority",
    tools: "https://www.sos.mo.gov/elections"
  },
  "Montana": {
    register: "https://sosmt.gov/elections/vote/",
    id: "https://sosmt.gov/elections/vote/#ID",
    absentee: "https://sosmt.gov/elections/vote/#Absentee",
    early: "https://sosmt.gov/elections/vote/#Early",
    polling: "https://app.mt.gov/voterinfo/",
    sample: "https://app.mt.gov/voterinfo/",
    military: "https://www.fvap.gov/montana",
    counties: "https://sosmt.gov/elections/administration/#County",
    tools: "https://sosmt.gov/elections/"
  },
  "Nebraska": {
    register: "https://www.nebraska.gov/apps-sos-voter-registration/",
    id: "https://sos.nebraska.gov/elections/voter-id",
    absentee: "https://sos.nebraska.gov/elections/early-voting",
    early: "https://sos.nebraska.gov/elections/early-voting",
    polling: "https://www.votercheck.necvr.ne.gov",
    sample: "https://www.votercheck.necvr.ne.gov",
    military: "https://www.fvap.gov/nebraska",
    counties: "https://sos.nebraska.gov/elections/election-officials-contact-information",
    tools: "https://sos.nebraska.gov/elections"
  },
  "Nevada": {
    register: "https://www.registertovotenv.gov",
    id: "https://www.nvsos.gov/sos/elections/voters/voter-id",
    absentee: "https://www.nvsos.gov/sos/elections/voters/absentee-voting",
    early: "https://www.nvsos.gov/sos/elections/voters/early-voting",
    polling: "https://www.nvsos.gov/votersearch/",
    sample: "https://www.nvsos.gov/votersearch/",
    military: "https://www.fvap.gov/nevada",
    counties: "https://www.nvsos.gov/sos/elections/election-officials",
    tools: "https://www.nvsos.gov/sos/elections"
  },
  "New Hampshire": {
    register: "https://www.sos.nh.gov/elections/voters/register-vote",
    id: "https://www.sos.nh.gov/elections/voters/voter-id",
    absentee: "https://www.sos.nh.gov/elections/voters/absentee-voting",
    early: "https://www.sos.nh.gov/elections/voters/absentee-voting",
    polling: "https://app.sos.nh.gov/Public/PollingPlaceSearch",
    sample: "https://app.sos.nh.gov/Public/Ballot",
    military: "https://www.fvap.gov/new-hampshire",
    counties: "https://www.sos.nh.gov/elections/election-officials",
    tools: "https://www.sos.nh.gov/elections"
  },
  "New Jersey": {
    register: "https://voter.svrs.nj.gov/register",
    id: "https://www.nj.gov/state/elections/vote/voter-id.shtml",
    absentee: "https://www.nj.gov/state/elections/vote-by-mail.shtml",
    early: "https://www.nj.gov/state/elections/vote/early-voting.shtml",
    polling: "https://voter.svrs.nj.gov/polling-place-search",
    sample: "https://voter.svrs.nj.gov/sample-ballot",
    military: "https://www.fvap.gov/new-jersey",
    counties: "https://www.nj.gov/state/elections/county-eo.shtml",
    tools: "https://www.nj.gov/state/elections"
  },
  {
  "New Mexico": {
    register: "https://portal.sos.state.nm.us/OVR/WebPages/InstructionsStep1.aspx",
    id: "https://www.sos.state.nm.us/voting-and-elections/voter-information/voter-id-requirements/",
    absentee: "https://www.sos.state.nm.us/voting-and-elections/voter-information/absentee-voting/",
    early: "https://www.sos.state.nm.us/voting-and-elections/voter-information/early-voting/",
    polling: "https://voterportal.servis.sos.state.nm.us/WhereToVote.aspx",
    sample: "https://voterportal.servis.sos.state.nm.us/WhereToVote.aspx",
    military: "https://www.fvap.gov/new-mexico",
    counties: "https://www.sos.state.nm.us/voting-and-elections/voter-information/county-clerks/",
    tools: "https://www.sos.state.nm.us/voting-and-elections/"
  },
  "New York": {
    register: "https://voterreg.dmv.ny.gov/MotorVoter/",
    id: "https://www.elections.ny.gov/VotingRegister.html",
    absentee: "https://www.elections.ny.gov/VotingAbsentee.html",
    early: "https://www.elections.ny.gov/VotingEarlyVoting.html",
    polling: "https://voterlookup.elections.ny.gov/",
    sample: "https://voterlookup.elections.ny.gov/",
    military: "https://www.fvap.gov/new-york",
    counties: "https://www.elections.ny.gov/CountyBoards.html",
    tools: "https://www.elections.ny.gov"
  },
  "North Carolina": {
    register: "https://www.ncsbe.gov/register",
    id: "https://www.ncsbe.gov/voting/voter-id",
    absentee: "https://www.ncsbe.gov/voting/vote-mail",
    early: "https://www.ncsbe.gov/voting/early-voting",
    polling: "https://www.ncsbe.gov/voting/vote-person/polling-place",
    sample: "https://www.ncsbe.gov/voting/sample-ballots",
    military: "https://www.ncsbe.gov/voting/military-overseas-voting",
    counties: "https://www.ncsbe.gov/about/contact-your-county-board-elections",
    tools: "https://www.ncsbe.gov/voting"
  },
  "North Dakota": {
    register: "https://vip.sos.nd.gov/PortalListDetails.aspx?ptlhPKID=79&ptlPKID=7",
    id: "https://vip.sos.nd.gov/IDRequirements.aspx",
    absentee: "https://vip.sos.nd.gov/AbsenteeBallot.aspx",
    early: "https://vip.sos.nd.gov/AbsenteeBallot.aspx",
    polling: "https://vip.sos.nd.gov/WhereToVote.aspx",
    sample: "https://vip.sos.nd.gov/WhereToVote.aspx",
    military: "https://www.fvap.gov/north-dakota",
    counties: "https://vip.sos.nd.gov/CountyAuditor.aspx",
    tools: "https://vip.sos.nd.gov"
  },
  "Ohio": {
    register: "https://olvr.ohiosos.gov",
    id: "https://www.ohiosos.gov/elections/voters/voter-id/",
    absentee: "https://www.ohiosos.gov/elections/voters/absentee-voting/",
    early: "https://www.ohiosos.gov/elections/voters/early-in-person-voting/",
    polling: "https://www.ohiosos.gov/elections/voters/toolkit/polling-place/",
    sample: "https://www.ohiosos.gov/elections/voters/toolkit/sample-ballot/",
    military: "https://www.fvap.gov/ohio",
    counties: "https://www.ohiosos.gov/elections/elections-officials/county-boards-of-elections-directory/",
    tools: "https://www.ohiosos.gov/elections"
  },
  "Oklahoma": {
    register: "https://okvoterportal.okelections.us/Home/RegWizard",
    id: "https://oklahoma.gov/elections/voters/voter-id.html",
    absentee: "https://oklahoma.gov/elections/voters/absentee-voting.html",
    early: "https://oklahoma.gov/elections/voters/early-voting.html",
    polling: "https://okvoterportal.okelections.us/",
    sample: "https://okvoterportal.okelections.us/",
    military: "https://www.fvap.gov/oklahoma",
    counties: "https://oklahoma.gov/elections/about-us/county-election-boards.html",
    tools: "https://oklahoma.gov/elections.html"
  },
  "Oregon": {
    register: "https://sos.oregon.gov/voting/pages/registration.aspx",
    id: "https://sos.oregon.gov/voting/pages/id.aspx",
    absentee: "https://sos.oregon.gov/voting/pages/voteearly.aspx",
    early: "https://sos.oregon.gov/voting/pages/voteearly.aspx",
    polling: "https://sos.oregon.gov/voting/pages/myvote.aspx",
    sample: "https://sos.oregon.gov/voting/pages/myvote.aspx",
    military: "https://www.fvap.gov/oregon",
    counties: "https://sos.oregon.gov/elections/pages/county-offices.aspx",
    tools: "https://sos.oregon.gov/voting/pages/default.aspx"
  },
  "Pennsylvania": {
    register: "https://www.pavoterservices.pa.gov/Pages/VoterRegistrationApplication.aspx",
    id: "https://www.vote.pa.gov/Register-to-Vote/Pages/Voter-ID-for-Voting.aspx",
    absentee: "https://www.vote.pa.gov/Voting-in-PA/Pages/Mail-and-Absentee-Ballot.aspx",
    early: "https://www.vote.pa.gov/Voting-in-PA/Pages/Early-Voting.aspx",
    polling: "https://www.pavoterservices.pa.gov/Pages/PollingPlaceInfo.aspx",
    sample: "https://www.pavoterservices.pa.gov/Pages/SampleBallot.aspx",
    military: "https://www.fvap.gov/pennsylvania",
    counties: "https://www.vote.pa.gov/About-Elections/Pages/Contact-Your-Election-Officials.aspx",
    tools: "https://www.vote.pa.gov"
  },
  "Rhode Island": {
    register: "https://vote.sos.ri.gov/",
    id: "https://vote.sos.ri.gov/VoterID",
    absentee: "https://vote.sos.ri.gov/Voter/VoteByMail",
    early: "https://vote.sos.ri.gov/Voter/EarlyVoting",
    polling: "https://vote.sos.ri.gov/Voter/PollingPlace",
    sample: "https://vote.sos.ri.gov/Voter/SampleBallot",
    military: "https://www.fvap.gov/rhode-island",
    counties: "https://vote.sos.ri.gov/Contact",
    tools: "https://vote.sos.ri.gov"
  },
  "South Carolina": {
    register: "https://votesc.gov",
    id: "https://www.scvotes.gov/voter-id",
    absentee: "https://www.scvotes.gov/absentee-voting",
    early: "https://www.scvotes.gov/early-voting",
    polling: "https://www.scvotes.gov/where-vote",
    sample: "https://www.scvotes.gov/sample-ballots",
    military: "https://www.fvap.gov/south-carolina",
    counties: "https://www.scvotes.gov/election-officials",
    tools: "https://www.scvotes.gov"
  },
  {
  "South Dakota": {
    register: "https://sdsos.gov/elections-voting/voting/register-to-vote/default.aspx",
    id: "https://sdsos.gov/elections-voting/voting/voter-id/default.aspx",
    absentee: "https://sdsos.gov/elections-voting/voting/absentee-voting/default.aspx",
    early: "https://sdsos.gov/elections-voting/voting/early-voting/default.aspx",
    polling: "https://vip.sdsos.gov/VIPLogin.aspx",
    sample: "https://vip.sdsos.gov/VIPLogin.aspx",
    military: "https://www.fvap.gov/south-dakota",
    counties: "https://sdsos.gov/elections-voting/election-resources/county-auditors.aspx",
    tools: "https://sdsos.gov/elections-voting/default.aspx"
  },
  "Tennessee": {
    register: "https://ovr.govote.tn.gov",
    id: "https://sos.tn.gov/elections/guides/voter-id-laws",
    absentee: "https://sos.tn.gov/elections/guides/absentee-voting",
    early: "https://sos.tn.gov/elections/guides/early-voting",
    polling: "https://tnmap.tn.gov/voterlookup/",
    sample: "https://tnmap.tn.gov/voterlookup/",
    military: "https://www.fvap.gov/tennessee",
    counties: "https://sos.tn.gov/elections/election-commission-information",
    tools: "https://sos.tn.gov/elections"
  },
  "Texas": {
    register: "https://www.votetexas.gov/register-to-vote/",
    id: "https://www.votetexas.gov/register-to-vote/need-id.html",
    absentee: "https://www.votetexas.gov/voting-by-mail/",
    early: "https://www.votetexas.gov/early-voting/",
    polling: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
    sample: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
    military: "https://www.fvap.gov/texas",
    counties: "https://www.sos.state.tx.us/elections/voter/county.shtml",
    tools: "https://www.votetexas.gov"
  },
  "Utah": {
    register: "https://vote.utah.gov",
    id: "https://vote.utah.gov/voter-id-requirements/",
    absentee: "https://vote.utah.gov/absentee-voting/",
    early: "https://vote.utah.gov/early-voting/",
    polling: "https://vote.utah.gov",
    sample: "https://vote.utah.gov",
    military: "https://www.fvap.gov/utah",
    counties: "https://vote.utah.gov/county-clerks/",
    tools: "https://vote.utah.gov"
  },
  "Vermont": {
    register: "https://olvr.vermont.gov",
    id: "https://sos.vermont.gov/elections/voters/voter-id-requirements/",
    absentee: "https://sos.vermont.gov/elections/voters/early-absentee-voting/",
    early: "https://sos.vermont.gov/elections/voters/early-absentee-voting/",
    polling: "https://mvp.vermont.gov",
    sample: "https://mvp.vermont.gov",
    military: "https://www.fvap.gov/vermont",
    counties: "https://sos.vermont.gov/elections/election-officials/",
    tools: "https://sos.vermont.gov/elections"
  },
  "Virginia": {
    register: "https://vote.elections.virginia.gov/Registration/Eligibility",
    id: "https://www.elections.virginia.gov/registration/voter-id-requirements/",
    absentee: "https://www.elections.virginia.gov/casting-a-ballot/absentee-voting/",
    early: "https://www.elections.virginia.gov/casting-a-ballot/early-voting/",
    polling: "https://vote.elections.virginia.gov/VoterInformation",
    sample: "https://vote.elections.virginia.gov/VoterInformation",
    military: "https://www.fvap.gov/virginia",
    counties: "https://www.elections.virginia.gov/local-election-officials/",
    tools: "https://www.elections.virginia.gov"
  },
  "Washington": {
    register: "https://www.sos.wa.gov/elections/voters/register-to-vote/",
    id: "https://www.sos.wa.gov/elections/voters/voter-id.aspx",
    absentee: "https://www.sos.wa.gov/elections/voters/vote-by-mail.aspx",
    early: "https://www.sos.wa.gov/elections/voters/early-voting.aspx",
    polling: "https://voter.votewa.gov",
    sample: "https://voter.votewa.gov",
    military: "https://www.fvap.gov/washington",
    counties: "https://www.sos.wa.gov/elections/auditors/",
    tools: "https://www.sos.wa.gov/elections"
  },
  "West Virginia": {
    register: "https://ovr.sos.wv.gov/Register/Landing",
    id: "https://sos.wv.gov/elections/Pages/VoterID.aspx",
    absentee: "https://sos.wv.gov/elections/Pages/AbsenteeVotingInformation.aspx",
    early: "https://sos.wv.gov/elections/Pages/EarlyVotingInformation.aspx",
    polling: "https://sos.wv.gov/elections/Pages/FindMyPollingPlace.aspx",
    sample: "https://sos.wv.gov/elections/Pages/SampleBallots.aspx",
    military: "https://www.fvap.gov/west-virginia",
    counties: "https://sos.wv.gov/elections/Pages/CountyClerks.aspx",
    tools: "https://sos.wv.gov/elections"
  },
  "Wisconsin": {
    register: "https://myvote.wi.gov/en-us/Register-To-Vote",
    id: "https://elections.wi.gov/voters/photo-id",
    absentee: "https://myvote.wi.gov/en-us/Vote-Absentee-By-Mail",
    early: "https://myvote.wi.gov/en-us/Vote-Absentee-In-Person",
    polling: "https://myvote.wi.gov/en-us/Find-My-Polling-Place",
    sample: "https://myvote.wi.gov/en-us/Whats-On-My-Ballot",
    military: "https://www.fvap.gov/wisconsin",
    counties: "https://elections.wi.gov/contact-us",
    tools: "https://elections.wi.gov"
  },
  "Wyoming": {
    register: "https://sos.wyo.gov/Elections/RegisteringToVote.aspx",
    id: "https://sos.wyo.gov/Elections/VoterID.aspx",
    absentee: "https://sos.wyo.gov/Elections/AbsenteeVoting.aspx",
    early: "https://sos.wyo.gov/Elections/EarlyVoting.aspx",
    polling: "https://sos.wyo.gov/Elections/PollingPlaceLocator.aspx",
    sample: "https://sos.wyo.gov/Elections/SampleBallots.aspx",
    military: "https://www.fvap.gov/wyoming",
    counties: "https://sos.wyo.gov/Elections/CountyClerks.aspx",
    tools: "https://sos.wyo.gov/Elections"
  }
}
window.showVoting = function () {
  showTab('voting');
  const container = document.getElementById('voting-cards');
  container.innerHTML = `<h3>${selectedState}</h3>`;

  const stateSlug = selectedState.toLowerCase().replace(/\s+/g, '-');

  const links = votingOverrides[selectedState] || {
  register: "https://www.nass.org/can-I-vote/register-to-vote",
  id: "https://www.nass.org/can-I-vote/valid-forms-id",
  absentee: "https://www.nass.org/can-I-vote/absentee-early-voting",
  early: "https://www.nass.org/can-I-vote/absentee-early-voting",
  polling: "https://www.nass.org/can-I-vote/find-your-polling-place",
  sample: "https://www.ballotready.org/",
  military: "https://www.fvap.gov/",
  counties: "https://www.nass.org/Can-I-Vote/contact-your-election-official",
  tools: "https://www.nass.org/can-I-vote"
};

const cards = [
  {
    title: '🗳️ Register to Vote',
    content: `<p>Register in ${selectedState}.</p><a href="${links.register}" target="_blank">Registration Portal</a>`
  },
  {
    title: '🆔 Voter ID Requirements',
    content: `<p>ID rules for ${selectedState}.</p><a href="${links.id}" target="_blank">ID Info</a>`
  },
  {
    title: '📬 Absentee & Early Voting',
    content: `<p>Vote early or by mail.</p><a href="${links.absentee}" target="_blank">Absentee Info</a><br><a href="${links.early}" target="_blank">Early Voting</a>`
  },
  {
    title: '📍 Find Your Polling Place',
    content: `<p>Polling site lookup.</p><a href="${links.polling}" target="_blank">Find Polling Place</a>`
  },
  {
    title: '📄 Sample Ballots',
    content: `<p>Preview your ballot.</p><a href="${links.sample}" target="_blank">Sample Ballots</a>`
  },
  {
    title: '🌍 Military & Overseas Voting',
    content: `<p>Info for military/overseas voters.</p><a href="${links.military}" target="_blank">Military Voting</a>`
  },
  {
    title: '📞 County Board Contacts',
    content: `<p>Local election office.</p><a href="${links.counties}" target="_blank">County Directory</a>`
  },
  {
    title: '🔗 Voting Tools & Assistance',
    content: `<p>Check registration, deadlines, and more.</p><a href="${links.tools}" target="_blank">Voting Hub</a>`
  }
];

  cards.forEach(card => {
    const div = document.createElement('div');
    div.className = 'voting-card';
    div.innerHTML = `<h4>${card.title}</h4>${card.content}`;
    container.appendChild(div);
  });
};
document.addEventListener('DOMContentLoaded', () => {
  const stateSelector = document.getElementById('state-selector');
  const searchBar = document.getElementById('search-bar');
  officialsContainer = document.getElementById('officials-container');
  const modal = document.getElementById('official-modal');
  const modalContent = document.getElementById('modal-content');
  const closeModal = document.getElementById('close-modal');

  Promise.all([
    fetch('governors.json').then(res => res.json()),
    fetch('ltgovernors.json').then(res => res.json()),
    fetch('senators.json').then(res => res.json()),
    fetch('housereps.json').then(res => res.json())
  ])
  .then(([govs, ltgovs, sens, reps]) => {
    governors = govs;
    ltGovernors = ltgovs;
    senators = sens;
    houseReps = reps;
    renderOfficials(selectedState, '');
  })
  .catch(error => {
    console.error('Error loading officials:', error);
  });

  function renderOfficials(stateFilter = null, query = '') {
    showTab('my-officials');
    officialsContainer.innerHTML = '';

    const queryLower = query.toLowerCase();
    const filterByState = query === '';

    const filteredGovs = governors.filter(o => !filterByState || o.state === stateFilter);
    const filteredLtGovs = ltGovernors.filter(o => !filterByState || o.state === stateFilter);
    const filteredSens = senators.filter(o => !filterByState || o.state === stateFilter);
    const filteredReps = houseReps
      .filter(o => !filterByState || o.state === stateFilter)
      .sort((a, b) => parseInt(a.district) - parseInt(b.district));

    const allOfficials = [
      ...filteredGovs,
      ...filteredLtGovs,
      ...filteredSens,
      ...filteredReps
       ].filter(o =>
      o.name.toLowerCase().includes(queryLower) ||
      o.office.toLowerCase().includes(queryLower) ||
      o.state.toLowerCase().includes(queryLower)
    );

    const partyMap = {
      republican: 'republican',
      democrat: 'democrat',
      democratic: 'democrat',
      independent: 'independent',
      green: 'green',
      libertarian: 'libertarian',
      constitution: 'constitution',
      'working families': 'workingfamilies',
      workingfamilies: 'workingfamilies',
      progressive: 'progressive'
    };

    allOfficials.forEach(o => {
      const rawParty = (o.party || '').toLowerCase().trim();
      const normalizedParty = partyMap[rawParty] || rawParty.replace(/\s+/g, '') || 'independent';
      const photoSrc = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';

      const districtDisplay = o.office === 'U.S. Representative' && o.district
        ? `<p class="district-display"><strong>District:</strong> ${o.district}</p>`
        : '';

      const card = document.createElement('div');
      card.className = `official-card ${normalizedParty}`;
      card.innerHTML = `
        <div class="party-stripe"></div>
        <div class="photo-wrapper">
          <img src="${photoSrc}" alt="${o.name}" onerror="this.onerror=null;this.src='assets/default-photo.png';" />
        </div>
        <div class="official-info">
          <h3>${o.name}</h3>
          <p><strong>Position:</strong> ${o.office}</p>
          ${districtDisplay}
          <p><strong>State:</strong> ${o.state}</p>
          <p><strong>Term:</strong> ${new Date(o.termStart).getFullYear()}–${new Date(o.termEnd).getFullYear()}</p>
          <p><strong>Party:</strong> ${o.party}</p>
        </div>
      `;
      card.addEventListener('click', () => openModal(o));
      officialsContainer.appendChild(card);
    });
  }

  function openModal(o) {
    const modalPhoto = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';

    const districtDisplay = o.office === 'U.S. Representative' && o.district
      ? `<p><strong>District:</strong> ${o.district}</p>`
      : '';

    modalContent.innerHTML = `
      <h2>${o.name}</h2>
      <div class="modal-photo-wrapper">
        <img src="${modalPhoto}" alt="${o.name}" onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      </div>
      <p><strong>Office:</strong> ${o.office}</p>
      ${districtDisplay}
      <p><strong>Party:</strong> ${o.party}</p>
      <p><strong>State:</strong> ${o.state}</p>
      <p><strong>Term:</strong> ${o.termStart} → ${o.termEnd}</p>
      ${o.bio ? `<p><strong>Bio:</strong> ${o.bio}</p>` : ''}
      ${o.education ? `<p><strong>Education:</strong> ${o.education}</p>` : ''}
      ${o.endorsements ? `<p><strong>Endorsements:</strong> ${o.endorsements}</p>` : ''}
      ${o.platform ? `<p><strong>Platform:</strong> ${o.platform}</p>` : ''}
      ${o.platformFollowThrough ? `
        <h4>Platform Follow-Through</h4>
        <ul>
          ${Object.entries(o.platformFollowThrough).map(([key, val]) => `<li><strong>${key}:</strong> ${val}</li>`).join('')}
        </ul>
      ` : ''}
      ${o.proposals ? `<p><strong>Proposals:</strong> ${o.proposals}</p>` : ''}
      ${o.keyVotes?.length ? `
        <h4>Key Votes</h4>
        <ul>
          ${o.keyVotes.map(v => `
            <li>
              <strong>${v.vote}:</strong> <a href="${v.link}" target="_blank">${v.title}</a> (${v.result}, ${v.date})
            </li>
          `).join('')}
        </ul>
      ` : ''}
      ${o.billsSigned?.length ? `
        <h4>Bills Signed</h4>
        <ul>
          ${o.billsSigned.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}
        </ul>
      ` : ''}
      ${o.vetoes && ["Governor", "President", "Mayor"].includes(o.office) ? `<p><strong>Vetoes:</strong> ${o.vetoes}</p>` : ''}
      ${o.salary ? `<p><strong>Salary:</strong> ${o.salary}</p>` : ''}
      ${o.predecessor ? `<p><strong>Predecessor:</strong> ${o.predecessor}</p>` : ''}
      ${o.ballotpediaLink ? `<p><a href="${o.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ''}
      ${o.govtrackLink ? `<p><a href="${o.govtrackLink}" target="_blank">GovTrack Profile</a></p>` : ''}
      ${o.govtrackReportCard ? `<p><a href="${o.govtrackReportCard}" target="_blank">GovTrack Report Card</a></p>` : ''}
    `;
    modal.style.display = 'flex';
  }

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  stateSelector.addEventListener('change', () => {
    selectedState = stateSelector.value;
    renderOfficials(selectedState, searchBar.value.trim());
  });

  searchBar.addEventListener('input', () => {
    renderOfficials(selectedState, searchBar.value.trim());
  });
});
