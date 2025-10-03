document.addEventListener('DOMContentLoaded', () => {
    // Array to hold all members
    let allMembers = [];

    // Load all JSON files
    const jsonFiles = ['Senate.json', 'House.json', 'Governors.json', 'LtGovernors.json'];

    Promise.all(jsonFiles.map(file =>
        fetch(file)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${file}`);
                return response.json();
            })
    ))
    .then(dataArrays => {
        // Flatten all data into allMembers
        allMembers = dataArrays.flat();

        // Initially render all cards
        renderCards(allMembers);

        // Initialize dropdown filters if present
        setupFilters();
    })
    .catch(error => console.error('Error loading JSON data:', error));
});
function renderCards(data) {
    const container = document.getElementById('cards-container');
    container.innerHTML = ''; // Clear existing cards

    data.forEach(item => {
        const card = createCard(item);
        container.appendChild(card);
    });
}

function createCard(item) {
    const card = document.createElement('article');
    card.className = 'card';

    // Card inner HTML
    card.innerHTML = `
        <img src="${item.photo}" alt="${item.name}" class="card-photo">
        <h3 class="card-name">${item.name}</h3>
        <p class="card-office">${item.office} - ${item.state}</p>
    `;

    // Click to open modal
    card.addEventListener('click', () => openModal(item));

    return card;
}

// Modal handling
function openModal(item) {
    const modal = document.getElementById('modal');
    modal.querySelector('.modal-title').textContent = item.name;
    modal.querySelector('.modal-photo').src = item.photo;
    modal.querySelector('.modal-body').textContent = item.platform || 'No platform info';
    modal.style.display = 'block';
}

// Close modal when clicking the X or outside the modal content
function setupModalClose() {
    const modal = document.getElementById('modal');
    const closeBtn = modal.querySelector('.close');

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Initialize modal close behavior
setupModalClose();
// Filtering by office and state
function setupFilters(data) {
    const officeSelect = document.getElementById('office-filter');
    const stateSelect = document.getElementById('state-filter');
    const searchInput = document.getElementById('search-input');

    // Populate office options
    const offices = [...new Set(data.map(item => item.office))].sort();
    offices.forEach(office => {
        const option = document.createElement('option');
        option.value = office;
        option.textContent = office;
        officeSelect.appendChild(option);
    });

    // Populate state options
    const states = [...new Set(data.map(item => item.state))].sort();
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });

    // Filter cards based on selections
    function filterCards() {
        const officeValue = officeSelect.value;
        const stateValue = stateSelect.value;
        const searchValue = searchInput.value.toLowerCase();

        const filtered = data.filter(item => {
            const matchesOffice = officeValue === 'All' || item.office === officeValue;
            const matchesState = stateValue === 'All' || item.state === stateValue;
            const matchesSearch = item.name.toLowerCase().includes(searchValue);
            return matchesOffice && matchesState && matchesSearch;
        });

        renderCards(filtered);
    }

    // Event listeners
    officeSelect.addEventListener('change', filterCards);
    stateSelect.addEventListener('change', filterCards);
    searchInput.addEventListener('input', filterCards);
}

// Initialize filters after data is loaded
setupFilters(allMembers);
