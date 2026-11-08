const states = [
  ['ANXIETY', 'Тревога'], ['GUILT', 'Вина'], ['SHAME', 'Стыд'],
  ['FATIGUE', 'Усталость / переутомление'], ['CHAOS', 'Мысли скачут'],
  ['AVERSION', 'Не хочется заниматься этой задачей / скука'],
  ['APATHY', 'Апатия, подавленность'], ['IRRITATION', 'Раздражение, протест'],
  ['FROZEN', 'Оцепенение / ступор'], ['PERFECTIONISM', 'Страх сделать неидеально'],
];
const startButton = document.querySelector('#start-button');
const nextButton = document.querySelector('#next-button');
const form = document.querySelector('#state-form');
const options = document.querySelector('#emotion-options');
const error = document.querySelector('#request-error');
let sessionId;
let saving = false;

for (const [value, text] of states) {
  const label = document.createElement('label');
  label.className = 'emotion-option';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = 'emotion';
  input.value = value;
  label.append(input, document.createTextNode(text));
  options.append(label);
}

function updateSelection() {
  const count = options.querySelectorAll(':checked').length;
  for (const input of options.querySelectorAll('input')) {
    input.disabled = saving || (count === 4 && !input.checked);
  }
  nextButton.disabled = saving || count === 0;
  document.querySelector('#selection-count').textContent = `Выбрано: ${count} из 4`;
}
options.addEventListener('change', updateSelection);

async function post(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('request failed');
  return response.json();
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  error.hidden = true;
  try {
    const session = await post('/api/sessions', {});
    sessionId = session.id;
    document.querySelector('#welcome-screen').hidden = true;
    document.querySelector('#state-screen').hidden = false;
    document.querySelector('#state-title').focus();
  } catch {
    error.textContent = 'Не получилось начать чекин. Можно попробовать ещё раз.';
    error.hidden = false;
  } finally {
    startButton.disabled = false;
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const emotions = [...options.querySelectorAll(':checked')].map(input => input.value);
  if (saving || emotions.length < 1 || emotions.length > 4) return;
  saving = true;
  updateSelection();
  error.hidden = true;
  try {
    await post(`/api/sessions/${sessionId}/state`, { emotions, user_text: '' });
    document.querySelector('#state-screen').hidden = true;
    document.querySelector('#saved-screen').hidden = false;
    document.querySelector('#saved-title').focus();
  } catch {
    error.textContent = 'Не получилось сохранить состояния. Ваш выбор остался здесь — можно повторить.';
    error.hidden = false;
  } finally {
    saving = false;
    updateSelection();
  }
});
