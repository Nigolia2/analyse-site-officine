/*
 * map-common.js — bibliothèque de carte partagée, copiée depuis le site d'origine (2026-10-12).
 * L'outil n'utilise que addBasemap, makePin, attachDoubleTapDragZoom et attachGeolocation
 * (voir docs/architecture.md) ; le reste peut être ignoré ou supprimé.
 */

/* --- Fond de carte : LE seul endroit à modifier pour changer de fournisseur ---
 * Fond actuel : OpenStreetMap France (gratuit, sans clé). Autre choix possible : CARTO Voyager
 * (clé gratuite à demander) :
 *   url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=<CLÉ>',
 *   subdomains: ['a','b','c','d'], attribution: '© OpenStreetMap contributors © CARTO'
 * Contrainte : le fournisseur doit autoriser les requêtes d'autres sites (CORS « * »).
 */
const CMAP_BASEMAP = {
  url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  subdomains: ['a', 'b', 'c'],
  attribution: '© <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a> · fond OpenStreetMap France',
  maxZoom: 19,
};
function cmapTileUrl(z, x, y) {
  const s = CMAP_BASEMAP.subdomains;
  return CMAP_BASEMAP.url.replace('{s}', s[((x % s.length) + s.length) % s.length])
    .replace('{z}', z).replace('{x}', x).replace('{y}', y);
}
function addBasemap(map, extraAttribution) {
  return L.tileLayer(CMAP_BASEMAP.url, {
    subdomains: CMAP_BASEMAP.subdomains,
    maxZoom: CMAP_BASEMAP.maxZoom,
    attribution: CMAP_BASEMAP.attribution + (extraAttribution ? ' | ' + extraAttribution : ''),
  }).addTo(map);
}


/* --- Icônes Phosphor (MIT, inline, ajouté 2026-07-23) + fabrique de marqueur ---
 * PHOSPHOR : dictionnaire glyphe -> contenu <path> (viewBox 0 0 256 256, fill currentColor).
 * phosphorSvg() : un glyphe inline (boutons, légendes, popups).
 * makePin() : marqueur "pastille colorée + glyphe blanc centré" pour toutes les cartes.
 */
