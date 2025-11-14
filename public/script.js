document.addEventListener('DOMContentLoaded', function () {
  // Tab navigation function
  let activeTab = null;

  function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.classList.add('active');
      activeTab = tabId;
    }
  }

  // Show specific content in main container
  function showContent(contentId) {
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => section.classList.add('hidden'));
    const targetSection = document.getElementById(contentId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }
  }

  // Render Officials page
  let selectedState = '';  // placeholder for dynamic state selection

  function renderOfficials(state, party) {
    const officialsSection = document.getElementById('officials-section');
    if (officialsSection) {
      officialsSection.innerHTML = `Showing officials for ${state} of ${party}`;
      showContent('officials-section');
    }
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
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  // Initialize page
  function initPage() {
    switchTab('home');  // Default tab
    showContent('home-content');
    closeModals();  // Ensure no modals are open by default
  }

  // Event listeners for tabs
  const homeTab = document.querySelector('.tab-home');
  if (homeTab) {
    homeTab.addEventListener('click', () => {
      switchTab('home');
      showStartupHub();
    });
  }

  const officialsTab = document.querySelector('.tab-officials');
  if (officialsTab) {
    officialsTab.addEventListener('click', () => {
      switchTab('officials');
      renderOfficials(selectedState, '');
    });
  }

  const civicTab = document.querySelector('.tab-civic');
  if (civicTab) {
    civicTab.addEventListener('click', () => {
      switchTab('civic');
      showCivic();
    });
  }

  const pollsTab = document.querySelector('.tab-polls');
  if (pollsTab) {
    pollsTab.addEventListener('click', () => {
      switchTab('polls');
      showPolls();
    });
  }

  const orgsTab = document.querySelector('.tab-orgs');
  if (orgsTab) {
    orgsTab.addEventListener('click', () => {
      switchTab('organizations');
      showOrganizations();
    });
  }

  const votingTab = document.querySelector('.tab-voting');
  if (votingTab) {
    votingTab.addEventListener('click', () => {
      switchTab('voting');
      showVoting();
    });
  }

  // Initialize the page when it loads
  initPage();
});
