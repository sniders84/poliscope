// script.js

// Map to store your JSON filenames
const dataFiles = {
    Senate: 'Senate.json',
    House: 'House.json',
    Governors: 'Governors.json',
    LtGovernors: 'LtGovernors.json'
};

// Current selected dataset (default to Senate)
let currentDataset = 'Senate';

// Fetch the selected dataset
async function fetchMembers(dataset = currentDataset) {
    try {
        const response = await fetch(dataFiles[dataset]);
        if (!response.ok) throw new Error(`Failed to load ${dataset} data`);
        const members = await response.json();
        displayCards(members);
    } catch (error) {
        console.error(error);
        document.getElementById('cards-container').innerHTML =
            `<p class="error">Failed to load ${dataset} data.</p>`;
    }
}

// Display all cards
function displayCards(members) {
    const container = document.getElementById('cards-container');
    container.innerHTML = ''; // Clear previous cards

    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';

        card.innerHTML = `
            <img src="${member.photo}" alt="${member.name}" class="member-photo">
            <h3 class="member-name">${member.name}</h3>
            <p class="member-office">${member.office} - ${member.state}</p>
            <p class="member-party">${member.party}</p>
        `;

        // Click to open modal with full details
        card.addEventListener('click', () => openModal(member));

        container.appendChild(card);
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => fetchMembers());
// Open modal with member details
function openModal(member) {
    const modal = document.getElementById('member-modal');
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-button" id="close-modal">&times;</span>
            <img src="${member.photo}" alt="${member.name}" class="modal-photo">
            <h2>${member.name}</h2>
            <p><strong>Office:</strong> ${member.office} - ${member.state}</p>
            <p><strong>Party:</strong> ${member.party}</p>
            ${member.platform ? `<p><strong>Platform:</strong> ${member.platform}</p>` : ''}
            <p>
                ${member.contact.email ? `<strong>Email:</strong> <a href="mailto:${member.contact.email}">${member.contact.email}</a><br>` : ''}
                ${member.contact.phone ? `<strong>Phone:</strong> ${member.contact.phone}<br>` : ''}
                ${member.contact.website ? `<strong>Website:</strong> <a href="${member.contact.website}" target="_blank">${member.contact.website}</a>` : ''}
            </p>
            <p>
                ${member.social.twitter ? `<a href="${member.social.twitter}" target="_blank">Twitter</a> ` : ''}
                ${member.social.facebook ? `<a href="${member.social.facebook}" target="_blank">Facebook</a> ` : ''}
                ${member.social.instagram ? `<a href="${member.social.instagram}" target="_blank">Instagram</a>` : ''}
            </p>
            ${member.bills && member.bills.length ? `<h3>Bills:</h3><ul>${member.bills.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}</ul>` : ''}
        </div>
    `;
    modal.style.display = 'block';

    document.getElementById('close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', e => {
        if (e.target === modal) modal.style.display = 'none';
    });
}
// Filter members by party or state
function filterMembers(members, filter = {}) {
    return members.filter(member => {
        let partyMatch = true, stateMatch = true;

        if (filter.party) {
            partyMatch = member.party.toLowerCase() === filter.party.toLowerCase();
        }

        if (filter.state) {
            stateMatch = member.state.toLowerCase() === filter.state.toLowerCase();
        }

        return partyMatch && stateMatch;
    });
}

// Render members to the page
function renderMembers(members) {
    const container = document.getElementById('members-container');
    container.innerHTML = ''; // Clear existing cards

    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <img src="${member.photo}" alt="${member.name}">
            <h3>${member.name}</h3>
            <p>${member.office} - ${member.state}</p>
            <p>${member.party}</p>
        `;
        card.addEventListener('click', () => openModal(member));
        container.appendChild(card);
    });
}
// Open modal with member details
function openModal(member) {
    const modal = document.getElementById('member-modal');
    modal.querySelector('.modal-name').textContent = member.name;
    modal.querySelector('.modal-office').textContent = member.office;
    modal.querySelector('.modal-state').textContent = member.state;
    modal.querySelector('.modal-party').textContent = member.party;
    modal.querySelector('.modal-photo').src = member.photo;
    modal.querySelector('.modal-bio-link').href = member.ballotpediaLink;

    modal.style.display = 'block';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('member-modal');
    modal.style.display = 'none';
}