const PHOSPHOR = {
  'baby': `<path d="M92,140a12,12,0,1,1,12-12A12,12,0,0,1,92,140Zm72-24a12,12,0,1,0,12,12A12,12,0,0,0,164,116Zm-12.27,45.23a45,45,0,0,1-47.46,0,8,8,0,0,0-8.54,13.54,61,61,0,0,0,64.54,0,8,8,0,0,0-8.54-13.54ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88.11,88.11,0,0,0-84.09-87.91C120.32,56.38,120,71.88,120,72a8,8,0,0,0,16,0,8,8,0,0,1,16,0,24,24,0,0,1-48,0c0-.73.13-14.3,8.46-30.63A88,88,0,1,0,216,128Z"/>`,
  'brain': `<path d="M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Zm16-52a8,8,0,0,1-8,8h-4a36,36,0,0,1-36-36V80a8,8,0,0,1,16,0v4a20,20,0,0,0,20,20h4A8,8,0,0,1,208,112ZM60,120H56a8,8,0,0,1,0-16h4A20,20,0,0,0,80,84V80a8,8,0,0,1,16,0v4A36,36,0,0,1,60,120Z"/>`,
  'bus': `<path d="M184,32H72A32,32,0,0,0,40,64V208a16,16,0,0,0,16,16H80a16,16,0,0,0,16-16V192h64v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V64A32,32,0,0,0,184,32ZM56,176V120H200v56Zm0-96H200v24H56ZM72,48H184a16,16,0,0,1,16,16H56A16,16,0,0,1,72,48Zm8,160H56V192H80Zm96,0V192h24v16Zm-72-60a12,12,0,1,1-12-12A12,12,0,0,1,104,148Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,148Zm72-68v24a8,8,0,0,1-16,0V80a8,8,0,0,1,16,0ZM24,80v24a8,8,0,0,1-16,0V80a8,8,0,0,1,16,0Z"/>`,
  'crosshair': `<path d="M232,120h-8.34A96.14,96.14,0,0,0,136,32.34V24a8,8,0,0,0-16,0v8.34A96.14,96.14,0,0,0,32.34,120H24a8,8,0,0,0,0,16h8.34A96.14,96.14,0,0,0,120,223.66V232a8,8,0,0,0,16,0v-8.34A96.14,96.14,0,0,0,223.66,136H232a8,8,0,0,0,0-16Zm-96,87.6V200a8,8,0,0,0-16,0v7.6A80.15,80.15,0,0,1,48.4,136H56a8,8,0,0,0,0-16H48.4A80.15,80.15,0,0,1,120,48.4V56a8,8,0,0,0,16,0V48.4A80.15,80.15,0,0,1,207.6,120H200a8,8,0,0,0,0,16h7.6A80.15,80.15,0,0,1,136,207.6ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"/>`,
  'first-aid-kit': `<path d="M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,200H40V72H216V200Zm-56-64a8,8,0,0,1-8,8H136v16a8,8,0,0,1-16,0V144H104a8,8,0,0,1,0-16h16V112a8,8,0,0,1,16,0v16h16A8,8,0,0,1,160,136Z"/>`,
  'first-aid': `<path d="M216,88H168V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V88H40a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16H88v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V168h48a16,16,0,0,0,16-16V104A16,16,0,0,0,216,88Zm0,64H160a8,8,0,0,0-8,8v56H104V160a8,8,0,0,0-8-8H40V104H96a8,8,0,0,0,8-8V40h48V96a8,8,0,0,0,8,8h56Z"/>`,
  'flask': `<path d="M221.69,199.77,160,96.92V40h8a8,8,0,0,0,0-16H88a8,8,0,0,0,0,16h8V96.92L34.31,199.77A16,16,0,0,0,48,224H208a16,16,0,0,0,13.72-24.23ZM110.86,103.25A7.93,7.93,0,0,0,112,99.14V40h32V99.14a7.93,7.93,0,0,0,1.14,4.11L183.36,167c-12,2.37-29.07,1.37-51.75-10.11-15.91-8.05-31.05-12.32-45.22-12.81ZM48,208l28.54-47.58c14.25-1.74,30.31,1.85,47.82,10.72,19,9.61,35,12.88,48,12.88a69.89,69.89,0,0,0,19.55-2.7L208,208Z"/>`,
  'gas-pump': `<path d="M241,69.66,221.66,50.34a8,8,0,0,0-11.32,11.32L229.66,81A8,8,0,0,1,232,86.63V168a8,8,0,0,1-16,0V128a24,24,0,0,0-24-24H176V56a24,24,0,0,0-24-24H72A24,24,0,0,0,48,56V208H32a8,8,0,0,0,0,16H192a8,8,0,0,0,0-16H176V120h16a8,8,0,0,1,8,8v40a24,24,0,0,0,48,0V86.63A23.85,23.85,0,0,0,241,69.66ZM64,208V56a8,8,0,0,1,8-8h80a8,8,0,0,1,8,8V208Zm80-96a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h48A8,8,0,0,1,144,112Z"/>`,
  'heartbeat': `<path d="M72,144H32a8,8,0,0,1,0-16H67.72l13.62-20.44a8,8,0,0,1,13.32,0l25.34,38,9.34-14A8,8,0,0,1,136,128h24a8,8,0,0,1,0,16H140.28l-13.62,20.44a8,8,0,0,1-13.32,0L88,126.42l-9.34,14A8,8,0,0,1,72,144ZM178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,.75,0,1.5,0,2.25a8,8,0,1,0,16-.5c0-.58,0-1.17,0-1.75A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46c0,53.61-77.76,102.15-96,112.8-10.83-6.31-42.63-26-66.68-52.21a8,8,0,1,0-11.8,10.82c31.17,34,72.93,56.68,74.69,57.63a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z"/>`,
  'hospital': `<path d="M248,208h-8V128a16,16,0,0,0-16-16H168V48a16,16,0,0,0-16-16H56A16,16,0,0,0,40,48V208H32a8,8,0,0,0,0,16H248a8,8,0,0,0,0-16Zm-24-80v80H168V128ZM56,48h96V208H136V160a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8v48H56Zm64,160H88V168h32ZM72,96a8,8,0,0,1,8-8H96V72a8,8,0,0,1,16,0V88h16a8,8,0,0,1,0,16H112v16a8,8,0,0,1-16,0V104H80A8,8,0,0,1,72,96Z"/>`,
  'house': `<path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z"/>`,
  'map-pin': `<path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"/>`,
  'mountains': `<path d="M164,80a28,28,0,1,0-28-28A28,28,0,0,0,164,80Zm0-40a12,12,0,1,1-12,12A12,12,0,0,1,164,40Zm90.88,155.92-54.56-92.08A15.87,15.87,0,0,0,186.55,96h0a15.85,15.85,0,0,0-13.76,7.84L146.63,148l-44.84-76.1a16,16,0,0,0-27.58,0L1.11,195.94A8,8,0,0,0,8,208H248a8,8,0,0,0,6.88-12.08ZM88,80l23.57,40H64.43ZM22,192l33-56h66l18.74,31.8,0,0L154,192Zm150.57,0-16.66-28.28L186.55,112,234,192Z"/>`,
  'pill': `<path d="M216.42,39.6a53.26,53.26,0,0,0-75.32,0L39.6,141.09a53.26,53.26,0,0,0,75.32,75.31h0L216.43,114.91A53.31,53.31,0,0,0,216.42,39.6ZM103.61,205.09h0a37.26,37.26,0,0,1-52.7-52.69L96,107.31,148.7,160ZM205.11,103.6,160,148.69,107.32,96l45.1-45.09a37.26,37.26,0,0,1,52.69,52.69ZM189.68,82.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,1,1-11.31-11.32l24-24A8,8,0,0,1,189.68,82.34Z"/>`,
  'ruler': `<path d="M235.32,73.37,182.63,20.69a16,16,0,0,0-22.63,0L20.68,160a16,16,0,0,0,0,22.63l52.69,52.68a16,16,0,0,0,22.63,0L235.32,96A16,16,0,0,0,235.32,73.37ZM84.68,224,32,171.31l32-32,26.34,26.35a8,8,0,0,0,11.32-11.32L75.31,128,96,107.31l26.34,26.35a8,8,0,0,0,11.32-11.32L107.31,96,128,75.31l26.34,26.35a8,8,0,0,0,11.32-11.32L139.31,64l32-32L224,84.69Z"/>`,
  'star': `<path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z"/>`,
  'stethoscope': `<path d="M220,160a12,12,0,1,1-12-12A12,12,0,0,1,220,160Zm-4.55,39.29A48.08,48.08,0,0,1,168,240H144a48.05,48.05,0,0,1-48-48V151.49A64,64,0,0,1,40,88V40a8,8,0,0,1,8-8H72a8,8,0,0,1,0,16H56V88a48,48,0,0,0,48.64,48c26.11-.34,47.36-22.25,47.36-48.83V48H136a8,8,0,0,1,0-16h24a8,8,0,0,1,8,8V87.17c0,32.84-24.53,60.29-56,64.31V192a32,32,0,0,0,32,32h24a32.06,32.06,0,0,0,31.22-25,40,40,0,1,1,16.23.27ZM232,160a24,24,0,1,0-24,24A24,24,0,0,0,232,160Z"/>`,
  'subway': `<path d="M224,96V208a8,8,0,0,1-16,0V96a56.06,56.06,0,0,0-56-56H104A56.06,56.06,0,0,0,48,96V208a8,8,0,0,1-16,0V96a72.08,72.08,0,0,1,72-72h48A72.08,72.08,0,0,1,224,96Zm-40,0v72a24,24,0,0,1-19.29,23.53l2.45,4.89a8,8,0,0,1-14.32,7.16L147.06,192H108.94l-5.78,11.58a8,8,0,0,1-14.32-7.16l2.45-4.89A24,24,0,0,1,72,168V96A24,24,0,0,1,96,72h64A24,24,0,0,1,184,96ZM88,96v48h80V96a8,8,0,0,0-8-8H96A8,8,0,0,0,88,96Zm32,64v16h16V160ZM96,176h8V160H88v8A8,8,0,0,0,96,176Zm72-8v-8H152v16h8A8,8,0,0,0,168,168Z"/>`,
  'syringe': `<path d="M237.66,66.34l-48-48a8,8,0,0,0-11.32,11.32L196.69,48,168,76.69,133.66,42.34a8,8,0,0,0-11.32,11.32L128.69,60l-84,84A15.86,15.86,0,0,0,40,155.31v49.38L18.34,226.34a8,8,0,0,0,11.32,11.32L51.31,216h49.38A15.86,15.86,0,0,0,112,211.31l84-84,6.34,6.35a8,8,0,0,0,11.32-11.32L179.31,88,208,59.31l18.34,18.35a8,8,0,0,0,11.32-11.32ZM100.69,200H56V155.31l18-18,20.34,20.35a8,8,0,0,0,11.32-11.32L85.31,126,98,113.31l20.34,20.35a8,8,0,0,0,11.32-11.32L109.31,102,140,71.31,184.69,116Z"/>`,
  'train-simple': `<path d="M184,24H72A32,32,0,0,0,40,56V184a32,32,0,0,0,32,32h8L65.6,235.2a8,8,0,1,0,12.8,9.6L100,216h56l21.6,28.8a8,8,0,1,0,12.8-9.6L176,216h8a32,32,0,0,0,32-32V56A32,32,0,0,0,184,24ZM72,40H184a16,16,0,0,1,16,16v64H56V56A16,16,0,0,1,72,40ZM184,200H72a16,16,0,0,1-16-16V136H200v48A16,16,0,0,1,184,200ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z"/>`,
  'train': `<path d="M184,24H72A32,32,0,0,0,40,56V184a32,32,0,0,0,32,32h8L65.6,235.2a8,8,0,1,0,12.8,9.6L100,216h56l21.6,28.8a8,8,0,1,0,12.8-9.6L176,216h8a32,32,0,0,0,32-32V56A32,32,0,0,0,184,24ZM56,120V80h64v40Zm80-40h64v40H136ZM72,40H184a16,16,0,0,1,16,16v8H56V56A16,16,0,0,1,72,40ZM184,200H72a16,16,0,0,1-16-16V136H200v48A16,16,0,0,1,184,200ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z"/>`,
  'target': `<path d="M221.87,83.16A104.1,104.1,0,1,1,195.67,49l22.67-22.68a8,8,0,0,1,11.32,11.32l-96,96a8,8,0,0,1-11.32-11.32l27.72-27.72a40,40,0,1,0,17.87,31.09,8,8,0,1,1,16-.9,56,56,0,1,1-22.38-41.65L184.3,60.39a87.88,87.88,0,1,0,23.13,29.67,8,8,0,0,1,14.44-6.9Z"/>`,
  'person-simple-ski': `<path d="M172,88a28,28,0,1,0-28-28A28,28,0,0,0,172,88Zm0-40a12,12,0,1,1-12,12A12,12,0,0,1,172,48ZM32.32,77.76a8,8,0,0,1,9.92-5.44L112,92.67l10.32-10.33a8,8,0,0,1,11.32,0L163.31,112H200a8,8,0,0,1,0,16H160a8,8,0,0,1-5.66-2.34L148.73,120l-111-32.36A8,8,0,0,1,32.32,77.76ZM236.44,204.24a69.78,69.78,0,0,1-58.37,8.95L21.77,167.67a8,8,0,1,1,4.47-15.36l76,22.13L128.73,148,85.8,135.69a8,8,0,0,1,4.4-15.39l56,16a8,8,0,0,1,3.46,13.35l-29.9,29.9,62.79,18.28a53.78,53.78,0,0,0,45-6.9,8,8,0,1,1,8.88,13.31Z"/>`,
  'car': `<path d="M240,104H229.2L201.42,41.5A16,16,0,0,0,186.8,32H69.2a16,16,0,0,0-14.62,9.5L26.8,104H16a8,8,0,0,0,0,16h8v80a16,16,0,0,0,16,16H64a16,16,0,0,0,16-16V184h96v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V120h8a8,8,0,0,0,0-16ZM69.2,48H186.8l24.89,56H44.31ZM64,200H40V184H64Zm128,0V184h24v16Zm24-32H40V120H216ZM56,144a8,8,0,0,1,8-8H80a8,8,0,0,1,0,16H64A8,8,0,0,1,56,144Zm112,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H176A8,8,0,0,1,168,144Z"/>`,
  'person-simple-walk': `<path d="M152,80a32,32,0,1,0-32-32A32,32,0,0,0,152,80Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,32Zm64,112a8,8,0,0,1-8,8c-35.31,0-52.95-17.81-67.12-32.12-2.74-2.77-5.36-5.4-8-7.84l-13.43,30.88,37.2,26.57A8,8,0,0,1,160,176v56a8,8,0,0,1-16,0V180.12l-31.07-22.2L79.34,235.19A8,8,0,0,1,72,240a7.84,7.84,0,0,1-3.19-.67,8,8,0,0,1-4.15-10.52l54.08-124.37c-9.31-1.65-20.92,1.2-34.7,8.58a163.88,163.88,0,0,0-30.57,21.77,8,8,0,0,1-10.95-11.66c2.5-2.35,61.69-57.23,98.72-25.08,3.83,3.32,7.48,7,11,10.57C166.19,122.7,179.36,136,208,136A8,8,0,0,1,216,144Z"/>`,
  'bicycle': `<path d="M208,112a47.81,47.81,0,0,0-16.93,3.09L165.93,72H192a8,8,0,0,1,8,8,8,8,0,0,0,16,0,24,24,0,0,0-24-24H152a8,8,0,0,0-6.91,12l11.65,20H99.26L82.91,60A8,8,0,0,0,76,56H48a8,8,0,0,0,0,16H71.41L85.12,95.51,69.41,117.06a48.13,48.13,0,1,0,12.92,9.44l11.59-15.9L125.09,164A8,8,0,1,0,138.91,156l-30.32-52h57.48l11.19,19.17A48,48,0,1,0,208,112ZM80,160a32,32,0,1,1-20.21-29.74l-18.25,25a8,8,0,1,0,12.92,9.42l18.25-25A31.88,31.88,0,0,1,80,160Zm128,32a32,32,0,0,1-22.51-54.72L201.09,164A8,8,0,1,0,214.91,156L199.3,129.21A32,32,0,1,1,208,192Z"/>`,
  'person-simple-hike': `<path d="M152,80a32,32,0,1,0-32-32A32,32,0,0,0,152,80Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,32Zm48,112v88a8,8,0,0,1-16,0V151.66c-25.75-2.25-34.35-15.52-42-27.36-2.85-4.39-5.56-8.57-9.13-12.19l-13.4,30.81,37.2,26.57A8,8,0,0,1,160,176v56a8,8,0,0,1-16,0V180.12l-31.07-22.2L79.34,235.19A8,8,0,0,1,72,240a7.84,7.84,0,0,1-3.19-.67,8,8,0,0,1-4.14-10.52L122.19,96.5a8,8,0,0,1,11-3.92,40.92,40.92,0,0,1,8,5.47c6.37,5.52,10.51,11.91,14.16,17.55,7.68,11.84,13.22,20.4,36.6,20.4A8,8,0,0,1,200,144ZM72,152a8,8,0,0,0,7.35-4.85l24-56a8,8,0,0,0-4.2-10.5l-28-12a8,8,0,0,0-10.5,4.2l-24,56a8,8,0,0,0,4.2,10.5l28,12A8,8,0,0,0,72,152ZM54.51,127.8,72.2,86.5l13.3,5.7L67.8,133.49Z"/>`,
  'warning': `<path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/>`,
  'warning-circle': `<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/>`,
  'printer': `<path d="M214.67,72H200V40a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V72H41.33C27.36,72,16,82.77,16,96v80a8,8,0,0,0,8,8H56v32a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8V184h32a8,8,0,0,0,8-8V96C240,82.77,228.64,72,214.67,72ZM72,48H184V72H72ZM184,208H72V160H184Zm40-40H200V152a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8v16H32V96c0-4.41,4.19-8,9.33-8H214.67c5.14,0,9.33,3.59,9.33,8Zm-24-52a12,12,0,1,1-12-12A12,12,0,0,1,200,116Z"/>`,
  'check-circle': `<path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/>`,
  'check': `<path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/>`,
  'pencil-simple': `<path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/>`,
  'magnifying-glass': `<path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>`,
  'phone': `<path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"/>`,
  'sun': `<path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/>`,
  'stack': `<path d="M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z"/>`,
  'wrench': `<path d="M226.76,69a8,8,0,0,0-12.84-2.88l-40.3,37.19-17.23-3.7-3.7-17.23,37.19-40.3A8,8,0,0,0,187,29.24,72,72,0,0,0,88,96,72.34,72.34,0,0,0,94,124.94L33.79,177c-.15.12-.29.26-.43.39a32,32,0,0,0,45.26,45.26c.13-.13.27-.28.39-.42L131.06,162A72,72,0,0,0,232,96,71.56,71.56,0,0,0,226.76,69ZM160,152a56.14,56.14,0,0,1-27.07-7,8,8,0,0,0-9.92,1.77L67.11,211.51a16,16,0,0,1-22.62-22.62L109.18,133a8,8,0,0,0,1.77-9.93,56,56,0,0,1,58.36-82.31l-31.2,33.81a8,8,0,0,0-1.94,7.1L141.83,108a8,8,0,0,0,6.14,6.14l26.35,5.66a8,8,0,0,0,7.1-1.94l33.81-31.2A56.06,56.06,0,0,1,160,152Z"/>`,
  'calendar-blank': `<path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z"/>`,
  'clock': `<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"/>`,
  'users': `<path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z"/>`,
  'door': `<path d="M232,216H208V40a16,16,0,0,0-16-16H64A16,16,0,0,0,48,40V216H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM64,40H192V216H64Zm104,92a12,12,0,1,1-12-12A12,12,0,0,1,168,132Z"/>`,
  'bed': `<path d="M216,72H32V48a8,8,0,0,0-16,0V208a8,8,0,0,0,16,0V176H240v32a8,8,0,0,0,16,0V112A40,40,0,0,0,216,72ZM32,88h72v72H32Zm88,72V88h96a24,24,0,0,1,24,24v48Z"/>`,
  'shower': `<path d="M64,236a12,12,0,1,1-12-12A12,12,0,0,1,64,236Zm20-44a12,12,0,1,0,12,12A12,12,0,0,0,84,192Zm-64,0a12,12,0,1,0,12,12A12,12,0,0,0,20,192Zm32-32a12,12,0,1,0,12,12A12,12,0,0,0,52,160ZM256,40a8,8,0,0,1-8,8H219.31L191.46,75.86,169.8,202.65a16,16,0,0,1-27.09,8.66l-98-98a16,16,0,0,1,8.69-27.1L180.14,64.54l30.2-30.2A8,8,0,0,1,216,32h32A8,8,0,0,1,256,40ZM174.21,81.79,56,102l98,98Z"/>`,
  'cable-car': `<path d="M247.87,30.59a8,8,0,0,0-9.28-6.46l-224,40A8,8,0,0,0,16,80a8.6,8.6,0,0,0,1.42-.12L120,61.55V96H64a32,32,0,0,0-32,32v64a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V128a32,32,0,0,0-32-32H136V58.7L241.4,39.88A8,8,0,0,0,247.87,30.59ZM104,160V112h48v48ZM64,112H88v48H48V128A16,16,0,0,1,64,112Zm128,96H64a16,16,0,0,1-16-16V176H208v16A16,16,0,0,1,192,208Zm16-80v32H168V112h24A16,16,0,0,1,208,128Z"/>`,
  'x': `<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>`,
  'map-trifold': `<path d="M228.92,49.69a8,8,0,0,0-6.86-1.45L160.93,63.52,99.58,32.84a8,8,0,0,0-5.52-.6l-64,16A8,8,0,0,0,24,56V200a8,8,0,0,0,9.94,7.76l61.13-15.28,61.35,30.68A8.15,8.15,0,0,0,160,224a8,8,0,0,0,1.94-.24l64-16A8,8,0,0,0,232,200V56A8,8,0,0,0,228.92,49.69ZM104,52.94l48,24V203.06l-48-24ZM40,62.25l48-12v127.5l-48,12Zm176,131.5-48,12V78.25l48-12Z"/>`,
  'star-fill': `<path d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"/>`,
};
function phosphorSvg(glyph, size, color) {
  return '<svg width="'+(size||16)+'" height="'+(size||16)+'" viewBox="0 0 256 256" style="fill:currentColor;color:'+(color||'currentColor')+';vertical-align:middle;display:inline-block;flex:none;">'+(PHOSPHOR[glyph]||'')+'</svg>';
}
// Remplace tout élément portant data-ph="glyphe" (+ data-size/data-color optionnels) par le
// SVG Phosphor inline. Sert aux emojis des EN-TÊTES/HTML statiques ; le JS, lui, appelle
// phosphorSvg() directement. Uniformisation des icônes (2026-07-27).
function hydratePhosphor(root) {
  (root || document).querySelectorAll('[data-ph]').forEach(function (el) {
    el.innerHTML = phosphorSvg(el.getAttribute('data-ph'),
      parseInt(el.getAttribute('data-size'), 10) || 16, el.getAttribute('data-color') || 'currentColor');
    el.removeAttribute('data-ph');
  });
}
if (document.readyState !== 'loading') hydratePhosphor();
else document.addEventListener('DOMContentLoaded', function () { hydratePhosphor(); });
function makePin(color, glyph, size, glyphColor) {
  size = size || 22;
  var gs = Math.round(size * 0.58);
  return L.divIcon({
    className: '',
    html: '<div style="width:'+size+'px;height:'+size+'px;background:'+color+';border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;">'
        + phosphorSvg(glyph, gs, glyphColor || '#fff')
        + '</div>',
    iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -(size/2) - 1]
  });
}

