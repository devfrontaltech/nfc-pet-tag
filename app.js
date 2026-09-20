const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Texto limpio: null/undefined/vacío/solo espacios → '' ; arrays → "a, b"
const txt = v => Array.isArray(v) ? v.map(txt).filter(Boolean).join(', ') : (v == null ? '' : String(v).trim());
const list = v => (Array.isArray(v) ? v.map(txt) : txt(v).split(/[,\n]/)).map(s => s.trim()).filter(Boolean);
const digits = s => txt(s).replace(/\D/g, '');
const show = (id, on = true) => { $(id).style.display = on ? '' : 'none'; };

const FOOD_ICONS = ['🥣','🥩','🥕','💧','🍗','🦴','🫐','🥚'];
const ALLERGY_ICONS = ['🌾','🐟','🧅','🥜','🍫','🥛','🍓','⚠️'];
const DEFAULT_PHOTO = 'default-dog.svg';

// Ficha por ID: /?id=abc123 → perros/abc123/data.json + perros/abc123/foto.jpg
const id = new URLSearchParams(location.search).get('id');

function showError() {
  document.body.innerHTML = '<p class="error">No hemos encontrado esta ficha.<br>Comprueba que el enlace es correcto.</p>';
}

if (!id || !/^[\w-]+$/.test(id)) {
  showError();
} else {
  fetch(`perros/${id}/data.json`, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(err => { console.error('Error cargando la ficha:', err); showError(); });
}

function render(raw) {
  const g = k => txt(raw[k]);
  const nombre = g('nombre') || 'Mi perro';
  document.title = nombre + ' 🐾';

  // FOTO: la del perro; si no existe, la de por defecto
  const img = $('hero-img');
  img.onerror = () => {
    img.onerror = null;
    img.src = DEFAULT_PHOTO;
  };
  img.src = `perros/${id}/foto.jpg`;
  img.alt = nombre;

  // HERO
  const microchip = g('microchip');
  show('hero-badge', !!microchip);
  $('hero-name').textContent = nombre;
  const sub = [g('raza'), g('genero')].filter(Boolean).join(' · ');
  $('hero-sub').textContent = sub;
  show('hero-sub', !!sub);

  const anosTxt = g('anos');
  const anos = anosTxt !== '' && !isNaN(Number(anosTxt)) ? Number(anosTxt) : null;
  const poblacion = g('poblacion');
  const estado = g('estadoSanitario');
  $('hero-chips').innerHTML = [
    anos !== null ? `🎂 ${esc(anos)} año${anos !== 1 ? 's' : ''}` : '',
    poblacion ? `📍 ${esc(poblacion)}` : '',
    estado ? `⚕️ ${esc(estado)}` : ''
  ].filter(Boolean).map(t => `<span class="chip">${t}</span>`).join('');

  // STATS (solo los que tienen dato)
  const genero = g('genero');
  const peso = g('peso');
  const stats = [];
  if (peso) stats.push([`${esc(peso)}<span style="font-size:14px">kg</span>`, 'Peso']);
  if (anos !== null) stats.push([esc(anos), 'Años']);
  if (genero) stats.push([genero.toLowerCase().startsWith('m') ? '♂' : '♀', esc(genero)]);
  const strip = $('stats-strip');
  if (stats.length) {
    strip.style.gridTemplateColumns = `repeat(${stats.length}, 1fr)`;
    strip.innerHTML = stats.map(([v, l]) => `
      <div class="stat-item"><div class="stat-val">${v}</div><div class="stat-label">${l}</div></div>`).join('');
  }
  show('stats-strip', stats.length > 0);

  // VETERINARIO + MICROCHIP
  const vet = g('veterinario');
  const vetTel = g('telefonoVeterinario');
  const hasVet = !!(vet || vetTel);
  const hasChip = !!microchip;
  if (hasVet) {
    $('vet-nombre').textContent = vet;
    show('vet-nombre', !!vet);
    $('vet-telefono').innerHTML = vetTel
      ? `<a href="tel:${esc(digits(vetTel))}">☎ ${esc(vetTel)}</a>` : '';
  }
  show('vet-card', hasVet);
  if (hasChip) $('chip-numero').textContent = microchip;
  show('chip-card', hasChip);
  show('info-row', hasVet || hasChip);
  $('info-row').classList.toggle('single-col', !(hasVet && hasChip));

  // COMIDA
  const comida = list(raw.alimentacion);
  if (comida.length) {
    $('food-grid').innerHTML = comida.map((f, i) => `
      <div class="food-item">
        <div class="food-item-icon">${FOOD_ICONS[i % FOOD_ICONS.length]}</div>
        <div class="food-item-name">${esc(f)}</div>
      </div>`).join('');
  }
  show('food-card', comida.length > 0);

  // ALERGIAS
  const alergias = list(raw.alergias);
  if (alergias.length) {
    $('allergy-list').innerHTML = alergias.map((a, i) => `
      <div class="allergy-item">
        <div class="allergy-icon">${ALLERGY_ICONS[i % ALLERGY_ICONS.length]}</div>
        <div class="allergy-text">${esc(a)}</div>
      </div>`).join('');
  }
  show('allergy-card', alergias.length > 0);

  // UBICACIÓN (mapa a partir de la población)
  if (poblacion) {
    $('loc-name').textContent = nombre;
    $('map-iframe').src = `https://www.google.com/maps?q=${encodeURIComponent(poblacion)}&output=embed`;
    $('loc-direccion').textContent = poblacion;
  }
  show('loc-card', !!poblacion);

  // NOTAS
  const notas = g('notas');
  if (notas) $('notas').textContent = notas;
  show('notas-card', !!notas);

  $('footer-nombre').textContent = nombre;

  // CONTACTO: WhatsApp (mensaje autogenerado) + llamada
  const tel = digits(raw.telefono);
  if (tel) {
    const dueno = g('dueno');
    const msg = `Hola${dueno ? ' ' + dueno : ''}! He encontrado a ${nombre} 🐾`;
    $('btn-whatsapp').href = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
    $('btn-call').href = `tel:+${tel}`;
  }
  show('contact-bar', !!tel);
}