// Event listener for closing modal
document.getElementById('modal-close').addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    const modal = document.getElementById('member-modal');
    if (event.target === modal) {
        closeModal();
    }
});
// Filter members by state, party, or office
function filterMembers(members, filters) {
    return members.filter(member => {
        const stateMatch = !filters.state || member.state === filters.state;
        const partyMatch = !filters.party || member.party === filters.party;
        const officeMatch = !filters.office || member.office === filters.office;
        return stateMatch && partyMatch && officeMatch;
    });
}

// Search members by name (case-insensitive)
function searchMembers(members, query) {
    if (!query) return members;
    return members.filter(member =>
        member.name.toLowerCase().includes(query.toLowerCase())
    );
}

// Event listeners for search input
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', () => {
    const query = searchInput.value;
    const filteredMembers = searchMembers(allMembers, query);
    renderMembers(filteredMembers);
});
// Render member cards
function renderMembers(members) {
    const container = document.getElementById('members-container');
    container.innerHTML = ''; // Clear previous content

    members.forEach(member => {
        const card = document.createElement('div');
        card.classList.add('member-card');
        card.innerHTML = `
            <img src="${member.photo}" alt="${member.name}" class="member-photo">
            <h3>${member.name}</h3>
            <p>${member.office} - ${member.state}</p>
            <p>${member.party}</p>
        `;

        card.addEventListener('click', () => showModal(member));
        container.appendChild(card);
    });
}

// Show modal with member details
function showModal(member) {
    const modal = document.getElementById('member-modal');
    modal.querySelector('.modal-name').textContent = member.name;
    modal.querySelector('.modal-office').textContent = member.office;
    modal.querySelector('.modal-state').textContent = member.state;
    modal.querySelector('.modal-party').textContent = member.party;
    modal.querySelector('.modal-photo').src = member.photo;
    modal.querySelector('.modal-bio-link').href = member.ballotpediaLink;

    modal.classList.add('show');
}

// Close modal
document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('member-modal').classList.remove('show');
});
// Filter members by state, party, or office
function filterMembers(members, criteria) {
    return members.filter(member => {
        let stateMatch = criteria.state ? member.state === criteria.state : true;
        let partyMatch = criteria.party ? member.party === criteria.party : true;
        let officeMatch = criteria.office ? member.office === criteria.office : true;
        return stateMatch && partyMatch && officeMatch;
    });
}

// Handle filter changes
document.getElementById('state-filter').addEventListener('change', (e) => {
    const state = e.target.value;
    applyFilters({ state });
});

document.getElementById('party-filter').addEventListener('change', (e) => {
    const party = e.target.value;
    applyFilters({ party });
});

document.getElementById('office-filter').addEventListener('change', (e) => {
    const office = e.target.value;
    applyFilters({ office });
});