const LOCATE_ICON_DEFAULT = phosphorSvg('crosshair', 17) + '<span class="lbl"> Ma position</span>';
const MEASURE_ICON_DEFAULT = phosphorSvg('ruler', 16) + '<span class="lbl"> Mesurer</span>';

/**
 * Geste "double-tap puis glisser" (façon Apple/Google Maps) pour zoomer à une main.
 * Double-tap sans relâcher, puis glisser vers le haut (zoom avant) ou le bas
 * (zoom arrière). Un double-tap simple sans glissement zoome +1 niveau (comportement
 * classique). Implémenté en JS natif, sans dépendance externe.
 */
function attachDoubleTapDragZoom(map) {
  const container = map.getContainer();
  const TAP_MAX_DELAY = 300;      // ms max entre les deux taps
  const TAP_MAX_DISTANCE = 30;    // px max entre les deux taps
  const MOVE_THRESHOLD = 10;      // px de glissement avant de considérer que c'est un drag
  const PX_PER_ZOOM_LEVEL = 60;   // px de glissement vertical pour 1 niveau de zoom

  let lastTapTime = 0;
  let lastTapPos = null;
  let gesture = null; // { startClientY, startZoom, anchorLatLng, moved }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function toLatLng(touch) {
    const rect = container.getBoundingClientRect();
    return map.containerPointToLatLng(L.point(touch.clientX - rect.left, touch.clientY - rect.top));
  }

  container.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { gesture = null; return; }
    const t = e.touches[0];
    const pos = { x: t.clientX, y: t.clientY };
    const now = Date.now();

    if (lastTapPos && (now - lastTapTime) < TAP_MAX_DELAY && dist(pos, lastTapPos) < TAP_MAX_DISTANCE) {
      gesture = { startClientY: t.clientY, startZoom: map.getZoom(), anchorLatLng: toLatLng(t), moved: false };
      map.dragging.disable();
      lastTapTime = 0;
      lastTapPos = null;
    } else {
      lastTapTime = now;
      lastTapPos = pos;
    }
  }, { passive: true });

  container.addEventListener('touchmove', e => {
    if (!gesture || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaY = gesture.startClientY - e.touches[0].clientY;
    if (!gesture.moved && Math.abs(deltaY) > MOVE_THRESHOLD) gesture.moved = true;
    if (!gesture.moved) return;

    const target = Math.round(gesture.startZoom + deltaY / PX_PER_ZOOM_LEVEL);
    const clamped = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), target));
    if (clamped !== map.getZoom()) {
      map.setZoomAround(gesture.anchorLatLng, clamped, { animate: false });
    }
  }, { passive: false });

  function endGesture() {
    if (!gesture) return;
    if (!gesture.moved) {
      map.setZoomAround(gesture.anchorLatLng, Math.min(map.getMaxZoom(), gesture.startZoom + 1));
    }
    map.dragging.enable();
    gesture = null;
  }

  container.addEventListener('touchend', endGesture);
  container.addEventListener('touchcancel', endGesture);
}

/**
 * Outil de mesure de distance/temps de trajet, multi-parcours. Bouton qui bascule un
 * "mode mesure" avec un panneau flottant. Jusqu'à 10 parcours simultanés, chacun avec
 * sa propre couleur, son propre mode (🚗 voiture / 🚶 à pied / 🚴 vélo) et sa propre liste
 * de points cliqués sur la carte. Pour chaque parcours : ligne pointillée = distance à
 * vol d'oiseau (calcul haversine local, aucune dépendance) ; ligne pleine = tracé réel +
 * durée + dénivelé, via **Geoapify** pour les 3 modes (proxy Caddy /geoapify/, clé
 * côté serveur) — un seul moteur pour des trajets cohérents entre modes. Repli vol
 * d'oiseau à vitesse fixe si le service échoue. Quota 3000/j : usage occasionnel.
 * `buttonId` doit pointer vers un <button> existant dans le DOM de la page.
 * Nécessite un conteneur `#map` positionné en `relative` ou `absolute` pour que le
 * panneau s'affiche par-dessus la carte.
 */
/* --- Panneaux d'outils flottants : habillage commun + déplaçables (ajouté 2026-07-27) ---
 * ensureCommonStyle() : injecte une seule fois un petit "design system" partagé par le
 *   panneau de mesure et le panneau « zone atteignable » — en-tête (poignée + titre),
 *   sous-titre, texte d'info — pour un rendu identique sur toutes les cartes.
 * cmapHeader(titre, actionsHtml) : construit l'en-tête standard (poignée ⠿ + titre + zone
 *   d'actions à droite). C'est aussi la zone par laquelle on déplace le panneau.
 * makeDraggablePanel(map, panel, handle) : rend `panel` déplaçable en glissant `handle`
 *   (souris + tactile), en le gardant dans les limites de la carte. Les panneaux ont déjà
 *   L.DomEvent.disableClickPropagation → le glissement ne déplace pas la carte dessous.
 */
function ensureCommonStyle() {
  if (document.getElementById('cmap-panel-style')) return;
  const st = document.createElement('style');
  st.id = 'cmap-panel-style';
  st.textContent =
      '.cmap-hd{display:flex;align-items:center;gap:7px;margin-bottom:8px;cursor:grab;user-select:none;touch-action:none}'
    + '.cmap-hd:active{cursor:grabbing}'
    + '.cmap-grip{color:#b0b7c0;font-size:13px;line-height:1;flex:none;letter-spacing:-1px}'
    + '.cmap-ttl{font-weight:600;font-size:13px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1c222b}'
    + '.cmap-acts{display:flex;gap:4px;flex:none}'
    + '.cmap-xbtn{border:1px solid #d0d0d0;background:#fff;border-radius:5px;min-width:22px;height:22px;cursor:pointer;font-size:12px;line-height:1;padding:0 5px;color:#333}'
    + '.cmap-sub{font-size:11px;color:#667085;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.cmap-hint{font-size:12px;color:#555;line-height:1.5}'
    // Boutons partagés (panneaux mesure + zone atteignable) : gabarit unique.
    + '.cmap-btn{padding:6px 8px;border:1px solid #d0d0d0;border-radius:6px;background:#fff;color:#333;cursor:pointer;font-size:12px;line-height:1.2}'
    + '.cmap-btn:hover{background:#f4f6f8}'
    + '.cmap-btn.sel{background:#1976d2;border-color:#1976d2;color:#fff}'
    // Normalisation des boutons/textes du panneau de mesure (CSS de page hétérogène en 11px).
    // Injecté après le CSS de page → prime, sur les 4 cartes, sans les éditer une par une.
    + '.measure-mode-btn,.measure-add,.measure-clear{font-size:12px;padding:6px 8px;border-radius:6px}'
    + '.measure-hint{font-size:12px}'
    + '.measure-route-label{font-size:11.5px}';
  document.head.appendChild(st);
}

function cmapHeader(title, actionsHtml) {
  return '<div class="cmap-hd"><span class="cmap-grip" title="Glisser pour déplacer">⠿</span>'
    + '<span class="cmap-ttl">' + title + '</span>'
    + '<span class="cmap-acts">' + (actionsHtml || '') + '</span></div>';
}

function makeDraggablePanel(map, panel, handle) {
  if (!handle) return;
  const container = map.getContainer();
  let sx, sy, sl, st, dragging = false;
  const pt = e => (e.touches && e.touches[0]) ? e.touches[0] : e;
  function down(e) {
    // Ne PAS démarrer un glissement (ni preventDefault) si on appuie sur un bouton de
    // l'en-tête : sur tactile, preventDefault sur touchstart annule le clic → les boutons
    // ✕ / A− / A+ devenaient inopérants sur iPhone.
    if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea, label')) return;
    const p = pt(e);
    const r = panel.getBoundingClientRect(), pr = container.getBoundingClientRect();
    sl = r.left - pr.left; st = r.top - pr.top; sx = p.clientX; sy = p.clientY;
    panel.style.left = sl + 'px'; panel.style.top = st + 'px';
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
    dragging = true;
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', up);
    if (e.cancelable) e.preventDefault();
  }
  function move(e) {
    if (!dragging) return;
    const p = pt(e), pr = container.getBoundingClientRect();
    let nl = sl + (p.clientX - sx), nt = st + (p.clientY - sy);
    nl = Math.max(0, Math.min(pr.width - panel.offsetWidth, nl));
    nt = Math.max(0, Math.min(pr.height - panel.offsetHeight, nt));
    panel.style.left = nl + 'px'; panel.style.top = nt + 'px';
    if (e.cancelable) e.preventDefault();
  }
  function up() {
    dragging = false;
    document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
    document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up);
  }
  L.DomEvent.on(handle, 'mousedown', down);
  L.DomEvent.on(handle, 'touchstart', down);
}

