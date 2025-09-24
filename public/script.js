async function loadData() {
  try {
    const house = await fetch('House.json').then(res => res.json())
    const governors = await fetch('Governors.json').then(res => res.json())
    const senate = await fetch('Senate.json').then(res => res.json())

    const houseList = house.map(rep => `<li>${rep.name} (${rep.state})</li>`).join('')
    const govList = governors.map(gov => `<li>${gov.name} (${gov.state})</li>`).join('')
    const senateList = senate.map(sen => `<li>${sen.name} (${sen.state})</li>`).join('')

    document.getElementById('house').innerHTML = `<h2>House</h2><ul>${houseList}</ul>`
    document.getElementById('governors').innerHTML = `<h2>Governors</h2><ul>${govList}</ul>`
    document.getElementById('senate').innerHTML = `<h2>Senate</h2><ul>${senateList}</ul>`
  } catch (err) {
    console.error("Error loading data:", err)
  }
}

loadData()
let allOfficials = []

async function loadData() {
  try {
    const house = await fetch('House.json').then(res => res.json())
    const governors = await fetch('Governors.json').then(res => res.json())
    const senate = await fetch('Senate.json').then(res => res.json())

    allOfficials = [...house, ...governors, ...senate]

    // Existing rendering logic...
  } catch (err) {
    console.error("Error loading data:", err)
  }
}

document.getElementById('search').addEventListener('input', function (e) {
  const query = e.target.value.toLowerCase()
  const matches = allOfficials.filter(person =>
    person.name.toLowerCase().includes(query) ||
    person.state.toLowerCase().includes(query) ||
    (person.party && person.party.toLowerCase().includes(query))
  )

  const resultsHTML = matches.map(person =>
    `<li>${person.name} (${person.state}${person.party ? ', ' + person.party : ''})</li>`
  ).join('')

  document.getElementById('results').innerHTML = resultsHTML
})
