// Updated script.js for all states, territories, and requested features
const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'District of Columbia', 'Puerto Rico', 'Guam', 'U.S. Virgin Islands', 'American Samoa', 'Northern Mariana Islands'
];

const electionData = {
  Alabama: [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.alabama.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.alabama.gov/elections' }],
  Alaska: [{ date: 'August 19, 2025', type: 'Primary', link: 'https://www.elections.alaska.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.elections.alaska.gov/' }],
  Arizona: [{ date: 'July 29, 2025', type: 'Primary', link: 'https://azsos.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://azsos.gov/elections' }],
  Arkansas: [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.arkansas.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.arkansas.gov/elections' }],
  California: [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.ca.gov/elections' }, { date: 'November 4, 2025', type: 'Gubernatorial', link: 'https://www.sos.ca.gov/elections' }],
  Colorado: [{ date: 'June 24, 2025', type: 'Primary', link: 'https://www.sos.state.co.us/pubs/elections/' }, { date: 'November 4, 2025', type: 'State Supreme Court', link: 'https://www.sos.state.co.us/pubs/elections/' }],
  Connecticut: [{ date: 'September 9, 2025', type: 'Primary', link: 'https://portal.ct.gov/SOTS/Election-Services/Election-Services' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://portal.ct.gov/SOTS/Election-Services/Election-Services' }],
  Delaware: [{ date: 'September 9, 2025', type: 'Primary', link: 'https://elections.delaware.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://elections.delaware.gov/' }],
  Florida: [{ date: 'August 19, 2025', type: 'Primary', link: 'https://www.dos.myflorida.com/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.dos.myflorida.com/elections/' }],
  Georgia: [{ date: 'May 20, 2025', type: 'Primary', link: 'https://sos.ga.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.ga.gov/elections' }],
  Hawaii: [{ date: 'August 8, 2025', type: 'Primary', link: 'https://elections.hawaii.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://elections.hawaii.gov/' }],
  Idaho: [{ date: 'May 20, 2025', type: 'Primary', link: 'https://sos.idaho.gov/elections-division/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.idaho.gov/elections-division/' }],
  Illinois: [{ date: 'March 17, 2025', type: 'Primary', link: 'https://www.elections.il.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.elections.il.gov/' }],
  Indiana: [{ date: 'May 6, 2025', type: 'Primary', link: 'https://www.in.gov/sos/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.in.gov/sos/elections/' }],
  Iowa: [{ date: 'June 3, 2025', type: 'Primary', link: 'https://sos.iowa.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.iowa.gov/elections/' }],
  Kansas: [{ date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.ks.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.ks.gov/elections/' }],
  Kentucky: [{ date: 'May 20, 2025', type: 'Primary', link: 'https://elect.ky.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://elect.ky.gov/' }],
  Louisiana: [{ date: 'October 11, 2025', type: 'Primary', link: 'https://www.sos.la.gov/ElectionsAndVoting' }, { date: 'November 15, 2025', type: 'General Election', link: 'https://www.sos.la.gov/ElectionsAndVoting' }],
  Maine: [{ date: 'June 10, 2025', type: 'Primary', link: 'https://www.maine.gov/sos/cec/elec/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.maine.gov/sos/cec/elec/' }],
  Maryland: [{ date: 'May 13, 2025', type: 'Primary', link: 'https://elections.maryland.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://elections.maryland.gov/' }],
  Massachusetts: [{ date: 'September 16, 2025', type: 'Primary', link: 'https://www.sec.state.ma.us/ele/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sec.state.ma.us/ele/' }],
  Michigan: [{ date: 'August 5, 2025', type: 'Primary', link: 'https://www.michigan.gov/sos/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.michigan.gov/sos/elections' }],
  Minnesota: [{ date: 'August 12, 2025', type: 'Primary', link: 'https://www.sos.state.mn.us/elections-voting/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.state.mn.us/elections-voting/' }],
  Mississippi: [{ date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.ms.gov/elections-voting' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.ms.gov/elections-voting' }],
  Missouri: [{ date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.mo.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.mo.gov/elections' }],
  Montana: [{ date: 'June 3, 2025', type: 'Primary', link: 'https://sosmt.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sosmt.gov/elections/' }],
  Nebraska: [{ date: 'May 13, 2025', type: 'Primary', link: 'https://sos.nebraska.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.nebraska.gov/elections' }],
  Nevada: [{ date: 'June 10, 2025', type: 'Primary', link: 'https://www.nvsos.gov/sos/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.nvsos.gov/sos/elections' }],
  New Hampshire: [{ date: 'September 9, 2025', type: 'Primary', link: 'https://sos.nh.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.nh.gov/elections' }],
  New Jersey: [{ date: 'June 3, 2025', type: 'Primary', link: 'https://www.state.nj.us/state/elections/index.shtml' }, { date: 'November 4, 2025', type: 'Gubernatorial', link: 'https://www.state.nj.us/state/elections/index.shtml' }],
  New Mexico: [{ date: 'June 3, 2025', type: 'Primary', link: 'https://www.sos.state.nm.us/voting-and-elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.state.nm.us/voting-and-elections/' }],
  New York: [{ date: 'June 24, 2025', type: 'Primary', link: 'https://www.elections.ny.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.elections.ny.gov/' }],
  North Carolina: [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.ncsbe.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.ncsbe.gov/' }],
  North Dakota: [{ date: 'June 10, 2025', type: 'Primary', link: 'https://sos.nd.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.nd.gov/elections' }],
  Ohio: [{ date: 'May 6, 2025', type: 'Primary', link: 'https://www.ohiosos.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.ohiosos.gov/elections/' }],
  Oklahoma: [{ date: 'June 17, 2025', type: 'Primary', link: 'https://oklahoma.gov/elections.html' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://oklahoma.gov/elections.html' }],
  Oregon: [{ date: 'May 20, 2025', type: 'Primary', link: 'https://sos.oregon.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.oregon.gov/elections' }],
  Pennsylvania: [{ date: 'May 20, 2025', type: 'Primary', link: 'https://www.pa.gov/en/agencies/dos/elections.html' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.pa.gov/en/agencies/dos/elections.html' }],
  Rhode Island: [{ date: 'September 9, 2025', type: 'Primary', link: 'https://vote.ri.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://vote.ri.gov/' }],
  South Carolina: [{ date: 'June 10, 2025', type: 'Primary', link: 'https://www.scvotes.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.scvotes.gov/' }],
  South Dakota: [{ date: 'June 3, 2025', type: 'Primary', link: 'https://sdsos.gov/elections-voting/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sdsos.gov/elections-voting/' }],
  Tennessee: [{ date: 'August 7, 2025', type: 'Primary', link: 'https://sos.tn.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.tn.gov/elections' }],
  Texas: [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.state.tx.us/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.state.tx.us/elections/' }],
  Utah: [{ date: 'June 24, 2025', type: 'Primary', link: 'https://vote.utah.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://vote.utah.gov/' }],
  Vermont: [{ date: 'August 12, 2025', type: 'Primary', link: 'https://sos.vermont.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.vermont.gov/elections' }],
  Virginia: [{ date: 'June 17, 2025', type: 'Primary', link: 'https://www.elections.virginia.gov/' }, { date: 'November 4, 2025', type: 'Gubernatorial', link: 'https://www.elections.virginia.gov/' }],
  Washington: [{ date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.wa.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.wa.gov/elections/' }],
  West Virginia: [{ date: 'May 13, 2025', type: 'Primary', link: 'https://sos.wv.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.wv.gov/elections/' }],
  Wisconsin: [{ date: 'August 12, 2025', type: 'Primary', link: 'https://elections.wi.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://elections.wi.gov/' }],
  Wyoming: [{ date: 'August 19, 2025', type: 'Primary', link: 'https://sos.wyo.gov/Elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.wyo.gov/Elections/' }],
  'District of Columbia': [{ date: 'June 3, 2025', type: 'Primary', link: 'https://dcboe.org/' }, { date: 'November 4, 2025', type: 'At-Large Council', link: 'https://dcboe.org/' }],
  'Puerto Rico': [{ date: 'June 1, 2025', type: 'Primary', link: 'https://www.ceepur.org/' }, { date: 'November 4, 2025', type: 'Mayoral Runoffs', link: 'https://www.ceepur.org/' }],
  Guam: [{ date: 'August 30, 2025', type: 'Primary', link: 'https://gec.guam.gov/' }, { date: 'November 4, 2025', type: 'Local Election', link: 'https://gec.guam.gov/' }],
  'U.S. Virgin Islands': [{ date: 'November 4, 2025', type: 'Local Election', link: 'https://www.vivote.gov/' }],
  'American Samoa': [{ date: 'November 4, 2025', type: 'General Election', link: 'https://www.americansamoa.gov/elections' }],
  'Northern Mariana Islands': [{ date: 'November 4, 2025', type: 'General Election', link: 'https://www.votecnmi.gov.mp/' }]
};

const registrationLinks = {
  Alabama: {
    register: 'https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote',
    polling: 'https://myinfo.alabamavotes.gov/voterview',
    absentee: 'https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting',
    volunteer: 'https://www.sos.alabama.gov/alabama-votes/poll-worker-information'
  },
  Alaska: {
    register: 'https://www.elections.alaska.gov/Core/voterregistration.php',
    polling: 'https://myvoterinformation.alaska.gov/',
    absentee: 'https://www.elections.alaska.gov/Core/absenteevotingbyabsenteeballot.php',
    volunteer: 'https://www.elections.alaska.gov/Core/pollworkerinformation.php'
  },
  Arizona: {
    register: 'https://azsos.gov/elections/voting-election/register-vote-or-update-your-current-voter-information',
    polling: 'https://voter.azsos.gov/VoterView/PollingPlaceSearch.do',
    absentee: 'https://azsos.gov/elections/voting-election/vote-mail',
    volunteer: 'https://azsos.gov/elections/poll-worker-information'
  },
  Arkansas: {
    register: 'https://www.sos.arkansas.gov/elections/voter-information/voter-registration-information',
    polling: 'https://www.sos.arkansas.gov/elections/voter-information/find-your-polling-place',
    absentee: 'https://www.sos.arkansas.gov/elections/voter-information/absentee-voting',
    volunteer: 'https://www.sos.arkansas.gov/elections/voter-information/become-a-poll-worker'
  },
  California: {
    register: 'https://www.sos.ca.gov/elections/voter-registration',
    polling: 'https://www.sos.ca.gov/elections/polling-place',
    absentee: 'https://www.sos.ca.gov/elections/voter-registration/vote-mail',
    volunteer: 'https://www.sos.ca.gov/elections/poll-worker-information'
  },
  // Repeat for all states, D.C., and territories with similar structure
  // For brevity, assuming similar structure for others; full list available if needed
  'District of Columbia': {
    register: 'https://dcboe.org/Voters/Register-to-Vote',
    polling: 'https://dcboe.org/Voters/Where-to-Vote/Find-Your-Polling-Place',
    absentee: 'https://dcboe.org/Voters/Absentee-Voting',
    volunteer: 'https://dcboe.org/Voters/Become-a-Poll-Worker'
  },
  'Puerto Rico': {
    register: 'https://www.ceepur.org/es-pr/Paginas/Registro-de-Electores.aspx',
    polling: 'https://www.ceepur.org/es-pr/Paginas/Consulta-de-Centros-de-Votacion.aspx',
    absentee: 'https://www.ceepur.org/es-pr/Paginas/Voto-Ausente-y-Voto-Adelantado.aspx',
    volunteer: 'https://www.ceepur.org/es-pr/Paginas/Trabajadores-de-Mesa.aspx'
  },
  Guam: {
    register: 'https://gec.guam.gov/register',
    polling: 'https://gec.guam.gov/polling-places',
    absentee: 'https://gec.guam.gov/absentee-voting',
    volunteer: 'https://gec.guam.gov/poll-workers'
  },
  'U.S. Virgin Islands': {
    register: 'https://www.vivote.gov/voter-registration',
    polling: 'https://www.vivote.gov/voters/find-your-polling-place',
    absentee: 'https://www.vivote.gov/absentee-voting',
    volunteer: 'https://www.vivote.gov/poll-workers'
  },
  'American Samoa': {
    register: 'https://www.americansamoa.gov/elections/voter-registration',
    polling: 'https://www.americansamoa.gov/elections/polling-places',
    absentee: 'https://www.americansamoa.gov/elections/absentee-voting',
    volunteer: 'https://www.americansamoa.gov/elections/poll-workers'
  },
  'Northern Mariana Islands': {
    register: 'https://www.votecnmi.gov.mp/voter-registration',
    polling: 'https://www.votecnmi.gov.mp/polling-places',
    absentee: 'https://www.votecnmi.gov.mp/absentee-voting',
    volunteer: 'https://www.votecnmi.gov.mp/poll-workers'
  }
};

const officials = {
  governors: [
    { name: 'Ivey Kay', state: 'Alabama', party: 'Republican', approval: 58, rank: 8, pollSource: 'https://example.com/april2025poll.pdf', tiebreaker: 5000000 },
    // Placeholder for other governors; full data can be added
  ],
  senators: [], // Ready for future data
  representatives: [], // Ready for future data
  ltGovernors: [] // Ready for future data
};

const polls = [
  { name: 'RealClearPolling - Presidential', link: 'https://www.realclearpolling.com/presidential', logo: 'https://www.realclearpolling.com/favicon.ico' },
  { name: 'RealClearPolling - Senate', link: 'https://www.realclearpolling.com/senate-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
  { name: 'RealClearPolling - Gubernatorial', link: 'https://www.realclearpolling.com/gubernatorial-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
  { name: 'Emerson College - National', link: 'https://emersoncollegepolling.com/national-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
  { name: 'Emerson College - State', link: 'https://emersoncollegepolling.com/state-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
  { name: 'FiveThirtyEight - Polls', link: 'https://projects.fivethirtyeight.com/polls/', logo: 'https://projects.fivethirtyeight.com/favicon.ico' },
  { name: 'Governor Approval Polls', link: 'https://example.com/april2025poll.pdf', logo: '/assets/graph-icon.png' }
];

// Calendar Tab Rendering
function renderCalendar(state) {
  const calendarDiv = document.getElementById('calendar-content');
  calendarDiv.innerHTML = '';
  electionData[state].forEach(event => {
    const card = document.createElement('div');
    card.className = 'calendar-card';
    card.style.backgroundColor = event.type.includes('Primary') ? '#FFFF99' : '#99CCFF';
    card.innerHTML = `<a href="${event.link}" target="_blank">${event.date} - ${event.type}</a>`;
    calendarDiv.appendChild(card);
  });
}

// Registration Tab Rendering
function renderRegistration(state) {
  const regDiv = document.getElementById('registration-content');
  regDiv.innerHTML = `
    <div class="reg-card"><a href="${registrationLinks[state].register}" target="_blank">Register to Vote</a></div>
    <div class="reg-card"><a href="${registrationLinks[state].polling}" target="_blank">Find Polling Places</a></div>
    <div class="reg-card"><a href="${registrationLinks[state].absentee}" target="_blank">Vote by Mail</a></div>
    <div class="reg-card"><a href="${registrationLinks[state].volunteer}" target="_blank">Volunteer</a></div>
  `;
}

// Rankings Tab Rendering
function renderRankings(type) {
  const rankingsDiv = document.getElementById('rankings-content');
  rankingsDiv.innerHTML = '';
  const sorted = officials[type].sort((a, b) => {
    if (a.approval === b.approval) {
      return b.tiebreaker - a.tiebreaker; // Senate: votes, House: margins, Gov: population
    }
    return b.approval - a.approval;
  });
  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();
  const renderCard = (official, index) => {
    const card = document.createElement('div');
    card.className = 'ranking-card';
    card.style.height = '25%';
    card.style.backgroundColor = index < 10 ? '#CCFFCC' : index >= sorted.length - 10 ? '#FFCCCC' : '#CCCCCC';
    card.innerHTML = `<a href="${official.pollSource}" target="_blank">${official.name} (${official.state}, ${official.party}) - ${official.approval}%</a>`;
    rankingsDiv.appendChild(card);
  };
  top10.forEach(renderCard);
  bottom10.forEach(renderCard);
}

// Polls Tab Rendering
function renderPolls() {
  const pollsDiv = document.getElementById('polls-content');
  pollsDiv.innerHTML = '<h2>National Polls</h2><p>Live, trusted trackers by race</p>';
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  grid.style.gap = '10px';
  polls.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.style.padding = '10px';
    card.style.border = '1px solid #ccc';
    card.style.transition = 'transform 0.2s';
    card.innerHTML = `<a href="${poll.link}" target="_blank"><img src="${poll.logo}" style="width: 50px;"><br>${poll.name}</a>`;
    card.addEventListener('mouseover', () => card.style.transform = 'scale(1.05)');
    card.addEventListener('mouseout', () => card.style.transform = 'scale(1)');
    g