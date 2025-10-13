let selectedState = 'North Carolina';
let allOfficials = [];

document.addEventListener('DOMContentLoaded', () => {
  const stateSelector = document.getElementById('state-selector');
  const searchBar = document.getElementById('search-bar');
  const officialsContainer = document.getElementById('officials-container');
  const modal = document.getElementById('official-modal');
  const modalContent = document.getElementById('modal-content');
  const closeModal = document.getElementById('close-modal');

  Promise.all([
    fetch('senators.json').then(res => res.json()),
    fetch('housereps.json').then(res => res.json()),
    fetch('governors.json').then(res => res.json()),
    fetch('ltgovernors.json').then(res => res.json())
  ])
  .then(([senators, reps, governors, ltgovs]) => {
    allOfficials = [...senators, ...reps, ...governors, ...ltgovs];
    renderOfficials(selectedState, '');
  })
  .catch(error => {
    console.error('Error loading officials:', error);
  });

  function renderOfficials(stateFilter = null, query = '') {
    officialsContainer.innerHTML = '';

    const queryLower = query.toLowerCase();
    const filtered = allOfficials.filter(o => {
      const matchesQuery =
        o.name.toLowerCase().includes(queryLower) ||
        o.office.toLowerCase().includes(queryLower) ||
        o.state.toLowerCase().includes(queryLower);

      const matchesState = stateFilter ? o.state === stateFilter : true;

      return matchesQuery && matchesState;
    });

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

    filtered.forEach(o => {
      const rawParty = (o.party || '').toLowerCase().trim();
      const normalizedParty = partyMap[rawParty] || rawParty.replace(/\s+/g, '') || 'independent';
      const photoSrc = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';

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

    modalContent.innerHTML = `
      <h2>${o.name}</h2>
      <div class="modal-photo-wrapper">
        <img src="${modalPhoto}" alt="${o.name}" onerror="this.onerror=null;this.src='assets/default-photo.png';" />
      </div>
      <p><strong>Office:</strong> ${o.office}</p>
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
              <strong>${v.vote}:</strong> 
              <a href="${v.link}" target="_blank">${v.title}</a> 
              (${v.result}, ${v.date})
            </li>
          `).join('')}
        </ul>
      ` : ''}
      ${o.billsSigned?.length ? `
        <h4>Bills Signed</h4>
        <ul>${o.billsSigned.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}</ul>
      ` : ''}
      ${o.vetoes ? `<p><strong>Vetoes:</strong> ${o.vetoes}</p>` : ''}
      ${o.salary ? `<p><strong>Salary:</strong> ${o.salary}</p>` : ''}
      ${o.predecessor ? `<p><strong>Predecessor:</strong> ${o.predecessor}</p>` : ''}
      ${o.pollingScore && o.pollingSource ? `
        <p><strong>Approval Rating:</strong> 
          <a href="${o.pollingSource}" target="_blank">${o.pollingScore}</a>
        </p>
      ` : ''}
      ${o.contact ? `
        <h4>Contact</h4>
        ${o.contact.email ? `<p><strong>Email:</strong> <a href="mailto:${o.contact.email}">${o.contact.email}</a></p>` : ''}
        ${o.contact.phone ? `<p><strong>Phone:</strong> <a href="tel:${o.contact.phone}">${o.contact.phone}</a></p>` : ''}
        ${o.contact.website ? `<p><strong>Website:</strong> <a href="${o.contact.website}" target="_blank">${o.contact.website}</a></p>` : ''}
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
    const query = searchBar.value.trim();
    if (query === '') {
      renderOfficials(selectedState, '');
    } else {
      renderOfficials(null, query);
    }
  });

  searchBar.addEventListener('input', () => {
    const query = searchBar.value.trim();
    if (query === '') {
      renderOfficials(selectedState, '');
    } else {
      renderOfficials(null, query);
    }
  });
});
