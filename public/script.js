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

    const isRookie = Number(person.termStart) >= new Date().getFullYear() - 6
    const rookieBadge = isRookie ? '<span class="badge">🟢 Rookie</span>' : ''

    return `
      <div class="card" onclick="expandCard('${person.slug}')" style="border-left: 8px solid ${partyColor};">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.src='images/fallback.jpg'" />
        <h3>${person.name} ${rookieBadge}</h3>
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

  renderCards(matches, 'my-cards')
}

function renderRankings() {
  const scored = allOfficials.filter(p => !isNaN(Number(p.score)))

  const top10 = scored.sort((a, b) => b.score - a.score).slice(0, 10)
  renderCards(top10, 'top10-overall')

  const governors = scored.filter(p => p.office?.includes("Governor")).sort((a, b) => b.score - a.score)
  const senators = scored.filter(p => p.office?.includes("Senator")).sort((a, b) => b.score - a.score)
  const house = scored.filter(p => p.office?.includes("Representative")).sort((a, b) => b.score - a.score)

  renderCards(governors, 'rankings-governors')
  renderCards(senators, 'rankings-senators')
  renderCards(house, 'rankings-house')
}

function renderRookies() {
  const cutoffYear = new Date().getFullYear() - 6

  const rookieGovernors = allOfficials.filter(p =>
    p.office?.includes("Governor") && Number(p.termStart) >= cutoffYear
  )
  const rookieSenators = allOfficials.filter(p =>
    p.office?.includes("Senator") && Number(p.termStart) >= cutoffYear
  )
  const rookieHouse = allOfficials.filter(p =>
    p.office?.includes("Representative") && Number(p.termStart) >= cutoffYear
  )

  renderCards(rookieGovernors, 'rookie-governors')
  renderCards(rookieSenators, 'rookie-senators')
  renderCards(rookieHouse, 'rookie-house')
}

function populateCompareDropdowns() {
  const left = document.getElementById('compare-left')
  const right = document.getElementById('compare-right')

  if (!left || !right) return

  left.innerHTML = '<option value="">Select official A</option>'
  right.innerHTML = '<option value="">Select official B</option>'

  allOfficials.forEach(person => {
    const label = `${person.name} (${person.state}${person.party ? ', ' + person.party : ''})`
    const optionLeft = new Option(label, person.slug)
    const optionRight = new Option(label, person.slug)

    left.add(optionLeft)
    right.add(optionRight)
  })

  left.addEventListener('change', function (e) {
    renderCompareCard(e.target.value, 'compare-card-left')
  })

  right.addEventListener('change', function (e) {
    renderCompareCard(e.target.value, 'compare-card-right')
  })
}

function renderCompareCard(slug, containerId) {
  const person = allOfficials.find(p => p.slug === slug)
  const container = document.getElementById(containerId)
  if (!container || !person) return

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
  const sections = ['my-officials', 'compare', 'rankings', 'rookies
', 'calendar', 'registration']
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
    await waitForHouseData()

    const house = window.cleanedHouse || []
    const governors = await fetch('Governors.json').then(res => res.json())
    const senate = await fetch('Senate.json').then(res => res.json())

    allOfficials = [...house, ...governors, ...senate]

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
    }

    renderRankings()
    renderRookies()
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

  const search = document.getElementById('search')
  const results = document.getElementById('results')

  if (search) {
    search.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase()
      if (!query) {
        results.innerHTML = ''
        return
      }

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

      results.innerHTML = resultsHTML
    })

    document.addEventListener('click', function (e) {
      if (!search.contains(e.target) && !results.contains(e.target)) {
        results.innerHTML = ''
        search.value = ''
      }
    })
  }
})

window.showTab = showTab
