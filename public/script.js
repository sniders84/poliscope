console.log("✅ script.js loaded");
let allOfficials = [];

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

   <h3>${person.name}</h3>


    return `
      <div class="card" onclick="expandCard('${person.slug}')" style="border-left: 8px solid ${partyColor};">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
        <h3>${person.name} ${rookieBadge}</h3>
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
  const imageUrl = person.imageUrl || person.photo || 'images/fallback.jpg';
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

  let followThroughHTML = '';
  if (person.platformFollowThrough) {
    followThroughHTML = `
      <div class="platform-followthrough">
        <h3>Platform Follow-Through</h3>
        <ul>
          ${Object.entries(person.platformFollowThrough).map(([key, value]) => `
            <li><strong>${key}:</strong> ${value}</li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  const modalHTML = `
    <div class="modal-container">
      <div class="modal-left">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
        <h2>${person.name}</h2>
        ${link ? `<p><a href="${link}" target="_blank">Ballotpedia Profile</a></p>` : ''}
        <p><strong>Contact:</strong>
          ${person.contact?.email ? `<a href="mailto:${person.contact.email}" style="margin-right:10px;">📧</a>` : ''}
          ${person.contact?.phone ? `<a href="tel:${person.contact.phone.replace(/[^0-9]/g, '')}" style="margin-right:10px;">📞</a>` : ''}
          ${person.contact?.website ? `<a href="${person.contact.website}" target="_blank" style="margin-right:10px;">🌐</a>` : ''}
        </p>
      </div>

      <div class="modal-right">
        ${person.bio ? `<p><strong>Bio:</strong> ${person.bio}</p>` : ''}
        ${person.education ? `<p><strong>Education:</strong> ${person.education}</p>` : ''}
        ${person.endorsements ? `<p><strong>Endorsements:</strong> ${person.endorsements}</p>` : ''}
        ${person.platform ? `<p><strong>Platform:</strong> ${person.platform}</p>` : ''}
        ${followThroughHTML}
        ${person.proposals ? `<p><strong>Legislative Proposals:</strong> ${person.proposals}</p>` : ''}
        ${billsHTML}
        ${person.vetoes ? `<p><strong>Vetoes:</strong> ${person.vetoes}</p>` : ''}
        ${person.salary ? `<p><strong>Salary:</strong> ${person.salary}</p>` : ''}
        ${person.predecessor ? `<p><strong>Predecessor:</strong> ${person.predecessor}</p>` : ''}
        ${person.donationLink ? `<p><strong>Donate:</strong> <a href="${person.donationLink}" target="_blank">💸</a></p>` : ''}
      </div>
    </div>
  `;

  document.getElementById('modal-content').innerHTML = modalHTML;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function renderMyOfficials(state) {
  const matches = allOfficials
    .filter(person =>
      person.state === state ||
      person.stateName === state ||
      person.stateAbbreviation === state
    )
    .sort((a, b) => {
      const rank = role =>
        role.includes("Governor") ? 1 :
        role.includes("Senator") ? 2 :
        role.includes("Representative") ? 3 : 4;
      return rank(a.office || "") - rank(b.office || "");
    });

  renderCards(matches, 'my-cards');
}

function renderRankings() {
  const governors = allOfficials.filter(p => p.office?.includes("Governor"));
  const senators = allOfficials.filter(p => p.office?.includes("Senator"));
  const house = allOfficials.filter(p => p.office?.includes("Representative"));

  renderCards(governors, 'rankings-governors');
  renderCards(senators, 'rankings-senators');
  renderCards(house, 'rankings-house');
}

function renderRookies() {
  const cutoffYear = new Date().getFullYear() - 6;

  const rookieGovernors = allOfficials.filter(p =>
    p.office?.includes("Governor") && Number(p.termStart) >= cutoffYear
  );
  const rookieSenators = allOfficials.filter(p =>
    p.office?.includes("Senator") && Number(p.termStart) >= cutoffYear
  );
  const rookieHouse = allOfficials.filter(p =>
    p.office?.includes("Representative") && Number(p.termStart) >= cutoffYear
  );

  renderCards(rookieGovernors, 'rookie-governors');
  renderCards(rookieSenators, 'rookie-senators');
  renderCards(rookieHouse, 'rookie-house');
}

function populateCompareDropdowns() {
  const left = document.getElementById('compare-left');
  const right = document.getElementById('compare-right');
  if (!left || !right) return;

  left.innerHTML = '<option value="">Select official A</option>';
  right.innerHTML = '<option value="">Select official B</option>';

  allOfficials.forEach(person => {
    const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`;
    const optionLeft = new Option(label, person.slug);
    const optionRight = new Option(label, person.slug);

    left.add(optionLeft);
    right.add(optionRight);
  });

  left.addEventListener('change', function (e) {
    renderCompareCard(e.target.value, 'compare-card-left');
  });

  right.addEventListener('change', function (e) {
    renderCompareCard(e.target.value, 'compare-card-right');
  });
}

