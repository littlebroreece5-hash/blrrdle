const today = new Date();
const launchDate = new Date(2026, 9, 4);
const puzzleNumber = Math.max(1, Math.floor((today - launchDate) / 86400000) + 1);
const dailyPuzzleEndpoint = 'https://qgomsmdzbxlujbtgebdw.supabase.co/functions/v1/daily-puzzle';

// This deliberately contains no answer. It only keeps the layout usable if the
// hosted endpoint is temporarily unreachable while previewing the page locally.
let puzzle = { number: String(puzzleNumber), title: '', year: '', genre: '', frames: ['', '', ''] };
let usingLivePuzzle = false;

// Suggestions are a public film-search starter list, not the private puzzle catalogue.
const movieIndex = [
  ['The Godfather', '1972'], ['Jaws', '1975'], ['Star Wars', '1977'],
  ['Blade Runner', '1982'], ['Back to the Future', '1985'], ['Goodfellas', '1990'],
  ['The Matrix', '1999'], ['The Dark Knight', '2008'], ['Get Out', '2017'],
  ['Everything Everywhere All at Once', '2022'],
];

let guesses = 0;
let complete = false;
const $ = (selector) => document.querySelector(selector);
const input = $('#guessInput');
const feedback = $('#feedback');
const frame = $('#filmFrame');
const statsKey = 'frame-by-frame-player-stats';
let playerStats = { wins: 0, plays: 0, streak: 0 };
try { playerStats = { ...playerStats, ...JSON.parse(localStorage.getItem(statsKey)) }; } catch { /* first visit or private browsing */ }

$('#puzzleNumber').textContent = `#${puzzle.number}`;

async function requestPuzzle(action, value) {
  const response = await fetch(dailyPuzzleEndpoint, {
    method: action ? 'POST' : 'GET',
    headers: action ? { 'Content-Type': 'application/json' } : undefined,
    body: action ? JSON.stringify({ action, value }) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Unable to load today’s puzzle.');
  return payload;
}

async function loadLivePuzzle() {
  try {
    const livePuzzle = await requestPuzzle();
    puzzle = { ...puzzle, number: String(livePuzzle.number), frames: [livePuzzle.frameUrl, '', ''] };
    usingLivePuzzle = true;
    $('#puzzleNumber').textContent = `#${puzzle.number}`;
    feedback.textContent = '';
  } catch {
    feedback.className = 'feedback failure';
    feedback.textContent = 'Today’s frame is unavailable. Please try again shortly.';
  }
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function updateFrame() {
  frame.className = `film-frame reveal-${Math.min(guesses + 1, 3)}`;
  frame.style.backgroundImage = `url("${puzzle.frames[Math.min(guesses, 2)]}")`;
  frame.style.backgroundPosition = guesses === 0 ? 'center' : guesses === 1 ? '45% center' : '55% center';
  $('#frameCount').textContent = Math.min(guesses + 1, 3);
  $('#frameStatus').textContent = guesses === 0 ? 'Look closely.' : guesses === 1 ? 'A little more to go on.' : 'Last look.';
  document.querySelectorAll('.attempt').forEach((attempt, index) => {
    attempt.classList.toggle('filled', index >= guesses);
    attempt.classList.toggle('used', index < guesses);
  });
}

function finish(won) {
  complete = true;
  input.disabled = true;
  $('#guessForm button').disabled = true;
  hideSuggestions();
  $('#frameStatus').textContent = won ? 'That’s it.' : 'Tomorrow brings another frame.';
  feedback.className = `feedback ${won ? 'success' : 'failure'}`;
  feedback.innerHTML = won
    ? `Correct — <em>${puzzle.title}</em> is today’s film.`
    : puzzle.title
      ? `Today’s film was <em>${puzzle.title}</em>.`
      : 'No luck today. A fresh puzzle arrives tomorrow.';
  if (won) {
    playerStats = { ...playerStats, wins: playerStats.wins + 1, plays: playerStats.plays + 1, streak: playerStats.streak + 1 };
    try { localStorage.setItem(statsKey, JSON.stringify(playerStats)); } catch { /* stats remain available this round */ }
    $('#winToast').hidden = false;
    playWinSound();
    window.setTimeout(() => { $('#winToast').hidden = true; showResult(); }, 1000);
  } else {
    playerStats = { ...playerStats, plays: playerStats.plays + 1, streak: 0 };
    try { localStorage.setItem(statsKey, JSON.stringify(playerStats)); } catch { /* stats remain available this round */ }
  }
}

function playWinSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const scheduleClicks = () => {
    const now = context.currentTime + .03;
    [0, .16, .32, .52, .72].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(1180 + index * 95, now + offset);
      oscillator.frequency.exponentialRampToValueAtTime(430 + index * 40, now + offset + .09);
      gain.gain.setValueAtTime(.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(.3, now + offset + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .13);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + offset); oscillator.stop(now + offset + .14);
    });
    window.setTimeout(() => context.close(), 1200);
  };
  if (context.state === 'suspended') context.resume().then(scheduleClicks).catch(() => context.close());
  else scheduleClicks();
}

