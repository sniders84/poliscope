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

// ✅ Calendar tab now links to Ballotpedia session and election data
function showCalendar() {
  showTab('civic');
  const calendarSection = document.getElementById('calendar');
  calendarSection.innerHTML = `<h3>${selectedState}</h3>`;

  const stateLinks = {
    'Alabama': {
  bills: 'https://alison.legislature.state.al.us/bill-search?tab=1',
  senateRoster: 'https://alison.legislature.state.al.us/senate',
  houseRoster: 'https://alison.legislature.state.al.us/house-of-representatives-sublanding',
  governorOrders: 'https://governor.alabama.gov/newsroom/category/executive-orders/',
  ltGovPress: 'https://ltgov.alabama.gov/category/press-release/',
  federalRaces: 'https://ballotpedia.org/Alabama_elections,_2025'
},
    'Alaska': {
  bills: 'https://www.akleg.gov/basis/Home/Bill',
  senateRoster: 'https://www.akleg.gov/senate.php',
  houseRoster: 'https://www.akleg.gov/house.php',
  governorOrders: 'https://gov.alaska.gov/administrative-orders/',
  ltGovPress: 'https://ltgov.alaska.gov/newsroom/',
  federalRaces: 'https://ballotpedia.org/Alaska_elections,_2025'
},
    'American Samoa': {
  bills: 'https://www.asfono.gov/392documents',
  senateRoster: 'https://www.asfono.gov/senate/members',
  houseRoster: 'https://en.wikipedia.org/wiki/American_Samoa_House_of_Representatives',
  governorOrders: 'https://www.americansamoa.gov/executiveorders',
  ltGovPress: 'https://www.americansamoa.gov/lieutenantgovernorpulu',
  federalRaces: 'https://ballotpedia.org/American_Samoa_elections,_2025'

},
    'Arizona': {
  bills: 'https://www.azleg.gov/bills/',
  senateRoster: 'https://www.azleg.gov/MemberRoster/?body=S',
  houseRoster: 'https://www.azleg.gov/MemberRoster/?body=H',
  governorOrders: 'https://azgovernor.gov/executive-orders',
  ltGovPress: '', // Arizona does not have a lieutenant governor
  federalRaces: 'https://ballotpedia.org/Arizona_elections,_2025'
},
    'Arkansas': {
  bills: 'https://www.arkleg.state.ar.us/Bills/SearchByRange?ddBienniumSession=2025%2F2025R',
  senateRoster: 'https://senate.arkansas.gov/senators/',
  houseRoster: 'https://www.arkansashouse.org/representatives',
  governorOrders: 'https://governor.arkansas.gov/executive-orders/',
  ltGovPress: 'https://ltgovernor.arkansas.gov/news/',
  federalRaces: 'https://ballotpedia.org/Arkansas_elections,_2025'
},
    'California': {
  bills: 'https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml',
  senateRoster: 'https://www.senate.ca.gov/senators',
  houseRoster: 'https://www.assembly.ca.gov/assemblymembers',
  governorOrders: 'https://www.gov.ca.gov/category/executive-orders/',
  ltGovPress: 'https://ltg.ca.gov/press-releases/',
  federalRaces: 'https://ballotpedia.org/California_elections,_2025'
},
    'Colorado': {
  bills: 'https://leg.colorado.gov/bills',
  senateRoster: 'https://leg.colorado.gov/legislators?field_chamber_value=Senate&field_chamber_target_id=2&field_political_affiliation_target_id=All&sort_bef_combine=field_last_name_value%20ASC',
  houseRoster: 'https://leg.colorado.gov/legislators?field_chamber_value=Senate&field_chamber_target_id=1&field_political_affiliation_target_id=All&sort_bef_combine=field_last_name_value%20ASC',
  governorOrders: 'https://www.colorado.gov/governor/executive-orders',
  ltGovPress: 'https://www.facebook.com/LtGovofCO/',
  federalRaces: 'https://ballotpedia.org/Colorado_elections,_2025'
},
    'Connecticut': {
  bills: 'https://www.cga.ct.gov/2025/lbp/lobp.pdf',
  senateRoster: 'https://www.cga.ct.gov/asp/menu/slist.asp',
  houseRoster: 'https://www.cga.ct.gov/asp/menu/hlist.asp',
  governorOrders: 'https://portal.ct.gov/governor/governor-actions?language=en_US',
  ltGovPress: 'https://portal.ct.gov/Office-of-the-Lt-Governor/News',
  federalRaces: 'https://ballotpedia.org/Connecticut_elections,_2025'
},
    'Delaware': {
  bills: 'https://legis.delaware.gov/AllLegislation',
  senateRoster: 'https://legis.delaware.gov/Senate',
  houseRoster: 'https://legis.delaware.gov/House',
  governorOrders: 'https://governor.delaware.gov/executive-orders/',
  ltGovPress: 'https://ltgov.delaware.gov/press-releases/',
  federalRaces: 'https://ballotpedia.org/Delaware_elections,_2025'
},
    'District of Columbia': {
  bills: 'https://dccouncil.gov/legislation/',
  senateRoster: '', // No state senate; unicameral council
  houseRoster: 'https://dccouncil.gov/councilmembers/',
  governorOrders: 'https://mayor.dc.gov/',
  ltGovPress: '', // No lieutenant governor
  federalRaces: 'https://ballotpedia.org/Washington,_D.C.,_elections,_2025'
},
   'Florida': {
  bills: 'https://www.flsenate.gov/Session/Bills/2025',
  senateRoster: 'https://www.flsenate.gov/Senators/',
  houseRoster: 'https://www.flhouse.gov/representatives',
  governorOrders: 'https://www.flgov.com/eog/news',
  ltGovPress: 'https://www.flgov.com/eog/news',
  federalRaces: 'https://ballotpedia.org/Florida_elections,_2025'
},
    'Georgia': {
  bills: 'https://www.legis.ga.gov/legislation/all',
  senateRoster: 'https://www.legis.ga.gov/members/senate',
  houseRoster: 'https://www.legis.ga.gov/members/house',
  governorOrders: 'https://gov.georgia.gov/executive-action/executive-orders',
  ltGovPress: 'https://ltgov.georgia.gov/press-releases',
  federalRaces: 'https://ballotpedia.org/Georgia_elections,_2025'
},
    'Guam': {
  bills: 'https://guamlegislature.gov/bills-page1/',
  senateRoster: 'https://guamlegislature.gov/senators-2/',
  houseRoster: 'https://guamlegislature.gov/legislative-committees/',
  governorOrders: 'https://governor.guam.gov/executive-orders/',
  ltGovPress: '',
  federalRaces: 'https://ballotpedia.org/Guam_elections,_2025'
},
    'Hawaii': {
  bills: 'https://www.capitol.hawaii.gov/session/slh.aspx',
  senateRoster: 'https://www.capitol.hawaii.gov/legislature/legislators.aspx?chamber=S',
  houseRoster: 'https://www.capitol.hawaii.gov/legislature/legislators.aspx?chamber=H',
  governorOrders: 'https://governor.hawaii.gov/newsroom/',
  ltGovPress: 'https://ltgov.hawaii.gov/category/press-releases/',
  federalRaces: 'https://ballotpedia.org/Hawaii_elections,_2025'
},
    'Idaho': {
  bills: 'https://legislature.idaho.gov/sessioninfo/',
  senateRoster: 'https://legislature.idaho.gov/senate/membership/',
  houseRoster: 'https://legislature.idaho.gov/house/membership/',
  governorOrders: 'https://gov.idaho.gov/executive-orders/',
  ltGovPress: 'https://lgo.idaho.gov/pressrelease/',
  federalRaces: 'https://ballotpedia.org/Idaho_elections,_2025'
},
   'Illinois': {
  bills: 'https://ilga.gov/Legislation',
  senateRoster: 'https://ilga.gov/Senate/Members',
  houseRoster: 'https://ilga.gov/House/Members',
  governorOrders: 'https://www.illinois.gov/government/executive-orders.html',
  ltGovPress: 'https://ltgov.illinois.gov/about/office-reports.html',
  federalRaces: 'https://ballotpedia.org/Illinois_elections,_2025'
},
    'Indiana': {
  bills: 'https://iga.in.gov/legislative/2025/bills/',
  senateRoster: 'https://iga.in.gov/legislative/2025/legislators',
  houseRoster: 'https://iga.in.gov/legislative/2025/legislators',
  governorOrders: 'https://www.in.gov/gov/newsroom/executive-orders/',
  ltGovPress: 'https://www.in.gov/lg/newsroom/news-releases/',
  federalRaces: 'https://ballotpedia.org/Indiana_elections,_2025'
},
    'Iowa': {
  bills: 'https://www.legis.iowa.gov/legislation',
  senateRoster: 'https://www.legis.iowa.gov/legislators/senate',
  houseRoster: 'https://www.legis.iowa.gov/legislators/house',
  governorOrders: 'https://governor.iowa.gov/meet-governor-kim-reynolds/executive-orders',
  ltGovPress: '',
  federalRaces: 'https://ballotpedia.org/Iowa_elections,_2025'
},
    'Kansas': {
  bills: 'https://kslegislature.org/li/b2025_26/measures/bills/',
  senateRoster: 'https://kslegislature.org/li/b2025_26/members/senate/',
  houseRoster: 'https://kslegislature.org/li/b2025_26/members/house/',
  governorOrders: 'https://governor.kansas.gov/executive-orders/',
  ltGovPress: 'https://ltgov.kansas.gov/newsroom/',
  federalRaces: 'https://ballotpedia.org/Kansas_elections,_2025'
},
    'Kentucky': {
  bills: 'https://apps.legislature.ky.gov/record/2025/bills_History.html',
  senateRoster: 'https://legislature.ky.gov/Legislators/senate',
  houseRoster: 'https://legislature.ky.gov/Legislators/house',
  governorOrders: 'https://governor.ky.gov/Executive-Orders',
  ltGovPress: 'https://ltgovernor.ky.gov/news/',
  federalRaces: 'https://ballotpedia.org/Kentucky_elections,_2025'
},
    'Louisiana': {
  bills: 'https://www.legis.la.gov/legis/BillSearch.aspx',
  senateRoster: 'https://senate.la.gov/Senators_FullInfo',
  houseRoster: 'https://house.louisiana.gov/H_Reps/H_Reps_FullInfo',
  governorOrders: 'https://gov.louisiana.gov/index.cfm/newsroom/category/9',
  ltGovPress: 'https://www.crt.state.la.us/lt-governor/news/',
  federalRaces: 'https://ballotpedia.org/Louisiana_elections,_2025'
},
    'Maine': {
  bills: 'https://legislature.maine.gov/LawMakerWeb/search.asp',
  senateRoster: 'https://legislature.maine.gov/senate-home-page',
  houseRoster: 'https://legislature.maine.gov/house-home-page',
  governorOrders: 'https://www.maine.gov/governor/executive-orders',
  ltGovPress: '', // Maine does not have a lieutenant governor
  federalRaces: 'https://ballotpedia.org/Maine_elections,_2025'
},
    'Maryland': {
  bills: 'https://mgaleg.maryland.gov/mgawebsite/Legislation/Index/2025',
  senateRoster: 'https://mgaleg.maryland.gov/mgawebsite/Members/Index/senate',
  houseRoster: 'https://mgaleg.maryland.gov/mgawebsite/Members/Index/house',
  governorOrders: 'https://governor.maryland.gov/executive-orders/',
  ltGovPress: 'https://ltgovernor.maryland.gov/newsroom/',
  federalRaces: 'https://ballotpedia.org/Maryland_elections,_2025'
},
    'Massachusetts': {
  bills: 'https://malegislature.gov/Bills/Search',
  senateRoster: 'https://malegislature.gov/Legislators/Members/Senate',
  houseRoster: 'https://malegislature.gov/Legislators/Members/House',
  governorOrders: 'https://www.mass.gov/executive-orders',
  ltGovPress: 'https://www.mass.gov/news?office_filter%5B%5D=Office+of+the+Lieutenant+Governor',
  federalRaces: 'https://ballotpedia.org/Massachusetts_elections,_2025'
},
    'Michigan': {
  bills: 'https://www.legislature.mi.gov/mileg.aspx?page=Bills',
  senateRoster: 'https://www.senate.michigan.gov/senatorinfo.html',
  houseRoster: 'https://www.house.mi.gov/AllRepresentatives',
  governorOrders: 'https://www.michigan.gov/whitmer/news/state-orders-and-directives',
  ltGovPress: 'https://www.michigan.gov/ltgov/news',
  federalRaces: 'https://ballotpedia.org/Michigan_elections,_2025'
},
    'Minnesota': {
  bills: 'https://www.revisor.mn.gov/bills/',
  senateRoster: 'https://www.senate.mn/members/',
  houseRoster: 'https://www.house.mn/members/',
  governorOrders: 'https://mn.gov/governor/executive-orders/',
  ltGovPress: 'https://mn.gov/lt-governor/news/',
  federalRaces: 'https://ballotpedia.org/Minnesota_elections,_2025'
},
    'Mississippi': {
  bills: 'http://billstatus.ls.state.ms.us/',
  senateRoster: 'https://www.legislature.ms.gov/senate/',
  houseRoster: 'https://www.legislature.ms.gov/house/',
  governorOrders: 'https://www.gov.ms.gov/executive-orders/',
  ltGovPress: 'https://www.ltgov.ms.gov/news/',
  federalRaces: 'https://ballotpedia.org/Mississippi_elections,_2025'
},
    'Missouri': {
  bills: 'https://www.house.mo.gov/billtracking/billsall.aspx',
  senateRoster: 'https://www.senate.mo.gov/Senators/',
  houseRoster: 'https://www.house.mo.gov/MemberRoster.aspx',
  governorOrders: 'https://governor.mo.gov/executive-orders',
  ltGovPress: 'https://ltgov.mo.gov/news/',
  federalRaces: 'https://ballotpedia.org/Missouri_elections,_2025'
},
    'Montana': {
  bills: 'https://leg.mt.gov/bills/',
  senateRoster: 'https://leg.mt.gov/senate-members/',
  houseRoster: 'https://leg.mt.gov/house-members/',
  governorOrders: 'https://governor.mt.gov/Executive-Orders',
  ltGovPress: 'https://ltgovernor.mt.gov/News',
  federalRaces: 'https://ballotpedia.org/Montana_elections,_2025'
},
    'Nebraska': {
  bills: 'https://nebraskalegislature.gov/bills/',
  senateRoster: '', // Nebraska has a unicameral legislature
  houseRoster: 'https://nebraskalegislature.gov/senators/',
  governorOrders: 'https://governor.nebraska.gov/executive-orders',
  ltGovPress: 'https://ltgov.nebraska.gov/news/',
  federalRaces: 'https://ballotpedia.org/Nebraska_elections,_2025'
},
    'Nevada': {
  bills: 'https://www.leg.state.nv.us/App/NELIS/REL/82nd2023/Bills',
  senateRoster: 'https://www.leg.state.nv.us/App/Legislator/A/Senate/82nd2023',
  houseRoster: 'https://www.leg.state.nv.us/App/Legislator/A/Assembly/82nd2023',
  governorOrders: 'https://gov.nv.gov/Newsroom/Executive_Orders/',
  ltGovPress: 'https://ltgov.nv.gov/News/',
  federalRaces: 'https://ballotpedia.org/Nevada_elections,_2025'
},
    'New Hampshire': {
  bills: 'https://www.gencourt.state.nh.us/bill_status/',
  senateRoster: 'https://www.gencourt.state.nh.us/senate/members/default.aspx',
  houseRoster: 'https://www.gencourt.state.nh.us/house/members/default.aspx',
  governorOrders: 'https://www.governor.nh.gov/news-and-media/executive-orders',
  ltGovPress: '', // New Hampshire does not have a lieutenant governor
  federalRaces: 'https://ballotpedia.org/New_Hampshire_elections,_2025'
},
    'New Jersey': {
  bills: 'https://www.njleg.state.nj.us/bill-search',
  senateRoster: 'https://www.njleg.state.nj.us/legislative-roster/senate',
  houseRoster: 'https://www.njleg.state.nj.us/legislative-roster/assembly',
  governorOrders: 'https://nj.gov/infobank/eo/eo_archive.html',
  ltGovPress: '', // New Jersey currently has no lieutenant governor
  federalRaces: 'https://ballotpedia.org/New_Jersey_elections,_2025'
},
    'New Mexico': {
  bills: 'https://www.nmlegis.gov/Legislation/BillFinder',
  senateRoster: 'https://www.nmlegis.gov/Members/Legislator_List?T=S',
  houseRoster: 'https://www.nmlegis.gov/Members/Legislator_List?T=H',
  governorOrders: 'https://www.governor.state.nm.us/executive-orders/',
  ltGovPress: 'https://www.ltgovernor.state.nm.us/newsroom/',
  federalRaces: 'https://ballotpedia.org/New_Mexico_elections,_2025'
},
    'New York': {
  bills: 'https://nyassembly.gov/leg/',
  senateRoster: 'https://www.nysenate.gov/senators',
  houseRoster: 'https://nyassembly.gov/mem/',
  governorOrders: 'https://www.governor.ny.gov/executive-orders',
  ltGovPress: 'https://www.ny.gov/office-lieutenant-governor/news',
  federalRaces: 'https://ballotpedia.org/New_York_elections,_2025'
},
    'North Carolina': {
  bills: 'https://www.ncleg.gov/Legislation/Legislation.html',
  senateRoster: 'https://www.ncleg.gov/Members/MemberList/S',
  houseRoster: 'https://www.ncleg.gov/Members/MemberList/H',
  governorOrders: 'https://www.governor.nc.gov/documents/executive-orders',
  ltGovPress: 'https://ltgov.nc.gov/news/press-releases',
  federalRaces: 'https://ballotpedia.org/North_Carolina_elections,_2025'
},
    'North Dakota': {
  bills: 'https://www.legis.nd.gov/assembly/68-2023/bill-actions',
  senateRoster: 'https://www.legis.nd.gov/assembly/68-2023/members/senate',
  houseRoster: 'https://www.legis.nd.gov/assembly/68-2023/members/house',
  governorOrders: 'https://www.governor.nd.gov/executive-orders',
  ltGovPress: 'https://www.governor.nd.gov/news-media',
  federalRaces: 'https://ballotpedia.org/North_Dakota_elections,_2025'
},
    'Ohio': {
  bills: 'https://www.legislature.ohio.gov/legislation/search',
  senateRoster: 'https://www.ohiosenate.gov/members',
  houseRoster: 'https://ohiohouse.gov/members',
  governorOrders: 'https://governor.ohio.gov/media/executive-orders',
  ltGovPress: 'https://ltgovernor.ohio.gov/media/news-and-media',
  federalRaces: 'https://ballotpedia.org/Ohio_elections,_2025'
},
    'Oklahoma': {
  bills: 'https://www.oklegislature.gov/BillInfo.aspx',
  senateRoster: 'https://www.oklegislature.gov/Senate_Members.aspx',
  houseRoster: 'https://www.oklegislature.gov/House_Members.aspx',
  governorOrders: 'https://www.governor.ok.gov/executive-orders',
  ltGovPress: 'https://www.ok.gov/ltgov/Newsroom/index.html',
  federalRaces: 'https://ballotpedia.org/Oklahoma_elections,_2025'
},'Oregon': {
  bills: 'https://olis.oregonlegislature.gov/liz/2025R1/Measures/list/',
  senateRoster: 'https://www.oregonlegislature.gov/senate',
  houseRoster: 'https://www.oregonlegislature.gov/house',
  governorOrders: 'https://www.oregon.gov/gov/Pages/executive-orders.aspx',
  ltGovPress: '', // Oregon does not have a lieutenant governor
  federalRaces: 'https://ballotpedia.org/Oregon_elections,_2025'
},
    'Pennsylvania': {
  bills: 'https://www.legis.state.pa.us/cfdocs/legis/home/bills/',
  senateRoster: 'https://www.legis.state.pa.us/cfdocs/legis/home/member_information/senate.cfm',
  houseRoster: 'https://www.legis.state.pa.us/cfdocs/legis/home/member_information/house.cfm',
  governorOrders: 'https://www.governor.pa.gov/executive-orders/',
  ltGovPress: 'https://www.ltgov.pa.gov/newsroom/',
  federalRaces: 'https://ballotpedia.org/Pennsylvania_elections,_2025'
},
    'Rhode Island': {
  bills: 'https://www.rilegislature.gov/BillStatus/Pages/default.aspx',
  senateRoster: 'https://www.rilegislature.gov/senators/default.aspx',
  houseRoster: 'https://www.rilegislature.gov/representatives/default.aspx',
  governorOrders: 'https://governor.ri.gov/executive-orders',
  ltGovPress: 'https://ltgov.ri.gov/news',
  federalRaces: 'https://ballotpedia.org/Rhode_Island_elections,_2025'
},
    'South Carolina': {
  bills: 'https://www.scstatehouse.gov/legislation.php',
  senateRoster: 'https://www.scstatehouse.gov/member.php?chamber=S',
  houseRoster: 'https://www.scstatehouse.gov/member.php?chamber=H',
  governorOrders: 'https://governor.sc.gov/executive-orders',
  ltGovPress: 'https://ltgov.sc.gov/news',
  federalRaces: 'https://ballotpedia.org/South_Carolina_elections,_2025'
},
    'South Dakota': {
  bills: 'https://sdlegislature.gov/Session/Bills/68',
  senateRoster: 'https://sdlegislature.gov/Legislators/Session/Senate/68',
  houseRoster: 'https://sdlegislature.gov/Legislators/Session/House/68',
  governorOrders: 'https://governor.sd.gov/executive-orders.aspx',
  ltGovPress: '', // South Dakota does not maintain a separate press page for the lieutenant governor
  federalRaces: 'https://ballotpedia.org/South_Dakota_elections,_2025'
},
    'Tennessee': {
  bills: 'https://wapp.capitol.tn.gov/apps/billinfo/default.aspx',
  senateRoster: 'https://www.capitol.tn.gov/senate/members/',
  houseRoster: 'https://www.capitol.tn.gov/house/members/',
  governorOrders: 'https://www.tn.gov/governor/executive-orders.html',
  ltGovPress: '', // Tennessee does not maintain a separate press page for the lieutenant governor
  federalRaces: 'https://ballotpedia.org/Tennessee_elections,_2025'
},
    'Texas': {
  bills: 'https://capitol.texas.gov/Search/Legislation.aspx',
  senateRoster: 'https://senate.texas.gov/directory.php',
  houseRoster: 'https://house.texas.gov/members/',
  governorOrders: 'https://gov.texas.gov/news/category/executive-order',
  ltGovPress: 'https://www.ltgov.texas.gov/news/',
  federalRaces: 'https://ballotpedia.org/Texas_elections,_2025'
},
    'Utah': {
  bills: 'https://le.utah.gov/',
  senateRoster: 'https://senate.utah.gov/senate-members/',
  houseRoster: 'https://house.utah.gov/house-members/',
  governorOrders: 'https://governor.utah.gov/executive-orders/',
  ltGovPress: 'https://ltgovernor.utah.gov/news/',
  federalRaces: 'https://ballotpedia.org/Utah_elections,_2025'
},
    'Vermont': {
  bills: 'https://legislature.vermont.gov/bill/search',
  senateRoster: 'https://legislature.vermont.gov/people/all/2024/Senate',
  houseRoster: 'https://legislature.vermont.gov/people/all/2024/House',
  governorOrders: 'https://governor.vermont.gov/executive-orders',
  ltGovPress: 'https://ltgov.vermont.gov/news',
  federalRaces: 'https://ballotpedia.org/Vermont_elections,_2025'
},
    'Virginia': {
  bills: 'https://lis.virginia.gov/cgi-bin/legp604.exe?241+men+ALL',
  senateRoster: 'https://apps.senate.virginia.gov/Senator/index.php',
  houseRoster: 'https://virginiageneralassembly.gov/house/members/members.php',
  governorOrders: 'https://www.governor.virginia.gov/executive-actions/executive-orders/',
  ltGovPress: 'https://www.ltgov.virginia.gov/newsroom/',
  federalRaces: 'https://ballotpedia.org/Virginia_elections,_2025'
},
    'Washington': {
  bills: 'https://app.leg.wa.gov/billinfo/',
  senateRoster: 'https://leg.wa.gov/Senate/Senators/Pages/default.aspx',
  houseRoster: 'https://leg.wa.gov/House/Representatives/Pages/default.aspx',
  governorOrders: 'https://www.governor.wa.gov/office-governor/executive-orders',
  ltGovPress: 'https://www.ltgov.wa.gov/newsroom/',
  federalRaces: 'https://ballotpedia.org/Washington_elections,_2025'
},
    'West Virginia': {
  bills: 'https://www.wvlegislature.gov/Bill_Status/bill_status.cfm',
  senateRoster: 'https://www.wvlegislature.gov/Senate1/roster.cfm',
  houseRoster: 'https://www.wvlegislature.gov/House/roster.cfm',
  governorOrders: 'https://governor.wv.gov/Pages/Executive-Orders.aspx',
  ltGovPress: '', // West Virginia does not have a lieutenant governor
  federalRaces: 'https://ballotpedia.org/West_Virginia_elections,_2025'
},
    'Wisconsin': {
  bills: 'https://docs.legis.wisconsin.gov/2025/proposals',
  senateRoster: 'https://legis.wisconsin.gov/people/legislators/senate',
  houseRoster: 'https://legis.wisconsin.gov/people/legislators/assembly',
  governorOrders: 'https://evers.wi.gov/Pages/Executive-Orders.aspx',
  ltGovPress: 'https://ltgov.wi.gov/newsroom/',
  federalRaces: 'https://ballotpedia.org/Wisconsin_elections,_2025'
},
    'Wyoming': {
  bills: 'https://wyoleg.gov/Legislation/2025',
  senateRoster: 'https://wyoleg.gov/Legislators/2025/S',
  houseRoster: 'https://wyoleg.gov/Legislators/2025/H',
  governorOrders: 'https://governor.wyo.gov/executive-orders',
  ltGovPress: '', // Wyoming does not have a lieutenant governor
  federalRaces: 'https://ballotpedia.org/Wyoming_elections,_2025'
},
    'Puerto Rico': {
  bills: 'https://fastdemocracy.com/states/pr/',
  senateRoster: '', // Not publicly listed in a centralized format
  houseRoster: '', // Not publicly listed in a centralized format
  governorOrders: 'https://www.statedepartment.pr.gov/executive-orders',
  ltGovPress: '', // Puerto Rico does not have a lieutenant governor
  federalRaces: 'https://ballotpedia.org/Puerto_Rico_elections,_2025'
},

'Guam': {
  bills: 'https://guamlegislature.gov/bills-page1/',
  senateRoster: '', // Unicameral legislature; roster not centralized
  houseRoster: '', // Not applicable
  governorOrders: 'https://governor.guam.gov/executive-orders/',
  ltGovPress: '', // No dedicated press page
  federalRaces: 'https://ballotpedia.org/Guam_elections,_2025'
},

'U.S. Virgin Islands': {
  bills: 'https://billtracking.legvi.org/',
  senateRoster: '', // Unicameral legislature; roster not centralized
  houseRoster: '', // Not applicable
  governorOrders: 'https://www.vi.gov/executive-orders/',
  ltGovPress: '', // No dedicated press page
  federalRaces: 'https://ballotpedia.org/U.S._Virgin_Islands_elections,_2025'
},

'American Samoa': {
  bills: 'https://www.asfono.gov/391documents',
  senateRoster: '', // Roster not centralized
  houseRoster: '', // Roster not centralized
  governorOrders: 'https://www.americansamoa.gov/executiveorders',
  ltGovPress: '', // No lieutenant governor
  federalRaces: 'https://ballotpedia.org/American_Samoa_elections,_2025'
},

'Northern Mariana Islands': {
  bills: 'https://cnmileg.net/',
  senateRoster: '', // Roster not centralized
  houseRoster: '', // Roster not centralized
  governorOrders: '', // Executive orders not published in a centralized archive
  ltGovPress: '', // No dedicated press page
  federalRaces: 'https://ballotpedia.org/Northern_Mariana_Islands_elections,_2025'
},

'District of Columbia': {
  bills: 'https://dccouncil.gov/legislation/',
  senateRoster: '', // Not applicable
  houseRoster: 'https://dccouncil.gov/council-members/',
  governorOrders: '', // DC does not have a governor; mayoral orders not archived centrally
  ltGovPress: '', // No lieutenant governor
  federalRaces: 'https://ballotpedia.org/Washington,_D.C.,_elections,_2025'
}
    // Add other states as needed
  };

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
        <a href="https://www.whitehouse.gov/presidential-actions/executive-orders/" target="_blank">White House Orders</a>
      `
    }
  ];

  cards.forEach(card => {
    const div = document.createElement('div');
    div.className = 'calendar-card';
    div.innerHTML = `<h4>${card.title}</h4>${card.content}`;
    calendarSection.appendChild(div);
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
              <strong>${v.vote}:</strong> <a href="${v.link}" target="_blank">${v.title}</a> (${            v.result}, ${v.date})
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
      ${o.vetoes ? `<p><strong>Vetoes:</strong> ${o.vetoes}</p>` : ''}
      ${o.salary ? `<p><strong>Salary:</strong> ${o.salary}</p>` : ''}
      ${o.predecessor ? `<p><strong>Predecessor:</strong> ${o.predecessor}</p>` : ''}
      ${o.pollingScore && o.pollingSource ? `
        <p><strong>Approval Rating:</strong> 
          <a href="${o.pollingSource}" target="_blank">${o.pollingScore}</a>
        </p>
      ` : ''}
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
