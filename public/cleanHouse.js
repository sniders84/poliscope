fetch('House.json')
  .then(res => res.text())
  .then(text => {
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1)
    }

    // Replace smart quotes and invisible junk
    text = text
      .replace(/[\u201C\u201D]/g, '"') // smart double quotes
      .replace(/[\u2018\u2019]/g, "'") // smart single quotes
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, '') // invisible control chars

    // Try parsing
    try {
      const data = JSON.parse(text)
      console.log('✅ Cleaned and parsed:', data.length, 'entries')
      window.cleanedHouse = data // optional: store globally
    } catch (err) {
      console.error('❌ Still broken:', err)
    }
  })
  .catch(err => console.error('Fetch failed:', err))
