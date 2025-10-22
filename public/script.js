function showCalendar() {
  officialsContainer.innerHTML = '<h2>State Calendar</h2>';
  console.log('Selected State:', selectedState);

  fetch('/state-calendars.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load calendar file');
      return res.json();
    })
    .then(data => {
      const availableStates = Object.keys(data);
      console.log('Available states in calendar:', availableStates);

      if (!data.hasOwnProperty(selectedState)) {
        officialsContainer.innerHTML += `<p>No calendar data found for <strong>${selectedState}</strong>.</p>`;
        console.warn(`State "${selectedState}" not found in calendar data.`);
        return;
      }

      const events = data[selectedState];
      console.log('Events for', selectedState, events);

      if (!Array.isArray(events) || events.length === 0) {
        officialsContainer.innerHTML += '<p>No events found for this state.</p>';
        return;
      }

      const list = document.createElement('ul');
      events.forEach(event => {
        const item = document.createElement('li');
        item.innerHTML = `
          <strong>${event.title}</strong><br>
          ${event.date} — ${event.location} (${event.type})
        `;
        list.appendChild(item);
      });
      officialsContainer.appendChild(list);
    })
    .catch(err => {
      officialsContainer.innerHTML += '<p>Error loading calendar.</p>';
      console.error('Calendar Load Error:', err);
    });
}
