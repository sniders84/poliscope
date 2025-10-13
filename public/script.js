let selectedState = 'Alabama';
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
    renderOfficials(selectedState);
  })
  .catch(error => {
    console.error('Error loading officials:', error);
  });

  function renderOfficials(state, query = '') {
    officialsContainer.innerHTML = '';
    const filtered = allOfficials.filter(o =>
      o.state === state &&
      (o.name.toLowerCase().includes(query) || o.office.toLowerCase().includes(query))
    );

    filtered.forEach(o => {
      const card = document.createElement('div');
      card.className = `official-card ${o.party?.toLowerCase() || 'independent'}`;
card.innerHTML = `
  <div class="party-stripe"></div>
  <div class="photo-wrapper">
    <img src="${o.photo}" alt="${o.name}" />
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
    modalContent.innerHTML = `
      <h2>${o.name}</h2>
      <div class="modal-photo-wrapper">
        <img src="${o.photo}" alt="${o.name}" />
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
      ${o.engagement ? `
        <h4>Engagement</h4>
        <p><strong>Executive Orders (2025):</strong> ${o.engagement.executiveOrders2025 || 0}</p>
        <p><strong>Social Media Surge:</strong> ${o.engagement.socialMediaSurge ? 'Yes' : 'No'}</p>
        <p><strong>Earned Media Coverage:</strong> ${o.engagement.earnedMediaCoverage ? 'Yes' : 'No'}</p>
        ${o.engagement.sources?.length ? `
          <p><strong>Sources:</strong></p>
          <ul>${o.engagement.sources.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('')}</ul>
        ` : ''}
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
    renderOfficials(selectedState, searchBar.value.trim().toLowerCase());
  });

  searchBar.addEventListener('input', () => {
    const query = searchBar.value.trim().toLowerCase();
    renderOfficials(selectedState, query);
  });
});