function attachDistanceMeasure(map, buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  ensureCommonStyle();
  btn.innerHTML = MEASURE_ICON_DEFAULT;

  const MAX_ROUTES = 10;
  const ROUTE_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
  const MODE_LABEL = { driving: phosphorSvg('car', 13), foot: phosphorSvg('person-simple-walk', 13), bicycle: phosphorSvg('bicycle', 13) };
  // Vitesses fixes utilisées UNIQUEMENT pour le repli « vol d'oiseau » quand Geoapify
  // échoue (le vrai calcul routé donne la durée exacte, voir fetchRoute).
  const WALK_SPEED_KMH = 4.5;
  const BIKE_SPEED_KMH = 15;

  let active = false;
  // `paused` : l'outil reste actif (panneau visible, parcours conservés) mais les clics
  // n'ajoutent plus de point — ils rouvrent les popups normalement. Permet de « terminer »
  // un trajet sans quitter l'outil. Repris via le bouton Reprendre ou « + Nouveau parcours ».
  let paused = false;
  function applyMeasureCursor() { map.getContainer().style.cursor = (active && !paused) ? 'crosshair' : ''; }
  // Zoom du panneau de mesure (lisibilité) : agrandissable via A−/A+, mémorisé.
  let panelZoom = parseFloat(localStorage.getItem('measurePanelZoom')) || 1;
  function applyPanelZoom() { if (panel) panel.style.zoom = panelZoom; }
  let panel = null;
  let routes = [];      // { id, mode, points, markers, dashLine, routeLine, km, drive, fetchToken }
  let activeRouteId = null;
  let nextId = 1;

  function haversineKm(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function totalKmVolOiseau(points) {
    let d = 0;
    for (let i = 1; i < points.length; i++) d += haversineKm(points[i - 1], points[i]);
    return d;
  }

  function fmtDuree(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
  }

  function activeRoute() {
    return routes.find(r => r.id === activeRouteId) || null;
  }

  function newRoute() {
    if (routes.length >= MAX_ROUTES) return;
    const route = {
      id: nextId++,
      mode: 'driving',
      points: [],
      markers: [],
      dashLine: null,
      routeLine: null,
      km: null,
      drive: null,
      fetchToken: 0,
    };
    routes.push(route);
    activeRouteId = route.id;
    render();
  }

  function deleteRoute(id) {
    const route = routes.find(r => r.id === id);
    if (!route) return;
    route.markers.forEach(m => map.removeLayer(m));
    if (route.dashLine) map.removeLayer(route.dashLine);
    if (route.routeLine) map.removeLayer(route.routeLine);
    routes = routes.filter(r => r.id !== id);
    if (activeRouteId === id) activeRouteId = routes.length ? routes[routes.length - 1].id : null;
    render();
  }

  function clearAll() {
    routes.forEach(r => {
      r.markers.forEach(m => map.removeLayer(m));
      if (r.dashLine) map.removeLayer(r.dashLine);
      if (r.routeLine) map.removeLayer(r.routeLine);
    });
    routes = [];
    activeRouteId = null;
    nextId = 1;
    newRoute();
  }

  // Dénivelé positif/négatif (D+/D-) à partir des altitudes renvoyées par Geoapify
  // (legs[].elevation, présent quand on demande &details=elevation). null si absent.
  function elevGain(legs) {
    let up = 0, down = 0, has = false;
    (legs || []).forEach(leg => {
      const e = leg && leg.elevation;
      if (Array.isArray(e) && e.length > 1) {
        has = true;
        for (let i = 1; i < e.length; i++) {
          const d = e[i] - e[i - 1];
          if (d > 0) up += d; else down -= d;
        }
      }
    });
    return has ? { up: Math.round(up), down: Math.round(down) } : null;
  }

  // Les 3 modes passent par le MÊME moteur Geoapify (proxy Caddy /geoapify/ qui injecte la
  // clé côté serveur — voir Caddyfile / PROGRAMMES.md §4) : voiture=`drive`, à pied=`walk`,
  // vélo=`bicycle`. Choix utilisateur (2026-07-27) pour des trajets COHÉRENTS et comparables
  // entre modes (avant, la voiture passait par OSRM public, un autre moteur → tracés/durées
  // incohérents avec pied/vélo). Vrai calcul par mode + dénivelé D+/D-. Repli vol d'oiseau à
  // vitesse fixe du mode si le service échoue (quota 3000/j dépassé, service down…).
  const GEO_MODE = { driving: 'drive', foot: 'walk', bicycle: 'bicycle' };
  const FB_SPEED = { driving: 50, foot: WALK_SPEED_KMH, bicycle: BIKE_SPEED_KMH };

  function fetchRoute(route) {
    if (route.points.length < 2) return;
    const token = ++route.fetchToken;
    if (route.routeLine) { map.removeLayer(route.routeLine); route.routeLine = null; }

    route.drive = 'loading';
    render();

    const gMode = GEO_MODE[route.mode] || 'drive';
    const fbSpeed = FB_SPEED[route.mode] || 50;
    const fallback = () => {
      const km = totalKmVolOiseau(route.points);
      route.drive = { km: km.toFixed(1), min: Math.round((km / fbSpeed) * 60), approx: true };
    };
    const wp = route.points.map(p => `${p.lat},${p.lng}`).join('|');
    fetch(`/geoapify/routing?waypoints=${encodeURIComponent(wp)}&mode=${gMode}&details=elevation`)
      .then(r => r.json())
      .then(data => {
        if (token !== route.fetchToken) return;   // réponse périmée (mode/points changés depuis)
        const f = data.features && data.features[0];
        if (f && f.properties) {
          route.drive = { km: (f.properties.distance / 1000).toFixed(1), min: Math.round(f.properties.time / 60) };
          const elev = elevGain(f.properties.legs);   // dénivelé réel D+/D- (Geoapify)
          if (elev) { route.drive.dplus = elev.up; route.drive.dminus = elev.down; }
          route.routeLine = L.geoJSON(f, { style: { color: route.color, weight: 4, opacity: 0.85 } }).addTo(map);
          route.routeLine.bringToFront();
        } else {
          fallback();   // réponse inattendue (quota dépassé, service down…)
        }
        render();
      })
      .catch(() => {
        if (token !== route.fetchToken) return;
        fallback();
        render();
      });
  }

  function redrawRoute(route) {
    const idx = routes.indexOf(route);
    route.color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
    if (route.dashLine) { map.removeLayer(route.dashLine); route.dashLine = null; }
    route.markers.forEach((m, i) => m.setStyle({ fillColor: route.color }));
    if (route.points.length > 1) {
      route.dashLine = L.polyline(route.points, { color: route.color, weight: 2.5, dashArray: '6,6', opacity: 0.7 }).addTo(map);
    }
    route.km = route.points.length > 1 ? totalKmVolOiseau(route.points).toFixed(1) : null;
  }

  function addPoint(latlng) {
    let route = activeRoute();
    if (!route) { newRoute(); route = activeRoute(); }
    route.points.push(latlng);
    const marker = L.circleMarker(latlng, {
      radius: 5, color: '#fff', weight: 2, fillColor: '#888', fillOpacity: 1,
    }).addTo(map);
    route.markers.push(marker);
    redrawRoute(route);
    render();
    if (route.points.length >= 2) fetchRoute(route);
  }

  // Clic en mesure : on écoute sur le conteneur en phase de CAPTURE (avant Leaflet), pour
  // qu'un clic sur un MARQUEUR (pharmacie, station…) ajoute aussi un point au lieu d'ouvrir
  // son popup. On convertit la position du clic en latlng et on stoppe l'événement pour que
  // Leaflet n'ouvre pas le popup / ne déclenche pas son propre clic. On ignore les clics sur
  // le panneau de mesure, les contrôles (zoom/attribution) et un popup déjà ouvert.
  function onMeasureClickCapture(ev) {
    if (ev.button && ev.button !== 0) return;               // clic gauche / tap uniquement
    if (paused) return;                                     // ajout en pause : laisser passer (popups OK)
    const t = ev.target;
    if (t && t.closest && t.closest('.measure-result, .leaflet-control, .leaflet-popup')) return;
    addPoint(map.mouseEventToLatLng(ev));
    ev.stopPropagation();
    ev.preventDefault();
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'measure-result cmap-glass';   // cmap-glass = prise pour thèmes (iOS)
    map.getContainer().appendChild(panel);
    // Le panneau est un enfant du conteneur de la carte : sans protection, les clics dessus
    // (boutons, liste de parcours) seraient traités comme des clics-carte. Le clic de mesure
    // est désormais capté sur le conteneur en phase de capture (onMeasureClickCapture), qui
    // ignore déjà `.measure-result` ; on garde néanmoins ces protections (ceinture+bretelles,
    // et pour d'éventuels autres handlers Leaflet). Note : disableClickPropagation() seul ne
    // stoppe pas l'événement 'click' lui-même (événement DOM indépendant de mousedown), d'où
    // le stopPropagation explicite sur 'click' ajouté ensuite.
    L.DomEvent.disableClickPropagation(panel);
    L.DomEvent.disableScrollPropagation(panel);
    L.DomEvent.on(panel, 'click', L.DomEvent.stopPropagation);
    return panel;
  }

  function driveText(route) {
    if (route.points.length < 2) return '';
    if (route.drive === 'loading') return `${MODE_LABEL[route.mode]} calcul en cours…`;
    if (route.drive === 'error' || !route.drive) return `${MODE_LABEL[route.mode]} estimation indisponible`;
    let suffix = route.drive.approx ? ' <span style="color:#b45309">(vol d\'oiseau, service indispo)</span>' : '';
    if (route.drive.dplus != null) suffix += ` <span style="color:#555">· ↗ ${route.drive.dplus} m ↘ ${route.drive.dminus} m</span>`;
    return `${MODE_LABEL[route.mode]} ${fmtDuree(route.drive.min)} (${route.drive.km} km)${suffix}`;
  }

  function render() {
    if (!active) return;
    const box = ensurePanel();
    box.style.display = 'block';
    const active_ = activeRoute();

    const modeButtons = active_ ? `
      <div class="measure-modes">
        <button type="button" class="measure-mode-btn ${active_.mode === 'driving' ? 'sel' : ''}" data-mode="driving">${phosphorSvg('car', 14)} Voiture</button>
        <button type="button" class="measure-mode-btn ${active_.mode === 'foot' ? 'sel' : ''}" data-mode="foot" title="Vrai itinéraire piéton (Geoapify) — repli sur distance à vol d'oiseau si le service est indisponible">${phosphorSvg('person-simple-walk', 14)} À pied</button>
        <button type="button" class="measure-mode-btn ${active_.mode === 'bicycle' ? 'sel' : ''}" data-mode="bicycle" title="Vrai itinéraire vélo (Geoapify) — repli sur distance à vol d'oiseau si le service est indisponible">${phosphorSvg('bicycle', 14)} Vélo</button>
      </div>` : '';

    // Texte explicatif retiré (demande utilisateur) : on n'affiche que le RÉSULTAT (distance +
    // durée) une fois ≥ 2 points ; rien avant (le bouton « Placer des points » suffit).
    const activeInfo = (active_ && active_.points.length >= 2)
      ? `<div class="measure-hint cmap-hint">${phosphorSvg('ruler', 13)} ${active_.km} km à vol d'oiseau<br>${driveText(active_)}</div>`
      : '';

    // Contrôle « Placer/Reprendre » ↔ « Terminer » l'ajout de points (sans quitter l'outil).
    // À l'ouverture on est en pause : rien ne s'ajoute au clic tant que l'utilisateur n'a
    // pas démarré. Voir activateMeasure (paused=true par défaut).
    const hasPts = !!(active_ && active_.points.length >= 1);
    const ctrlBtn = 'width:100%;padding:8px;margin:2px 0 8px;border:1px solid #d0d0d0;border-radius:6px;cursor:pointer;font-size:12.5px;font-weight:600';
    const pauseControl = paused
      ? `<button type="button" class="measure-resume" style="${ctrlBtn};background:#eef4ff;color:#1a56c4;border-color:#c7d7f5">▶ ${hasPts ? "Reprendre l'ajout de points" : 'Placer des points sur la carte'}</button>`
      : `<button type="button" class="measure-finish" style="${ctrlBtn};background:#eafaf0;color:#0b8043;border-color:#bfe6cd">${phosphorSvg('check', 13)} Terminer (arrêter d'ajouter)</button>`;
    const pausedHint = '';   // texte explicatif retiré (demande utilisateur) — les boutons suffisent

    const list = routes.map((r, i) => `
      <div class="measure-route-row ${r.id === activeRouteId ? 'sel' : ''}" data-id="${r.id}">
        <span class="measure-swatch" style="background:${r.color || ROUTE_COLORS[i % ROUTE_COLORS.length]}"></span>
        <span class="measure-route-label">Parcours ${i + 1} ${MODE_LABEL[r.mode]}${r.drive && r.drive !== 'loading' && r.drive !== 'error' ? ` · ${r.drive.km} km · ${fmtDuree(r.drive.min)}${r.drive.dplus != null ? ` · ↗${r.drive.dplus} m` : ''}` : ''}</span>
        <button type="button" class="measure-del" data-del="${r.id}" title="Supprimer ce parcours">${phosphorSvg('x', 12)}</button>
      </div>
    `).join('');

    box.innerHTML = `
      ${cmapHeader(phosphorSvg('ruler', 14) + ' Mesure de trajets',
          '<button type="button" class="cmap-xbtn measure-zoom" data-z="-1" title="Réduire le panneau">A−</button>'
        + '<button type="button" class="cmap-xbtn measure-zoom" data-z="1" title="Agrandir le panneau">A+</button>'
        + '<button type="button" class="cmap-xbtn measure-close" title="Fermer">' + phosphorSvg('x', 12) + '</button>')}
      ${modeButtons}
      ${activeInfo}
      ${pausedHint}
      ${pauseControl}
      <div class="measure-list">${list}</div>
      <div class="measure-actions">
        <button type="button" class="measure-add" ${routes.length >= MAX_ROUTES ? 'disabled' : ''}>+ Nouveau parcours</button>
        <button type="button" class="measure-clear">Tout effacer</button>
      </div>
    `;
    applyPanelZoom();

    box.querySelectorAll('.measure-zoom').forEach(b => {
      b.addEventListener('click', () => {
        panelZoom = Math.min(2.2, Math.max(0.9, panelZoom + 0.2 * (+b.dataset.z)));
        localStorage.setItem('measurePanelZoom', panelZoom);
        applyPanelZoom();
      });
    });
    const closeBtn = box.querySelector('.measure-close');
    if (closeBtn) closeBtn.addEventListener('click', deactivateMeasure);   // ✕ = ferme le panneau

    box.querySelectorAll('.measure-mode-btn').forEach(b => {
      b.addEventListener('click', () => {
        const r = activeRoute();
        if (!r) return;
        r.mode = b.dataset.mode;
        if (r.points.length >= 2) fetchRoute(r);
        render();
      });
    });
    box.querySelectorAll('.measure-route-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.measure-del')) return;
        activeRouteId = Number(row.dataset.id);
        render();
      });
    });
    box.querySelectorAll('.measure-del').forEach(b => {
      b.addEventListener('click', (e) => { e.stopPropagation(); deleteRoute(Number(b.dataset.del)); });
    });
    box.querySelector('.measure-add').addEventListener('click', () => { paused = false; applyMeasureCursor(); newRoute(); });
    box.querySelector('.measure-clear').addEventListener('click', clearAll);
    const finishBtn = box.querySelector('.measure-finish');
    if (finishBtn) finishBtn.addEventListener('click', () => { paused = true; applyMeasureCursor(); render(); });
    const resumeBtn = box.querySelector('.measure-resume');
    if (resumeBtn) resumeBtn.addEventListener('click', () => { paused = false; applyMeasureCursor(); render(); });
    makeDraggablePanel(map, box, box.querySelector('.cmap-hd'));   // déplaçable par l'en-tête
  }

  function reset() {
    routes.forEach(r => {
      r.markers.forEach(m => map.removeLayer(m));
      if (r.dashLine) map.removeLayer(r.dashLine);
      if (r.routeLine) map.removeLayer(r.routeLine);
    });
    routes = [];
    activeRouteId = null;
    nextId = 1;
    paused = false;
    if (panel) panel.style.display = 'none';
  }

  function activateMeasure() {
    if (active) return;
    active = true;
    paused = true;   // à l'ouverture : PAS de sélection de points — l'utilisateur démarre quand il veut
    btn.classList.add('active');
    applyMeasureCursor();
    map.getContainer().addEventListener('click', onMeasureClickCapture, true);
  }
  function deactivateMeasure() {
    if (!active) return;
    active = false;
    paused = false;
    btn.classList.remove('active');
    map.getContainer().style.cursor = '';
    map.getContainer().removeEventListener('click', onMeasureClickCapture, true);
    if (panel) panel.style.display = 'none';
  }

  btn.addEventListener('click', () => {
    // activer AVANT de créer le 1er parcours : render() sort tôt si `active` est faux,
    // donc sans cet ordre le panneau n'apparaissait qu'au 1er point cliqué.
    if (!active) { reset(); activateMeasure(); newRoute(); }
    else { deactivateMeasure(); }
  });

  // API publique : tracer un trajet par programme (ex. carte escalade « gare la plus proche → site »).
  // points : tableau de [lat,lng] ou {lat,lng} (≥ 2 points) ; mode : 'foot' (défaut) ou 'driving'.
  // Remplace la mesure en cours par ce trajet, active l'outil, calcule et recadre la carte.
  // Exposé pour l'export d'impression (attachPrintFrame) : liste des parcours à dessiner.
  map.getMeasureRoutes = () => routes;

  map.measureRoute = function (points, mode) {
    if (!points || points.length < 2) return;
    const pts = points.map(p => Array.isArray(p) ? L.latLng(p[0], p[1]) : L.latLng(p.lat, p.lng));
    reset();
    activateMeasure();
    newRoute();
    const route = activeRoute();
    if (route) route.mode = (mode === 'driving' || mode === 'bicycle') ? mode : 'foot';
    pts.forEach(ll => addPoint(ll));   // addPoint gère marqueur + tracé + calcul (au 2e point)
    try { map.fitBounds(L.latLngBounds(pts), { padding: [70, 70], maxZoom: 15 }); } catch (e) {}
  };

  // Ouvert d'emblée (demande utilisateur) : panneau de mesure visible au chargement, en
  // PAUSE (aucun point ajouté au clic tant que l'utilisateur n'a pas cliqué « Placer des
  // points »). Le bouton Mesurer bascule ensuite ouvert/fermé comme avant.
  // `map._skipAutoOpen = true` (posé par la page avant l'attache) désactive ça — utilisé par
  // le thème iOS de la carte médicale où les outils s'ouvrent au tap d'un bouton.
  if (!map._skipAutoOpen) { reset(); activateMeasure(); newRoute(); }
}

