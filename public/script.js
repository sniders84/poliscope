// script.js for Poliscope - Complete rebuild with all tweaks
let currentState = 'Alabama';
let officials = {
  governors: [],
  senators: [],
  representatives: [],
  ltGovernors: []
};

// Full state/territory list for dropdown
const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'District of Columbia', 'Puerto Rico', 'Guam', 'U.S. Virgin Islands', 'American Samoa', 'Northern Mariana Islands'
];

// Election data for 2025 (state-specific, live links from Ballotpedia/state sites)
const electionData = {
  'Alabama': [
    { date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.alabama.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.alabama.gov/elections' },
    { date: 'October 20, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting' }
  ],
  'Alaska': [
    { date: 'August 19, 2025', type: 'Primary', link: 'https://www.elections.alaska.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.elections.alaska.gov/' },
    { date: 'October 5, 2025', type: 'Voter Registration Deadline', link: 'https://www.elections.alaska.gov/Core/voterregistration.php' },
    { date: 'October 20, 2025', type: 'Absentee Request Deadline', link: 'https://www.elections.alaska.gov/Core/absenteevotingbyabsenteeballot.php' }
  ],
  'Arizona': [
    { date: 'July 29, 2025', type: 'Primary', link: 'https://azsos.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://azsos.gov/elections' },
    { date: 'October 4, 2025', type: 'Voter Registration Deadline', link: 'https://azsos.gov/elections/voting-election/register-vote-or-update-your-current-voter-information' },
    { date: 'October 24, 2025', type: 'Absentee Request Deadline', link: 'https://azsos.gov/elections/voting-election/vote-mail' }
  ],
  'Arkansas': [
    { date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.arkansas.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.arkansas.gov/elections' },
    { date: 'October 5, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.arkansas.gov/elections/voter-information/voter-registration-information' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.arkansas.gov/elections/voter-information/absentee-voting' }
  ],
  'California': [
    { date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.ca.gov/elections' },
    { date: 'November 4, 2025', type: 'Gubernatorial', link: 'https://www.sos.ca.gov/elections' },
    { date: 'October 21, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.ca.gov/elections/voter-registration' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.ca.gov/elections/voter-registration/vote-mail' }
  ],
  'Colorado': [
    { date: 'June 24, 2025', type: 'Primary', link: 'https://www.sos.state.co.us/pubs/elections/' },
    { date: 'November 4, 2025', type: 'State Supreme Court', link: 'https://www.sos.state.co.us/pubs/elections/' },
    { date: 'October 27, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.state.co.us/pubs/elections/vote.html' },
    { date: 'October 27, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.state.co.us/pubs/elections/vote.html' }
  ],
  'Connecticut': [
    { date: 'September 9, 2025', type: 'Primary', link: 'https://portal.ct.gov/SOTS/Election-Services/Election-Services' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://portal.ct.gov/SOTS/Election-Services/Election-Services' },
    { date: 'October 20, 2025', type: 'Voter Registration Deadline', link: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Registration-Information/Voter-Registration' },
    { date: 'November 1, 2025', type: 'Absentee Request Deadline', link: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Absentee-Voting' }
  ],
  'Delaware': [
    { date: 'September 9, 2025', type: 'Primary', link: 'https://elections.delaware.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://elections.delaware.gov/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://elections.delaware.gov/voter/register.shtml' },
    { date: 'October 29, 2025', type: 'Absentee Request Deadline', link: 'https://elections.delaware.gov/voter/absentee.shtml' }
  ],
  'Florida': [
    { date: 'August 19, 2025', type: 'Primary', link: 'https://www.dos.myflorida.com/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.dos.myflorida.com/elections/' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://dos.myflorida.com/elections/for-voters/voter-registration/register-to-vote-or-update-your-information/' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://dos.myflorida.com/elections/for-voters/voting/vote-by-mail/' }
  ],
  'Georgia': [
    { date: 'May 20, 2025', type: 'Primary', link: 'https://sos.ga.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.ga.gov/elections' },
    { date: 'October 6, 2025', type: 'Voter Registration Deadline', link: 'https://sos.ga.gov/how-to-guide/how-guide-register-vote' },
    { date: 'October 29, 2025', type: 'Absentee Request Deadline', link: 'https://sos.ga.gov/how-to-guide/how-guide-absentee-voting' }
  ],
  'Hawaii': [
    { date: 'August 8, 2025', type: 'Primary', link: 'https://elections.hawaii.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://elections.hawaii.gov/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://elections.hawaii.gov/voters/registration/' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://elections.hawaii.gov/voters/absentee-voting/' }
  ],
  'Idaho': [
    { date: 'May 20, 2025', type: 'Primary', link: 'https://sos.idaho.gov/elections-division/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.idaho.gov/elections-division/' },
    { date: 'October 20, 2025', type: 'Voter Registration Deadline', link: 'https://voteidaho.gov/voter-registration/' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://voteidaho.gov/absentee-voting/' }
  ],
  'Illinois': [
    { date: 'March 17, 2025', type: 'Primary', link: 'https://www.elections.il.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.elections.il.gov/' },
    { date: 'October 21, 2025', type: 'Voter Registration Deadline', link: 'https://www.elections.il.gov/VoterReg.aspx' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://www.elections.il.gov/VotingByMail.aspx' }
  ],
  'Indiana': [
    { date: 'May 6, 2025', type: 'Primary', link: 'https://www.in.gov/sos/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.in.gov/sos/elections/' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://indianavoters.in.gov/MVPHome/PrintDocuments' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://www.in.gov/sos/elections/absentee-voting/' }
  ],
  'Iowa': [
    { date: 'June 3, 2025', type: 'Primary', link: 'https://sos.iowa.gov/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.iowa.gov/elections/' },
    { date: 'October 21, 2025', type: 'Voter Registration Deadline', link: 'https://sos.iowa.gov/elections/voterinformation/voterregistration.html' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://sos.iowa.gov/elections/voterinformation/absenteeinfo.html' }
  ],
  'Kansas': [
    { date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.ks.gov/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.ks.gov/elections/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://sos.ks.gov/elections/voter-registration.html' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://sos.ks.gov/elections/advance-voting.html' }
  ],
  'Kentucky': [
    { date: 'May 20, 2025', type: 'Primary', link: 'https://elect.ky.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://elect.ky.gov/' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://elect.ky.gov/registertovote/Pages/default.aspx' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://elect.ky.gov/Voters/Pages/Absentee-Voting.aspx' }
  ],
  'Louisiana': [
    { date: 'October 11, 2025', type: 'Primary', link: 'https://www.sos.la.gov/ElectionsAndVoting' },
    { date: 'November 15, 2025', type: 'General Election', link: 'https://www.sos.la.gov/ElectionsAndVoting' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.la.gov/ElectionsAndVoting/Pages/OnlineVoterRegistration.aspx' },
    { date: 'November 1, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.la.gov/ElectionsAndVoting/Vote/VoteByMail/Pages/default.aspx' }
  ],
  'Maine': [
    { date: 'June 10, 2025', type: 'Primary', link: 'https://www.maine.gov/sos/cec/elec/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.maine.gov/sos/cec/elec/' },
    { date: 'October 29, 2025', type: 'Voter Registration Deadline', link: 'https://www.maine.gov/sos/cec/elec/voter-info/voterreg.html' },
    { date: 'November 1, 2025', type: 'Absentee Request Deadline', link: 'https://www.maine.gov/sos/cec/elec/voter-info/absent.html' }
  ],
  'Maryland': [
    { date: 'May 13, 2025', type: 'Primary', link: 'https://elections.maryland.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://elections.maryland.gov/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://elections.maryland.gov/voter_registration/index.html' },
    { date: 'October 21, 2025', type: 'Absentee Request Deadline', link: 'https://elections.maryland.gov/voting/absentee.html' }
  ],
  'Massachusetts': [
    { date: 'September 16, 2025', type: 'Primary', link: 'https://www.sec.state.ma.us/ele/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sec.state.ma.us/ele/' },
    { date: 'October 19, 2025', type: 'Voter Registration Deadline', link: 'https://www.sec.state.ma.us/ovr/' },
    { date: 'October 29, 2025', type: 'Absentee Request Deadline', link: 'https://www.sec.state.ma.us/ele/eleabs/absidx.htm' }
  ],
  'Michigan': [
    { date: 'August 5, 2025', type: 'Primary', link: 'https://www.michigan.gov/sos/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.michigan.gov/sos/elections' },
    { date: 'October 20, 2025', type: 'Voter Registration Deadline', link: 'https://mvic.sos.state.mi.us/RegisterVoter/Index' },
    { date: 'October 27, 2025', type: 'Absentee Request Deadline', link: 'https://mvic.sos.state.mi.us/AVApplication/Index' }
  ],
  'Minnesota': [
    { date: 'August 12, 2025', type: 'Primary', link: 'https://www.sos.state.mn.us/elections-voting/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.state.mn.us/elections-voting/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.state.mn.us/elections-voting/register-to-vote/' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.state.mn.us/elections-voting/other-ways-to-vote/vote-early-by-mail/' }
  ],
  'Mississippi': [
    { date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.ms.gov/elections-voting' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.ms.gov/elections-voting' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.ms.gov/elections-voting/voter-registration' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.ms.gov/elections-voting/absentee-voting' }
  ],
  'Missouri': [
    { date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.mo.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.mo.gov/elections' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.mo.gov/elections/goVoteMissouri/register' },
    { date: 'October 29, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.mo.gov/elections/goVoteMissouri/howtovote#absentee' }
  ],
  'Montana': [
    { date: 'June 3, 2025', type: 'Primary', link: 'https://sosmt.gov/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sosmt.gov/elections/' },
    { date: 'October 27, 2025', type: 'Voter Registration Deadline', link: 'https://sosmt.gov/elections/voter/' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://sosmt.gov/elections/absentee/' }
  ],
  'Nebraska': [
    { date: 'May 13, 2025', type: 'Primary', link: 'https://sos.nebraska.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.nebraska.gov/elections' },
    { date: 'October 20, 2025', type: 'Voter Registration Deadline', link: 'https://www.nebraska.gov/apps-sos-voter-registration' },
    { date: 'October 24, 2025', type: 'Absentee Request Deadline', link: 'https://sos.nebraska.gov/elections/absentee-voting' }
  ],
  'Nevada': [
    { date: 'June 10, 2025', type: 'Primary', link: 'https://www.nvsos.gov/sos/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.nvsos.gov/sos/elections' },
    { date: 'October 20, 2025', type: 'Voter Registration Deadline', link: 'https://www.nvsos.gov/sos/voter-services/registering-to-vote' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://www.nvsos.gov/sos/elections/voters/absentee-voting' }
  ],
  'New Hampshire': [
    { date: 'September 9, 2025', type: 'Primary', link: 'https://sos.nh.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.nh.gov/elections' },
    { date: 'October 29, 2025', type: 'Voter Registration Deadline', link: 'https://sos.nh.gov/elections/voters/register-to-vote/' },
    { date: 'November 1, 2025', type: 'Absentee Request Deadline', link: 'https://sos.nh.gov/elections/voters/absentee-ballots/' }
  ],
  'New Jersey': [
    { date: 'June 3, 2025', type: 'Primary', link: 'https://www.state.nj.us/state/elections/index.shtml' },
    { date: 'November 4, 2025', type: 'Gubernatorial', link: 'https://www.state.nj.us/state/elections/index.shtml' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://nj.gov/state/elections/voter-registration.shtml' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://nj.gov/state/elections/vote-by-mail.shtml' }
  ],
  'New Mexico': [
    { date: 'June 3, 2025', type: 'Primary', link: 'https://www.sos.state.nm.us/voting-and-elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.state.nm.us/voting-and-elections/' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.state.nm.us/voting-and-elections/voter-information-portal-nmvote-org/voter-registration-information/' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.state.nm.us/voting-and-elections/absentee-and-early-voting/absentee-voting-by-mail/' }
  ],
  'New York': [
    { date: 'June 24, 2025', type: 'Primary', link: 'https://www.elections.ny.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.elections.ny.gov/' },
    { date: 'October 27, 2025', type: 'Voter Registration Deadline', link: 'https://www.elections.ny.gov/registervote.html' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://www.elections.ny.gov/votingabsentees.html' }
  ],
  'North Carolina': [
    { date: 'March 3, 2025', type: 'Primary', link: 'https://www.ncsbe.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.ncsbe.gov/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://www.ncsbe.gov/registering/how-register' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://www.ncsbe.gov/voting/vote-mail/absentee-ballot-tools' }
  ],
  'North Dakota': [
    { date: 'June 10, 2025', type: 'Primary', link: 'https://sos.nd.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.nd.gov/elections' },
    { date: 'October 27, 2025', type: 'Voter Registration Deadline', link: 'https://sos.nd.gov/elections/voter/voting-north-dakota' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://sos.nd.gov/elections/voter/absentee-or-mail-ballot-voting' }
  ],
  'Ohio': [
    { date: 'May 6, 2025', type: 'Primary', link: 'https://www.ohiosos.gov/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.ohiosos.gov/elections/' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://olvr.ohiosos.gov/' },
    { date: 'October 29, 2025', type: 'Absentee Request Deadline', link: 'https://www.ohiosos.gov/elections/voters/absentee-voting/' }
  ],
  'Oklahoma': [
    { date: 'June 17, 2025', type: 'Primary', link: 'https://oklahoma.gov/elections.html' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://oklahoma.gov/elections.html' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://oklahoma.gov/elections/voters/register-to-vote.html' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://oklahoma.gov/elections/voters/absentee-voting.html' }
  ],
  'Oregon': [
    { date: 'May 20, 2025', type: 'Primary', link: 'https://sos.oregon.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.oregon.gov/elections' },
    { date: 'October 21, 2025', type: 'Voter Registration Deadline', link: 'https://sos.oregon.gov/elections/Pages/registration.aspx' },
    { date: 'October 29, 2025', type: 'Absentee Request Deadline', link: 'https://sos.oregon.gov/elections/Pages/votebymail.aspx' }
  ],
  'Pennsylvania': [
    { date: 'May 20, 2025', type: 'Primary', link: 'https://www.pa.gov/en/agencies/dos/elections.html' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.pa.gov/en/agencies/dos/elections.html' },
    { date: 'October 21, 2025', type: 'Voter Registration Deadline', link: 'https://pavoterservices.pa.gov/Pages/VoterRegistrationApplication.aspx' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://www.pa.gov/en/agencies/vote/other-election-information/vote-by-mail.html' }
  ],
  'Rhode Island': [
    { date: 'September 9, 2025', type: 'Primary', link: 'https://vote.ri.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://vote.ri.gov/' },
    { date: 'October 6, 2025', type: 'Voter Registration Deadline', link: 'https://vote.sos.ri.gov/Voter/RegisterToVote' },
    { date: 'October 29, 2025', type: 'Absentee Request Deadline', link: 'https://vote.sos.ri.gov/Voter/MailBallot' }
  ],
  'South Carolina': [
    { date: 'June 10, 2025', type: 'Primary', link: 'https://www.scvotes.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.scvotes.gov/' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://scvotes.gov/voters/register-to-vote/' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://scvotes.gov/voters/absentee-voting/' }
  ],
  'South Dakota': [
    { date: 'June 3, 2025', type: 'Primary', link: 'https://sdsos.gov/elections-voting/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sdsos.gov/elections-voting/' },
    { date: 'October 20, 2025', type: 'Voter Registration Deadline', link: 'https://sdsos.gov/elections-voting/voting/register-to-vote/default.aspx' },
    { date: 'October 31, 2025', type: 'Absente Request Deadline', link: 'https://sdsos.gov/elections-voting/voting/absentee-voting.aspx' }
  ],
  'Tennessee': [
    { date: 'August 7, 2025', type: 'Primary', link: 'https://sos.tn.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.tn.gov/elections' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://sos.tn.gov/elections/guides/how-to-register-to-vote' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://sos.tn.gov/elections/guides/how-to-vote-absentee-by-mail' }
  ],
  'Texas': [
    { date: 'March 3, 2025', type: 'Primary', link: 'https://www.sos.state.tx.us/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.state.tx.us/elections/' },
    { date: 'October 7, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.state.tx.us/elections/voter/reqvr.shtml' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.state.tx.us/elections/voter/absentee-ballot.shtml' }
  ],
  'Utah': [
    { date: 'June 24, 2025', type: 'Primary', link: 'https://vote.utah.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://vote.utah.gov/' },
    { date: 'October 21, 2025', type: 'Voter Registration Deadline', link: 'https://vote.utah.gov/register-to-vote/' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://vote.utah.gov/vote-by-mail/' }
  ],
  'Vermont': [
    { date: 'August 12, 2025', type: 'Primary', link: 'https://sos.vermont.gov/elections' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.vermont.gov/elections' },
    { date: 'October 29, 2025', type: 'Voter Registration Deadline', link: 'https://sos.vermont.gov/elections/voters/registration/' },
    { date: 'November 1, 2025', type: 'Absentee Request Deadline', link: 'https://sos.vermont.gov/elections/voters/absentee-ballots/' }
  ],
  'Virginia': [
    { date: 'June 17, 2025', type: 'Primary', link: 'https://www.elections.virginia.gov/' },
    { date: 'November 4, 2025', type: 'Gubernatorial', link: 'https://www.elections.virginia.gov/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://www.elections.virginia.gov/registration/how-to-register/' },
    { date: 'October 24, 2025', type: 'Absentee Request Deadline', link: 'https://www.elections.virginia.gov/voter-information/absentee-voting/' }
  ],
  'Washington': [
    { date: 'August 5, 2025', type: 'Primary', link: 'https://www.sos.wa.gov/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.sos.wa.gov/elections/' },
    { date: 'October 27, 2025', type: 'Voter Registration Deadline', link: 'https://www.sos.wa.gov/elections/register.aspx' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://www.sos.wa.gov/elections/absentee-voting.aspx' }
  ],
  'West Virginia': [
    { date: 'May 13, 2025', type: 'Primary', link: 'https://sos.wv.gov/elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.wv.gov/elections/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://sos.wv.gov/elections/Pages/RegisterToVote.aspx' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://sos.wv.gov/elections/Pages/AbsenteeVoting.aspx' }
  ],
  'Wisconsin': [
    { date: 'August 12, 2025', type: 'Primary', link: 'https://elections.wi.gov/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://elections.wi.gov/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://myvote.wi.gov/en-us/Register-To-Vote' },
    { date: 'October 31, 2025', type: 'Absentee Request Deadline', link: 'https://myvote.wi.gov/en-us/Vote-Absentee-By-Mail' }
  ],
  'Wyoming': [
    { date: 'August 19, 2025', type: 'Primary', link: 'https://sos.wyo.gov/Elections/' },
    { date: 'November 4, 2025', type: 'General Election', link: 'https://sos.wyo.gov/Elections/' },
    { date: 'October 20, 2025', type: 'Voter Registration Deadline', link: 'https://sos.wyo.gov/Elections/State/RegisteringToVote.aspx' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://sos.wyo.gov/Elections/State/AbsenteeVoting.aspx' }
  ],
  'District of Columbia': [
    { date: 'June 3, 2025', type: 'Primary', link: 'https://dcboe.org/' },
    { date: 'November 4, 2025', type: 'At-Large Council', link: 'https://dcboe.org/' },
    { date: 'October 14, 2025', type: 'Voter Registration Deadline', link: 'https://dcboe.org/Voters/Register-To-Vote/Register-to-Vote' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://dcboe.org/Voters/Absentee-Voting/Mail-in-Voting' }
  ],
  'Puerto Rico': [
    { date: 'June 1, 2025', type: 'Primary', link: 'https://www.ceepur.org/' },
    { date: 'November 4, 2025', type: 'Mayoral Runoffs', link: 'https://www.ceepur.org/' },
    { date: 'September 19, 2025', type: 'Voter Registration Deadline', link: 'https://ww2.election.pr/cee-2024/solicitud-registro-electoral/' },
    { date: 'October 5, 2025', type: 'Absentee Request Deadline', link: 'https://ww2.election.pr/cee-2024/voto-por-correo/' }
  ],
  'Guam': [
    { date: 'August 30, 2025', type: 'Primary', link: 'https://gec.guam.gov/' },
    { date: 'November 4, 2025', type: 'Local Election', link: 'https://gec.guam.gov/' },
    { date: 'October 5, 2025', type: 'Voter Registration Deadline', link: 'https://gec.guam.gov/register/' },
    { date: 'October 20, 2025', type: 'Absentee Request Deadline', link: 'https://gec.guam.gov/absentee-voting/' }
  ],
  'U.S. Virgin Islands': [
    { date: 'November 4, 2025', type: 'Local Election', link: 'https://www.vivote.gov/' },
    { date: 'October 5, 2025', type: 'Voter Registration Deadline', link: 'https://www.vivote.gov/voters/register-to-vote' },
    { date: 'October 28, 2025', type: 'Absentee Request Deadline', link: 'https://www.vivote.gov/voters/absentee-voting' }
  ],
  'American Samoa': [
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.americansamoa.gov/elections' },
    { date: 'October 5, 2025', type: 'Voter Registration Deadline', link: 'https://election.as.gov/register-to-vote/' },
    { date: 'October 20, 2025', type: 'Absentee Request Deadline', link: 'https://election.as.gov/absentee-voting/' }
  ],
  'Northern Mariana Islands': [
    { date: 'November 4, 2025', type: 'General Election', link: 'https://www.votecnmi.gov.mp/' },
    { date: 'October 5, 2025', type: 'Voter Registration Deadline', link: 'https://www.votecnmi.gov.mp/voter-registration/' },
    { date: 'October 20, 2025', type: 'Absentee Request Deadline', link: 'https://www.votecnmi.gov.mp/absentee-voting/' }
  ]
};

// Registration links (full, live from vote.gov and state sites)
const registrationLinks = {
  'Alabama': {
    register: 'https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote',
    polling: 'https://myinfo.alabamavotes.gov/voterview',
    absentee: 'https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting',
    volunteer: 'https://www.sos.alabama.gov/alabama-votes/poll-worker-information'
  },
  'Alaska': {
    register: 'https://www.elections.alaska.gov/Core/voterregistration.php',
    polling: 'https://myvoterinformation.alaska.gov/',
    absentee: 'https://www.elections.alaska.gov/Core/absenteevotingbyabsenteeballot.php',
    volunteer: 'https://www.elections.alaska.gov/Core/pollworkerinformation.php'
  },
  'Arizona': {
    register: 'https://azsos.gov/elections/voting-election/register-vote-or-update-your-current-voter-information',
    polling: 'https://voter.azsos.gov/VoterView/PollingPlaceSearch.do',
    absentee: 'https://azsos.gov/elections/voting-election/vote-mail',
    volunteer: 'https://azsos.gov/elections/poll-worker-information'
  },
  'Arkansas': {
    register: 'https://www.sos.arkansas.gov/elections/voter-information/voter-registration-information',
    polling: 'https://www.sos.arkansas.gov/elections/voter-information/find-your-polling-place',
    absentee: 'https://www.sos.arkansas.gov/elections/voter-information/absentee-voting',
    volunteer: 'https://www.sos.arkansas.gov/elections/voter-information/become-a-poll-worker'
  },
  'California': {
    register: 'https://www.sos.ca.gov/elections/voter-registration',
    polling: 'https://www.sos.ca.gov/elections/polling-place',
    absentee: 'https://www.sos.ca.gov/elections/voter-registration/vote-mail',
    volunteer: 'https://www.sos.ca.gov/elections/poll-worker-information'
  },
  'Colorado': {
    register: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    polling: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    absentee: 'https://www.sos.state.co.us/pubs/elections/vote.html',
    volunteer: 'https://www.sos.state.co.us/pubs/elections/pollworkers.html'
  },
  'Connecticut': {
    register: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Registration-Information/Voter-Registration',
    polling: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Polling-Place-Locator',
    absentee: 'https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Absentee-Voting',
    volunteer: 'https://portal.ct.gov/SOTS/Election-Services/Poll-Worker-Information/Poll-Worker-Information'
  },
  'Delaware': {
    register: 'https://elections.delaware.gov/voter/register.shtml',
    polling: 'https://elections.delaware.gov/voter/pollfinder.shtml',
    absentee: 'https://elections.delaware.gov/voter/absentee.shtml',
    volunteer: 'https://elections.delaware.gov/pollworkers/index.shtml'
  },
  'Florida': {
    register: 'https://dos.myflorida.com/elections/for-voters/voter-registration/register-to-vote-or-update-your-information/',
    polling: 'https://dos.myflorida.com/elections/for-voters/voting/find-my-polling-place/',
    absentee: 'https://dos.myflorida.com/elections/for-voters/voting/vote-by-mail/',
    volunteer: 'https://dos.myflorida.com/elections/for-voters/become-a-poll-worker/'
  },
  'Georgia': {
    register: 'https://sos.ga.gov/how-to-guide/how-guide-register-vote',
    polling: 'https://mvp.sos.ga.gov/s/',
    absentee: 'https://sos.ga.gov/how-to-guide/how-guide-absentee-voting',
    volunteer: 'https://sos.ga.gov/poll-worker-training'
  },
  'Hawaii': {
    register: 'https://elections.hawaii.gov/voters/registration/',
    polling: 'https://elections.hawaii.gov/voters/voting-locations/',
    absentee: 'https://elections.hawaii.gov/voters/absentee-voting/',
    volunteer: 'https://elections.hawaii.gov/volunteer/'
  },
  'Idaho': {
    register: 'https://voteidaho.gov/voter-registration/',
    polling: 'https://voteidaho.gov/vote-early-vote-in-person/',
    absentee: 'https://voteidaho.gov/absentee-voting/',
    volunteer: 'https://voteidaho.gov/election-day-poll-worker/'
  },
  'Illinois': {
    register: 'https://www.elections.il.gov/VoterReg.aspx',
    polling: 'https://www.elections.il.gov/PollingPlaces.aspx',
    absentee: 'https://www.elections.il.gov/VotingByMail.aspx',
    volunteer: 'https://www.elections.il.gov/PollWorker.aspx'
  },
  'Indiana': {
    register: 'https://indianavoters.in.gov/MVPHome/PrintDocuments',
    polling: 'https://indianavoters.in.gov/PublicSite/Public/FT1/PublicLookupMain.aspx?Link=Polling',
    absentee: 'https://www.in.gov/sos/elections/absentee-voting/',
    volunteer: 'https://www.in.gov/sos/elections/poll-workers/'
  },
  'Iowa': {
    register: 'https://sos.iowa.gov/elections/voterinformation/voterregistration.html',
    polling: 'https://sos.iowa.gov/elections/voterinformation/edayreg.html',
    absentee: 'https://sos.iowa.gov/elections/voterinformation/absenteeinfo.html',
    volunteer: 'https://sos.iowa.gov/elections/pollworker/index.html'
  },
  'Kansas': {
    register: 'https://sos.ks.gov/elections/voter-registration.html',
    polling: 'https://myvoteinfo.voteks.org/voterview',
    absentee: 'https://sos.ks.gov/elections/advance-voting.html',
    volunteer: 'https://sos.ks.gov/elections/poll-worker-information.html'
  },
  'Kentucky': {
    register: 'https://elect.ky.gov/registertovote/Pages/default.aspx',
    polling: 'https://elect.ky.gov/Voters/Pages/Polling-Locations.aspx',
    absentee: 'https://elect.ky.gov/Voters/Pages/Absentee-Voting.aspx',
    volunteer: 'https://elect.ky.gov/Voters/Pages/Poll-Worker-Training.aspx'
  },
  'Louisiana': {
    register: 'https://www.sos.la.gov/ElectionsAndVoting/Pages/OnlineVoterRegistration.aspx',
    polling: 'https://voterportal.sos.la.gov/',
    absentee: 'https://www.sos.la.gov/ElectionsAndVoting/Vote/VoteByMail/Pages/default.aspx',
    volunteer: 'https://www.sos.la.gov/ElectionsAndVoting/GetInvolved/BecomeACommissioner/Pages/default.aspx'
  },
  'Maine': {
    register: 'https://www.maine.gov/sos/cec/elec/voter-info/voterreg.html',
    polling: 'https://www.maine.gov/sos/cec/elec/voter-info/pollfinder/index.html',
    absentee: 'https://www.maine.gov/sos/cec/elec/voter-info/absent.html',
    volunteer: 'https://www.maine.gov/sos/cec/elec/municipal/election-warden-guide.pdf'
  },
  'Maryland': {
    register: 'https://elections.maryland.gov/voter_registration/index.html',
    polling: 'https://elections.maryland.gov/voting/early_voting.html',
    absentee: 'https://elections.maryland.gov/voting/absentee.html',
    volunteer: 'https://elections.maryland.gov/get_involved/election_judges.html'
  },
  'Massachusetts': {
    register: 'https://www.sec.state.ma.us/ovr/',
    polling: 'https://www.sec.state.ma.us/WhereDoIVoteMA/WhereDoIVote',
    absentee: 'https://www.sec.state.ma.us/ele/eleabs/absidx.htm',
    volunteer: 'https://www.sec.state.ma.us/ele/elepollworkers/pollworkersidx.htm'
  },
  'Michigan': {
    register: 'https://mvic.sos.state.mi.us/RegisterVoter/Index',
    polling: 'https://mvic.sos.state.mi.us/Voter/Index',
    absentee: 'https://mvic.sos.state.mi.us/AVApplication/Index',
    volunteer: 'https://www.michigan.gov/sos/elections/administrator/election-workers'
  },
  'Minnesota': {
    register: 'https://www.sos.state.mn.us/elections-voting/register-to-vote/',
    polling: 'https://pollfinder.sos.state.mn.us/',
    absentee: 'https://www.sos.state.mn.us/elections-voting/other-ways-to-vote/vote-early-by-mail/',
    volunteer: 'https://www.sos.state.mn.us/elections-voting/get-involved/become-an-election-judge/'
  },
  'Mississippi': {
    register: 'https://www.sos.ms.gov/elections-voting/voter-registration',
    polling: 'https://myelectionday.sos.state.ms.us/VoterSearch/PollingLocation.aspx',
    absentee: 'https://www.sos.ms.gov/elections-voting/absentee-voting',
    volunteer: 'https://www.sos.ms.gov/elections-voting/poll-worker-training'
  },
  'Missouri': {
    register: 'https://www.sos.mo.gov/elections/goVoteMissouri/register',
    polling: 'https://s1.sos.mo.gov/elections/pollingplacelookup',
    absentee: 'https://www.sos.mo.gov/elections/goVoteMissouri/howtovote#absentee',
    volunteer: 'https://www.sos.mo.gov/elections/pollworker'
  },
  'Montana': {
    register: 'https://sosmt.gov/elections/voter/',
    polling: 'https://sosmt.gov/elections/vote/',
    absentee: 'https://sosmt.gov/elections/absentee/',
    volunteer: 'https://sosmt.gov/elections/poll-worker/'
  },
  'Nebraska': {
    register: 'https://www.nebraska.gov/apps-sos-voter-registration',
    polling: 'https://www.voterinformationlookup.nebraska.gov/voterlookup',
    absentee: 'https://sos.nebraska.gov/elections/absentee-voting',
    volunteer: 'https://sos.nebraska.gov/elections/poll-worker-information'
  },
  'Nevada': {
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
  'Ohio': {
    register: 'https://olvr.ohiosos.gov/',
    polling: 'https://www.ohiosos.gov/elections/voters/toolkit/polling-location/',
    absentee: 'https://www.ohiosos.gov/elections/voters/absentee-voting/',
    volunteer: 'https://www.ohiosos.gov/elections/election-officials/poll-worker-training/'
  },
  'Oklahoma': {
    register: 'https://oklahoma.gov/elections/voters/register-to-vote.html',
    polling: 'https://okvoterportal.okelections.us/',
    absentee: 'https://oklahoma.gov/elections/voters/absentee-voting.html',
    volunteer: 'https://oklahoma.gov/elections/election-officials/become-poll-worker.html'
  },
  'Oregon': {
    register: 'https://sos.oregon.gov/elections/Pages/registration.aspx',
    polling: 'https://sos.oregon.gov/voting/Pages/drop-box-locator.aspx',
    absentee: 'https://sos.oregon.gov/elections/Pages/votebymail.aspx',
    volunteer: 'https://sos.oregon.gov/elections/Pages/election-officials.aspx'
  },
  'Pennsylvania': {
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
  'Tennessee': {
    register: 'https://sos.tn.gov/elections/guides/how-to-register-to-vote',
    polling: 'https://tnmap.tn.gov/voterlookup/',
    absentee: 'https://sos.tn.gov/elections/guides/how-to-vote-absentee-by-mail',
    volunteer: 'https://sos.tn.gov/elections/guides/become-a-poll-official'
  },
  'Texas': {
    register: 'https://www.sos.state.tx.us/elections/voter/reqvr.shtml',
    polling: 'https://www.sos.state.tx.us/elections/voter/votreg.shtml',
    absentee: 'https://www.sos.state.tx.us/elections/voter/absentee-ballot.shtml',
    volunteer: 'https://www.sos.state.tx.us/elections/voter/election-officials.shtml'
  },
  'Utah': {
    register: 'https://vote.utah.gov/register-to-vote/',
    polling: 'https://votesearch.utah.gov/voter-search/search/search-by-address/how-and-where-can-i-vote',
    absentee: 'https://vote.utah.gov/vote-by-mail/',
    volunteer: 'https://vote.utah.gov/poll-worker/'
  },
  'Vermont': {
    register: 'https://sos.vermont.gov/elections/voters/registration/',
    polling: 'https://mvp.vermont.gov/',
    absentee: 'https://sos.vermont.gov/elections/voters/absentee-ballots/',
    volunteer: 'https://sos.vermont.gov/elections/election-officials/poll-worker-information/'
  },
  'Virginia': {
    register: 'https://www.elections.virginia.gov/registration/how-to-register/',
    polling: 'https://www.elections.virginia.gov/voter-information/polling-place-lookup/',
    absentee: 'https://www.elections.virginia.gov/voter-information/absentee-voting/',
    volunteer: 'https://www.elections.virginia.gov/poll-worker/'
  },
  'Washington': {
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
  'Wisconsin': {
    register: 'https://myvote.wi.gov/en-us/Register-To-Vote',
    polling: 'https://myvote.wi.gov/en-us/Find-My-Polling-Place',
    absentee: 'https://myvote.wi.gov/en-us/Vote-Absentee-By-Mail',
    volunteer: 'https://elections.wi.gov/clerk/poll-workers'
  },
  'Wyoming': {
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
  'Guam': {
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

// Load all JSON files
Promise.all([
  fetch('Governors.json').then(res => res.ok ? res.json() : Promise.reject('Governors.json not found')),
  fetch('Senators.json').then(res => res.ok ? res.json() : Promise.reject('Senators.json not found')),
  fetch('House.json').then(res => res.ok ? res.json() : Promise.reject('House.json not found')),
  fetch('LtGovernors.json').then(res => res.ok ? res.json() : Promise.reject('LtGovernors.json not found'))
])
  .then(([governors, senators, representatives, ltGovernors]) => {
    officials.governors = governors.filter((g, i, arr) => arr.findIndex(t => t.state === g.state) === i);
    officials.senators = senators;
    officials.representatives = representatives;
    officials.ltGovernors = ltGovernors.filter((lg, i, arr) => arr.findIndex(t => t.state === lg.state) === i);
    populateStateSelect();
    window.showTab('my-officials');
  })
  .catch(error => console.error('Error loading JSON files:', error));

// Populate state select
function populateStateSelect() {
  const select = document.getElementById('state-select');
  select.innerHTML = '<option value="">Choose a state</option>';
  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    select.appendChild(option);
  });
  select.value = currentState;
}

// Tab switching
window.showTab = function(tabName) {
  document.querySelectorAll('section').forEach(section => section.style.display = 'none');
  let actualId = tabName === 'polls' ? 'compare' : tabName;
  const target = document.getElementById(actualId);
  if (target) target.style.display = 'block';
  if (tabName === 'my-officials') renderMyOfficials(currentState);
  if (tabName === 'rankings') renderRankings('governors');
  if (tabName === 'polls') renderPolls();
  if (tabName === 'calendar') renderCalendar(currentState);
  if (tabName === 'registration') renderRegistration(currentState);
};

// State switcher
document.getElementById('state-select').addEventListener('change', (e) => {
  currentState = e.target.value || 'Alabama';
  const activeTab = document.querySelector('section[style="display: block;"]')?.id;
  if (activeTab === 'my-officials') renderMyOfficials(currentState);
  if (activeTab === 'calendar') renderCalendar(currentState);
  if (activeTab === 'registration') renderRegistration(currentState);
});

// My Officials
function renderMyOfficials(state) {
  const container = document.getElementById('my-cards');
  if (!container) return;
  container.innerHTML = '';
  const positions = [
    { data: officials.governors, title: 'Governor' },
    { data: officials.senators, title: 'Senator' },
    { data: officials.representatives, title: 'Representative' },
    { data: officials.ltGovernors, title: 'Lieutenant Governor' }
  ];
  positions.forEach(position => {
    const officialsForState = position.data.filter(o => o.state === state);
    officialsForState.forEach(official => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${official.photo || 'https://via.placeholder.com/100'}" alt="${official.name}" style="width: 100px; height: auto;">
        <h3>${official.name} (${official.party}) - ${position.title}</h3>
        <p>${official.bio || 'Bio not available'}</p>
        <p>Approval: ${official.approval || 'N/A'}% (Rank: ${official.rank || 'N/A'})</p>
        <a href="${official.pollSource || '#'}" target="_blank">Poll Source</a>
        <ul>Platforms: ${official.platforms ? official.platforms.map(p => `<li>${p}</li>`).join('') : '<li>Not available</li>'}</ul>
        <p>Follow Through: ${official.follow_through || 'Not available'}</p>
        <ul>Bills: ${official.bills_signed ? official.bills_signed.map(b => `<li>${b.name} (${b.year}): ${b.description}</li>`).join('') : '<li>Not available</li>'}</ul>
      `;
      container.appendChild(card);
    });
  });
  document.getElementById('polls-container').innerHTML = '';
}

// Rankings (governors only, top/bottom 10)
function renderRankings(type) {
  const container = document.getElementById(`rankings-${type}`);
  if (!container) return;
  container.innerHTML = '';
  const sorted = [...officials.governors].sort((a, b) => {
    if (a.approval === b.approval) return b.tiebreaker - a.tiebreaker;
    return b.approval - a.approval;
  });
  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();
  top10.forEach(official => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.height = '25%';
    card.style.borderLeft = '5px solid green';
    card.style.backgroundColor = '#CCFFCC';
    card.innerHTML = `${official.name} (${official.state}, ${official.party}) - ${official.approval}%`;
    container.appendChild(card);
  });
  bottom10.forEach(official => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.height = '25%';
    card.style.borderLeft = '5px solid red';
    card.style.backgroundColor = '#FFCCCC';
    card.innerHTML = `${official.name} (${official.state}, ${official.party}) - ${official.approval}%`;
    container.appendChild(card);
  });
  ['senators', 'house', 'ltgovernors'].forEach(t => {
    const c = document.getElementById(`rankings-${t}`);
    if (c) c.innerHTML = '';
  });
  document.getElementById('top10-overall').innerHTML = '';
}

// Calendar
function renderCalendar(state) {
  const container = document.getElementById('calendar-container');
  if (!container) return;
  container.innerHTML = '';
  const events = electionData[state] || [];
  events.forEach(event => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.backgroundColor = event.type.includes('Primary') ? '#FFFF99' : '#99CCFF';
    card.innerHTML = `<a href="${event.link}" target="_blank">${event.date} - ${event.type}</a>`;
    container.appendChild(card);
  });
}

// Registration
function renderRegistration(state) {
  const container = document.getElementById('voting-container');
  if (!container) return;
  container.innerHTML = '';
  const links = registrationLinks[state] || {};
  Object.keys(links).forEach(key => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<a href="${links[key]}" target="_blank">${key.charAt(0).toUpperCase() + key.slice(1)}</a>`;
    container.appendChild(card);
  });
}

// Polls (live URLs)
function renderPolls() {
  const container = document.getElementById('compare-container');
  if (!container) return;
  container.innerHTML = '';
  const pollsData = [
    { name: 'RealClearPolitics Presidential', link: 'https://www.realclearpolitics.com/epolls/latest_polls/president/', logo: 'https://www.realclearpolitics.com/favicon.ico' },
    { name: 'RealClearPolitics Senate', link: 'https://www.realclearpolitics.com/epolls/latest_polls/senate/', logo: 'https://www.realclearpolitics.com/favicon.ico' },
    { name: 'RealClearPolitics Governor', link: 'https://www.realclearpolitics.com/epolls/latest_polls/governor/', logo: 'https://www.realclearpolitics.com/favicon.ico' },
    { name: 'Emerson College National', link: 'https://www.emersoncollegepolling.com/national-polls', logo: 'https://www.emersoncollegepolling.com/favicon.ico' },
    { name: 'Emerson College State', link: 'https://www.emersoncollegepolling.com/state-polls', logo: 'https://www.emersoncollegepolling.com/favicon.ico' },
    { name: 'FiveThirtyEight Polls', link: 'https://projects.fivethirtyeight.com/polls/', logo: 'https://projects.fivethirtyeight.com/favicon.ico' }
  ];
  pollsData.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<a href="${poll.link}" target="_blank"><img src="${poll.logo}" style="width: 50px;" alt="${poll.name}"><br>${poll.name}</a>`;
    container.appendChild(card);
  });
}

// Search
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  let dropdown = document.getElementById('search-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'search-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.background = 'white';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.zIndex = '10';
    dropdown.style.width = '100%';
    e.target.parentNode.appendChild(dropdown);
  }
  const allOfficials = [
    ...officials.governors.map(g => ({ ...g, position: 'Governor' })),
    ...officials.senators.map(s => ({ ...s, position: 'Senator' })),
    ...officials.representatives.map(r => ({ ...r, position: 'Representative' })),
    ...officials.ltGovernors.map(lg => ({ ...lg, position: 'Lieutenant Governor' }))
  ];
  const suggestions = allOfficials.filter(o =>
    o.name.toLowerCase().includes(query) ||
    o.state.toLowerCase().includes(query) ||
    o.party.toLowerCase().includes(query) ||
    o.position.toLowerCase().includes(query)
  );
  dropdown.inner
