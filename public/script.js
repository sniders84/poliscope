let allOfficials = []

function renderCards(data, containerId) {
  const container = document.getElementById(containerId)
  const cardsHTML = data.map(person => {
    const imageUrl = `https://ballotpedia.org/images/thumb/${person.slug || 'placeholder'}.jpg`
    return `
      <div class="card" onclick="expandCard('${person.slug}')">
        <img src="${imageUrl}" alt="${person.name}" onerror="this.src='fallback.jpg'" />
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
  alert(`Expand view for: ${slug}`)
}

async function loadData() {
  try {
    const house = await fetch('House.json').then(res => res.json())
    const governors = await fetch('Governors.json').then(res => res.json())
    const senate = await fetch('Senate.json').then(res => res.json())

    allOfficials = [...house, ...governors, ...senate]

    renderCards(house, 'house-cards')
    renderCards(governors, 'governor-cards')
    renderCards(senate, 'senate-cards')
  } catch (err) {
    console.error("Error loading data:", err)
  }
}

loadData()

document.getElementById('search').addEventListener('input', function (e) {
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
