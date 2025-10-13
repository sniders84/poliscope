// script.js — Block 1: DOM setup and state

let selectedState = 'Alabama'; // Default fallback

document.addEventListener('DOMContentLoaded', () => {
  const stateSelector = document.getElementById('state-selector');
  const officialsContainer = document.getElementById('officials-container');
  const modal = document.getElementById('official-modal');
  const modalContent = document.getElementById('modal-content');
  const closeModal = document.getElementById('close-modal');
  // Block 2: Load and merge all officials
  Promise.all([
    fetch('public/senators.json').then(res => res.json()),
    fetch('public/housereps.json').then(res => res.json()),
    fetch('public/governors.json').then(res => res.json()),
    fetch('public/ltgovernors.json').then(res => res.json())
  ]).then(([senators, reps, governors, ltgovs]) => {
    const allOfficials = [...senators, ...reps, ...governors, ...ltgovs];
    // Block 3: Render officials by selected state
    function renderOfficials(state) {
      officialsContainer.innerHTML = '';
      const filtered = allOfficials.filter(o => o.state === state);

      filtered.forEach(o => {
        const card = document.createElement('div');
        card.className = `official-card ${o.party.toLowerCase()}`;
        card.innerHTML = `
          <div class="party-stripe"></div>
          <img src="${o.photo}" alt="${o.name}" />
          <div class="official-info">
            <h3>${o.name}</h3>
            <p>${o.office}</p>
            <p>${o.termStart} → ${o.termEnd}</p>
          </div>
        `;
        card.addEventListener('click', () => openModal(o));
        officialsContainer.appendChild(card);
      });
    }
    // Block 4: Modal logic
    function openModal(official) {
      modalContent.innerHTML = `
        <h2>${official.name}</h2>
        <img src="${official.photo}" alt="${official.name}" />
        <p><strong>Office:</strong> ${official.office}</p>
        <p><strong>Party:</strong> ${official.party}</p>
        <p><strong>Term:</strong> ${official.termStart} → ${official.termEnd}</p>
        <p><strong>Bio:</strong> ${official.bio || '—'}</p>
        <p><strong>Education:</strong> ${official.education || '—'}</p>
        <p><strong>Platform:</strong> ${official.platform || '—'}</p>
        <p><strong>Proposals:</strong> ${official.proposals || '—'}</p>
        <p><strong>Contact:</strong> 
          ${official.contact?.email ? `<a href="mailto:${official.contact.email}">${official.contact.email}</a>` : ''}
          ${official.contact?.phone ? ` | ${official.contact.phone}` : ''}
        </p>
        ${official.ballotpediaLink ? `<p><a href="${official.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ''}
        ${official.billsSigned?.length ? `
          <h4>Bills Signed</h4>
          <ul>${official.billsSigned.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join('')}</ul>
        ` : ''}
      `;
      modal.style.display = 'block';
    }

    closeModal.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    // Block 5: State change + initial render
    stateSelector.addEventListener('change', () => {
      selectedState = stateSelector.value;
      renderOfficials(selectedState);
      // TODO: Sync other tabs (calendar, polls, activist, registration)
    });

    renderOfficials(selectedState);
  });
});
