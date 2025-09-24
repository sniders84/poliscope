async function loadData() {
  const house = await fetch('data/house.json').then(res => res.json())

  const governors = await fetch('data/governors.json').then(res => res.json())

  const houseList = house.map(rep => `<li>${rep.name} (${rep.state})</li>`).join('')
  const govList = governors.map(gov => `<li>${gov.name} (${gov.state})</li>`).join('')

  document.getElementById('house').innerHTML = `<h2>House</h2><ul>${houseList}</ul>`
  document.getElementById('governors').innerHTML = `<h2>Governors</h2><ul>${govList}</ul>`
}

loadData()
