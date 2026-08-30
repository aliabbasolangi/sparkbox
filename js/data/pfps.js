export const PFPS = [
  { id: 'purple' },
  { id: 'cat' },
  { id: 'duck' },
  { id: 'penguin' },
  { id: 'lego' },
  { id: 'apple' },
  { id: 'masha' },
  { id: 'bibble' },
];

export function pfpUrl(id) {
  return PFPS.some(p => p.id === id) ? `images/pfps/${id}.jpg` : '';
}

export function pfpImg(id, extraClass = '') {
  const src = pfpUrl(id);
  if (!src) return '';
  return `<img class="pfp ${extraClass}" src="${src}" alt="" width="40" height="40">`;
}

export function pfpPicker(selected) {
  return `
    <div class="pfp-picker">
      ${PFPS.map(p => `
        <button type="button" class="pfp-pick ${selected === p.id ? 'is-on' : ''}" data-pfp="${p.id}" aria-label="Choose face">
          <img src="${pfpUrl(p.id)}" alt="">
        </button>
      `).join('')}
    </div>
  `;
}