// Apply filters cumulatively
let currentFilters = {};
function applyFilters(newFilter) {
    currentFilters = { ...currentFilters, ...newFilter };
    const filtered = filterMembers(allMembers, currentFilters);
    renderMembers(filtered);
}
// Render member cards
function renderMembers(members) {
    const container = document.getElementById('members-container');
    container.innerHTML = ''; // Clear previous cards

    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <img src="${member.photo}" alt="${member.name}" class="member-photo">
            <h3>${member.name}</h3>
            <p>${member.office} - ${member.state}</p>
            <p>${member.party}</p>
        `;
        card.addEventListener('click', () => showMemberModal(member));
        container.appendChild(card);
    });
}

// Show member details in modal
function showMemberModal(member) {
    const modal = document.getElementById('member-modal');
    modal.querySelector('.modal-name').textContent = member.name;
    modal.querySelector('.modal-office').textContent = member.office;
    modal.querySelector('.modal-state').textContent = member.state;
    modal.querySelector('.modal-party').textContent = member.party;
    modal.querySelector('.modal-photo').src = member.photo;
    modal.querySelector('.modal-bio a').href = member.ballotpediaLink;
    modal.style.display = 'block';
}

// Close modal
document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('member-modal').style.display = 'none';
});
// Filter members by state, office, or party
function filterMembers(members, criteria) {
    return members.filter(member => {
        let match = true;
        if (criteria.state && criteria.state !== 'All') {
            match = match && member.state === criteria.state;
        }
        if (criteria.office && criteria.office !== 'All') {
            match = match && member.office === criteria.office;
        }
        if (criteria.party && criteria.party !== 'All') {
            match = match && member.party === criteria.party;
        }
        return match;
    });
}

// Event listeners for filter dropdowns
document.getElementById('filter-state').addEventListener('change', e => {
    const state = e.target.value;
    const office = document.getElementById('filter-office').value;
    const party = document.getElementById('filter-party').value;
    renderMembers(filterMembers(allMembers, { state, office, party }));
});

document.getElementById('filter-office').addEventListener('change', e => {
    const office = e.target.value;
    const state = document.getElementById('filter-state').value;
    const party = document.getElementById('filter-party').value;
    renderMembers(filterMembers(allMembers, { state, office, party }));
});

document.getElementById('filter-party').addEventListener('change', e => {
    const party = e.target.value;
    const state = document.getElementById('filter-state').value;
    const office = document.getElementById('filter-office').value;
    renderMembers(filterMembers(allMembers, { state, office, party }));
});
// Modal elements
const modal = document.getElementById('member-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

// Open modal with member details
function openModal(member) {
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>${member.name}</h2>
            <button id="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <img src="${member.photo}" alt="${member.name}" class="modal-photo">
            <p><strong>State:</strong> ${member.state}</p>
            <p><strong>Party:</strong> ${member.party}</p>
            <p><strong>Office:</strong> ${member.office}</p>
            <p><a href="${member.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>
        </div>
    `;
    modal.style.display = 'block';
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
}

// Close modal when clicking outside of modal content
window.addEventListener('click', e => {
    if (e.target === modal) closeModal();
});
// Filter buttons
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const office = btn.dataset.office;
        displayMembers(office);
    });
});

// Display members by office
function displayMembers(office = 'all') {
    const container = document.getElementById('members-container');
    container.innerHTML = ''; // Clear existing cards

    let filteredMembers = allMembers;
    if (office !== 'all') {
        filteredMembers = allMembers.filter(member => member.office === office);
    }

    filteredMembers.forEach(member => {
        const card = document.createElement('div');
        card.classList.add('member-card');
        card.innerHTML = `
            <img src="${member.photo}" alt="${member.name}">
            <h3>${member.name}</h3>
            <p>${member.state} - ${member.party}</p>
        `;
        card.addEventListener('click', () => openModal(member));
        container.appendChild(card);
    });
}
// Modal elements
const modal = document.getElementById('member-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');

// Open modal with member details
function openModal(member) {
    modalContent.innerHTML = `
        <span id="close-modal">&times;</span>
        <img src="${member.photo}" alt="${member.name}" class="modal-photo">
        <h2>${member.name}</h2>
        <p><strong>State:</strong> ${member.state}</p>
        <p><strong>Party:</strong> ${member.party}</p>
        <p><strong>Office:</strong> ${member.office}</p>
        <p><strong>Platform:</strong> ${member.platform || 'N/A'}</p>
        <p><strong>Contact:</strong> 
            ${member.contact.phone ? member.contact.phone + '<br>' : ''}
            ${member.contact.email ? member.contact.email + '<br>' : ''}
            ${member.contact.website ? `<a href="${member.contact.website}" target="_blank">Website</a>` : ''}
        </p>
        <p><strong>Social:</strong>
            ${member.social.twitter ? `<a href="${member.social.twitter}" target="_blank">Twitter</a>` : ''}
            ${member.social.facebook ? `<a href="${member.social.facebook}" target="_blank">Facebook</a>` : ''}
            ${member.social.instagram ? `<a href="${member.social.instagram}" target="_blank">Instagram</a>` : ''}
        </p>
        <p><strong>Ballotpedia:</strong> <a href="${member.ballotpediaLink}" target="_blank">View Profile</a></p>
    `;
    modal.style.display = 'block';

    // Re-attach close listener
    document.getElementById('close-modal').addEventListener('click', closeModal);
}

