// cleanHouse.js — parses and sanitizes House.json, stores globally as window.cleanedHouse

fetch('House.json', { cache: 'no-store' })
  .then(res => res.text())
  .then(text => {
    text = text
      .replace(/[\u201C\u201D]/g, '"') // smart double quotes
      .replace(/[\u2018\u2019]/g, "'") // smart single quotes
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, ''); // invisible control chars

    try {
      const data = JSON.parse(text);
      console.log('✅ Cleaned and parsed:', data.length, 'entries');
      window.cleanedHouse = data;
    } catch (err) {
      console.error('❌ Still broken:', err);
    }
  }) // ← this closes the .then block
  .catch(err => console.error('Fetch failed:', err));
