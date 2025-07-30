// Marker SVG para reclamos (VIP/CORPO) - profesional
export function getReclamoSvgIcon({ tipo = 'VIP', radius = 16 } = {}) {
  // Colores y estilos
  const color = tipo === 'VIP' ? '#007bff' : '#ff0000';
  const border = tipo === 'VIP' ? '#0056b3' : '#b30000';
  const shadow = tipo === 'VIP' ? '#cce0ff' : '#ffd6d6';
  // SVG marker estilizado
  return `
    <svg width="${radius * 2}" height="${radius * 2 + 10}" viewBox="0 0 ${radius * 2} ${radius * 2 + 10}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${shadow}" flood-opacity="0.7"/>
      </filter>
      <circle cx="${radius}" cy="${radius}" r="${radius - 2}" fill="${color}" stroke="${border}" stroke-width="3" filter="url(#shadow)"/>
      <circle cx="${radius}" cy="${radius}" r="${radius/2}" fill="#fff" fill-opacity="0.7"/>
      <text x="50%" y="${radius + 5}" text-anchor="middle" font-size="${radius/1.5}" font-family="Arial, sans-serif" fill="${border}" font-weight="bold" dy=".3em">
        ${tipo === 'VIP' ? '★' : 'C'}
      </text>
    </svg>
  `;
}
export default {}