function showResult() {
  $('#resultFilm').textContent = `${puzzle.title} · ${guesses + 1}/3`;
  $('#streakValue').textContent = playerStats.streak;
  $('#winRateValue').textContent = `${Math.round((playerStats.wins / playerStats.plays) * 100)}%`;
  $('#resultDialog').showModal();
}

function hideSuggestions() {
  const list = $('#suggestions');
  list.hidden = true;
  list.replaceChildren();
}

async function submitGuess(value) {
  if (complete || !value.trim()) return;
  let correct = normalize(value) === normalize(puzzle.title);
  try {
    if (usingLivePuzzle) {
      const result = await requestPuzzle('guess', value);
      correct = result.correct;
      if (result.title) puzzle.title = result.title;
      else if (result.correct) puzzle.title = value.trim();
    }
  } catch {
    feedback.className = 'feedback failure';
    feedback.textContent = 'Could not check that guess. Please try again.';
    return;
  }
  if (correct) {
    finish(true);
    return;
  }
  triggerMissGlitch();
  guesses += 1;
  input.value = '';
  hideSuggestions();
  if (guesses === 3) {
    finish(false);
  } else {
    feedback.className = 'feedback';
    feedback.textContent = `Not quite. Here’s frame ${guesses + 1}.`;
    if (usingLivePuzzle) {
      try {
        const nextFrame = await requestPuzzle('frame', guesses + 1);
        puzzle.frames[guesses] = nextFrame.frameUrl;
      } catch { /* retain the first frame if the connection is interrupted */ }
    }
    updateFrame();
    input.focus();
  }
}

function triggerMissGlitch() {
  const flash = $('#glitchFlash');
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');
  window.setTimeout(() => flash.classList.remove('active'), 420);
}

function showSuggestions(query) {
  const list = $('#suggestions');
  const matches = movieIndex.filter(([title]) => title.toLowerCase().includes(query.toLowerCase())).slice(0, 3);
  if (!query.trim() || !matches.length || complete) return hideSuggestions();
  list.replaceChildren(...matches.map(([title, year]) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `${title} <span>${year}</span>`;
    button.addEventListener('click', () => submitGuess(title));
    item.append(button);
    return item;
  }));
  list.hidden = false;
}

$('#guessForm').addEventListener('submit', (event) => {
  event.preventDefault();
  submitGuess(input.value);
});

input.addEventListener('input', () => showSuggestions(input.value));
input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideSuggestions();
});

function lockHints(chosenHint, hintType) {
  document.querySelectorAll('.hint').forEach((hint) => {
    hint.disabled = true;
    hint.classList.toggle('chosen', hint === chosenHint);
  });
  if (hintType) {
    try { localStorage.setItem(`blrrdle-hint-${puzzle.number}`, hintType); } catch { /* private browsing: lock remains for this visit */ }
  }
}

$('#yearHint').addEventListener('click', async (event) => {
  if (usingLivePuzzle) {
    try { puzzle.year = String((await requestPuzzle('hint', 'year')).value); } catch { return; }
  }
  lockHints(event.currentTarget, 'year');
  $('#yearValue').textContent = puzzle.year;
});
$('#genreHint').addEventListener('click', async (event) => {
  if (usingLivePuzzle) {
    try { puzzle.genre = String((await requestPuzzle('hint', 'genre')).value); } catch { return; }
  }
  lockHints(event.currentTarget, 'genre');
  $('#genreValue').textContent = puzzle.genre;
});

function restoreHint() {
  let chosenHint;
  try { chosenHint = localStorage.getItem(`blrrdle-hint-${puzzle.number}`); } catch { return; }
  if (chosenHint === 'year') {
    $('#yearValue').textContent = puzzle.year;
    lockHints($('#yearHint'));
  }
  if (chosenHint === 'genre') {
    $('#genreValue').textContent = puzzle.genre;
    lockHints($('#genreHint'));
  }
}

$('#helpButton').addEventListener('click', () => $('#helpDialog').showModal());
$('#closeHelp').addEventListener('click', () => $('#helpDialog').close());
$('#startButton').addEventListener('click', () => { $('#helpDialog').close(); input.focus(); });
function renderArchive() {
  const list = $('#archiveList');
  const pastCount = puzzleNumber - 1;
  if (!pastCount) {
    list.innerHTML = '<li class="archive-empty">Puzzle #1 is the first entry. Come back tomorrow for the archive.</li>';
    return;
  }
  list.replaceChildren(...Array.from({ length: pastCount }, (_, index) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>#${index + 1}</span><strong>Archived puzzle</strong><em>Completed</em>`;
    return item;
  }));
}
$('#archiveButton').addEventListener('click', () => { renderArchive(); $('#archiveDialog').showModal(); });
$('#closeArchive').addEventListener('click', () => $('#archiveDialog').close());
async function shareResult() {
  const text = `Blrrdle ${puzzle.number}: ${guesses + 1}/3 ✦`;
  try { await navigator.clipboard.writeText(text); return 'Copied'; } catch { return 'Copy unavailable'; }
}
$('#resultShare').addEventListener('click', async (event) => {
  event.currentTarget.textContent = await shareResult();
});
$('#closeResult').addEventListener('click', () => $('#resultDialog').close());

async function initialiseGame() {
  feedback.textContent = 'Loading today’s frame…';
  await loadLivePuzzle();
  updateFrame();
  restoreHint();
}

initialiseGame();