// Close modal function
function closeModal() {
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
// Filter by state or party
function filterMembers() {
    const stateFilter = document.getElementById('state-filter').value.toLowerCase();
    const partyFilter = document.getElementById('party-filter').value.toLowerCase();

    const filtered = membersData.filter(member => {
        const stateMatch = member.state.toLowerCase().includes(stateFilter) || stateFilter === '';
        const partyMatch = member.party.toLowerCase().includes(partyFilter) || partyFilter === '';
        return stateMatch && partyMatch;
    });

    displayMembers(filtered);
}

// Search by name
function searchMembers() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const searched = membersData.filter(member =>
        member.name.toLowerCase().includes(searchQuery)
    );
    displayMembers(searched);
}

// Attach filter and search events
document.getElementById('state-filter').addEventListener('input', filterMembers);
document.getElementById('party-filter').addEventListener('input', filterMembers);
document.getElementById('search-input').addEventListener('input', searchMembers);
// Modal elements
const modal = document.getElementById('member-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

// Open modal with member details
function openModal(member) {
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>${member.name}</h2>
            <span id="modal-close" class="close-button">&times;</span>
        </div>
        <div class="modal-body">
            <img src="${member.photo}" alt="${member.name}" class="modal-photo">
            <p><strong>State:</strong> ${member.state}</p>
            <p><strong>Party:</strong> ${member.party}</p>
            <p><strong>Office:</strong> ${member.office}</p>
            <p><a href="${member.ballotpediaLink}" target="_blank">View on Ballotpedia</a></p>
        </div>
    `;
    modal.style.display = 'block';

    // Close button event
    document.getElementById('modal-close').onclick = () => {
        modal.style.display = 'none';
    };
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};
// Filters
const stateFilter = document.getElementById('state-filter');
const partyFilter = document.getElementById('party-filter');

// Populate filter options dynamically
function populateFilters(members) {
    const states = [...new Set(members.map(m => m.state))].sort();
    const parties = [...new Set(members.map(m => m.party))].sort();

    stateFilter.innerHTML = `<option value="All">All States</option>` +
        states.map(state => `<option value="${state}">${state}</option>`).join('');

    partyFilter.innerHTML = `<option value="All">All Parties</option>` +
        parties.map(party => `<option value="${party}">${party}</option>`).join('');
}

// Apply filters and re-render cards
function applyFilters(members) {
    const stateValue = stateFilter.value;
    const partyValue = partyFilter.value;

    const filtered = members.filter(member => {
        const stateMatch = stateValue === 'All' || member.state === stateValue;
        const partyMatch = partyValue === 'All' || member.party === partyValue;
        return stateMatch && partyMatch;
    });

    renderCards(filtered);
}

// Event listeners for filters
stateFilter.addEventListener('change', () => applyFilters(allMembers));
partyFilter.addEventListener('change', () => applyFilters(allMembers));
// Search bar
const searchInput = document.getElementById('search-input');

// Apply search on members
function applySearch(members) {
    const query = searchInput.value.trim().toLowerCase();

    const searched = members.filter(member => {
        return (
            member.name.toLowerCase().includes(query) ||
            member.state.toLowerCase().includes(query) ||
            member.party.toLowerCase().includes(query) ||
            member.office.toLowerCase().includes(query)
        );
    });

    renderCards(searched);
}

// Event listener for search input
searchInput.addEventListener('input', () => applySearch(allMembers));
// Modal elements
const modal = document.getElementById('member-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');

// Open modal with member details
function openModal(member) {
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>${member.name}</h2>
            <span id="close-modal" class="close">&times;</span>
        </div>
        <div class="modal-body">
            <img src="${member.photo}" alt="${member.name}" />
            <p><strong>State:</strong> ${member.state}</p>
            <p><strong>Party:</strong> ${member.party}</p>
            <p><strong>Office:</strong> ${member.office}</p>
            ${member.platform ? `<p><strong>Platform:</strong> ${member.platform}</p>` : ''}
            <p><a href="${member.ballotpediaLink}" target="_blank">View on Ballotpedia</a></p>
        </div>
    `;
    modal.style.display = 'block';

    // Close button event
    const closeBtn = modalContent.querySelector('#close-modal');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
}

// Close modal when clicking outside content
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
// Filters
const partyFilter = document.getElementById('party-filter');
const stateFilter = document.getElementById('state-filter');
const searchInput = document.getElementById('search-input');

function applyFilters(members) {
    let filtered = [...members];

    // Filter by party
    const selectedParty = partyFilter.value;
    if (selectedParty !== 'All') {
        filtered = filtered.filter(m => m.party === selectedParty);
    }

    // Filter by state
    const selectedState = stateFilter.value;
    if (selectedState !== 'All') {
        filtered = filtered.filter(m => m.state === selectedState);
    }

    // Search by name
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(m => m.name.toLowerCase().includes(searchTerm));
    }

    return filtered;
}