function renderCompareCard(slug, containerId) {
  const person = allOfficials.find(p => p.slug === slug);
  const container = document.getElementById(containerId);
  if (!container || !person) return;

  const imageUrl = person.photo || 'images/fallback.jpg';
  const link = person.ballotpediaLink || person.contact?.website || null;

  container.innerHTML = `
    <div class="card">
      <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
      <h3>${person.name}</h3>
      <p><strong>Office:</strong> ${person.office || person.position || ''}</p>
      <p><strong>State:</strong> ${person.state}</p>
      <p><strong>Party:</strong> ${person.party || '—'}</p>
      <p><strong>Term:</strong> ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
      ${link ? `<p><a href="${link}" target="_blank">Ballotpedia Profile</a></p>` : ''}
    </div>
  `;
}

function showTab(id) {
  const sections = ['my-officials', 'compare', 'rankings', 'rookies', 'calendar', 'registration'];
  sections.forEach(sectionId => {
    const el = document.getElementById(sectionId);
    if (el) el.style.display = sectionId === id ? 'block' : 'none';
  });

  const results = document.getElementById('results');
  if (results) results.innerHTML = '';
  const search = document.getElementById('search');
  if (search) search.value = '';
}

async function loadData() {
  try {
    await waitForHouseData();

    const house = window.cleanedHouse || [];
    const governors = await fetch('Governors.json').then(res => res.json());
    const senate = await fetch('Senate.json').then(res => res.json());

    allOfficials = [...house, ...governors, ...senate];

    populateCompareDropdowns();

    const stateSelect = document.getElementById('state-select');
    if (stateSelect) {
      const states = [...new Set(allOfficials.map(p => p.state))].sort();
      stateSelect.innerHTML = '<option value="">Choose a state</option>' +
        states.map(state => `<option value="${state}">${state}</option>`).join('');

      stateSelect.value = 'North Carolina';
      renderMyOfficials('North Carolina');

      stateSelect.addEventListener('change', function (e) {
        renderMyOfficials(e.target.value);
      });
    }

    renderRankings();
    renderRookies();
  } catch (err) {
    console.error("Error loading data:", err);
  }
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

document.addEventListener('DOMContentLoaded', function () {
  loadData();

  const search = document.getElementById('search');
  const results = document.getElementById('results');

  if (search) {
    search.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase();
      if (!query) {
        results.innerHTML = '';
        return;
      }

      const matches = allOfficials.filter(person =>
        person.name.toLowerCase().includes(query) ||
        person.state.toLowerCase().includes(query) ||
        (person.party && person.party.toLowerCase().includes(query))
      );

      const resultsHTML = matches.map(person => {
        const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`;
        const link = person.ballotpediaLink || person.contact?.website || null;

                return link
          ? `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${label}</a></li>`
          : `<li>${label}</li>`;
      }).join('');

      results.innerHTML = resultsHTML;
    });

    document.addEventListener('click', function (e) {
      if (search && results && !search.contains(e.target) && !results.contains(e.target)) {
        results.innerHTML = '';
        search.value = '';
      }
    });
  }
});

function showTab(id) {
  const sections = ['my-officials', 'compare', 'rankings', 'rookies', 'calendar', 'registration'];
  sections.forEach(sectionId => {
    const el = document.getElementById(sectionId);
    if (el) el.style.display = sectionId === id ? 'block' : 'none';
  });

  const results = document.getElementById('results');
  if (results) results.innerHTML = '';
  const search = document.getElementById('search');
  if (search) search.value = '';
}

window.showTab = showTab;
