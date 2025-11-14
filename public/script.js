// Tab navigation function
let activeTab = null;

function switchTab(tabId) {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  const targetTab = document.getElementById(tabId);
  targetTab.classList.add('active');
  activeTab = tabId;
}

// Show specific content in main container
function showContent(contentId) {
  const contentSections = document.querySelectorAll('.content-section');
  contentSections.forEach(section => section.classList.add('hidden'));
  const targetSection = document.getElementById(contentId);
  targetSection.classList.remove('hidden');
}

// Render Officials page
let selectedState = '';  // placeholder for dynamic state selection

function renderOfficials(state, party) {
  // Placeholder for fetching and displaying officials
  const officialsSection = document.getElementById('officials-section');
  officialsSection.innerHTML = `Showing officials for ${state} of ${party}`;
  showContent('officials-section');
}

// Show Startup Hub page
function showStartupHub() {
  showContent('startup-hub-section');
}

// Show Civic Intelligence page
function showCivic() {
  showContent('civic-intelligence-section');
}

// Show Polls page
function showPolls() {
  showContent('polls-section');
}

// Show Political Groups page
function showOrganizations() {
  showContent('organizations-section');
}

// Show Voting page
function showVoting() {
  showContent('voting-section');
}

// Hide any open modals
function closeModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => modal.classList.add('hidden'));
}

// Open modal by ID
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
}

// Initialize page
function initPage() {
  switchTab('home');  // Default tab
  showContent('home-content');
  closeModals();  // Ensure no modals are open by default
}

// Event listeners for tabs
document.querySelector('.tab-home').addEventListener('click', () => {
  switchTab('home');
  showStartupHub();
});

document.querySelector('.tab-officials').addEventListener('click', () => {
  switchTab('officials');
  renderOfficials(selectedState, '');
});

document.querySelector('.tab-civic').addEventListener('click', () => {
  switchTab('civic');
  showCivic();
});

document.querySelector('.tab-polls').addEventListener('click', () => {
  switchTab('polls');
  showPolls();
});

document.querySelector('.tab-orgs').addEventListener('click', () => {
  switchTab('organizations');
  showOrganizations();
});

document.querySelector('.tab-voting').addEventListener('click', () => {
  switchTab('voting');
  showVoting();
});

// Initialize the page when it loads
window.onload = initPage;
