let allOfficials = [];

function showTab(tabId) {
  const tabs = document.querySelectorAll('section[id]');
  tabs.forEach(tab => {
    tab.style.display = tab.id === tabId ? 'block' : 'none';
  });
  
  window.showTab = showTab;

  const buttons = document.querySelectorAll('#tabs button');
  buttons.forEach(button => {
    button.classList.toggle('active', button.getAttribute('onclick') === `showTab('${tabId}')`);
  });
}

function renderCards(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Missing container: ${containerId}`);
    return;
  }

  const cardsHTML = data.map(person => {
    const imageUrl = person.photo || 'images/fallback.jpg';
    const partyColor = person.party?.toLowerCase().includes("repub") ? "#d73027" :
                       person.party?.toLowerCase().includes("dem") ? "#4575b4" :
                       person.party?.toLowerCase().includes("libert") ? "#fdae61" :
                       person.party?.toLowerCase().includes("indep") ? "#999999" :
                       person.party?.toLowerCase().includes("green") ? "#66bd63" :
                       person.party?.toLowerCase().includes("constit") ? "#984ea3" :
                       "#cccccc";

    return `
      <div class="card" onclick="expandCard('${person.slug}')" style="border-left: 8px solid ${partyColor};">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
        <h3>${person.name}</h3>
        <p>${person.office || person.position || ''}</p>
        <p>${person.district || ''}</p>
        <p>${person.state}${person.party ? ', ' + person.party : ''}</p>
        <p>Term: ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
}

function expandCard(slug) {
  const person = allOfficials.find(p => p.slug === slug);
  if (!person) return;
  openModal(person);
}

function openModal(person) {
  const imageUrl = person.photo || 'images/fallback.jpg';
  const link = person.ballotpediaLink || person.contact?.website || '';

  let billsHTML = '';
  if (person.billsSigned?.length) {
    billsHTML = `
      <p><strong>Key Bills Signed:</strong></p>
      <ul>
        ${person.billsSigned.map(bill => `<li><a href="${bill.link}" target="_blank">${bill.title}</a></li>`).join('')}
      </ul>
    `;
  }

  const modalHTML = `
    <div class="modal-container">
      <div class="modal-left">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
        <h2>${person.name}</h2>
        ${link ? `<p><a href="${link}" target="_blank">Ballotpedia Profile</a></p>` : ''}
      </div>
      <div class="modal-right">
        ${person.bio ? `<p><strong>Bio:</strong> ${person.bio}</p>` : ''}
        ${person.platform ? `<p><strong>Platform:</strong> ${person.platform}</p>` : ''}
        ${billsHTML}
      </div>
    </div>
  `;

  document.getElementById('modal-content').innerHTML = modalHTML;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function waitForHouseData() {
  return new Promise(resolve => {
    const check = () => {
      if (window.cleanedHouse && window.cleanedHouse.length > 0) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

async function loadData() {
  try {
    await waitForHouseData();

    const house = window.cleanedHouse || [];
    const governors = await fetch('Governors.json').then(res => res.json());
    const senate = await fetch('Senate.json').then(res => res.json());

    allOfficials = [...house, ...governors, ...senate];

    renderMyOfficials('Alabama');
    renderRankings();
    renderRookies();
    populateCompareDropdowns();
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

function renderMyOfficials(state) {
  const matches = allOfficials.filter(p =>
    p.state === state ||
    p.stateName === state ||
    p.stateAbbreviation === state
  );
  renderCards(matches, 'my-cards');
}

function renderRankings() {
  renderCards(allOfficials.filter(p => p.office?.includes("Governor")), 'rankings-governors');
  renderCards(allOfficials.filter(p => p.office?.includes("Senator")), 'rankings-senators');
  renderCards(allOfficials.filter(p => p.office?.includes("Representative")), 'rankings-house');
}

function renderRookies() {
  const cutoffYear = new Date().getFullYear() - 6;
  renderCards(allOfficials.filter(p => p.office?.includes("Governor") && Number(p.termStart) >= cutoffYear), 'rookie-governors');
  renderCards(allOfficials.filter(p => p.office?.includes("Senator") && Number(p.termStart) >= cutoffYear), 'rookie-senators');
  renderCards(allOfficials.filter(p => p.office?.includes("Representative") && Number(p.termStart) >= cutoffYear), 'rookie-house');
}

function populateCompareDropdowns() {
  const left = document.getElementById('compare-left');
  const right = document.getElementById('compare-right');
  if (!left || !right) return;

  left.innerHTML = '<option value="">Select official A</option>';
  right.innerHTML = '<option value="">Select official B</option>';

  allOfficials.forEach(person => {
    const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`;
    left.add(new Option(label, person.slug));
    right.add(new Option(label, person.slug));
  });

  left.addEventListener('change', e => renderCompareCard(e.target.value, 'compare-card-left'));
  right.addEventListener('change', e => renderCompareCard(e.target.value, 'compare-card-right'));
}

function renderCompareCard(slug, containerId) {
  const person = allOfficials.find(p => p.slug === slug);
  const container = document.getElementById(containerId);
  if (!container || !person) return;

  container.innerHTML = `
    <div class="card">
      <h3>${person.name}</h3>
      <p><strong>Office:</strong> ${person.office || ''}</p>
      <p><strong>State:</strong> ${person.state}</p>
      <p><strong>Party:</strong> ${person.party || '—'}</p>
      <p><strong>Term:</strong> ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();

  const stateSelect = document.getElementById('state-select');
  const searchInput = document.getElementById('search');
  const results = document.getElementById('results');

  if (stateSelect) {
    stateSelect.addEventListener('change', () => {
      const selectedState = stateSelect.value;
      renderMyOfficials(selectedState);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      const selectedState = stateSelect?.value || '';
      const filtered = allOfficials.filter(person =>
        (person.state === selectedState ||
         person.stateName === selectedState ||
         person.stateAbbreviation === selectedState) &&
        (
          person.name?.toLowerCase().includes(query) ||
          person.party?.toLowerCase().includes(query)
        )
      );
      renderCards(filtered, 'my-cards');

      if (results) {
        results.innerHTML = filtered.map(person => {
          const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`;
          return `<li>${label}</li>`;
        }).join('');
      }
    });
  }

  showTab('my-officials');
});

