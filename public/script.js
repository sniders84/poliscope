async function loadData() {
  try {
    const house = await fetch('./data/House.json').then(res => res.json())
    const governors = await fetch('./data/Governors.json').then(res => res.json())
    const senate = await fetch('./data/Senate.json').then(res => res.json())
    console.log("House:", house)
    console.log("Governors:", governors)
    console.log("Senate:", senate)
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
