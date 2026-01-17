async function loadStatus() {
  const tableContainer = document.getElementById('statusTable');
  const timestampEl = document.getElementById('timestamp');

  try {
    const response = await fetch('/environment_status.html', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar el reporte.');

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const generated = doc.querySelector('body > p:nth-child(2)')?.innerText || '';
    const rows = doc.querySelectorAll('table tr');
    let tableHTML = '<table><tr><th>Componente</th><th>Estado</th></tr>';

    rows.forEach((row, i) => {
      if (i === 0) return;
      const cols = row.querySelectorAll('td');
      if (cols.length === 2) {
        const name = cols[0].innerText.trim();
        const status = cols[1].innerText.trim();
        let cls = 'ok';
        if (status.includes('⚠')) cls = 'warn';
        if (status.includes('❌')) cls = 'error';
        tableHTML += `<tr><td>${name}</td><td class="${cls}">${status}</td></tr>`;
      }
    });
    tableHTML += '</table>';

    timestampEl.textContent = generated ? generated : 'Reporte cargado correctamente';
    tableContainer.innerHTML = tableHTML;
  } catch (err) {
    tableContainer.innerHTML = `<p style="color:red;">❌ Error: ${err.message}</p>`;
  }
}

loadStatus();
setInterval(loadStatus, 30000);
