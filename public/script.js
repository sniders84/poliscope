/* --- Poliscope Main Script: Fully Corrected and Tweaked Version --- */

/** ---- GLOBALS ---- */
let allOfficials = [];
let currentState = 'Alabama';
let calendarEvents = []; // Placeholder for calendar events, to be populated as needed

// Expanded votingInfo with all states and territories
const votingInfo = {
  'Alabama': {
    registrationLink: 'https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote',
    statusCheckLink: 'https://myinfo.alabamavotes.gov/voterview/',
    pollingPlaceLink: 'https://myinfo.alabamavotes.gov/voterview/',
    volunteerLink: 'https://www.sos.alabama.gov/alabama-votes/poll-worker-information',
    absenteeLink: 'https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting',
    registrationDeadline: '2025-10-20',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 12:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'Alaska': {
    registrationLink: 'https://www.elections.alaska.gov/Core/voterregistration.php',
    statusCheckLink: 'https://myvoterinformation.alaska.gov/',
    pollingPlaceLink: 'https://myvoterinformation.alaska.gov/',
    volunteerLink: 'https://www.elections.alaska.gov/Core/pollworkerinformation.php',
    absenteeLink: 'https://www.elections.alaska.gov/Core/absenteevotingbyabsenteeballot.php',
    registrationDeadline: '2025-10-05',
    absenteeRequestDeadline: '2025-10-20',
    absenteeReturnDeadline: '2025-11-04 12:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-11-04'
  },
  'Arizona': {
    registrationLink: 'https://azsos.gov/elections/voting-election/register-vote-or-update-your-current-voter-information',
    statusCheckLink: 'https://voter.azsos.gov/VoterView/RegistrantSearch.do',
    pollingPlaceLink: 'https://voter.azsos.gov/VoterView/PollingPlaceSearch.do',
    volunteerLink: 'https://azsos.gov/elections/poll-worker-information',
    absenteeLink: 'https://azsos.gov/elections/voting-election/vote-mail',
    registrationDeadline: '2025-10-04',
    absenteeRequestDeadline: '2025-10-24',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-08',
    earlyVotingEnd: '2025-10-31'
  },
  'Arkansas': {
    registrationLink: 'https://www.sos.arkansas.gov/elections/voter-information/voter-registration-information',
    statusCheckLink: 'https://www.voterview.ar-nova.org/voterview',
    pollingPlaceLink: 'https://www.sos.arkansas.gov/elections/voter-information/find-your-polling-place',
    volunteerLink: 'https://www.sos.arkansas.gov/elections/voter-information/become-a-poll-worker',
    absenteeLink: 'https://www.sos.arkansas.gov/elections/voter-information/absentee-voting',
    registrationDeadline: '2025-10-05',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:30 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-11-03'
  },
  'California': {
    registrationLink: 'https://www.sos.ca.gov/elections/voter-registration',
    statusCheckLink: 'https://voterstatus.sos.ca.gov/',
    pollingPlaceLink: 'https://www.sos.ca.gov/elections/polling-place',
    volunteerLink: 'https://www.sos.ca.gov/elections/poll-worker-information',
    absenteeLink: 'https://www.sos.ca.gov/elections/voter-registration/vote-mail',
    registrationDeadline: '2025-10-21',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-06',
    earlyVotingEnd: '2025-11-04'
  },
  'Colorado': {
    registrationLink: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    statusCheckLink: 'https://www.sos.state.co.us/voter/pages/pub/olvr/findVoterReg.xhtml',
    pollingPlaceLink: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    volunteerLink: 'https://www.sos.state.co.us/pubs/elections/pollworkers.html',
    absenteeLink: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    registrationDeadline: '2025-10-27',
    absenteeRequestDeadline: '2025-10-27',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-11-04'
  },
  'Connecticut': {
    registrationLink: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Registration-Information/Voter-Registration',
    statusCheckLink: 'https://portaldir.ct.gov/sots/LookUp.aspx',
    pollingPlaceLink: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Polling-Place-Locator',
    volunteerLink: 'https://portal.ct.gov/SOTS/Election-Services/Poll-Worker-Information/Poll-Worker-Information',
    absenteeLink: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Absentee-Voting',
    registrationDeadline: '2025-10-20',
    absenteeRequestDeadline: '2025-11-01',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'Delaware': {
    registrationLink: 'https://elections.delaware.gov/voter/register.shtml',
    statusCheckLink: 'https://ivote.de.gov/VoterView',
    pollingPlaceLink: 'https://elections.delaware.gov/voter/pollfinder.shtml',
    volunteerLink: 'https://elections.delaware.gov/pollworkers/index.shtml',
    absenteeLink: 'https://elections.delaware.gov/voter/absentee.shtml',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-29',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-25',
    earlyVotingEnd: '2025-11-02'
  },
  'Florida': {
    registrationLink: 'https://dos.myflorida.com/elections/for-voters/voter-registration/register-to-vote-or-update-your-information/',
    statusCheckLink: 'https://registration.elections.myflorida.com/CheckVoterStatus',
    pollingPlaceLink: 'https://dos.myflorida.com/elections/for-voters/voting/find-my-polling-place/',
    volunteerLink: 'https://dos.myflorida.com/elections/for-voters/become-a-poll-worker/',
    absenteeLink: 'https://dos.myflorida.com/elections/for-voters/voting/vote-by-mail/',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-25',
    earlyVotingEnd: '2025-11-02'
  },
  'Georgia': {
    registrationLink: 'https://sos.ga.gov/how-to-guide/how-guide-register-vote',
    statusCheckLink: 'https://mvp.sos.ga.gov/s/',
    pollingPlaceLink: 'https://mvp.sos.ga.gov/s/',
    volunteerLink: 'https://sos.ga.gov/poll-worker-training',
    absenteeLink: 'https://sos.ga.gov/how-to-guide/how-guide-absentee-voting',
    registrationDeadline: '2025-10-06',
    absenteeRequestDeadline: '2025-10-29',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-14',
    earlyVotingEnd: '2025-10-31'
  },
  'Hawaii': {
    registrationLink: 'https://elections.hawaii.gov/voters/registration/',
    statusCheckLink: 'https://olvr.hawaii.gov/',
    pollingPlaceLink: 'https://elections.hawaii.gov/voters/voting-locations/',
    volunteerLink: 'https://elections.hawaii.gov/volunteer/',
    absenteeLink: 'https://elections.hawaii.gov/voters/absentee-voting/',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-21',
    earlyVotingEnd: '2025-11-04'
  },
  'Idaho': {
    registrationLink: 'https://voteidaho.gov/voter-registration/',
    statusCheckLink: 'https://elections.sos.idaho.gov/ElectionLink/ElectionLink/VoterSearch.aspx',
    pollingPlaceLink: 'https://voteidaho.gov/vote-early-vote-in-person/',
    volunteerLink: 'https://voteidaho.gov/election-day-poll-worker/',
    absenteeLink: 'https://voteidaho.gov/absentee-voting/',
    registrationDeadline: '2025-10-20',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-10-31'
  },
  'Illinois': {
    registrationLink: 'https://www.elections.il.gov/VoterReg.aspx',
    statusCheckLink: 'https://ova.elections.il.gov/RegistrationLookup.aspx',
    pollingPlaceLink: 'https://www.elections.il.gov/PollingPlaces.aspx',
    volunteerLink: 'https://www.elections.il.gov/PollWorker.aspx',
    absenteeLink: 'https://www.elections.il.gov/VotingByMail.aspx',
    registrationDeadline: '2025-10-21',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-09-25',
    earlyVotingEnd: '2025-11-04'
  },
  'Indiana': {
    registrationLink: 'https://indianavoters.in.gov/MVPHome/PrintDocuments',
    statusCheckLink: 'https://indianavoters.in.gov/',
    pollingPlaceLink: 'https://indianavoters.in.gov/PublicSite/Public/FT1/PublicLookupMain.aspx?Link=Polling',
    volunteerLink: 'https://www.in.gov/sos/elections/poll-workers/',
    absenteeLink: 'https://www.in.gov/sos/elections/absentee-voting/',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 6:00 PM',
    earlyVotingStart: '2025-10-07',
    earlyVotingEnd: '2025-11-03'
  },
  'Iowa': {
    registrationLink: 'https://sos.iowa.gov/elections/voterinformation/voterregistration.html',
    statusCheckLink: 'https://sos.iowa.gov/elections/voterinformation/voterregistration.html',
    pollingPlaceLink: 'https://sos.iowa.gov/elections/voterinformation/edayreg.html',
    volunteerLink: 'https://sos.iowa.gov/elections/pollworker/index.html',
    absenteeLink: 'https://sos.iowa.gov/elections/voterinformation/absenteeinfo.html',
    registrationDeadline: '2025-10-21',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-15',
    earlyVotingEnd: '2025-11-03'
  },
  'Kansas': {
    registrationLink: 'https://sos.ks.gov/elections/voter-registration.html',
    statusCheckLink: 'https://myvoteinfo.voteks.org/voterview',
    pollingPlaceLink: 'https://myvoteinfo.voteks.org/voterview',
    volunteerLink: 'https://sos.ks.gov/elections/poll-worker-information.html',
    absenteeLink: 'https://sos.ks.gov/elections/advance-voting.html',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-11-03'
  },
  'Kentucky': {
    registrationLink: 'https://elect.ky.gov/registertovote/Pages/default.aspx',
    statusCheckLink: 'https://vrsws.sos.ky.gov/ovrweb/',
    pollingPlaceLink: 'https://elect.ky.gov/Voters/Pages/Polling-Locations.aspx',
    volunteerLink: 'https://elect.ky.gov/Voters/Pages/Poll-Worker-Training.aspx',
    absenteeLink: 'https://elect.ky.gov/Voters/Pages/Absentee-Voting.aspx',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 6:00 PM',
    earlyVotingStart: '2025-10-30',
    earlyVotingEnd: '2025-11-01'
  },
  'Louisiana': {
    registrationLink: 'https://www.sos.la.gov/ElectionsAndVoting/Pages/OnlineVoterRegistration.aspx',
    statusCheckLink: 'https://voterportal.sos.la.gov/',
    pollingPlaceLink: 'https://voterportal.sos.la.gov/',
    volunteerLink: 'https://www.sos.la.gov/ElectionsAndVoting/GetInvolved/BecomeACommissioner/Pages/default.aspx',
    absenteeLink: 'https://www.sos.la.gov/ElectionsAndVoting/Vote/VoteByMail/Pages/default.aspx',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-11-01',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-18',
    earlyVotingEnd: '2025-10-28'
  },
  'Maine': {
    registrationLink: 'https://www.maine.gov/sos/cec/elec/voter-info/voterreg.html',
    statusCheckLink: 'https://www.maine.gov/sos/cec/elec/voter-info/voter-lookup.html',
    pollingPlaceLink: 'https://www.maine.gov/sos/cec/elec/voter-info/pollfinder/index.html',
    volunteerLink: 'https://www.maine.gov/sos/cec/elec/municipal/election-warden-guide.pdf',
    absenteeLink: 'https://www.maine.gov/sos/cec/elec/voter-info/absent.html',
    registrationDeadline: '2025-10-29',
    absenteeRequestDeadline: '2025-11-01',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'Maryland': {
    registrationLink: 'https://elections.maryland.gov/voter_registration/index.html',
    statusCheckLink: 'https://voterservices.elections.maryland.gov/VoterSearch',
    pollingPlaceLink: 'https://elections.maryland.gov/voting/early_voting.html',
    volunteerLink: 'https://elections.maryland.gov/get_involved/election_judges.html',
    absenteeLink: 'https://elections.maryland.gov/voting/absentee.html',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-21',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-23',
    earlyVotingEnd: '2025-10-30'
  },
  'Massachusetts': {
    registrationLink: 'https://www.sec.state.ma.us/ovr/',
    statusCheckLink: 'https://www.sec.state.ma.us/VoterRegistrationSearch/MyVoterRegStatus.aspx',
    pollingPlaceLink: 'https://www.sec.state.ma.us/WhereDoIVoteMA/WhereDoIVote',
    volunteerLink: 'https://www.sec.state.ma.us/ele/elepollworkers/pollworkersidx.htm',
    absenteeLink: 'https://www.sec.state.ma.us/ele/eleabs/absidx.htm',
    registrationDeadline: '2025-10-19',
    absenteeRequestDeadline: '2025-10-29',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-18',
    earlyVotingEnd: '2025-10-31'
  },
  'Michigan': {
    registrationLink: 'https://mvic.sos.state.mi.us/RegisterVoter/Index',
    statusCheckLink: 'https://mvic.sos.state.mi.us/Voter/Index',
    pollingPlaceLink: 'https://mvic.sos.state.mi.us/Voter/Index',
    volunteerLink: 'https://www.michigan.gov/sos/elections/administrator/election-workers',
    absenteeLink: 'https://mvic.sos.state.mi.us/AVApplication/Index',
    registrationDeadline: '2025-10-20',
    absenteeRequestDeadline: '2025-10-27',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-11-04'
  },
  'Minnesota': {
    registrationLink: 'https://www.sos.state.mn.us/elections-voting/register-to-vote/',
    statusCheckLink: 'https://mnvotes.sos.state.mn.us/VoterStatus.aspx',
    pollingPlaceLink: 'https://pollfinder.sos.state.mn.us/',
    volunteerLink: 'https://www.sos.state.mn.us/elections-voting/get-involved/become-an-election-judge/',
    absenteeLink: 'https://www.sos.state.mn.us/elections-voting/other-ways-to-vote/vote-early-by-mail/',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-09-19',
    earlyVotingEnd: '2025-11-03'
  },
  'Mississippi': {
    registrationLink: 'https://www.sos.ms.gov/elections-voting/voter-registration',
    statusCheckLink: 'https://myelectionday.sos.state.ms.us/VoterSearch/VoterStatus.aspx',
    pollingPlaceLink: 'https://myelectionday.sos.state.ms.us/VoterSearch/PollingLocation.aspx',
    volunteerLink: 'https://www.sos.ms.gov/elections-voting/poll-worker-training',
    absenteeLink: 'https://www.sos.ms.gov/elections-voting/absentee-voting',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'Missouri': {
    registrationLink: 'https://www.sos.mo.gov/elections/goVoteMissouri/register',
    statusCheckLink: 'https://s1.sos.mo.gov/elections/voterlookup',
    pollingPlaceLink: 'https://s1.sos.mo.gov/elections/pollingplacelookup',
    volunteerLink: 'https://www.sos.mo.gov/elections/pollworker',
    absenteeLink: 'https://www.sos.mo.gov/elections/goVoteMissouri/howtovote#absentee',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-29',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-21',
    earlyVotingEnd: '2025-11-03'
  },
  'Montana': {
    registrationLink: 'https://sosmt.gov/elections/voter/',
    statusCheckLink: 'https://app.mt.gov/voterinfo/',
    pollingPlaceLink: 'https://sosmt.gov/elections/vote/',
    volunteerLink: 'https://sosmt.gov/elections/poll-worker/',
    absenteeLink: 'https://sosmt.gov/elections/absentee/',
    registrationDeadline: '2025-10-27',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-06',
    earlyVotingEnd: '2025-11-03'
  },
  'Nebraska': {
    registrationLink: 'https://www.nebraska.gov/apps-sos-voter-registration',
    statusCheckLink: 'https://www.voterinformationlookup.nebraska.gov/voterlookup',
    pollingPlaceLink: 'https://www.voterinformationlookup.nebraska.gov/voterlookup',
    volunteerLink: 'https://sos.nebraska.gov/elections/poll-worker-information',
    absenteeLink: 'https://sos.nebraska.gov/elections/absentee-voting',
    registrationDeadline: '2025-10-20',
    absenteeRequestDeadline: '2025-10-24',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-06',
    earlyVotingEnd: '2025-11-03'
  },
  'Nevada': {
    registrationLink: 'https://www.nvsos.gov/sos/voter-services/registering-to-vote',
    statusCheckLink: 'https://www.nvsos.gov/votersearch/',
    pollingPlaceLink: 'https://www.nvsos.gov/sos/elections/voters/polling-place-locator',
    volunteerLink: 'https://www.nvsos.gov/sos/elections/poll-workers',
    absenteeLink: 'https://www.nvsos.gov/sos/elections/voters/absentee-voting',
    registrationDeadline: '2025-10-20',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-18',
    earlyVotingEnd: '2025-10-31'
  },
  'New Hampshire': {
    registrationLink: 'https://sos.nh.gov/elections/voters/register-to-vote/',
    statusCheckLink: 'https://app.sos.nh.gov/voterinformation',
    pollingPlaceLink: 'https://app.sos.nh.gov/voterinformation',
    volunteerLink: 'https://sos.nh.gov/elections/election-officials/poll-worker-resources/',
    absenteeLink: 'https://sos.nh.gov/elections/voters/absentee-ballots/',
    registrationDeadline: '2025-10-29',
    absenteeRequestDeadline: '2025-11-01',
    absenteeReturnDeadline: '2025-11-04 5:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'New Jersey': {
    registrationLink: 'https://nj.gov/state/elections/voter-registration.shtml',
    statusCheckLink: 'https://voter.svrs.nj.gov/register/status',
    pollingPlaceLink: 'https://nj.gov/state/elections/vote-polling-locations.shtml',
    volunteerLink: 'https://nj.gov/state/elections/poll-worker.shtml',
    absenteeLink: 'https://nj.gov/state/elections/vote-by-mail.shtml',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-25',
    earlyVotingEnd: '2025-11-02'
  },
  'New Mexico': {
    registrationLink: 'https://www.sos.state.nm.us/voting-and-elections/voter-information-portal-nmvote-org/voter-registration-information/',
    statusCheckLink: 'https://voterinfo.sos.state.nm.us/',
    pollingPlaceLink: 'https://voterinfo.sos.state.nm.us/whereToVote.aspx',
    volunteerLink: 'https://www.sos.state.nm.us/voting-and-elections/become-a-poll-worker/',
    absenteeLink: 'https://www.sos.state.nm.us/voting-and-elections/absentee-and-early-voting/absentee-voting-by-mail/',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-07',
    earlyVotingEnd: '2025-11-01'
  },
  'New York': {
    registrationLink: 'https://www.elections.ny.gov/registervote.html',
    statusCheckLink: 'https://voterlookup.elections.ny.gov/votersearch.aspx',
    pollingPlaceLink: 'https://voterlookup.elections.ny.gov/votersearch.aspx',
    volunteerLink: 'https://www.elections.ny.gov/becomepollworker.html',
    absenteeLink: 'https://www.elections.ny.gov/votingabsentees.html',
    registrationDeadline: '2025-10-27',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 9:00 PM',
    earlyVotingStart: '2025-10-25',
    earlyVotingEnd: '2025-11-02'
  },
  'North Carolina': {
    registrationLink: 'https://www.ncsbe.gov/registering/how-register',
    statusCheckLink: 'https://vt.ncsbe.gov/VRInfo/',
    pollingPlaceLink: 'https://vt.ncsbe.gov/PPLkup/',
    volunteerLink: 'https://www.ncsbe.gov/get-involved/become-precinct-official',
    absenteeLink: 'https://www.ncsbe.gov/voting/vote-mail/absentee-ballot-tools',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:30 PM',
    earlyVotingStart: '2025-10-16',
    earlyVotingEnd: '2025-11-01'
  },
  'North Dakota': {
    registrationLink: 'https://sos.nd.gov/elections/voter/voting-north-dakota',
    statusCheckLink: 'https://vip.sos.nd.gov/WhereToVote.aspx?tab=Voter%20Information',
    pollingPlaceLink: 'https://vip.sos.nd.gov/WhereToVote.aspx?tab=AddressandVotingTimes',
    volunteerLink: 'https://sos.nd.gov/elections/election-officials/poll-workers',
    absenteeLink: 'https://sos.nd.gov/elections/voter/absentee-or-mail-ballot-voting',
    registrationDeadline: null, // No voter registration required
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-11-03'
  },
  'Ohio': {
    registrationLink: 'https://olvr.ohiosos.gov/',
    statusCheckLink: 'https://voterlookup.ohiosos.gov/voterlookup.aspx',
    pollingPlaceLink: 'https://www.ohiosos.gov/elections/voters/toolkit/polling-location/',
    volunteerLink: 'https://www.ohiosos.gov/elections/election-officials/poll-worker-training/',
    absenteeLink: 'https://www.ohiosos.gov/elections/voters/absentee-voting/',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-29',
    absenteeReturnDeadline: '2025-11-04 7:30 PM',
    earlyVotingStart: '2025-10-07',
    earlyVotingEnd: '2025-11-03'
  },
  'Oklahoma': {
    registrationLink: 'https://oklahoma.gov/elections/voters/register-to-vote.html',
    statusCheckLink: 'https://okvoterportal.okelections.us/',
    pollingPlaceLink: 'https://okvoterportal.okelections.us/',
    volunteerLink: 'https://oklahoma.gov/elections/election-officials/become-poll-worker.html',
    absenteeLink: 'https://oklahoma.gov/elections/voters/absentee-voting.html',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-30',
    earlyVotingEnd: '2025-11-01'
  },
  'Oregon': {
    registrationLink: 'https://sos.oregon.gov/elections/Pages/registration.aspx',
    statusCheckLink: 'https://secure.sos.state.or.us/orestar/vr/showVoterSearch.do',
    pollingPlaceLink: 'https://sos.oregon.gov/voting/Pages/drop-box-locator.aspx',
    volunteerLink: 'https://sos.oregon.gov/elections/Pages/election-officials.aspx',
    absenteeLink: 'https://sos.oregon.gov/elections/Pages/votebymail.aspx',
    registrationDeadline: '2025-10-21',
    absenteeRequestDeadline: '2025-10-29',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'Pennsylvania': {
    registrationLink: 'https://pavoterservices.pa.gov/Pages/VoterRegistrationApplication.aspx',
    statusCheckLink: 'https://www.pavoterservices.pa.gov/Pages/VoterRegistrationStatus.aspx',
    pollingPlaceLink: 'https://www.pavoterservices.pa.gov/Pages/PollingPlaceInfo.aspx',
    volunteerLink: 'https://www.pa.gov/en/agencies/vote/help-america-vote/poll-workers.html',
    absenteeLink: 'https://www.pa.gov/en/agencies/vote/other-election-information/vote-by-mail.html',
    registrationDeadline: '2025-10-21',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'Rhode Island': {
    registrationLink: 'https://vote.sos.ri.gov/Voter/RegisterToVote',
    statusCheckLink: 'https://vote.sos.ri.gov/Home/UpdateVoterRecord?ActiveFlag=0',
    pollingPlaceLink: 'https://vote.sos.ri.gov/Voter/VoteLocation',
    volunteerLink: 'https://vote.sos.ri.gov/PollWorker',
    absenteeLink: 'https://vote.sos.ri.gov/Voter/MailBallot',
    registrationDeadline: '2025-10-06',
    absenteeRequestDeadline: '2025-10-29',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-15',
    earlyVotingEnd: '2025-11-03'
  },
  'South Carolina': {
    registrationLink: 'https://scvotes.gov/voters/register-to-vote/',
    statusCheckLink: 'https://info.scvotes.sc.gov/eng/voterinquiry/VoterInquiry/voterInquiry.action',
    pollingPlaceLink: 'https://scvotes.gov/voters/find-your-polling-place/',
    volunteerLink: 'https://scvotes.gov/poll-managers/',
    absenteeLink: 'https://scvotes.gov/voters/absentee-voting/',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-11-01'
  },
  'South Dakota': {
    registrationLink: 'https://sdsos.gov/elections-voting/voting/register-to-vote/default.aspx',
    statusCheckLink: 'https://vip.sdsos.gov/VIPLogin.aspx',
    pollingPlaceLink: 'https://vip.sdsos.gov/VIPLogin.aspx',
    volunteerLink: 'https://sdsos.gov/elections-voting/election-officials/poll-worker-information.aspx',
    absenteeLink: 'https://sdsos.gov/elections-voting/voting/absentee-voting.aspx',
    registrationDeadline: '2025-10-20',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-09-19',
    earlyVotingEnd: '2025-11-03'
  },
  'Tennessee': {
    registrationLink: 'https://sos.tn.gov/elections/guides/how-to-register-to-vote',
    statusCheckLink: 'https://tnmap.tn.gov/voterlookup/',
    pollingPlaceLink: 'https://tnmap.tn.gov/voterlookup/',
    volunteerLink: 'https://sos.tn.gov/elections/guides/become-a-poll-official',
    absenteeLink: 'https://sos.tn.gov/elections/guides/how-to-vote-absentee-by-mail',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-15',
    earlyVotingEnd: '2025-10-30'
  },
  'Texas': {
    registrationLink: 'https://www.sos.state.tx.us/elections/voter/reqvr.shtml',
    statusCheckLink: 'https://teamrv-mvp.sos.texas.gov/MVP/mvp.do',
    pollingPlaceLink: 'https://www.sos.state.tx.us/elections/voter/votreg.shtml',
    volunteerLink: 'https://www.sos.state.tx.us/elections/voter/election-officials.shtml',
    absenteeLink: 'https://www.sos.state.tx.us/elections/voter/absentee-ballot.shtml',
    registrationDeadline: '2025-10-07',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-10-31'
  },
  'Utah': {
    registrationLink: 'https://vote.utah.gov/register-to-vote/',
    statusCheckLink: 'https://votesearch.utah.gov/voter-search/search/search-by-voter/voter-info',
    pollingPlaceLink: 'https://votesearch.utah.gov/voter-search/search/search-by-address/how-and-where-can-i-vote',
    volunteerLink: 'https://vote.utah.gov/poll-worker/',
    absenteeLink: 'https://vote.utah.gov/vote-by-mail/',
    registrationDeadline: '2025-10-21',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-28',
    earlyVotingEnd: '2025-11-03'
  },
  'Vermont': {
    registrationLink: 'https://sos.vermont.gov/elections/voters/registration/',
    statusCheckLink: 'https://mvp.vermont.gov/',
    pollingPlaceLink: 'https://mvp.vermont.gov/',
    volunteerLink: 'https://sos.vermont.gov/elections/election-officials/poll-worker-information/',
    absenteeLink: 'https://sos.vermont.gov/elections/voters/absentee-ballots/',
    registrationDeadline: '2025-10-29',
    absenteeRequestDeadline: '2025-11-01',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-09-20',
    earlyVotingEnd: '2025-11-03'
  },
  'Virginia': {
    registrationLink: 'https://www.elections.virginia.gov/registration/how-to-register/',
    statusCheckLink: 'https://www.elections.virginia.gov/citizen-portal/',
    pollingPlaceLink: 'https://www.elections.virginia.gov/voter-information/polling-place-lookup/',
    volunteerLink: 'https://www.elections.virginia.gov/poll-worker/',
    absenteeLink: 'https://www.elections.virginia.gov/voter-information/absentee-voting/',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-24',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-09-19',
    earlyVotingEnd: '2025-11-01'
  },
  'Washington': {
    registrationLink: 'https://www.sos.wa.gov/elections/register.aspx',
    statusCheckLink: 'https://voter.votewa.gov/WhereToVote.aspx',
    pollingPlaceLink: 'https://voter.votewa.gov/WhereToVote.aspx',
    volunteerLink: 'https://www.sos.wa.gov/elections/poll-workers.aspx',
    absenteeLink: 'https://www.sos.wa.gov/elections/absentee-voting.aspx',
    registrationDeadline: '2025-10-27',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'West Virginia': {
    registrationLink: 'https://sos.wv.gov/elections/Pages/RegisterToVote.aspx',
    statusCheckLink: 'https://apps.sos.wv.gov/Elections/Voter/AmIRegisteredToVote.aspx',
    pollingPlaceLink: 'https://apps.sos.wv.gov/elections/voter/FindMyPollingPlace.aspx',
    volunteerLink: 'https://sos.wv.gov/elections/Pages/PollWorkerTraining.aspx',
    absenteeLink: 'https://sos.wv.gov/elections/Pages/AbsenteeVoting.aspx',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:30 PM',
    earlyVotingStart: '2025-10-22',
    earlyVotingEnd: '2025-11-01'
  },
  'Wisconsin': {
    registrationLink: 'https://myvote.wi.gov/en-us/Register-To-Vote',
    statusCheckLink: 'https://myvote.wi.gov/en-us/Voter-Registration-Status',
    pollingPlaceLink: 'https://myvote.wi.gov/en-us/Find-My-Polling-Place',
    volunteerLink: 'https://elections.wi.gov/clerk/poll-workers',
    absenteeLink: 'https://myvote.wi.gov/en-us/Vote-Absentee-By-Mail',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-31',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-21',
    earlyVotingEnd: '2025-11-02'
  },
  'Wyoming': {
    registrationLink: 'https://sos.wyo.gov/Elections/State/RegisteringToVote.aspx',
    statusCheckLink: 'https://sos.wyo.gov/Elections/VoterServices.aspx',
    pollingPlaceLink: 'https://sos.wyo.gov/Elections/PollPlace/Default.aspx',
    volunteerLink: 'https://sos.wyo.gov/Elections/Docs/PollWorkerInfo.aspx',
    absenteeLink: 'https://sos.wyo.gov/Elections/State/AbsenteeVoting.aspx',
    registrationDeadline: '2025-10-20',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: '2025-09-20',
    earlyVotingEnd: '2025-11-03'
  },
  'District of Columbia': {
    registrationLink: 'https://dcboe.org/Voters/Register-To-Vote/Register-to-Vote',
    statusCheckLink: 'https://dcboe.org/Voters/Check-Voter-Status/Check-Voter-Status',
    pollingPlaceLink: 'https://dcboe.org/Voters/Where-to-Vote/Find-Your-Polling-Place',
    volunteerLink: 'https://dcboe.org/Voters/Become-a-Poll-Worker/Poll-Worker-Information',
    absenteeLink: 'https://dcboe.org/Voters/Absentee-Voting/Mail-in-Voting',
    registrationDeadline: '2025-10-14',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-27',
    earlyVotingEnd: '2025-11-04'
  },
  'Puerto Rico': {
    registrationLink: 'https://ww2.election.pr/cee-2024/solicitud-registro-electoral/',
    statusCheckLink: 'https://consulta.ceepur.org/',
    pollingPlaceLink: 'https://consulta.ceepur.org/',
    volunteerLink: 'https://ww2.election.pr/cee-2024/funcionarios-de-mesa/',
    absenteeLink: 'https://ww2.election.pr/cee-2024/voto-por-correo/',
    registrationDeadline: '2025-09-19',
    absenteeRequestDeadline: '2025-10-05',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-25',
    earlyVotingEnd: '2025-11-04'
  },
  'Guam': {
    registrationLink: 'https://gec.guam.gov/register/',
    statusCheckLink: 'https://gec.guam.gov/voter-services/',
    pollingPlaceLink: 'https://gec.guam.gov/polling-places/',
    volunteerLink: 'https://gec.guam.gov/poll-workers/',
    absenteeLink: 'https://gec.guam.gov/absentee-voting/',
    registrationDeadline: '2025-10-05',
    absenteeRequestDeadline: '2025-10-20',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: '2025-10-20',
    earlyVotingEnd: '2025-11-04'
  },
  'U.S. Virgin Islands': {
    registrationLink: 'https://www.vivote.gov/voters/register-to-vote',
    statusCheckLink: 'https://www.vivote.gov/voters/check-voter-status',
    pollingPlaceLink: 'https://www.vivote.gov/voters/find-your-polling-place',
    volunteerLink: 'https://www.vivote.gov/voters/become-a-poll-worker',
    absenteeLink: 'https://www.vivote.gov/voters/absentee-voting',
    registrationDeadline: '2025-10-05',
    absenteeRequestDeadline: '2025-10-28',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'American Samoa': {
    registrationLink: 'https://election.as.gov/register-to-vote/',
    statusCheckLink: 'https://election.as.gov/voter-services/',
    pollingPlaceLink: 'https://election.as.gov/polling-places/',
    volunteerLink: 'https://election.as.gov/poll-workers/',
    absenteeLink: 'https://election.as.gov/absentee-voting/',
    registrationDeadline: '2025-10-05',
    absenteeRequestDeadline: '2025-10-20',
    absenteeReturnDeadline: '2025-11-04 8:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  },
  'Northern Mariana Islands': {
    registrationLink: 'https://www.votecnmi.gov.mp/voter-registration/',
    statusCheckLink: 'https://www.votecnmi.gov.mp/voter-services/',
    pollingPlaceLink: 'https://www.votecnmi.gov.mp/polling-places/',
    volunteerLink: 'https://www.votecnmi.gov.mp/poll-workers/',
    absenteeLink: 'https://www.votecnmi.gov.mp/absentee-voting/',
    registrationDeadline: '2025-10-05',
    absenteeRequestDeadline: '2025-10-20',
    absenteeReturnDeadline: '2025-11-04 7:00 PM',
    earlyVotingStart: null,
    earlyVotingEnd: null
  }
};

/** ---- UTILS ---- */
function escapeJs(str = '') {
  return String(str)
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function getSafePhotoUrl(person) {
  const raw = person.photo;
  if (!raw || typeof raw !== 'string') return 'https://via.placeholder.com/200x300?text=No+Photo';
  const trimmed = raw.trim();
  const isBroken =
    trimmed === '' ||
    trimmed.startsWith('200x300') ||
    trimmed.startsWith('/200x300') ||
    trimmed.includes('?text=No+Photo') ||
    !trimmed.startsWith('http') ||
    trimmed.includes('ERR_NAME_NOT_RESOLVED');
  return isBroken ? 'https://via.placeholder.com/200x300?text=No+Photo' : trimmed;
}

/** ---- TABS ---- */
window.showTab = function(tabId) {
  // Hide all sections
  document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
  // Show requested
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  // Rerender for stateful sections
  const selectedState = document.getElementById('state-select').value || 'Alabama';

  switch(tabId) {
    case 'my-officials':
      renderMyOfficials(selectedState);
      break;
    case 'polls':
      renderPollsForState(selectedState);
      break;
    case 'rankings':
      renderRankings();
      break;
    case 'calendar':
      renderCalendar(calendarEvents, selectedState);
      break;
    case 'registration':
      renderVotingInfo(selectedState);
      break;
  }
};

/** ---- MODAL ---- */
function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (overlay && content) {
    content.innerHTML = html;
    overlay.style.display = 'flex';
  }
}
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (overlay) overlay.style.display = 'none';
  if (content) content.innerHTML = '';
}
window.closeModal = closeModal;

/** ---- OFFICIAL CARDS ---- */
function renderCards(data, containerId) {
  let container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = data.map(person => {
    const partyLower = (person.party || '').toLowerCase();
    const partyColor =
      partyLower.includes('repub') ? '#d73027' :
      partyLower.includes('dem') ? '#4575b4' :
      partyLower.includes('libert') ? '#fdae61' :
      partyLower.includes('indep') ? '#999999' :
      partyLower.includes('green') ? '#66bd63' :
      partyLower.includes('constit') ? '#984ea3' :
      '#cccccc';
    const imageUrl = getSafePhotoUrl(person);
    return `
      <div class="card" style="border-left: 8px solid ${partyColor}; cursor:pointer;" onclick="expandCard('${escapeJs(person.slug)}')">
        <img src="${imageUrl}" alt="${escapeJs(person.name)}" />
        <h3>${person.name}</h3>
        <p>${person.office || person.position || ''}</p>
        <p>${person.state}${person.party ? ', ' + person.party : ''}</p>
      </div>
    `;
  }).join('');
}
window.expandCard = function(slug) {
  const person = allOfficials.find(p => p.slug === slug);
  if (!person) return;
  // Modal HTML
  const imageUrl = getSafePhotoUrl(person);
  const link = person.ballotpediaLink || person.contact?.website || '';
  let html = `
    <div class="modal-container">
      <div class="modal-left">
        <img src="${imageUrl}" />
        <h2>${person.name}</h2>
        ${link ? `<p><a href="${link}" target="_blank" rel="noopener noreferrer">External Profile</a></p>` : ''}
        <p><strong>Contact:</strong>
          ${person.contact?.email ? `<a href="mailto:${person.contact.email}" class="contact-icon">📧</a>` : ''}
          ${person.contact?.phone ? `<a href="tel:${person.contact.phone.replace(/[^0-9]/g, '')}" class="contact-icon">📞</a>` : ''}
          ${person.contact?.website ? `<a href="${person.contact.website}" target="_blank" rel="noopener noreferrer" class="contact-icon">🌐</a>` : ''}
        </p>
      </div>
      <div class="modal-right">
        ${person.bio ? `<p><strong>Bio:</strong> ${person.bio}</p>` : ''}
        ${person.education ? `<p><strong>Education:</strong> ${person.education}</p>` : ''}
        ${person.endorsements ? `<p><strong>Endorsements:</strong> ${person.endorsements}</p>` : ''}
        ${person.platform ? `<p><strong>Platform:</strong> ${person.platform}</p>` : ''}
        ${person.platformFollowThrough && Object.keys(person.platformFollowThrough).length
          ? `<div class="platform-followthrough"><h3>Platform Follow-Through</h3><ul>${
            Object.entries(person.platformFollowThrough).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')
          }</ul></div>`
          : ''}
        ${person.proposals ? `<p><strong>Legislative Proposals:</strong> ${person.proposals}</p>` : ''}
        ${person.billsSigned?.length
          ? `<p><strong>Key Bills Signed:</strong></p><ul>${
            person.billsSigned.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')
          }</ul>`
          : ''}
        ${person.vetoes ? `<p><strong>Vetoes:</strong> ${person.vetoes}</p>` : ''}
        ${person.salary ? `<p><strong>Salary:</strong> ${person.salary}</p>` : ''}
        ${person.predecessor ? `<p><strong>Predecessor:</strong> ${person.predecessor}</p>` : ''}
        ${person.donationLink ? `<p><strong>Donate:</strong> <a href="${person.donationLink}" target="_blank">💸</a></p>` : ''}
      </div>
    </div>
  `;
  openModal(html);
};

/** ---- MY OFFICIALS ---- */
function renderMyOfficials(state) {
  if (!state) return;
  const matches = allOfficials.filter(p =>
    p.state === state || p.stateName === state || p.stateAbbreviation === state
  );
  // Sort by role
  const roleOrder = ['senator', 'representative', 'governor', 'lt. governor', 'lt governor', 'ltgovernor', 'lieutenant governor'];
  matches.sort((a, b) => {
    const roleA = (a.office || a.position || '').toLowerCase();
    const roleB = (b.office || b.position || '').toLowerCase();
    const idxA = roleOrder.findIndex(role => roleA.includes(role));
    const idxB = roleOrder.findIndex(role => roleB.includes(role));
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
  renderCards(matches, 'my-cards');
}

/** ---- RANKINGS ---- */
function renderRankings() {
  const governors = allOfficials.filter(p => {
    const role = (p.office || p.position || '').toLowerCase();
    return role.includes('governor') && !role.includes('lt') && !role.includes('lieutenant');
  });
  const ltGovernors = allOfficials.filter(p => {
    const role = (p.office || p.position || '').toLowerCase();
    return (
      role.includes('lt. governor') ||
      role.includes('lt governor') ||
      role.includes('ltgovernor') ||
      role.includes('lieutenant governor')
    );
  });
  const senators = allOfficials.filter(p => (p.office || p.position || '').toLowerCase().includes('senator'));
  const house = allOfficials.filter(p => (p.office || p.position || '').toLowerCase().includes('representative'));
  renderCards(governors, 'rankings-governors');
  renderCards(senators, 'rankings-senators');
  renderCards(house, 'rankings-house');
  renderCards(ltGovernors, 'rankings-ltgovernors');
}

/** ---- CALENDAR ---- */
function renderCalendar(events, selectedState) {
  const container = document.getElementById('calendar-container');
  if (!container) return;
  const today = new Date();
  const selected = (selectedState || '').trim().toLowerCase();
  const filtered = events.filter(e => {
    const eventState = (e.state || '').trim().toLowerCase();
    const eventDate = new Date(e.date);
    return (
      (!selected || eventState === selected || eventState === 'all' || eventState === 'national') &&
      !isNaN(eventDate) &&
      eventDate >= today
    );
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
  container.innerHTML = filtered.length
    ? filtered.map(event => `
      <div class="card" onclick="openEventModal('${escapeJs(event.title)}', '${event.date}', '${escapeJs(event.state)}', '${escapeJs(event.type)}', '${escapeJs(event.details)}', '${event.link}')">
        <h3>${event.title}</h3>
        <p><strong>Date:</strong> ${event.date}</p>
        <p><strong>Type:</strong> ${event.type}</p>
      </div>
    `).join('')
    : `<p>No upcoming events for ${selectedState ? selectedState : 'your selection'}.</p>`;
}
window.openEventModal = function(title, date, state, type, details, link) {
  openModal(`
    <div class="event-modal">
      <h2>${title}</h2>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>State:</strong> ${state}</p>
      <p><strong>Type:</strong> ${type}</p>
      <p>${details}</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">More Info</a></p>
    </div>
  `);
};

/** ---- VOTING INFO ---- */
function renderVotingInfo(state) {
  const container = document.getElementById('voting-container');
  const info = votingInfo[state];
  if (!container || !info) {
    if (container) container.innerHTML = `<p>No voting info available for ${state}. Please check your state’s official voter website.</p>`;
    return;
  }
  container.innerHTML = `
    <div class="card">
      <h3>Register to Vote in ${state}</h3>
      <p><a href="${info.registrationLink}" target="_blank">Register Online</a></p>
      <p><a href="${info.statusCheckLink}" target="_blank">Check Registration Status</a></p>
      <p><strong>Deadline:</strong> ${info.registrationDeadline || 'Varies'}</p>
    </div>
    <div class="card">
      <h3>Polling Place</h3>
      <p><a href="${info.pollingPlaceLink}" target="_blank">Find Your Polling Place</a></p>
    </div>
    <div class="card">
      <h3>Vote by Mail</h3>
      <p><a href="${info.absenteeLink}" target="_blank">Request Absentee Ballot</a></p>
      <p><strong>Request Deadline:</strong> ${info.absenteeRequestDeadline}</p>
      <p><strong>Return Deadline:</strong> ${info.absenteeReturnDeadline}</p>
    </div>
    <div class="card">
      <h3>Early Voting</h3>
      <p><strong>Start:</strong> ${info.earlyVotingStart || 'Not available'}</p>
      <p><strong>End:</strong> ${info.earlyVotingEnd || 'Not available'}</p>
    </div>
    <div class="card">
      <h3>Volunteer</h3>
      <p><a href="${info.volunteerLink}" target="_blank">Become a Poll Worker</a></p>
    </div>
  `;
}

/** ---- POLLS ---- */
function renderPollsForState(stateName) {
  const pollsContainer = document.getElementById('polls-container');
  if (!pollsContainer || !stateName) return;
  const emersonLink = `https://emersoncollegepolling.com/category/state-polls/${stateName.replace(/\s+/g, '-').toLowerCase()}/`;
  const rcpLink = `https://www.realclearpolitics.com/epolls/${stateName.replace(/\s+/g, '_').toLowerCase()}/`;
  pollsContainer.innerHTML = `
    <div class="card">
      <h3>${stateName} Polls</h3>
      <p>Source: Emerson College</p>
      <a href="${emersonLink}" target="_blank">View Emerson Polls</a>
    </div>
    <div class="card">
      <h3>${stateName} Polls</h3>
      <p>Source: RealClearPolitics</p>
      <a href="${rcpLink}" target="_blank">View RCP Polls</a>
    </div>
    <div class="card">
      <h3>National Polls</h3>
      <p>Source: FiveThirtyEight</p>
      <a href="https://projects.fivethirtyeight.com/polls/" target="_blank">View FiveThirtyEight Polls</a>
    </div>
  `;
}

/** ---- GLOBAL SEARCH ---- */
function setupGlobalSearch() {
  const searchInput = document.getElementById('search');
  const dropdown = document.createElement('div');
  dropdown.className = 'search-dropdown';
  dropdown.style.position = 'absolute';
  dropdown.style.zIndex = '1001';
  dropdown.style.display = 'none';
  dropdown.style.maxHeight = '300px';
  dropdown.style.overflowY = 'auto';
  dropdown.style.background = '#fff';
  dropdown.style.border = '1px solid #ccc';
  dropdown.style.width = '100%';

  searchInput.parentNode.appendChild(dropdown);

  searchInput.addEventListener('input', function () {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      dropdown.style.display = 'none';
      return;
    }
    const matches = allOfficials.filter(
      p => 
        p.name.toLowerCase().includes(q) ||
        (p.office || '').toLowerCase().includes(q) ||
        (p.position || '').toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q)
    );
    if (matches.length === 0) {
      dropdown.innerHTML = '<div style="padding:8px;">No matches found.</div>';
      dropdown.style.display = 'block';
      return;
    }
    dropdown.innerHTML = matches.map(p => `
      <div class="search-result-item" style="padding:8px; cursor:pointer; border-bottom:1px solid #eee;" onclick="expandCard('${escapeJs(p.slug)}');document.querySelector('.search-dropdown').style.display='none';document.getElementById('search').value='';">
        <strong>${p.name}</strong> <span style="font-size:90%;">(${p.state}, ${p.office || p.position})</span>
      </div>
    `).join('');
    dropdown.style.display = 'block';
  });

  document.addEventListener('click', function (e) {
    if (!dropdown.contains(e.target) && e.target !== searchInput) {
      dropdown.style.display = 'none';
    }
  });
}

/** ---- LOAD DATA ---- */
async function loadData() {
  // Wait for cleanHouse.js to load window.cleanedHouse
  await new Promise(resolve => {
    const check = () => {
      if (window.cleanedHouse && Array.isArray(window.cleanedHouse)) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
  const house = window.cleanedHouse || [];
  const governors = await fetch('./Governors.json').then(res => res.ok ? res.json() : []).catch(() => []);
  const senate = await fetch('./Senate.json').then(res => res.ok ? res.json() : []).catch(() => []);
  let ltGovernors = [];
  try {
    ltGovernors = await fetch('./LtGovernors.json').then(res => res.ok ? res.json() : []).catch(() => []);
  } catch {}
  window.allOfficials = [...governors, ...senate, ...house, ...ltGovernors];
  allOfficials = window.allOfficials;

  // Populate state-select dropdown in strict alphabetical order
  const stateSelect = document.getElementById('state-select');
  if (stateSelect) {
    const states = [...new Set(allOfficials.map(p => p.state).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    while (stateSelect.options.length > 1) stateSelect.remove(1);
    states.forEach(state => {
      const opt = document.createElement('option');
      opt.value = opt.text = state;
      stateSelect.appendChild(opt);
    });
    stateSelect.value = stateSelect.querySelector('option[value="Alabama"]') ? 'Alabama' : (states[0] || '');
  }
  // Initial render
  const defaultState = stateSelect ? (stateSelect.value || 'Alabama') : 'Alabama';
  currentState = defaultState;
  renderMyOfficials(defaultState);
  renderCalendar(calendarEvents, defaultState);
  renderVotingInfo(defaultState);
  renderPollsForState(defaultState);
}

/** ---- INITIALIZATION ---- */
document.addEventListener('DOMContentLoaded', function () {
  loadData();

  // State select logic
  const stateSelect = document.getElementById('state-select');
  if (stateSelect) {
    stateSelect.addEventListener('change', function () {
      currentState = this.value;
      renderMyOfficials(currentState);
      renderCalendar(calendarEvents, currentState);
      renderVotingInfo(currentState);
      renderPollsForState(currentState);
      window.showTab('my-officials');
    });
  }

  // Set up global search bar with dropdown
  setupGlobalSearch();

  // Modal overlay click to close
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  // Tab button wiring
  document.querySelectorAll('#tabs button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#tabs button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const tabId = button.getAttribute('onclick').match(/'(.+)'/)[1];
      window.showTab(tabId);
    });
  });

  // Start on My Officials tab
  window.showTab('my-officials');
});