// Event listeners
partyFilter.addEventListener('change', () => {
    const filteredMembers = applyFilters(allMembers);
    renderMemberCards(filteredMembers);
});

stateFilter.addEventListener('change', () => {
    const filteredMembers = applyFilters(allMembers);
    renderMemberCards(filteredMembers);
});

searchInput.addEventListener('input', () => {
    const filteredMembers = applyFilters(allMembers);
    renderMemberCards(filteredMembers);
});
// Modal Elements
const modal = document.getElementById('member-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

// Function to open modal
function openModal(member) {
    modalContent.innerHTML = `
        <img src="${member.photo}" alt="${member.name}" class="modal-photo">
        <h2>${member.name}</h2>
        <p><strong>Office:</strong> ${member.office}</p>
        <p><strong>State:</strong> ${member.state}</p>
        <p><strong>Party:</strong> ${member.party}</p>
        <p><a href="${member.ballotpediaLink}" target="_blank">View on Ballotpedia</a></p>
        <p><strong>Platform:</strong> ${member.platform || 'N/A'}</p>
        <p><strong>Bills:</strong> ${member.bills.length ? member.bills.join(', ') : 'N/A'}</p>
    `;
    modal.style.display = 'block';
}

// Function to close modal
modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal if user clicks outside content
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
// Filter & Search Elements
const searchInput = document.getElementById('search-input');
const stateFilter = document.getElementById('state-filter');
const partyFilter = document.getElementById('party-filter');

// Function to filter members
function filterMembers() {
    const searchTerm = searchInput.value.toLowerCase();
    const stateTerm = stateFilter.value;
    const partyTerm = partyFilter.value;

    const filtered = membersData.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm);
        const matchesState = stateTerm === 'All' || member.state === stateTerm;
        const matchesParty = partyTerm === 'All' || member.party === partyTerm;
        return matchesSearch && matchesState && matchesParty;
    });

    renderCards(filtered);
}

// Event listeners
searchInput.addEventListener('input', filterMembers);
stateFilter.addEventListener('change', filterMembers);
partyFilter.addEventListener('change', filterMembers);
// Modal Elements
const modal = document.getElementById('member-modal');
const modalClose = document.getElementById('modal-close');
const modalContent = document.getElementById('modal-content');

// Function to open modal with member details
function openModal(member) {
    modalContent.innerHTML = `
        <img src="${member.photo}" alt="${member.name}" class="modal-photo">
        <h2>${member.name}</h2>
        <p><strong>State:</strong> ${member.state}</p>
        <p><strong>Party:</strong> ${member.party}</p>
        <p><strong>Office:</strong> ${member.office}</p>
        <p><a href="${member.ballotpediaLink}" target="_blank">View on Ballotpedia</a></p>
    `;
    modal.style.display = 'block';
}

// Close modal on click of close button
modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside content
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
// Filter and search elements
const stateFilter = document.getElementById('state-filter');
const partyFilter = document.getElementById('party-filter');
const searchInput = document.getElementById('search-input');

