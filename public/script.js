        results.innerHTML = '';
        search.value = '';
      }
    });
  }

  // Calendar initial render & state sync (ensures calendar updates if state-select exists)
  const stateSelect = document.getElementById('state-select');
  if (stateSelect) {
    const defaultState = stateSelect.value || 'Alabama';
    renderCalendar(calendarEvents, defaultState);

    stateSelect.addEventListener('change', () => {
      renderCalendar(calendarEvents, stateSelect.value);
    });
  }

  // Modal overlay click to close
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  // Tab button wiring
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      window.showTab(tabId);
    });
  });

  // Ensure UI starts at a sensible tab
  if (!document.querySelector('.tab-button.active')) {
    const firstTab = document.querySelector('.tab-button');
    if (firstTab) {
      firstTab.classList.add('active');
      const tabId = firstTab.getAttribute('data-tab');
      window.showTab(tabId);
    }
  }
});
