console.log("✅ script.js loaded")
let allOfficials = []

function renderCards(data, containerId) {
  const container = document.getElementById(containerId)
  if (!container) {
    console.warn(`Missing container: ${containerId}`)
    return
  }

  const cardsHTML = data.map(person => {
    const imageUrl = person.photo || 'images/fallback.jpg'
    const partyColor = person.party?.toLowerCase().includes("repub") ? "#d73027" :
                       person.party?.toLowerCase().includes("dem") ? "#4575b4" :
                       person.party?.toLowerCase().includes("libert") ? "#fdae61" :
                       person.party?.toLowerCase().includes("indep") ? "#999999" :
                       person.party?.toLowerCase().includes("green") ? "#66bd63" :
                       person.party?.toLowerCase().includes("constit") ? "#984ea3" :
                       "#cccccc"

    return `
      <div class="card" onclick="expandCard('${person.slug}')" style="border-left: 8px solid ${partyColor};">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
        <h3>${person.name}</h3>
        <p>${person.office || person.position || ''}</p>
        <p>${person.district || ''}</p>
        <p>${person.state}${person.party ? ', ' + person.party : ''}</p>
        <p>Term: ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
        <p>Approval: ${person.approval || person.score || '—'}%</p>
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
  const score = person.score || '—'
  const badge = score >= 85 ? '🟢 Civic Champion' :
                score >= 70 ? '🟡 Solid Contributor' :
                score < 70 ? '🔴 Needs Accountability' : '⚪ Unscored'

  const breakdown = person.scoreBreakdown || {}

  const breakdownHTML = Object.entries(breakdown).map(([label, value]) => {
    return `<tr><td>${label}</td><td>${value}/10</td></tr>`
  }).join('')

  const modalHTML = `
    <div class="card">
      <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
      <h2>${person.name}</h2>
      <p><strong>Office:</strong> ${person.office || person.position || ''}</p>
      <p><strong>District:</strong> ${person.district || '—'}</p>
      <p><strong>State:</strong> ${person.state}</p>
      <p><strong>Party:</strong> ${person.party || '—'}</p>
      <p><strong>Term:</strong> ${person.termStart || '—'} to ${person.termEnd || '—'}</p>
      <p><strong>Score:</strong> ${score}/100 (${badge})</p>

      <table style="margin: 10px auto; border-collapse: collapse;">
        <thead><tr><th>Metric</th><th>Score</th></tr></thead>
        <tbody>${breakdownHTML}</tbody>
      </table>

      ${link ? `<p><a href="${link}" target="_blank">Ballotpedia Profile</a></p>` : ''}
      <p><strong>Contact:</strong> ${person.contact?.email || '—'} | ${person.contact?.phone || '—'} | ${person.contact?.website || '—'}</p>
    </div>
  `

  document.getElementById('modal-content').innerHTML = modalHTML
  document.getElementById('modal-overlay').style.display = 'flex'
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none'
}

function renderMyOfficials(state) {
  console.log("Rendering officials for:", state)
  const matches = allOfficials
    .filter(person =>
      person.state === state ||
      person.stateName === state ||
      person.stateAbbreviation === state
    )
    .sort((a, b) => {
      const rank = role => role.includes("Governor") ? 1 :
                           role.includes("Senator") ? 2 :
                           role.includes("Representative") ? 3 : 4
      return rank(a.office || "") - rank(b.office || "")
    })

  console.log(`Found ${matches.length} officials for ${state}`)
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
    const optionLeft = new Option(label, person.slug)
    const optionRight = new Option(label, person.slug)

    left.add(optionLeft)
    right.add(optionRight)
  })

  console.log(`Compare A options: ${left.options.length}`)
  console.log(`Compare B options: ${right.options.length}`)
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
      <p><strong>Approval:</strong> ${person.approval || person.score || '—'}%</p>
      ${link ? `<p><a href="${link}" target="_blank">Ballotpedia Profile</a></p>` : ''}
    </div>
  `
}

function showTab(id) {
  const sections = ['my-officials', 'compare', 'top10', 'bottom10', 'calendar', 'registration']
  sections.forEach(sectionId => {
    const el = document.getElementById(sectionId)
    if (el) el.style.display = sectionId === id ? 'block' : 'none'
  })

  const results = document.getElementById('results')
  if (results) results.innerHTML = ''
  const search = document.getElementById('search')
  if (search) search.value = ''
}

async function loadData() {
  try {
    console.log("Starting loadData()")

    await waitForHouseData()

    const house = window.cleanedHouse || []
    const governors = await fetch('Governors.json').then(res => res.json())
    const senate = await fetch('Senate.json').then(res => res.json())

    allOfficials = [...house, ...governors, ...senate]
    console.log("Loaded officials:", allOfficials.length)

    populateCompareDropdowns()

    const stateSelect = document.getElementById('state-select')
    if (stateSelect) {
      const states = [...new Set(allOfficials.map(p => p.state))].sort()
      stateSelect.innerHTML = '<option value="">Choose a state</option>' +
        states.map(state => `<option value="${state}">${state}</option>`).join('')

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

function waitForHouseData() {
  return new Promise(resolve => {
    const check = () => {
      if (window.cleanedHouse && window.cleanedHouse.length > 0) {
        resolve()
      } else {
        setTimeout(check, 50)
      }
    }
    check()
  })
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

// ✅ Expose showTab globally so tabs work
window.showTab = showTab