// Function to filter members based on current filters/search
function filterMembers() {
    const stateValue = stateFilter.value.toLowerCase();
    const partyValue = partyFilter.value.toLowerCase();
    const searchValue = searchInput.value.toLowerCase();

    const filtered = membersData.filter(member => {
        const matchesState = stateValue === 'all' || member.state.toLowerCase() === stateValue;
        const matchesParty = partyValue === 'all' || member.party.toLowerCase() === partyValue;
        const matchesSearch = member.name.toLowerCase().includes(searchValue);
        return matchesState && matchesParty && matchesSearch;
    });

    displayMembers(filtered);
}

// Event listeners for filters/search
stateFilter.addEventListener('change', filterMembers);
partyFilter.addEventListener('change', filterMembers);
searchInput.addEventListener('input', filterMembers);
// Modal elements
const modal = document.getElementById('member-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');

// Function to open modal with member details
function openModal(member) {
    modalContent.innerHTML = `
        <img src="${member.photo}" alt="${member.name}" class="modal-photo">
        <h2>${member.name}</h2>
        <p><strong>State:</strong> ${member.state}</p>
        <p><strong>Party:</strong> ${member.party}</p>
        <p><strong>Office:</strong> ${member.office}</p>
        <p><a href="${member.ballotpediaLink}" target="_blank">Ballotpedia</a></p>
        <div class="social-links">
            ${member.social.twitter ? `<a href="${member.social.twitter}" target="_blank">Twitter</a>` : ''}
            ${member.social.facebook ? `<a href="${member.social.facebook}" target="_blank">Facebook</a>` : ''}
            ${member.social.instagram ? `<a href="${member.social.instagram}" target="_blank">Instagram</a>` : ''}
        </div>
    `;
    modal.style.display = 'block';
}

// Close modal
closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside modal content
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
// Search and filter elements
const searchInput = document.getElementById('search-input');
const filterState = document.getElementById('filter-state');
const filterParty = document.getElementById('filter-party');
const filterOffice = document.getElementById('filter-office');

// Function to filter members
function filterMembers() {
    const searchTerm = searchInput.value.toLowerCase();
    const stateTerm = filterState.value;
    const partyTerm = filterParty.value;
    const officeTerm = filterOffice.value;

    const filteredMembers = allMembers.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm);
        const matchesState = stateTerm === 'All' || member.state === stateTerm;
        const matchesParty = partyTerm === 'All' || member.party === partyTerm;
        const matchesOffice = officeTerm === 'All' || member.office === officeTerm;
        return matchesSearch && matchesState && matchesParty && matchesOffice;
    });

    renderMembers(filteredMembers);
}

// Event listeners for search and filters
searchInput.addEventListener('input', filterMembers);
filterState.addEventListener('change', filterMembers);
filterParty.addEventListener('change', filterMembers);
filterOffice.addEventListener('change', filterMembers);
// Modal elements
const modal = document.getElementById('member-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

// Function to open modal
function openModal(member) {
    modalContent.innerHTML = `
        <span id="modal-close">&times;</span>
        <div class="modal-member">
            <img src="${member.photo}" alt="${member.name}">
            <h2>${member.name}</h2>
            <p><strong>Office:</strong> ${member.office}</p>
            <p><strong>State:</strong> ${member.state}</p>
            <p><strong>Party:</strong> ${member.party}</p>
            <p><a href="${member.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>
            <p><strong>Platform:</strong> ${member.platform || 'N/A'}</p>
            <p><strong>Bills Sponsored:</strong> ${member.bills.length > 0 ? member.bills.join(', ') : 'None'}</p>
        </div>
    `;
    // Re-attach close listener
    document.getElementById('modal-close').addEventListener('click', closeModal);
    modal.style.display = 'block';
}

// Function to close modal
function closeModal() {
    modal.style.display = 'none';
}

// Close modal when clicking outside content
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
// Filter elements
const stateFilter = document.getElementById('state-filter');
const partyFilter = document.getElementById('party-filter');
const officeFilter = document.getElementById('office-filter');
const searchInput = document.getElementById('search-input');

// Function to apply filters and search
function applyFilters() {
    const state = stateFilter.value.toLowerCase();
    const party = partyFilter.value.toLowerCase();
    const office = officeFilter.value.toLowerCase();
    const search = searchInput.value.toLowerCase();

    const filteredMembers = membersData.filter(member => {
        const matchesState = state === '' || member.state.toLowerCase() === state;
        const matchesParty = party === '' || member.party.toLowerCase() === party;
        const matchesOffice = office === '' || member.office.toLowerCase() === office;
        const matchesSearch = member.name.toLowerCase().includes(search);
        return matchesState && matchesParty && matchesOffice && matchesSearch;
    });

    renderMembers(filteredMembers);
}

// Event listeners for filters
stateFilter.addEventListener('change', applyFilters);
partyFilter.addEventListener('change', applyFilters);
officeFilter.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);
// Modal elements
const modal = document.getElementById('member-modal');
const modalClose = document.getElementById('modal-close');
const modalContent = document.getElementById('modal-content');