/**
 * Géolocalisation : bouton qui centre la carte sur la position de l'utilisateur
 * et affiche un marqueur bleu. `buttonId` doit pointer vers un <button> existant
 * dans le DOM de la page.
 */
function attachGeolocation(map, buttonId) {
  let userMarker = null;
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.innerHTML = LOCATE_ICON_DEFAULT;

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    btn.classList.add('loading');
    btn.textContent = '⏳ Localisation…';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        map.setView([lat, lon], 14);

        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker([lat, lon], {
          radius: 10,
          fillColor: '#1976d2',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
        }).bindPopup('<b>' + phosphorSvg('map-pin', 13) + ' Ma position</b>').addTo(map).openPopup();

        btn.classList.remove('loading');
        btn.innerHTML = LOCATE_ICON_DEFAULT;
      },
      (err) => {
        btn.classList.remove('loading');
        btn.innerHTML = LOCATE_ICON_DEFAULT;
        const msgs = {1: 'Accès à la position refusé.', 2: 'Position indisponible.', 3: 'Délai dépassé.'};
        alert(msgs[err.code] || 'Erreur de géolocalisation.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Recherche — partagée par toutes les cartes. Barre flottante en haut-centre.
 * 1) Recherche **locale** optionnelle (ex. noms de sites d'escalade) : suggestions en direct
 *    pendant la frappe, priorité sur le reste. `local = { get: () => items, onSelect: item => … }`
 *    où chaque item a `.name`, `.lat`, `.lng` (et `.region` facultatif).
 * 2) Repli **Nominatim** (OSM, gratuit, CORS *, sans clé, FR) pour agglomération / lieu-dit /
 *    code postal : recadre sur la bbox + marqueur temporaire.
 * Styles inline → aucun CSS à ajouter dans la page. Appeler après L.map().
 */
function attachSearch(map, local) {
  const box = document.createElement('div');
  box.className = 'cmap-search';   // prise pour thèmes (iOS : repositionner/styler la recherche)
  box.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;'
    + 'width:min(340px,calc(100vw - 32px));';
  box.innerHTML =
      '<div style="display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #d7dbe0;'
    + 'border-radius:22px;box-shadow:0 2px 10px rgba(0,0,0,.18);padding:4px 4px 4px 12px;">'
    + '<input type="text" placeholder="' + (local ? 'Site, ville, lieu-dit, code postal…' : 'Ville, lieu-dit, code postal…') + '" '
    + 'autocomplete="off" style="border:none;outline:none;font-size:16px;flex:1;min-width:0;background:transparent;color:#1a1a1a;" />'
    + '<button type="button" title="Rechercher" style="border:none;background:#2f6fed;color:#fff;width:32px;height:32px;'
    + 'border-radius:50%;cursor:pointer;font-size:15px;flex:none;display:flex;align-items:center;justify-content:center;">' + phosphorSvg('magnifying-glass', 16, '#fff') + '</button>'
    + '</div>'
    + '<div class="ms-results" style="display:none;background:#fff;border:1px solid #d7dbe0;border-radius:12px;'
    + 'box-shadow:0 4px 14px rgba(0,0,0,.18);margin-top:6px;max-height:50vh;overflow-y:auto;"></div>'
    + '<div class="ms-msg" style="display:none;text-align:center;font-size:12px;color:#555;'
    + 'background:rgba(255,255,255,.95);border-radius:8px;padding:3px 8px;margin-top:6px;"></div>';
  map.getContainer().appendChild(box);
  L.DomEvent.disableClickPropagation(box);
  L.DomEvent.disableScrollPropagation(box);
  L.DomEvent.on(box, 'click', L.DomEvent.stopPropagation);

  const input = box.querySelector('input');
  const btn = box.querySelector('button');
  const results = box.querySelector('.ms-results');
  const msgEl = box.querySelector('.ms-msg');
  let resultMarker = null, matches = [];
  const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const showMsg = t => { msgEl.textContent = t || ''; msgEl.style.display = t ? 'block' : 'none'; };
  const clearResults = () => { results.style.display = 'none'; results.innerHTML = ''; matches = []; };

  function localMatches(q) {
    if (!local || !local.get) return [];
    const nq = norm(q);
    if (nq.length < 2) return [];
    return local.get().filter(it => it && it.name && norm(it.name).includes(nq)).slice(0, 8);
  }
  function renderResults(q) {
    matches = localMatches(q);
    if (!matches.length) { clearResults(); return; }
    results.innerHTML = matches.map((it, i) =>
      '<div class="ms-row" data-i="' + i + '" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f0f2f4;font-size:13px;">'
      + phosphorSvg('person-simple-hike', 13) + ' <b>' + it.name + '</b>' + (it.region ? ' <span style="color:#888;font-size:11px">· ' + it.region + '</span>' : '')
      + '</div>').join('');
    results.style.display = 'block'; showMsg('');
    results.querySelectorAll('.ms-row').forEach(el => {
      el.addEventListener('click', () => selectLocal(matches[+el.dataset.i]));
      el.addEventListener('mouseover', () => el.style.background = '#f2f6ff');
      el.addEventListener('mouseout', () => el.style.background = '');
    });
  }
  function selectLocal(it) {
    clearResults(); showMsg('');
    input.value = it.name;
    map.setView([it.lat, it.lng], 15);
    if (local && local.onSelect) local.onSelect(it);
  }
  async function geocode(q) {
    clearResults(); showMsg('Recherche…');
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr'
        + '&countrycodes=fr&q=' + encodeURIComponent(q);
      const res = await (await fetch(url)).json();
      if (!res || !res.length) { showMsg('Aucun résultat'); return; }
      const r = res[0], lat = parseFloat(r.lat), lon = parseFloat(r.lon);
      if (r.boundingbox && r.boundingbox.length === 4) {
        const bb = r.boundingbox.map(parseFloat);
        map.fitBounds([[bb[0], bb[2]], [bb[1], bb[3]]], { maxZoom: 15, padding: [40, 40] });
      } else { map.setView([lat, lon], 13); }
      if (resultMarker) map.removeLayer(resultMarker);
      const icon = (typeof makePin === 'function') ? makePin('#e11d48', 'map-pin', 28) : new L.Icon.Default();
      resultMarker = L.marker([lat, lon], { icon }).addTo(map)
        .bindPopup('<div class="popup-title">' + escapeHtml(r.display_name || q) + '</div>').openPopup();
      showMsg('');
    } catch (e) { showMsg('Erreur de recherche'); }
  }
  function submit() {
    const q = input.value.trim();
    if (!q) return;
    const m = localMatches(q);
    if (m.length) { selectLocal(m[0]); return; }   // priorité au site local exact/partiel
    geocode(q);
  }
  input.addEventListener('input', () => { showMsg(''); renderResults(input.value.trim()); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  btn.addEventListener('click', submit);
  map.on('click', clearResults);
}

/* --- Auto-correction des pages HTML gardées en cache (ajouté 2026-07-26) ---
 * Symptôme rencontré : un iPhone continuait de servir une version périmée d'une page carte
 * (fonctionnalités manquantes) alors que le serveur renvoyait bien la nouvelle version avec
 * `Cache-Control: no-cache` (vérifié : md5 identique avec/sans query, 304/200 corrects, aucun
 * service worker). Vider le cache et redémarrer n'avait pas suffi.
 * Ce fichier-ci, lui, est TOUJOURS revalidé (no-cache de longue date) : il est donc à jour même
 * quand le HTML ne l'est pas. On s'en sert comme garde-fou : chaque page à jour déclare
 * `window.__PAGE_V__` ; si ce marqueur est absent au chargement, la page vient du cache → on
 * recharge une fois avec un paramètre anti-cache. `sessionStorage` empêche toute boucle.
 */
window.addEventListener('load', function () {
  try {
    if (window.__PAGE_V__) return;                       // page à jour
    if (sessionStorage.getItem('mapCacheFixed')) return; // déjà tenté dans cette session
    sessionStorage.setItem('mapCacheFixed', '1');
    const u = new URL(location.href);
    u.searchParams.set('_v', Date.now());
    location.replace(u.toString());
  } catch (e) { /* pas de sessionStorage (mode privé strict) : on ne fait rien */ }
});

/* --- Impression à l'échelle (étape 1 : échelle 1/X + zone d'impression) — ajouté 2026-07-27 ---
 * Panneau flottant : format A4/A3, orientation, échelle (1/X). Affiche l'échelle courante de la
 * carte (référence 96 dpi) et dessine la ZONE qui sera imprimée/exportée à l'échelle choisie
 * (rectangle = surface au sol paper_mm × échelle, projetée en pixels écran). L'export JPEG/PDF
 * viendra s'appuyer sur cette même zone (étape 2). Styles inline, aucune dépendance.
 */
function attachPrintFrame(map) {
  ensureCommonStyle();   // pour l'en-tête .cmap-hd/.cmap-ttl/.cmap-xbtn du panneau
  const PAPER = { A4: [210, 297], A3: [297, 420] };   // largeur × hauteur en mm (portrait)
  const SCALES = [2500, 5000, 10000, 25000, 50000, 100000, 200000];
  let fmt = 'A4', orient = 'paysage', scale = 25000, active = false, showTrajets = false, busy = false;
  const EXPORT_DPI = 200;

  const fmtInt = n => Math.round(n).toLocaleString('fr-FR');
  const paperMM = () => { const [w, h] = PAPER[fmt]; return orient === 'portrait' ? [w, h] : [h, w]; };
  const mpp = () => 156543.03392 * Math.cos(map.getCenter().lat * Math.PI / 180) / Math.pow(2, map.getZoom());
  const currentScale = () => mpp() * 96 / 0.0254;     // dénominateur d'échelle à 96 dpi (écran)

  // bouton flottant (bas-droite)
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cmap-print-btn';   // prise pour thèmes (iOS)
  btn.innerHTML = phosphorSvg('printer', 14) + ' Imprimer';
  btn.style.cssText = 'position:absolute;bottom:14px;right:14px;z-index:1000;padding:8px 12px;border:1px solid #d0d0d0;'
    + 'border-radius:8px;background:#fff;font-size:13px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.2);';
  // zone (rectangle) d'impression
  const frame = document.createElement('div');
  frame.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:900;display:none;'
    + 'border:2px solid #1976d2;box-shadow:0 0 0 9999px rgba(0,0,0,.18);pointer-events:none;';
  const frameLabel = document.createElement('div');
  frameLabel.style.cssText = 'position:absolute;top:-24px;left:50%;transform:translateX(-50%);white-space:nowrap;'
    + 'background:#1976d2;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;';
  frame.appendChild(frameLabel);
  // panneau réglages
  const panel = document.createElement('div');
  panel.className = 'cmap-print-panel';   // prise pour thèmes (iOS)
  panel.style.cssText = 'position:absolute;bottom:52px;right:14px;z-index:1001;display:none;background:#fff;'
    + 'border:1px solid #d0d0d0;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.2);padding:12px;width:230px;font-size:13px;';
  const c = map.getContainer();
  c.appendChild(frame); c.appendChild(panel); c.appendChild(btn);
  [panel, btn].forEach(el => { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); });

  function closePrint() {
    active = false;
    btn.style.background = '#fff'; btn.style.color = '#333';
    panel.style.display = 'none'; frame.style.display = 'none';
  }
  function renderPanel() {
    panel.innerHTML =
      cmapHeader(phosphorSvg('printer', 14) + ' Imprimer', '<button type="button" class="cmap-xbtn pf-close" title="Fermer">' + phosphorSvg('x', 12) + '</button>')
      + '<label style="display:block;font-size:11px;color:#666;margin-bottom:2px">Format</label>'
      + '<div style="display:flex;gap:6px;margin-bottom:8px">'
      + ['A4', 'A3'].map(f => `<button type="button" data-fmt="${f}" style="flex:1;padding:5px;border:1px solid #d0d0d0;border-radius:6px;background:${fmt === f ? '#1976d2' : '#fff'};color:${fmt === f ? '#fff' : '#333'};cursor:pointer">${f}</button>`).join('')
      + '</div>'
      + '<label style="display:block;font-size:11px;color:#666;margin-bottom:2px">Orientation</label>'
      + '<div style="display:flex;gap:6px;margin-bottom:8px">'
      + [['paysage', 'Paysage'], ['portrait', 'Portrait']].map(([o, l]) => `<button type="button" data-orient="${o}" style="flex:1;padding:5px;border:1px solid #d0d0d0;border-radius:6px;background:${orient === o ? '#1976d2' : '#fff'};color:${orient === o ? '#fff' : '#333'};cursor:pointer">${l}</button>`).join('')
      + '</div>'
      + '<label style="display:block;font-size:11px;color:#666;margin-bottom:2px">Échelle</label>'
      + '<select id="pf-scale" style="width:100%;padding:6px;border:1px solid #d0d0d0;border-radius:6px;font-size:13px;margin-bottom:8px">'
      + SCALES.map(s => `<option value="${s}" ${s === scale ? 'selected' : ''}>1 / ${fmtInt(s)}</option>`).join('')
      + '</select>'
      + `<label style="display:flex;align-items:center;gap:6px;margin-bottom:10px;cursor:pointer">`
      + `<input type="checkbox" id="pf-trajets" ${showTrajets ? 'checked' : ''}> Afficher les trajets (mesure)</label>`
      + '<div style="display:flex;gap:6px;margin-bottom:8px">'
      + `<button type="button" id="pf-jpeg" style="flex:1;padding:7px;border:none;border-radius:6px;background:#1976d2;color:#fff;font-weight:600;cursor:pointer">Exporter JPEG</button>`
      + `<button type="button" id="pf-pdf" style="flex:1;padding:7px;border:none;border-radius:6px;background:#0b8043;color:#fff;font-weight:600;cursor:pointer">Exporter PDF</button>`
      + '</div>'
      + '<div id="pf-readout" style="font-size:11px;color:#666;border-top:1px solid #eee;padding-top:8px"></div>';
    panel.querySelectorAll('[data-fmt]').forEach(b => b.onclick = () => { fmt = b.dataset.fmt; renderPanel(); update(); });
    panel.querySelectorAll('[data-orient]').forEach(b => b.onclick = () => { orient = b.dataset.orient; renderPanel(); update(); });
    panel.querySelector('#pf-scale').onchange = e => { scale = +e.target.value; update(); };
    panel.querySelector('#pf-trajets').onchange = e => { showTrajets = e.target.checked; };
    panel.querySelector('#pf-jpeg').onclick = () => exportMap('jpeg');
    panel.querySelector('#pf-pdf').onclick = () => exportMap('pdf');
    panel.querySelector('.pf-close').onclick = closePrint;   // ✕ = ferme (comme les autres panneaux)
    makeDraggablePanel(map, panel, panel.querySelector('.cmap-hd'));   // déplaçable par l'en-tête
    update();
  }

  function update() {
    if (!active) { frame.style.display = 'none'; return; }
    const [pw, ph] = paperMM();
    const gW = pw / 1000 * scale, gH = ph / 1000 * scale;   // surface au sol (m)
    const m = mpp();
    frame.style.display = 'block';
    frame.style.width = (gW / m) + 'px';
    frame.style.height = (gH / m) + 'px';
    frameLabel.textContent = `${fmt} ${orient} · 1/${fmtInt(scale)} · ${(gW / 1000).toFixed(1)}×${(gH / 1000).toFixed(1)} km`;
    const ro = panel.querySelector('#pf-readout');
    if (ro) ro.innerHTML = `Échelle actuelle de la carte : <b>1/${fmtInt(currentScale())}</b><br>`
      + `<span style="color:#999">Le rectangle bleu = la zone imprimée à l'échelle choisie. Recadre/zoome pour la placer.</span>`;
  }

  btn.onclick = () => {
    active = !active;
    btn.style.background = active ? '#1976d2' : '#fff';
    btn.style.color = active ? '#fff' : '#333';
    panel.style.display = active ? 'block' : 'none';
    if (active) renderPanel(); else frame.style.display = 'none';
  };
  map.on('move zoom moveend zoomend', update);

  // --- Export à l'échelle (JPEG / PDF), ajouté 2026-07-27 ---
  function setStatus(html) { const ro = panel.querySelector('#pf-readout'); if (ro) ro.innerHTML = html; }
  function loadImg(src) {
    return new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  }
  function loadJsPDF() {
    if (window.jspdf) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/common/vendor/jspdf.umd.min.js';
      s.onload = res; s.onerror = () => rej(new Error('jsPDF introuvable'));
      document.head.appendChild(s);
    });
  }
  function glyphPath(glyph) {
    const g = (typeof PHOSPHOR !== 'undefined') && PHOSPHOR[glyph];
    const m = g && g.match(/ d="([^"]+)"/);
    return m ? m[1] : null;
  }
  function drawPin(ctx, x, y, d, color, glyph, glyphColor) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, d / 2, 0, 2 * Math.PI);
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = Math.max(2, d * 0.09); ctx.strokeStyle = '#fff'; ctx.stroke();
    const dd = glyphPath(glyph);
    if (dd) { const gs = d * 0.6; ctx.translate(x - gs / 2, y - gs / 2); ctx.scale(gs / 256, gs / 256); ctx.fillStyle = glyphColor || '#fff'; ctx.fill(new Path2D(dd)); }
    ctx.restore();
  }
  function flattenLL(ll, out) { out = out || []; (ll || []).forEach(e => Array.isArray(e) ? flattenLL(e, out) : (e && e.lat != null ? out.push(e) : null)); return out; }
  // Coordonnées d'un tracé de route, quel que soit son type Leaflet. Depuis 2026-07-27 les
  // 3 modes viennent de Geoapify → toujours L.geoJSON (FeatureGroup, PAS de getLatLngs) : on
  // parcourt ses sous-couches. La branche getLatLngs (L.polyline) reste par sécurité.
  function routeLatLngs(rl) {
    if (!rl) return null;
    if (typeof rl.getLatLngs === 'function') return flattenLL(rl.getLatLngs());
    if (typeof rl.eachLayer === 'function') {
      const out = [];
      rl.eachLayer(l => { if (typeof l.getLatLngs === 'function') flattenLL(l.getLatLngs(), out); });
      return out.length ? out : null;
    }
    return null;
  }

  async function exportMap(kind) {
    if (busy) return;
    busy = true;
    try {
      setStatus('⏳ Génération en cours…');
      const [pw, ph] = paperMM();                              // mm
      const exW = Math.round(pw / 25.4 * EXPORT_DPI), exH = Math.round(ph / 25.4 * EXPORT_DPI);
      const gW = pw / 1000 * scale, gH = ph / 1000 * scale;    // sol (m)
      const latRad = map.getCenter().lat * Math.PI / 180;
      const exMpp = gW / exW;
      let Z = Math.round(Math.log2(156543.03392 * Math.cos(latRad) / exMpp));
      Z = Math.max(0, Math.min(19, Z));
      const mppZ = 156543.03392 * Math.cos(latRad) / Math.pow(2, Z);
      const spanW = gW / mppZ, spanH = gH / mppZ;               // px à zoom Z
      const k = exW / spanW;                                    // zoom-Z px -> px export (≈200 dpi)
      const cw = exW, ch = exH;
      const centerPt = map.project(map.getCenter(), Z);
      const tl = { x: centerPt.x - spanW / 2, y: centerPt.y - spanH / 2 };
      const project = (lat, lng) => { const p = map.project([lat, lng], Z); return [(p.x - tl.x) * k, (p.y - tl.y) * k]; };

      const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingQuality = 'high';

      // 1) tuiles du fond commun CMAP_BASEMAP (crossOrigin → canvas non "tainted"), redessinées à l'échelle export
      const TS = 256;
      const x0 = Math.floor(tl.x / TS), y0 = Math.floor(tl.y / TS);
      const x1 = Math.floor((tl.x + spanW) / TS), y1 = Math.floor((tl.y + spanH) / TS);
      const nmax = Math.pow(2, Z);
      const jobs = [];
      for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) {
        const wx = ((tx % nmax) + nmax) % nmax;
        jobs.push(loadImg(cmapTileUrl(Z, wx, ty))
          .then(img => { if (img) ctx.drawImage(img, (tx * TS - tl.x) * k, (ty * TS - tl.y) * k, TS * k, TS * k); }));
      }
      await Promise.all(jobs);

      // 2) marqueurs (établissements/arrêts) fournis par la page, dans la zone
      const pinD = Math.round(EXPORT_DPI * 0.16);
      const marks = (typeof map.getExportMarkers === 'function') ? map.getExportMarkers() : [];
      marks.forEach(mk => {
        const [x, y] = project(mk.lat, mk.lng);
        if (x < -pinD || y < -pinD || x > cw + pinD || y > ch + pinD) return;
        drawPin(ctx, x, y, pinD, mk.color, mk.glyph, '#fff');
      });

      // 3) trajets (option) : vol d'oiseau (pointillé) + trajet réel routé (plein), comme la carte
      if (showTrajets && typeof map.getMeasureRoutes === 'function') {
        map.getMeasureRoutes().forEach(r => {
          if (!r.points || r.points.length < 1) return;
          const col = r.color || '#1f77b4';
          // a) ligne à vol d'oiseau (pointillé) à travers les points cliqués
          if (r.points.length > 1) {
            ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, pinD * 0.12);
            ctx.setLineDash([pinD * 0.45, pinD * 0.35]); ctx.lineJoin = 'round';
            ctx.beginPath(); r.points.forEach((p, i) => { const [x, y] = project(p.lat, p.lng); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
          }
          // b) trajet réel routé (plein, épais) par-dessus — Geoapify/geoJSON pour les 3 modes
          const line = routeLatLngs(r.routeLine);
          if (line && line.length > 1) {
            ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, pinD * 0.22); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.beginPath(); line.forEach((p, i) => { const [x, y] = project(p.lat, p.lng); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
          }
          // c) points du parcours
          r.points.forEach(p => { const [x, y] = project(p.lat, p.lng); ctx.save(); ctx.beginPath(); ctx.arc(x, y, pinD * 0.22, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke(); ctx.restore(); });
        });
      }

      // 4) cartouche : format A + échelle + barre d'échelle
      drawCartouche(ctx, cw, ch, gW);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base = `carte-medicale_${fmt}-${orient}_1-${scale}`;
      if (kind === 'jpeg') {
        triggerDownload(dataUrl, base + '.jpg');
        setStatus(phosphorSvg('check-circle', 13, '#0b8043') + ' JPEG exporté.');
      } else {
        await loadJsPDF();
        const doc = new window.jspdf.jsPDF({ orientation: orient === 'paysage' ? 'landscape' : 'portrait', unit: 'mm', format: fmt.toLowerCase(), compress: true });
        doc.addImage(dataUrl, 'JPEG', 0, 0, pw, ph);
        doc.save(base + '.pdf');
        setStatus(phosphorSvg('check-circle', 13, '#0b8043') + ' PDF exporté.');
      }
    } catch (e) {
      setStatus(phosphorSvg('warning-circle', 13, '#c0392b') + ' Erreur export : ' + (e && e.message || e));
    } finally { busy = false; }
  }

  function drawCartouche(ctx, cw, ch, gW) {
    const pad = Math.round(ch * 0.012);
    const fs = Math.max(13, Math.round(ch * 0.016));
    ctx.font = `600 ${fs}px -apple-system,Arial,sans-serif`;
    const l1 = `${fmt} ${orient}`, l2 = `Échelle 1 / ${fmtInt(scale)}`;
    // barre d'échelle : distance ronde ~15% de la largeur
    const mCanvas = gW / cw;                                   // m/px sur le canvas
    const target = cw * 0.15 * mCanvas;
    const nice = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);
    const barPx = nice / mCanvas;
    const barLabel = nice >= 1000 ? (nice / 1000) + ' km' : nice + ' m';
    const boxW = Math.max(ctx.measureText(l2).width, barPx) + pad * 2;
    const boxH = fs * 2 + barPx * 0 + pad * 3 + fs; // 2 lignes texte + barre + marges
    const bx = pad, by = ch - boxH - pad;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.fillRect(bx, by, boxW, boxH); ctx.strokeRect(bx, by, boxW, boxH);
    ctx.fillStyle = '#111'; ctx.textBaseline = 'top';
    ctx.fillText(l1, bx + pad, by + pad);
    ctx.fillText(l2, bx + pad, by + pad + fs * 1.2);
    // barre
    const barY = by + pad + fs * 2.6, barX = bx + pad;
    ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(2, fs * 0.12);
    ctx.beginPath(); ctx.moveTo(barX, barY); ctx.lineTo(barX + barPx, barY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(barX, barY - fs * 0.3); ctx.lineTo(barX, barY + fs * 0.3);
    ctx.moveTo(barX + barPx, barY - fs * 0.3); ctx.lineTo(barX + barPx, barY + fs * 0.3); ctx.stroke();
    ctx.font = `${Math.round(fs * 0.8)}px -apple-system,Arial,sans-serif`;
    ctx.fillText(barLabel, barX + barPx + pad * 0.6, barY - fs * 0.5);
  }

  function triggerDownload(url, name) {
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
}

/* --- Popups : habillage commun + helpers partagés (standardisation 2026-07-27) -----------
 * Toutes les cartes partageaient des popups au style divergent (medical: .tag/.info-line ;
 * essence: .station-addr/.price-row ; escalade/chalets: .popup-title/-footer/-coords…).
 * On unifie ici le CHROME (titre, sous-titre, pastille, lignes info, description, footer,
 * liens, coordonnées) — chaque carte garde son CONTENU métier (prix, cotations, budget ski).
 *   ensurePopupStyle() : injecte une fois le CSS `.popup-*` commun (idempotent).
 *   popupCoords(lat,lng,label,opts) : bloc coordonnées + liens Google Maps / OsmAnd (ex-
 *     coordsBlock dupliqué dans escalade + chalets). opts.showCoord=false masque la ligne coord.
 *   escapeHtml(s) : échappe &<>"' — À utiliser pour tout nom/texte venant d'OSM ou Nominatim
 *     (corrige des popups cassés par « Bar & Tabac », « Gare d'Orléans »…).
 */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function popupCoords(lat, lng, label, opts) {
  opts = opts || {};
  const coord = (+lat).toFixed(5) + ', ' + (+lng).toFixed(5);
  const gmaps = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;
  const osmand = 'geo:' + lat + ',' + lng + '?q=' + lat + ',' + lng + '(' + encodeURIComponent(label || '') + ')';
  return (opts.showCoord === false ? '' : '<div class="popup-coords">' + phosphorSvg('map-pin', 12, '#667085') + ' ' + coord + '</div>')
    + '<div class="popup-maplinks"><a href="' + gmaps + '" target="_blank" rel="noopener">Google Maps</a>'
    + '<a href="' + osmand + '">OsmAnd</a></div>';
}

function ensurePopupStyle() {
  if (document.getElementById('cmap-popup-style')) return;
  const st = document.createElement('style');
  st.id = 'cmap-popup-style';
  st.textContent =
      '.leaflet-popup-content{min-width:0;font-size:12px;line-height:1.4}'
    + '.popup-title{font-weight:700;font-size:15px;margin:0 0 3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;line-height:1.25;color:#1c222b}'
    + '.popup-sub{font-size:12px;color:#667085;margin:0 0 8px;line-height:1.4}'
    + '.popup-tag{font-size:11px;padding:1px 8px;border-radius:10px;font-weight:600;display:inline-block}'
    + '.popup-info{font-size:12px;color:#555;margin:2px 0;line-height:1.45}'
    + '.popup-info a{color:#2f6fed;text-decoration:none}'
    + '.popup-desc{font-size:11.5px;color:#667085;line-height:1.5;margin:8px 0 0;padding-top:8px;border-top:1px solid #eef0f2}'
    + '.popup-footer{border-top:1px solid #eef0f2;margin-top:8px;padding-top:8px}'
    + '.popup-footer .popup-desc{border-top:none;padding-top:0;margin-top:0}'
    + '.popup-link{display:inline-block;color:#2f6fed;font-size:12px;font-weight:600;text-decoration:none;margin-bottom:3px}'
    + '.popup-link:hover{text-decoration:underline}'
    + '.popup-warn{color:#b45309;font-size:11.5px;margin:0 0 8px}'
    + '.popup-coords{font-size:11px;color:#667085;margin:8px 0 4px;font-family:ui-monospace,monospace}'
    + '.popup-maplinks{display:flex;gap:8px;margin-top:2px;flex-wrap:wrap}'
    + '.popup-maplinks a{font-size:11px;color:#2f6fed;text-decoration:none;border:1px solid #d8dce2;border-radius:4px;padding:2px 7px}'
    + '.popup-maplinks a:hover{background:#f0f4ff}';
  document.head.appendChild(st);
}

/* --- Outils "lieu" dans les popups : isochrone + altitude (Geoapify) — ajouté 2026-07-27 ---
 * Ajoute automatiquement, en bas de CHAQUE popup à marqueur, une barre :
 *     🎯 Zone atteignable   ·   ⛰️ Altitude
 * - Zone atteignable : isochrone Geoapify (proxy Caddy same-origin `/geoapify-iso/`, clé
 *   injectée côté serveur — cf. Caddyfile / PROGRAMMES.md §4) depuis le point du popup.
 *   Un petit panneau flottant permet de choisir le mode (🚗 voiture / 🚶 à pied / 🚴 vélo)
 *   et la durée (5→30 min). Dessine le polygone atteignable et recadre dessus.
 * - Altitude : POST Geoapify Elevation (proxy `/geoapify-elev/`) pour ce point, affichée
 *   inline dans le bouton.
 * Les deux consomment le quota Geoapify (3000 crédits/jour, partagé avec le routage piéton
 * de l'outil de mesure) — mais UNIQUEMENT au clic explicite, jamais en boucle.
 * Aucune modification des popups de chaque carte : on s'accroche à l'événement `popupopen`
 * et on lit le latlng du popup. Appeler une fois après L.map() : attachPlaceTools(map).
 */
function attachPlaceTools(map) {
  ensurePopupStyle();   // habillage popup commun (injecté une fois, présent sur toutes les cartes)
  const MODES = [['drive', phosphorSvg('car', 15)], ['walk', phosphorSvg('person-simple-walk', 15)], ['bicycle', phosphorSvg('bicycle', 15)]];
  const DURATIONS = [5, 10, 15, 30, 60];   // aligné sur le mockup Figma iOS
  const MODE_COLOR = { drive: '#2f6fed', walk: '#0b8043', bicycle: '#d97706' };
  const MODE_LBL = { drive: 'en voiture', walk: 'à pied', bicycle: 'à vélo' };
  let isoLayer = null, isoPanel = null, cur = null; // cur = {lat, lon, name, mode, minutes}

  // ---------- Isochrone ----------
  function ensureIsoPanel() {
    if (isoPanel) return isoPanel;
    ensureCommonStyle();
    isoPanel = document.createElement('div');
    isoPanel.className = 'iso-panel cmap-glass';   // prise pour thèmes (iOS)
    // Habillage aligné sur le panneau de mesure (même fond/bordure/rayon/police).
    // Position par défaut en HAUT-DROITE (le panneau de mesure est en bas-gauche) pour
    // éviter le chevauchement quand les deux sont ouverts. Les deux restent déplaçables.
    isoPanel.style.cssText = 'position:absolute;top:14px;right:14px;z-index:1001;display:none;background:rgba(255,255,255,.97);'
      + 'border:1px solid #d7dbe0;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.15);padding:10px 12px;width:min(230px,calc(100vw - 28px));font-size:12px;';
    map.getContainer().appendChild(isoPanel);
    L.DomEvent.disableClickPropagation(isoPanel);
    L.DomEvent.disableScrollPropagation(isoPanel);
    L.DomEvent.on(isoPanel, 'click', L.DomEvent.stopPropagation);
    return isoPanel;
  }
  function renderIsoPanel() {
    const p = ensureIsoPanel();
    p.style.display = 'block';
    const hasOrigin = cur && cur.lat != null;
    // Texte explicatif retiré (demande utilisateur) : sous-titre seulement s'il y a un point choisi.
    const sub = hasOrigin ? (cur.name || 'Point choisi sur la carte') : '';
    p.innerHTML =
      cmapHeader(phosphorSvg('target', 14) + ' Zone atteignable', '<button type="button" class="cmap-xbtn" id="iso-x" title="Effacer la zone">' + phosphorSvg('x', 12) + '</button>')
      + (sub ? '<div class="cmap-sub" style="white-space:normal">' + sub + '</div>' : '')
      + '<div style="display:flex;gap:6px;margin-bottom:8px">'
      + MODES.map(([m, e]) => '<button type="button" class="cmap-btn' + (cur.mode === m ? ' sel' : '') + '" data-m="' + m + '" style="flex:1;font-size:15px">' + e + '</button>').join('')
      + '</div>'
      + '<div style="display:flex;gap:4px;margin-bottom:8px">'
      + DURATIONS.map(d => '<button type="button" class="cmap-btn' + (cur.minutes === d ? ' sel' : '') + '" data-d="' + d + '" style="flex:1;min-width:0;padding:6px 2px">' + d + '′</button>').join('')
      + '</div>'
      + '<div id="iso-status" class="cmap-hint"></div>';
    p.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { cur.mode = b.dataset.m; renderIsoPanel(); if (cur.lat != null) drawIso(); });
    p.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { cur.minutes = +b.dataset.d; renderIsoPanel(); if (cur.lat != null) drawIso(); });
    p.querySelector('#iso-x').onclick = clearIso;
    makeDraggablePanel(map, p, p.querySelector('.cmap-hd'));   // déplaçable par l'en-tête
  }
  function setIsoStatus(t) { const s = isoPanel && isoPanel.querySelector('#iso-status'); if (s) s.innerHTML = t; }
  // ✕ = ferme le panneau (dismissable, comme le bouton Mesurer ferme la mesure) et efface la
  // zone. Se rouvre au rechargement (ouvert d'emblée) ou via 🎯 dans un popup.
  function clearIso() {
    if (isoLayer) { map.removeLayer(isoLayer); isoLayer = null; }
    if (isoPanel) isoPanel.style.display = 'none';
    cur = null;
  }
  function drawIso() {
    if (!cur || cur.lat == null) return;
    const req = cur;
    setIsoStatus('⏳ calcul de la zone…');
    const url = '/geoapify-iso/x?lat=' + cur.lat + '&lon=' + cur.lon + '&type=time&mode=' + cur.mode + '&range=' + (cur.minutes * 60);
    fetch(url).then(r => r.json()).then(data => {
      if (cur !== req) return;                      // réglages changés depuis : réponse périmée
      if (isoLayer) { map.removeLayer(isoLayer); isoLayer = null; }
      if (!data.features || !data.features.length) { setIsoStatus(phosphorSvg('warning-circle', 13, '#c0392b') + ' zone indisponible'); return; }
      const col = MODE_COLOR[cur.mode] || '#2f6fed';
      isoLayer = L.geoJSON(data, { style: { color: col, weight: 2, opacity: 0.9, fillColor: col, fillOpacity: 0.15 } }).addTo(map);
      isoLayer.bringToBack();
      if (cur.fit !== false) { try { map.fitBounds(isoLayer.getBounds(), { padding: [30, 30] }); } catch (e) {} }
      setIsoStatus('Zone atteignable en <b>' + cur.minutes + ' min ' + MODE_LBL[cur.mode] + '</b>');
    }).catch(() => { if (cur === req) setIsoStatus(phosphorSvg('warning-circle', 13, '#c0392b') + ' service indisponible (quota ?)'); });
  }
  // Origine imposée — conserve mode/durée en cours. fit=false pour ne pas recadrer (clic-carte).
  function openIso(lat, lon, name, fit) {
    cur = { lat: lat, lon: lon, name: name, fit: fit !== false, mode: (cur && cur.mode) || 'drive', minutes: (cur && cur.minutes) || 10 };
    renderIsoPanel();
    drawIso();
  }
  // Panneau ouvert d'emblée, sans origine : prêt à recevoir un clic-carte ou un 🎯 de popup.
  function openIsoWaiting() {
    cur = { lat: null, lon: null, name: '', mode: (cur && cur.mode) || 'drive', minutes: (cur && cur.minutes) || 10 };
    renderIsoPanel();
  }
  // Clic sur la carte = point de départ de la zone (quand le panneau est ouvert). Un clic sur
  // un marqueur ouvre son popup (Leaflet ne déclenche pas 'click' carte) → pas de conflit ;
  // et en mode traçage de mesure, la mesure absorbe le clic (stopPropagation) → pas de conflit.
  map.on('click', function (e) {
    if (!isoPanel || isoPanel.style.display === 'none') return;
    openIso(e.latlng.lat, e.latlng.lng, '', false);   // pas de recadrage : on regarde déjà le point
  });

  // ---------- Altitude ----------
  function fetchAltitude(lat, lon, btn) {
    btn.textContent = '⏳'; btn.disabled = true;
    fetch('/geoapify-elev/x', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: [{ lat: +lat, lon: +lon }] })
    }).then(r => r.json()).then(d => {
      const r0 = d.results && d.results[0];
      btn.innerHTML = (r0 && r0.elevation != null) ? phosphorSvg('mountains', 13) + ' ' + r0.elevation + ' m' : phosphorSvg('mountains', 13) + ' n/d';
    }).catch(() => { btn.innerHTML = phosphorSvg('mountains', 13) + ' erreur'; btn.disabled = false; });
  }

  // ---------- Injection automatique dans les popups ----------
  map.on('popupopen', e => {
    const pop = e.popup;
    const ll = pop.getLatLng && pop.getLatLng();
    const node = pop._contentNode;
    if (!ll || !node || node.querySelector('.place-tools')) return;
    // nom du lieu = titre du popup (pour l'afficher dans le panneau iso). On vise d'abord
    // le titre standard (.popup-title / .station-addr), sinon un titre HTML — sinon on
    // attrapait le 1er <b> du corps (une cotation « 6a », un prix…), affichant n'importe quoi.
    const titleEl = node.querySelector('.popup-title, .station-addr, h1, h2, h3, b, strong');
    const name = titleEl ? (titleEl.textContent || '').trim() : '';
    const bar = document.createElement('div');
    bar.className = 'place-tools';
    // Boutons empilés en pleine largeur : côte à côte, "Zone atteignable" débordait la
    // largeur du popup (~236px) et décalait le bouton Altitude. Empilés = toujours propre.
    bar.style.cssText = 'display:flex;flex-direction:column;gap:5px;margin-top:8px;padding-top:8px;border-top:1px solid #eee';
    const bs = 'width:100%;padding:6px 8px;border:1px solid #d7dbe0;border-radius:6px;background:#f7f9fc;cursor:pointer;font-size:12px;text-align:center;line-height:1.3';
    bar.innerHTML = '<button type="button" class="pt-iso" style="' + bs + '">' + phosphorSvg('target', 14) + ' Zone atteignable</button>'
      + '<button type="button" class="pt-alt" style="' + bs + '">' + phosphorSvg('mountains', 14) + ' Altitude du point</button>';
    node.appendChild(bar);
    bar.querySelector('.pt-iso').onclick = () => openIso(ll.lat, ll.lng, name);
    bar.querySelector('.pt-alt').onclick = function () { fetchAltitude(ll.lat, ll.lng, this); };
  });

  // Ouvert d'emblée (demande utilisateur) : le panneau Zone atteignable est visible au
  // chargement, prêt à recevoir un clic-carte ou un 🎯 de popup. Désactivé si
  // `map._skipAutoOpen` (thème iOS : ouverture au tap / via popup).
  if (!map._skipAutoOpen) openIsoWaiting();
}
