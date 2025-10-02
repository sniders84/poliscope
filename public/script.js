// script.js for Poliscope - Rebuilt with all tweaks
let officials = {
  governors: [], // Loaded from JSON
  senators: [], // Ready for future
  representatives: [], // Ready for future
  ltGovernors: [] // Ready for future
};

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
  'New Hampshire': [{ date: 'September 9, 2025', type: 'Primary', link: 'https://sos.nh.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.nh.gov/elections' }],
  'New Jersey': [{ date: 'June 3, 2025', type: 'Primary', link: 'https://www.state.nj.us/state/elections/index.shtml' }, { date: 'November 4, 2025', type: 'Gubernatorial', link: 'https://www.state.nj.us/state/elections/index.shtml' }],
  'New Mexico': [{ date: 'June 3, 2025', type: 'Primary', link: 'https://www.sos.state.nm.us/voting-and-elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.state.nm.us/voting-and-elections/' }],
  'New York': [{ date: 'June 24, 2025', type: 'Primary', link: 'https://www.elections.ny.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.elections.ny.gov/' }],
  'North Carolina': [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.ncsbe.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.ncsbe.gov/' }],
  'North Dakota': [{ date: 'June 10, 2025', type: 'Primary', link: 'https://sos.nd.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.nd.gov/elections' }],
  Ohio: [{ date: 'May 6, 2025', type: 'Primary', link: 'https://www.ohiosos.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.ohiosos.gov/elections/' }],
  Oklahoma: [{ date: 'June 17, 2025', type: 'Primary', link: 'https://oklahoma.gov/elections.html' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://oklahoma.gov/elections.html' }],
  Oregon: [{ date: 'May 20, 2025', type: 'Primary', link: 'https://sos.oregon.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.oregon.gov/elections' }],
  Pennsylvania: [{ date: 'May 20, 2025', type: 'Primary', link: 'https://www.pa.gov/en/agencies/dos/elections.html' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.pa.gov/en/agencies/dos/elections.html' }],
  'Rhode Island': [{ date: 'September 9, 2025', type: 'Primary', link: 'https://vote.ri.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://vote.ri.gov/' }],
  'South Carolina': [{ date: 'June 10, 2025', type: 'Primary', link: 'https://www.scvotes.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.scvotes.gov/' }],
  'South Dakota': [{ date: 'June 3, 2025', type: 'Primary', link: 'https://sdsos.gov/elections-voting/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sdsos.gov/elections-voting/' }],
  Tennessee: [{ date: 'August 7, 2025', type: 'Primary', link: 'https://sos.tn.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.tn.gov/elections' }],
  Texas: [{ date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.state.tx.us/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.state.tx.us/elections/' }],
  Utah: [{ date: 'June 24, 2025', type: 'Primary', link: 'https://vote.utah.gov/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://vote.utah.gov/' }],
  Vermont: [{ date: 'August 12, 2025', type: 'Primary', link: 'https://sos.vermont.gov/elections' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.vermont.gov/elections' }],
  Virginia: [{ date: 'June 17, 2025', type: 'Primary', link: 'https://www.elections.virginia.gov/' }, { date: 'November 4, 2025', type: 'Gubernatorial', link: 'https://www.elections.virginia.gov/' }],
  Washington: [{ date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.wa.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.wa.gov/elections/' }],
  'West Virginia': [{ date: 'May 13, 2025', type: 'Primary', link: 'https://sos.wv.gov/elections/' }, { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.wv.gov/elections/' }],
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
    absent ee: 'https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting',
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
  Colorado: {
    register: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    polling: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    absentee: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    volunteer: 'https://www.sos.state.co.us/pubs/elections/pollworkers.html'
  },
  Connecticut: {
    register: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Registration-Information/Voter-Registration',
    polling: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Polling-Place-Locator',
    absentee: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Absentee-Voting',
    volunteer: 'https://portal.ct.gov/SOTS/Election-Services/Poll-Worker-Information/Poll-Worker-Information'
  },
  Delaware: {
    register: 'https://elections.delaware.gov/voter/register.shtml',
    polling: 'https://elections.delaware.gov/voter/pollfinder.shtml',
    absentee: 'https://elections.delaware.gov/voter/absentee.shtml',
    volunteer: 'https://elections.delaware.gov/pollworkers/index.shtml'
  },
  Florida: {
    register: 'https://dos.myflorida.com/elections/for-voters/voter-registration/register-to-vote-or-update-your-information/',
    polling: 'https://dos.myflorida.com/elections/for-voters/voting/find-my-polling-place/',
    absentee: 'https://dos.myflorida.com/elections/for-voters/voting/vote-by-mail/',
    volunteer: 'https://dos.myflorida.com/elections/for-voters/become-a-poll-worker/'
  },
  Georgia: {
    register: 'https://sos.ga.gov/how-to-guide/how-guide-register-vote',
    polling: 'https://mvp.sos.ga.gov/s/',
    absentee: 'https://sos.ga.gov/how-to-guide/how-guide-absentee-voting',
    volunteer: 'https://sos.ga.gov/poll-worker-training'
  },
  Hawaii: {
    register: 'https://elections.hawaii.gov/voters/registration/',
    polling: 'https://elections.hawaii.gov/voters/voting-locations/',
    absentee: 'https://elections.hawaii.gov/voters/absentee-voting/',
    volunteer: 'https://elections.hawaii.gov/volunteer/'
  },
  Idaho: {
    register: 'https://voteidaho.gov/voter-registration/',
    polling: 'https://voteidaho.gov/vote-early-vote-in-person/',
    absentee: 'https://voteidaho.gov/absentee-voting/',
    volunteer: 'https://voteidaho.gov/election-day-poll-worker/'
  },
  Illinois: {
    register: 'https://www.elections.il.gov/VoterReg.aspx',
    polling: 'https://www.elections.il.gov/PollingPlaces.aspx',
    absentee: 'https://www.elections.il.gov/VotingByMail.aspx',
    volunteer: 'https://www.elections.il.gov/PollWorker.aspx'
  },
  Indiana: {
    register: 'https://indianavoters.in.gov/MVPHome/PrintDocuments',
    polling: 'https://indianavoters.in.gov/PublicSite/Public/FT1/PublicLookupMain.aspx?Link=Polling',
    absentee: 'https://www.in.gov/sos/elections/absentee-voting/',
    volunteer: 'https://www.in.gov/sos/elections/poll-workers/'
  },
  Iowa: {
    register: 'https://sos.iowa.gov/elections/voterinformation/voterregistration.html',
    polling: 'https://sos.iowa.gov/elections/voterinformation/edayreg.html',
    absentee: 'https://sos.iowa.gov/elections/voterinformation/absenteeinfo.html',
    volunteer: 'https://sos.iowa.gov/elections/pollworker/index.html'
  },
  Kansas: {
    register: 'https://sos.ks.gov/elections/voter-registration.html',
    polling: 'https://myvoteinfo.voteks.org/voterview',
    absentee: 'https://sos.ks.gov/elections/advance-voting.html',
    volunteer: 'https://sos.ks.gov/elections/poll-worker-information.html'
  },
  Kentucky: {
    register: 'https://elect.ky.gov/registertovote/Pages/default.aspx',
    polling: 'https://elect.ky.gov/Voters/Pages/Polling-Locations.aspx',
    absentee: 'https://elect.ky.gov/Voters/Pages/Absentee-Voting.aspx',
    volunteer: 'https://elect.ky.gov/Voters/Pages/Poll-Worker-Training.aspx'
  },
  Louisiana: {
    register: 'https://www.sos.la.gov/ElectionsAndVoting/Pages/OnlineVoterRegistration.aspx',
    polling: 'https://voterportal.sos.la.gov/',
    absentee: 'https://www.sos.la.gov/ElectionsAndVoting/Vote/VoteByMail/Pages/default.aspx',
    volunteer: 'https://www.sos.la.gov/ElectionsAndVoting/GetInvolved/BecomeACommissioner/Pages/default.aspx'
  },
  Maine: {
    register: 'https://www.maine.gov/sos/cec/elec/voter-info/voterreg.html',
    polling: 'https://www.maine.gov/sos/cec/elec/voter-info/pollfinder/index.html',
    absentee: 'https://www.maine.gov/sos/cec/elec/voter-info/absent.html',
    volunteer: 'https://www.maine.gov/sos/cec/elec/municipal/election-warden-guide.pdf' // Volunteer info in guide
  },
  Maryland: {
    register: 'https://elections.maryland.gov/voter_registration/index.html',
    polling: 'https://elections.maryland.gov/voting/early_voting.html',
    absentee: 'https://elections.maryland.gov/voting/absentee.html',
    volunteer: 'https://elections.maryland.gov/get_involved/election_judges.html'
  },
  Massachusetts: {
    register: 'https://www.sec.state.ma.us/ovr/',
    polling: 'https://www.sec.state.ma.us/WhereDoIVoteMA/WhereDoIVote',
    absentee: 'https://www.sec.state.ma.us/ele/eleabs/absidx.htm',
    volunteer: 'https://www.sec.state.ma.us/ele/elepollworkers/pollworkersidx.htm'
  },
  Michigan: {
    register: 'https://mvic.sos.state.mi.us/RegisterVoter/Index',
    polling: 'https://mvic.sos.state.mi.us/Voter/Index',
    absentee: 'https://mvic.sos.state.mi.us/AVApplication/Index',
    volunteer: 'https://www.michigan.gov/sos/elections/administrator/election-workers'
  },
  Minnesota: {
    register: 'https://www.sos.state.mn.us/elections-voting/register-to-vote/',
    polling: 'https://pollfinder.sos.state.mn.us/',
    absentee: 'https://www.sos.state.mn.us/elections-voting/other-ways-to-vote/vote-early-by-mail/',
    volunteer: 'https://www.sos.state.mn.us/elections-voting/get-involved/become-an-election-judge/'
  },
  Mississippi: {
    register: 'https://www.sos.ms.gov/elections-voting/voter-registration',
    polling: 'https://myelectionday.sos.state.ms.us/VoterSearch/PollingLocation.aspx',
    absentee: 'https://www.sos.ms.gov/elections-voting/absentee-voting',
    volunteer: 'https://www.sos.ms.gov/elections-voting/poll-worker-training'
  },
  Missouri: {
    register: 'https://www.sos.mo.gov/elections/goVoteMissouri/register',
    polling: 'https://s1.sos.mo.gov/elections/pollingplacelookup',
    absentee: 'https://www.sos.mo.gov/elections/goVoteMissouri/howtovote#absentee',
    volunteer: 'https://www.sos.mo.gov/elections/pollworker'
  },
  Montana: {
    register: 'https://sosmt.gov/elections/voter/',
    polling: 'https://sosmt.gov/elections/vote/',
    absentee: 'https://sosmt.gov/elections/absentee/',
    volunteer: 'https://sosmt.gov/elections/poll-worker/'
  },
  Nebraska: {
    register: 'https://www.nebraska.gov/apps-sos-voter-registration',
    polling: 'https://www.voterinformationlookup.nebraska.gov/voterlookup',
    absentee: 'https://sos.nebraska.gov/elections/absentee-voting',
    volunteer: 'https://sos.nebraska.gov/elections/poll-worker-information'
  },
  Nevada: {
    register: 'https://www.nvsos.gov/sos/voter-services/registering-to-vote',
    polling: 'https://www.nvsos.gov/sos/elections/voters/polling-place-locator',
    absentee: 'https://www.nvsos.gov/sos/elections/voters/absentee-voting',
    volunteer: 'https://www.nvsos.gov/sos/elections/poll-workers'
  },
  'New Hampshire': {
    register: 'https://sos.nh.gov/elections/voters/register-to-vote/',
    polling: 'https://app.sos.nh.gov/voterinformation',
    absentee: 'https://sos.nh.gov/elections/voters/absentee-ballots/',
    volunteer: 'https://sos.nh.gov/elections/election-officials/poll-worker-resources/'
  },
  'New Jersey': {
    register: 'https://nj.gov/state/elections/voter-registration.shtml',
    polling: 'https://nj.gov/state/elections/vote-polling-locations.shtml',
    absentee: 'https://nj.gov/state/elections/vote-by-mail.shtml',
    volunteer: 'https://nj.gov/state/elections/poll-worker.shtml'
  },
  'New Mexico': {
    register: 'https://www.sos.state.nm.us/voting-and-elections/voter-information-portal-nmvote-org/voter-registration-information/',
    polling: 'https://voterinfo.sos.state.nm.us/whereToVote.aspx',
    absentee: 'https://www.sos.state.nm.us/voting-and-elections/absentee-and-early-voting/absentee-voting-by-mail/',
    volunteer: 'https://www.sos.state.nm.us/voting-and-elections/become-a-poll-worker/'
  },
  'New York': {
    register: 'https://www.elections.ny.gov/registervote.html',
    polling: 'https://voterlookup.elections.ny.gov/votersearch.aspx',
    absentee: 'https://www.elections.ny.gov/votingabsentees.html',
    volunteer: 'https://www.elections.ny.gov/becomepollworker.html'
  },
  'North Carolina': {
    register: 'https://www.ncsbe.gov/registering/how-register',
    polling: 'https://vt.ncsbe.gov/PPLkup/',
    absentee: 'https://www.ncsbe.gov/voting/vote-mail/absentee-ballot-tools',
    volunteer: 'https://www.ncsbe.gov/get-involved/become-precinct-official'
  },
  'North Dakota': {
    register: 'https://sos.nd.gov/elections/voter/voting-north-dakota',
    polling: 'https://vip.sos.nd.gov/WhereToVote.aspx?tab=AddressandVotingTimes',
    absentee: 'https://sos.nd.gov/elections/voter/absentee-or-mail-ballot-voting',
    volunteer: 'https://sos.nd.gov/elections/election-officials/poll-workers'
  },
  Ohio: {
    register: 'https://olvr.ohiosos.gov/',
    polling: 'https://www.ohiosos.gov/elections/voters/toolkit/polling-location/',
    absentee: 'https://www.ohiosos.gov/elections/voters/absentee-voting/',
    volunteer: 'https://www.ohiosos.gov/elections/election-officials/poll-worker-training/'
  },
  Oklahoma: {
    register: 'https://oklahoma.gov/elections/voters/register-to-vote.html',
    polling: 'https://okvoterportal.okelections.us/',
    absentee: 'https://oklahoma.gov/elections/voters/absentee-voting.html',
    volunteer: 'https://oklahoma.gov/elections/election-officials/become-poll-worker.html'
  },
  Oregon: {
    register: 'https://sos.oregon.gov/elections/Pages/registration.aspx',
    polling: 'https://sos.oregon.gov/voting/Pages/drop-box-locator.aspx',
    absentee: 'https://sos.oregon.gov/elections/Pages/votebymail.aspx',
    volunteer: 'https://sos.oregon.gov/elections/Pages/election-officials.aspx'
  },
  Pennsylvania: {
    register: 'https://pavoterservices.pa.gov/Pages/VoterRegistrationApplication.aspx',
    polling: 'https://www.pavoterservices.pa.gov/Pages/PollingPlaceInfo.aspx',
    absentee: 'https://www.pa.gov/en/agencies/vote/other-election-information/vote-by-mail.html',
    volunteer: 'https://www.pa.gov/en/agencies/vote/help-america-vote/poll-workers.html'
  },
  'Rhode Island': {
    register: 'https://vote.sos.ri.gov/Voter/RegisterToVote',
    polling: 'https://vote.sos.ri.gov/Voter/VoteLocation',
    absentee: 'https://vote.sos.ri.gov/Voter/MailBallot',
    volunteer: 'https://vote.sos.ri.gov/PollWorker'
  },
  'South Carolina': {
    register: 'https://scvotes.gov/voters/register-to-vote/',
    polling: 'https://scvotes.gov/voters/find-your-polling-place/',
    absentee: 'https://scvotes.gov/voters/absentee-voting/',
    volunteer: 'https://scvotes.gov/poll-managers/'
  },
  'South Dakota': {
    register: 'https://sdsos.gov/elections-voting/voting/register-to-vote/default.aspx',
    polling: 'https://vip.sdsos.gov/VIPLogin.aspx',
    absentee: 'https://sdsos.gov/elections-voting/voting/absentee-voting.aspx',
    volunteer: 'https://sdsos.gov/elections-voting/election-officials/poll-worker-information.aspx'
  },
  Tennessee: {
    register: 'https://sos.tn.gov/elections/guides/how-to-register-to-vote',
    polling: 'https://tnmap.tn.gov/voterlookup/',
    absentee: 'https://sos.tn.gov/elections/guides/how-to-vote-absentee-by-mail',
    volunteer: 'https://sos.tn.gov/elections/guides/become-a-poll-official'
  },
  Texas: {
    register: 'https://www.sos.state.tx.us/elections/voter/reqvr.shtml',
    polling: 'https://www.sos.state.tx.us/elections/voter/votreg.shtml',
    absentee: 'https://www.sos.state.tx.us/elections/voter/absentee-ballot.shtml',
    volunteer: 'https://www.sos.state.tx.us/elections/voter/election-officials.shtml'
  },
  Utah: {
    register: 'https://vote.utah.gov/register-to-vote/',
    polling: 'https://votesearch.utah.gov/voter-search/search/search-by-address/how-and-where-can-i-vote',
    absentee: 'https://vote.utah.gov/vote-by-mail/',
    volunteer: 'https://vote.utah.gov/poll-worker/'
  },
  Vermont: {
    register: 'https://sos.vermont.gov/elections/voters/registration/',
    polling: 'https://mvp.vermont.gov/',
    absentee: 'https://sos.vermont.gov/elections/voters/absentee-ballots/',
    volunteer: 'https://sos.vermont.gov/elections/election-officials/poll-worker-information/'
  },
  Virginia: {
    register: 'https://www.elections.virginia.gov/registration/how-to-register/',
    polling: 'https://www.elections.virginia.gov/voter-information/polling-place-lookup/',
    absentee: 'https://www.elections.virginia.gov/voter-information/absentee-voting/',
    volunteer: 'https://www.elections.virginia.gov/poll-worker/'
  },
  Washington: {
    register: 'https://www.sos.wa.gov/elections/register.aspx',
    polling: 'https://voter.votewa.gov/WhereToVote.aspx',
    absentee: 'https://www.sos.wa.gov/elections/absentee-voting.aspx',
    volunteer: 'https://www.sos.wa.gov/elections/poll-workers.aspx'
  },
  'West Virginia': {
    register: 'https://sos.wv.gov/elections/Pages/RegisterToVote.aspx',
    polling: 'https://apps.sos.wv.gov/elections/voter/FindMyPollingPlace.aspx',
    absentee: 'https://sos.wv.gov/elections/Pages/AbsenteeVoting.aspx',
    volunteer: 'https://sos.wv.gov/elections/Pages/PollWorkerTraining.aspx'
  },
  Wisconsin: {
    register: 'https://myvote.wi.gov/en-us/Register-To-Vote',
    polling: 'https://myvote.wi.gov/en-us/Find-My-Polling-Place',
    absentee: 'https://myvote.wi.gov/en-us/Vote-Absentee-By-Mail',
    volunteer: 'https://elections.wi.gov/clerk/poll-workers'
  },
  Wyoming: {
    register: 'https://sos.wyo.gov/Elections/State/RegisteringToVote.aspx',
    polling: 'https://sos.wyo.gov/Elections/PollPlace/Default.aspx',
    absentee: 'https://sos.wyo.gov/Elections/State/AbsenteeVoting.aspx',
    volunteer: 'https://sos.wyo.gov/Elections/Docs/PollWorkerInfo.aspx'
  },
  'District of Columbia': {
    register: 'https://dcboe.org/Voters/Register-To-Vote/Register-to-Vote',
    polling: 'https://dcboe.org/Voters/Where-to-Vote/Find-Your-Polling-Place',
    absentee: 'https://dcboe.org/Voters/Absentee-Voting/Mail-in-Voting',
    volunteer: 'https://dcboe.org/Voters/Become-a-Poll-Worker/Poll-Worker-Information'
  },
  'Puerto Rico': {
    register: 'https://ww2.election.pr/cee-2024/solicitud-registro-electoral/',
    polling: 'https://consulta.ceepur.org/',
    absentee: 'https://ww2.election.pr/cee-2024/voto-por-correo/',
    volunteer: 'https://ww2.election.pr/cee-2024/funcionarios-de-mesa/'
  },
  Guam: {
    register: 'https://gec.guam.gov/register/',
    polling: 'https://gec.guam.gov/polling-places/',
    absentee: 'https://gec.guam.gov/absentee-voting/',
    volunteer: 'https://gec.guam.gov/poll-workers/'
  },
  'U.S. Virgin Islands': {
    register: 'https://www.vivote.gov/voters/register-to-vote',
    polling: 'https://www.vivote.gov/voters/find-your-polling-place',
    absentee: 'https://www.vivote.gov/voters/absentee-voting',
    volunteer: 'https://www.vivote.gov/voters/become-a-poll-worker'
  },
  'American Samoa': {
    register: 'https://election.as.gov/register-to-vote/',
    polling: 'https://election.as.gov/polling-places/',
    absentee: 'https://election.as.gov/absentee-voting/',
    volunteer: 'https://election.as.gov/poll-workers/'
  },
  'Northern Mariana Islands': {
    register: 'https://www.votecnmi.gov.mp/voter-registration/',
    polling: 'https://www.votecnmi.gov.mp/polling-places/',
    absentee: 'https://www.votecnmi.gov.mp/absentee-voting/',
    volunteer: 'https://www.votecnmi.gov.mp/poll-workers/'
  }
};

// Load governors.json
fetch('governors.json')
  .then(response => response.json())
  .then(data => {
    officials.governors = data;
    populateStateSelect();
    renderMyOfficials(currentState);
    renderRankings('governors');
  })
  .catch(error => console.error('Error loading governors.json:', error));

// Populate state select
function populateStateSelect() {
  const select = document.getElementById('state-select');
  select.innerHTML = '';
  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.text = state;
    select.appendChild(option);
  });
  select.value = currentState;
}

// My Officials Tab
function renderMyOfficials(state) {
  const container = document.getElementById('my-cards');
  container.innerHTML = '';
  const gov = officials.governors.find(g => g.state === state);
  if (gov) {
    const card = document.createElement('div');
    card.className = 'official-card';
    card.innerHTML = `
      <img src="${gov.photo}" alt="${gov.name}">
      <h3>${gov.name} (${gov.party})</h3>
      <p>${gov.bio}</p>
      <p>Approval: ${gov.approval}% (Rank: ${gov.rank})</p>
      <a href="${gov.pollSource}" target="_blank">Poll Source</a>
      <ul>Platforms:
        ${gov.platforms.map(p => `<li>${p}</li>`).join('')}
      </ul>
      <p>Follow Through: ${gov.follow_through}</p>
      <ul>Bills Signed:
        ${gov.bills_signed.map(b => `<li>${b.name} (${b.year}): ${b.description}</li>`).join('')}
      </ul>
    `;
    container.appendChild(card);
  }
  document.getElementById('polls-container').innerHTML = '';
}

// Rankings Tab
function renderRankings(type) {
  const container = document.getElementById(`rankings-${type}`);
  container.innerHTML = '';
  const sorted = officials[type].sort((a, b) => {
    if (a.approval === b.approval) return b.tiebreaker - a.tiebreaker;
    return b.approval - a.approval;
  });
  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();
  top10.forEach(official => {
    const card = document.createElement('div');
    card.className = 'ranking-card';
    card.style.height = '25%';
    card.style.borderLeft = '5px solid green';
    card.innerHTML = `${official.name} (${official.state}, ${official.party}) - ${official.approval}%`;
    container.appendChild(card);
  });
  bottom10.forEach(official => {
    const card = document.createElement('div');
    card.className = 'ranking-card';
    card.style.height = '25%';
    card.style.borderLeft = '5px solid red';
    card.innerHTML = `${official.name} (${official.state}, ${official.party}) - ${official.approval}%`;
    container.appendChild(card);
  });
  // Middle gray for others if needed, but per tweak, only top/bottom 10
  // No top10-overall
  document.getElementById('top10-overall').style.display = 'none';
}

// Calendar Tab
function renderCalendar(state) {
  const container = document.getElementById('calendar-container');
  container.innerHTML = '';
  const events = electionData[state] || [];
  events.forEach(event => {
    const card = document.createElement('div');
    card.className = 'calendar-card';
    card.style.backgroundColor = event.type.includes('Primary') ? '#FFFF99' : '#99CCFF';
    card.innerHTML = `<a href="${event.link}" target="_blank">${event.date} - ${event.type}</a>`;
    container.appendChild(card);
  });
}

// Registration Tab
function renderRegistration(state) {
  const container = document.getElementById('voting-container');
  container.innerHTML = '';
  const links = registrationLinks[state] || {};
  ['register', 'polling', 'absentee', 'volunteer'].forEach(key => {
    const card = document.createElement('div');
    card.className = 'reg-card';
    card.innerHTML = `<a href="${links[key]}" target="_blank">${key.charAt(0).toUpperCase() + key.slice(1)}</a>`;
    container.appendChild(card);
  });
}

// Polls Tab
function renderPolls() {
  const container = document.getElementById('compare-container');
  container.innerHTML = '';
  const pollsData = [
    { name: 'RealClearPolling Presidential', link: 'https://www.realclearpolling.com/presidential', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'RealClearPolling Senate', link: 'https://www.realclearpolling.com/senate-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'RealClearPolling Gubernatorial', link: 'https://www.realclearpolling.com/gubernatorial-polls', logo: 'https://www.realclearpolling.com/favicon.ico' },
    { name: 'Emerson College National', link: 'https://emersoncollegepolling.com/national-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
    { name: 'Emerson College State', link: 'https://emersoncollegepolling.com/state-polls', logo: 'https://emersoncollegepolling.com/favicon.ico' },
    { name: 'FiveThirtyEight Polls', link: 'https://projects.fivethirtyeight.com/polls/', logo: 'https://projects.fivethirtyeight.com/favicon.ico' }
  ];
  pollsData.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.innerHTML = `<a href="${poll.link}" target="_blank"><img src="${poll.logo}" alt="${poll.name}" style="width:50px"><br>${poll.name}</a>`;
    container.appendChild(card);
  });
}

// Search Bar
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  const dropdown = document.getElementById('search-dropdown') || createDropdown();
  const suggestions = officials.governors.filter(g => g.name.toLowerCase().includes(query) || g.state.toLowerCase().includes(query) || g.party.toLowerCase().includes(query));
  dropdown.innerHTML = suggestions.map(g => `<div onclick="selectState('${g.state}')">${g.name} (${g.state}, ${g.party})</div>`).join('');
});

searchInput.addEventListener('blur', () => {
  setTimeout(() => {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) dropdown.remove();
  }, 100);
});

function createDropdown() {
  const dropdown = document.createElement('div');
  dropdown.id = 'search-dropdown';
  dropdown.style.position = 'absolute';
  dropdown.style.background = 'white';
  dropdown.style.border = '1px solid #ccc';
  searchInput.parentNode.appendChild(dropdown);
  return dropdown;
}

function selectState(state) {
  document.getElementById('state-select').value = state;
  currentState = state;
  const activeTab = document.querySelector('section[style="display: block;"]').id;
  if (activeTab === 'my-officials') renderMyOfficials(state);
  if (activeTab === 'calendar') renderCalendar(state);
  if (activeTab === 'registration') renderRegistration(state);
  searchInput.value = '';
}

// State Select Change
document.getElementById('state-select').addEventListener('change', (e) => {
  currentState = e.target.value;
  const activeTab = document.querySelector('section[style="display: block;"]').id;
  if (activeTab === 'my-officials') renderMyOfficials(currentState);
  if (activeTab === 'calendar') renderCalendar(currentState);
  if (activeTab === 'registration') renderRegistration(currentState);
});

// Initialize
populateStateSelect();
renderMyOfficials('Alabama');
renderRankings('governors');
renderPolls();
renderCalendar('Alabama');
renderRegistration('Alabama');