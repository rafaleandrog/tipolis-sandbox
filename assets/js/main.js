document.querySelectorAll('details').forEach((d) => {
  d.addEventListener('toggle', () => {
    if (d.open) d.setAttribute('data-opened', 'true');
  });
});