// Function to open modal with member details
function openModal(member) {
    modalContent.innerHTML = `
        <img src="${member.photo}" alt="${member.name}" class="modal-photo">
        <h2>${member.name}</h2>
        <p><strong>State:</strong> ${member.state}</p>
        <p><strong>Party:</strong> ${member.party}</p>
        <p><strong>Office:</strong> ${member.office}</p>
        ${member.platform ? `<p><strong>Platform:</strong> ${member.platform}</p>` : ''}
        <div class="social-links">
            ${member.social.twitter ? `<a href="${member.social.twitter}" target="_blank">Twitter</a>` : ''}
            ${member.social.facebook ? `<a href="${member.social.facebook}" target="_blank">Facebook</a>` : ''}
            ${member.social.instagram ? `<a href="${member.social.instagram}" target="_blank">Instagram</a>` : ''}
        </div>
        <a href="${member.ballotpediaLink}" target="_blank" class="ballotpedia-link">View on Ballotpedia</a>
    `;
    modal.style.display = 'block';
}

// Close modal when clicking close button
modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside modal content
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
// Filter by party dropdown
const partyFilter = document.getElementById('party-filter');
partyFilter.addEventListener('change', () => {
    const selectedParty = partyFilter.value;
    const filteredMembers = selectedParty === 'All' 
        ? membersData 
        : membersData.filter(member => member.party === selectedParty);
    displayMembers(filteredMembers);
});

// Search by name input
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filteredMembers = membersData.filter(member => member.name.toLowerCase().includes(query));
    displayMembers(filteredMembers);
});
// Modal elements
const modal = document.getElementById('member-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

// Open modal with member details
function openModal(member) {
    modalContent.innerHTML = `
        <img src="${member.photo}" alt="${member.name}" class="modal-photo">
        <h2>${member.name}</h2>
        <p><strong>State:</strong> ${member.state}</p>
        <p><strong>Party:</strong> ${member.party}</p>
        <p><strong>Office:</strong> ${member.office}</p>
        <p><a href="${member.ballotpediaLink}" target="_blank">Ballotpedia</a></p>
        ${member.platform ? `<p><strong>Platform:</strong> ${member.platform}</p>` : ''}
        ${member.bills.length > 0 ? `<p><strong>Bills:</strong> ${member.bills.join(', ')}</p>` : ''}
    `;
    modal.style.display = 'block';
}

// Close modal
modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside content
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
// Filter elements
const searchInput = document.getElementById('search-input');
const filterState = document.getElementById('filter-state');
const filterParty = document.getElementById('filter-party');
const filterOffice = document.getElementById('filter-office');

// Apply filters and search
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const stateTerm = filterState.value;
    const partyTerm = filterParty.value;
    const officeTerm = filterOffice.value;

    const filteredMembers = membersData.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm);
        const matchesState = stateTerm === '' || member.state === stateTerm;
        const matchesParty = partyTerm === '' || member.party === partyTerm;
        const matchesOffice = officeTerm === '' || member.office === officeTerm;
        return matchesSearch && matchesState && matchesParty && matchesOffice;
    });

    renderMembers(filteredMembers);
}

// Event listeners
searchInput.addEventListener('input', applyFilters);
filterState.addEventListener('change', applyFilters);
filterParty.addEventListener('change', applyFilters);
filterOffice.addEventListener('change', applyFilters);
