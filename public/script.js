let allOfficials = []

function renderCards(data, containerId) {
  const container = document.getElementById(containerId)
  if (!container) {
    console.warn(`Missing container: ${containerId}`)
    return
  }

  const cardsHTML = data.map(person => {
    const imageUrl = person.photo || 'images/fallback.jpg'
    return `
      <div class="card" onclick="expandCard('${person.slug}')">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
        <h3>${person.name}</h3>
        <p>${person.office || person.position || ''}</p>
        <p>${person.state}${person.party ? ', ' + person.party : ''}</p>
        <p>Term: ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
        <p>Approval: ${person.approval || '—'}%</p>
      </div>
    `
  }).join('')
  container.innerHTML = cardsHTML
}

function expandCard(slug) {
  const person = allOfficials.find(p => p.slug === slug)
  if (!person) return

  const imageUrl = person.photo || 'images/fallback.jpg'
  const link = person.ballotpediaLink || person.contact?.website || null

  const profileHTML = `
    <div class="card">
      <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
      <h2>${person.name}</h2>
      <p><strong>Office:</strong> ${person.office || person.position || ''}</p>
      <p><strong>State:</strong> ${person.state}</p>
      <p><strong>Party:</strong> ${person.party || '—'}</p>
      <p><strong>Term:</strong> ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
      <p><strong>Approval:</strong> ${person.approval || '—'}%</p>
      ${link ? `<p><a href="${link}" target="_blank">Ballotpedia Profile</a></p>` : ''}
      <p><strong>Platform:</strong> ${person.platform || '—'}</p>
      <p><strong>Bio:</strong> ${person.bio || '—'}</p>
      <p><strong>Contact:</strong> ${person.contact?.email || '—'} | ${person.contact?.phone || '—'} | ${person.contact?.website || '—'}</p>
      <p><strong>Social:</strong> Twitter: ${person.social?.twitter || '—'}, Facebook: ${person.social?.facebook || '—'}, Instagram: ${person.social?.instagram || '—'}</p>
    </div>
  `

  const view = document.getElementById('profile-view')
  view.innerHTML = profileHTML
  view.style.display = 'block'
  window.scrollTo({ top: view.offsetTop, behavior: 'smooth' })
}

function renderMyOfficials(state) {
  console.log("Rendering officials for:", state)
  const matches = allOfficials.filter(person => person.state === state)
  renderCards(matches, 'my-cards')
}

function populateCompareDropdowns() {
  console.log("Populating compare dropdowns")
  const left = document.getElementById('compare-left')
  const right = document.getElementById('compare-right')

  if (!left || !right) {
    console.warn("Compare dropdowns not found")
    return
  }

  left.innerHTML = '<option value="">Select official A</option>'
  right.innerHTML = '<option value="">Select official B</option>'

  allOfficials.forEach(person => {
    const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`
    const option = new Option(label, person.slug)
    left.add(option.cloneNode(true))
    right.add(option.cloneNode(true))
  })
}

function renderCompareCard(slug, containerId) {
  const person = allOfficials.find(p => p.slug === slug)
  const container = document.getElementById(containerId)
  if (!container) return

  if (!person) {
    container.innerHTML = `<p>No match found for: ${slug}</p>`
    return
  }

  const imageUrl = person.photo || 'images/fallback.jpg'
  const link = person.ballotpediaLink || person.contact?.website || null

  container.innerHTML = `
    <div class="card">
      <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
      <h3>${person.name}</h3>
      <p><strong>Office:</strong> ${person.office || person.position || ''}</p>
      <p><strong>State:</strong> ${person.state}</p>
      <p><strong>Party:</strong> ${person.party || '—'}</p>
      <p><strong>Term:</strong> ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
      <p><strong>Approval:</strong> ${person.approval || '—'}%</p>
      ${link ? `<p><a href="${link}" target="_blank">Ballotpedia Profile</a></p>` : ''}
      <p><strong>Platform:</strong> ${person.platform || '—'}</p>
      <p><strong>Contact:</strong> ${person.contact?.email || '—'} | ${person.contact?.phone || '—'} | ${person.contact?.website || '—'}</p>
      <p><strong>Social:</strong> Twitter: ${person.social?.twitter || '—'}, Facebook: ${person.social?.facebook || '—'}, Instagram: ${person.social?.instagram || '—'}</p>
    </div>
  `
}

function showTab(id) {
  const sections = ['my-officials', 'compare', 'top10', 'bottom10', 'calendar', 'registration']
  sections.forEach(sectionId => {
    const el = document.getElementById(sectionId)
    if (el) el.style.display = sectionId === id ? 'block' : 'none'
  })
}

async function loadData() {
  try {
    console.log("Starting loadData()")

    // Use cleaned data from cleanHouse.js
    const house = window.cleanedHouse || []
    const governors = await fetch('Governors.json').then(res => res.json())
    const senate = await fetch('Senate.json').then(res => res.json())

    allOfficials = [...house, ...governors, ...senate]
    console.log("Loaded officials:", allOfficials.length)

    populateCompareDropdowns()

    const stateSelect = document.getElementById('state-select')
    if (stateSelect) {
      stateSelect.value = 'North Carolina'
      renderMyOfficials('North Carolina')

      stateSelect.addEventListener('change', function (e) {
        renderMyOfficials(e.target.value)
      })
    } else {
      console.warn("State selector not found")
    }
  } catch (err) {
    console.error("Error loading data:", err)
  }
}

document.addEventListener('DOMContentLoaded', function () {
  loadData()

  const left = document.getElementById('compare-left')
  const right = document.getElementById('compare-right')
  const search = document.getElementById('search')

  if (left) {
    left.addEventListener('change', function (e) {
      renderCompareCard(e.target.value, 'compare-card-left')
    })
  }

  if (right) {
    right.addEventListener('change', function (e) {
      renderCompareCard(e.target.value, 'compare-card-right')
    })
  }

  if (search) {
    search.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase()
      const matches = allOfficials.filter(person =>
        person.name.toLowerCase().includes(query) ||
        person.state.toLowerCase().includes(query) ||
        (person.party && person.party.toLowerCase().includes(query))
      )

      const resultsHTML = matches.map(person => {
        const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`
        const link = person.ballotpediaLink || person.contact?.website || null

        if (link) {
          return `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${label}</a></li>`
        } else {
          return `<li>${label}</li>`
        }
      }).join('')

      document.getElementById('results').innerHTML = resultsHTML
    })
  }
})
