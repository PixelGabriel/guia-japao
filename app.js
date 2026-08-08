const STORAGE_KEY = 'guia-japao-emergency-card-v1';
const CHECKLIST_KEY = 'guia-japao-checklist-v1';

const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const phraseCards = [...document.querySelectorAll('.phrase-card')];
const searchInput = document.querySelector('#phraseSearch');
const filterButtons = [...document.querySelectorAll('.filter-chip')];
const emptyState = document.querySelector('#emptyState');
let activeFilter = 'all';

function filterPhrases() {
  const query = normalize(searchInput.value);
  let visible = 0;

  phraseCards.forEach((card) => {
    const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
    const searchable = normalize(`${card.dataset.search} ${card.textContent}`);
    const queryMatch = !query || searchable.includes(query);
    card.hidden = !(categoryMatch && queryMatch);
    if (!card.hidden) visible += 1;
  });

  emptyState.hidden = visible !== 0;
}

searchInput.addEventListener('input', filterPhrases);
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    filterPhrases();
  });
});

document.addEventListener('click', async (event) => {
  const copyButton = event.target.closest('[data-copy]');
  const speakButton = event.target.closest('[data-speak]');

  if (copyButton) {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copy);
      showToast('Frase copiada.');
    } catch {
      showToast('Não foi possível copiar automaticamente.');
    }
  }

  if (speakButton) {
    if (!('speechSynthesis' in window)) {
      showToast('Este navegador não oferece leitura em voz alta.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speakButton.dataset.speak);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.78;
    const japaneseVoice = speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('ja'));
    if (japaneseVoice) utterance.voice = japaneseVoice;
    speechSynthesis.speak(utterance);
  }
});

const form = document.querySelector('#emergencyForm');
const clearButton = document.querySelector('#clearCard');
const saveStatus = document.querySelector('#saveStatus');
const cardFields = {
  name: document.querySelector('#cardName'),
  hotel: document.querySelector('#cardHotel'),
  address: document.querySelector('#cardAddress'),
  contact: document.querySelector('#cardContact'),
  insurance: document.querySelector('#cardInsurance'),
  medical: document.querySelector('#cardMedical')
};

function formDataObject() {
  return Object.fromEntries(new FormData(form).entries());
}

function renderEmergencyCard(data = {}) {
  cardFields.name.textContent = data.name || 'Preencha seu nome';
  ['hotel', 'address', 'contact', 'insurance', 'medical'].forEach((key) => {
    cardFields[key].textContent = data[key] || '—';
  });
}

function loadEmergencyCard() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.entries(saved).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = value;
    });
    renderEmergencyCard(saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

form.addEventListener('input', () => renderEmergencyCard(formDataObject()));
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = formDataObject();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderEmergencyCard(data);
  saveStatus.textContent = 'Dados salvos neste aparelho.';
  showToast('Cartão salvo no aparelho.');
});

clearButton.addEventListener('click', () => {
  const confirmed = window.confirm('Limpar todos os dados do cartão de emergência deste aparelho?');
  if (!confirmed) return;
  form.reset();
  localStorage.removeItem(STORAGE_KEY);
  renderEmergencyCard();
  saveStatus.textContent = 'Dados apagados.';
  showToast('Cartão apagado.');
});

loadEmergencyCard();

const checklistInputs = [...document.querySelectorAll('[data-check]')];
function loadChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
    checklistInputs.forEach((input) => { input.checked = Boolean(saved[input.dataset.check]); });
  } catch {
    localStorage.removeItem(CHECKLIST_KEY);
  }
}
checklistInputs.forEach((input) => {
  input.addEventListener('change', () => {
    const state = Object.fromEntries(checklistInputs.map((item) => [item.dataset.check, item.checked]));
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
  });
});
loadChecklist();

let deferredInstallPrompt;
const installButton = document.querySelector('#installButton');
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
  showToast('Guia instalado para uso offline.');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      console.warn('Não foi possível ativar o modo offline.');
    });
  });
}
