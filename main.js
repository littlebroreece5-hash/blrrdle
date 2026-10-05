const today = new Date();
const launchDate = new Date(2026, 9, 4);
const puzzleNumber = Math.max(1, Math.floor((today - launchDate) / 86400000) + 1);
const dailyPuzzleEndpoint = 'https://qgomsmdzbxlujbtgebdw.supabase.co/functions/v1/daily-puzzle';

// This deliberately contains no answer. It only keeps the layout usable if the
// hosted endpoint is temporarily unreachable while previewing the page locally.
let puzzle = { number: String(puzzleNumber), title: '', year: '', genre: '', frames: ['', '', ''] };
let usingLivePuzzle = false;
let selectedArchivePuzzle = null;
let todayPuzzleNumber = String(puzzleNumber);

// Archive choices are intentionally one-time. A refresh always returns a player to today.
try {
  selectedArchivePuzzle = Number(sessionStorage.getItem('blrrdle-open-archive-puzzle')) || null;
  sessionStorage.removeItem('blrrdle-open-archive-puzzle');
} catch { /* session storage is optional */ }
if (new URLSearchParams(location.search).has('puzzle')) {
  history.replaceState(null, '', location.pathname);
}

// Suggestions are a public film-search starter list, not the private puzzle catalogue.
const movieIndex = [
  ['12 Angry Men', '1957'], ['2001: A Space Odyssey', '1968'], ['A Clockwork Orange', '1971'], ['Alien', '1979'],
  ['All the President’s Men', '1976'], ['Amadeus', '1984'], ['Apocalypse Now', '1979'], ['Arrival', '2016'],
  ['Back to the Future', '1985'], ['Barbie', '2023'], ['Beetlejuice', '1988'], ['Birdman', '2014'],
  ['Black Swan', '2010'], ['Blade Runner', '1982'], ['Boogie Nights', '1997'], ['The Breakfast Club', '1985'],
  ['Casablanca', '1942'], ['Catch Me If You Can', '2002'], ['Children of Men', '2006'], ['Chinatown', '1974'],
  ['The Conformist', '1970'], ['The Dark Knight', '2008'], ['The Departed', '2006'], ['Die Hard', '1988'],
  ['Do the Right Thing', '1989'], ['Donnie Darko', '2001'], ['Dune', '2021'], ['E.T. the Extra-Terrestrial', '1982'],
  ['Edward Scissorhands', '1990'], ['Everything Everywhere All at Once', '2022'], ['Ex Machina', '2014'], ['The Exorcist', '1973'],
  ['Fight Club', '1999'], ['The Florida Project', '2017'], ['The French Dispatch', '2021'], ['Get Out', '2017'],
  ['The Godfather', '1972'], ['The Godfather Part II', '1974'], ['Goodfellas', '1990'], ['The Grand Budapest Hotel', '2014'],
  ['Halloween', '1978'], ['Heat', '1995'], ['Her', '2013'], ['Inception', '2010'], ['Indiana Jones and the Raiders of the Lost Ark', '1981'],
  ['Inglourious Basterds', '2009'], ['Interstellar', '2014'], ['Jaws', '1975'], ['Kill Bill: Vol. 1', '2003'], ['Knives Out', '2019'],
  ['La La Land', '2016'], ['Lady Bird', '2017'], ['The Lighthouse', '2019'], ['Little Miss Sunshine', '2006'],
  ['Lost in Translation', '2003'], ['Mad Max: Fury Road', '2015'], ['The Matrix', '1999'], ['Memento', '2000'],
  ['Moonlight', '2016'], ['Mulholland Drive', '2001'], ['No Country for Old Men', '2007'], ['Nope', '2022'],
  ['Once Upon a Time in Hollywood', '2019'], ['The Others', '2001'], ['Oppenheimer', '2023'], ['Panic Room', '2002'],
  ['Parasite', '2019'], ['Past Lives', '2023'], ['The Prestige', '2006'], ['Prisoners', '2013'],
  ['Psycho', '1960'], ['Pulp Fiction', '1994'], ['The Princess Bride', '1987'], ['Raging Bull', '1980'],
  ['The Revenant', '2015'], ['The Royal Tenenbaums', '2001'], ['Scream', '1996'], ['Se7en', '1995'],
  ['The Shawshank Redemption', '1994'], ['The Shining', '1980'], ['Shutter Island', '2010'], ['The Silence of the Lambs', '1991'],
  ['Singin’ in the Rain', '1952'], ['The Social Network', '2010'], ['Spider-Man: Into the Spider-Verse', '2018'], ['Star Wars', '1977'],
  ['The Thing', '1982'], ['There Will Be Blood', '2007'], ['The Truman Show', '1998'], ['Uncut Gems', '2019'],
  ['Vertigo', '1958'], ['Whiplash', '2014'], ['The Wizard of Oz', '1939'], ['Zodiac', '2007'],
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

async function requestPuzzle(action, value, extra = {}) {
  const response = await fetch(dailyPuzzleEndpoint, {
    method: action ? 'POST' : 'GET',
    headers: action ? { 'Content-Type': 'application/json' } : undefined,
    body: action ? JSON.stringify({ action, value, puzzleNumber: selectedArchivePuzzle, ...extra }) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Unable to load today’s puzzle.');
  return payload;
}

async function loadLivePuzzle() {
  try {
    const todayResponse = await fetch(dailyPuzzleEndpoint);
    const todayPuzzle = await todayResponse.json();
    if (!todayResponse.ok) throw new Error(todayPuzzle.error || 'Unable to load today’s puzzle.');
    todayPuzzleNumber = String(todayPuzzle.number);

    let livePuzzle = todayPuzzle;
    if (selectedArchivePuzzle && String(selectedArchivePuzzle) !== todayPuzzleNumber) {
      const archiveResponse = await fetch(`${dailyPuzzleEndpoint}?puzzle=${selectedArchivePuzzle}`);
      livePuzzle = await archiveResponse.json();
      if (!archiveResponse.ok) throw new Error(livePuzzle.error || 'Unable to load puzzle.');
    }
    puzzle = { ...puzzle, number: String(livePuzzle.number), frames: [livePuzzle.frameUrl, '', ''] };
    usingLivePuzzle = true;
    $('#puzzleNumber').textContent = `#${puzzle.number}`;
    feedback.textContent = '';
  } catch {
    feedback.className = 'feedback failure';
    feedback.textContent = 'Today’s frame is unavailable. Please try again shortly.';
  }
  if (!usingLivePuzzle) document.querySelectorAll('.hint').forEach((hint) => { hint.disabled = true; });
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function updateFrame() {
  frame.className = `film-frame reveal-${Math.min(guesses + 1, 3)}`;
  frame.style.backgroundImage = `url("${puzzle.frames[0]}")`;
  frame.style.backgroundPosition = guesses === 0 ? 'center' : guesses === 1 ? '45% center' : '55% center';
  $('#frameCount').textContent = Math.min(guesses + 1, 3);
  $('#frameStatus').textContent = guesses === 0 ? 'Look closely.' : guesses === 1 ? 'A little more to go on.' : 'Last look.';
  document.querySelectorAll('.attempt').forEach((attempt, index) => {
    attempt.classList.toggle('filled', index >= guesses);
    attempt.classList.toggle('used', index < guesses);
  });
}

function progressKey() {
  return `blrrdle-progress-${puzzle.number}`;
}

function saveProgress(won = null) {
  try {
    localStorage.setItem(progressKey(), JSON.stringify({ guesses, complete, won }));
  } catch { /* progress remains available this visit */ }
}

function restoreProgress() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(progressKey())); } catch {
    try { localStorage.removeItem(progressKey()); } catch { /* nothing to restore */ }
    return;
  }
  if (!saved || !Number.isInteger(saved.guesses) || saved.guesses < 0 || saved.guesses > 3) return;

  guesses = saved.guesses;
  complete = saved.complete === true;
  if (!complete) {
    if (guesses > 0) feedback.textContent = `Your previous guess is saved. Here’s frame ${Math.min(guesses + 1, 3)}.`;
    return;
  }

  input.disabled = true;
  $('#guessForm button').disabled = true;
  feedback.className = `feedback ${saved.won ? 'success' : 'failure'}`;
  feedback.textContent = 'This puzzle is already complete.';
}

function finish(won) {
  complete = true;
  saveProgress(won);
  try { localStorage.setItem(`blrrdle-complete-${puzzle.number}`, 'true'); } catch { /* progress remains available this visit */ }
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
    $('#lossToastText').textContent = puzzle.title ? `The answer: ${puzzle.title}` : 'Out of guesses.';
    $('#lossToast').hidden = false;
    window.setTimeout(() => { $('#lossToast').hidden = true; showResult(); }, 1000);
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
  $('#resultEyebrow').textContent = complete && guesses === 3 ? 'Final frame' : 'Picture perfect';
  $('#resultTitle').textContent = complete && guesses === 3 ? 'The answer was.' : 'You got it.';
  $('#resultFilm').textContent = `${puzzle.title} · ${Math.min(guesses + 1, 3)}/3`;
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
      const result = await requestPuzzle('guess', value, { attempt: guesses + 1 });
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
  saveProgress();
  input.value = '';
  hideSuggestions();
  if (guesses === 3) {
    finish(false);
  } else {
    feedback.className = 'feedback';
    feedback.textContent = `Not quite. Here’s frame ${guesses + 1}.`;
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

function lockHints(chosenHint) {
  document.querySelectorAll('.hint').forEach((hint) => {
    hint.disabled = true;
    hint.classList.toggle('chosen', hint === chosenHint);
  });
}

function saveHint(type, value) {
  try { localStorage.setItem(`blrrdle-hint-${puzzle.number}`, JSON.stringify({ type, value })); } catch { /* private browsing: value remains visible this visit */ }
}

async function revealHint(type, button, valueElement) {
  if (!usingLivePuzzle) {
    feedback.className = 'feedback failure';
    feedback.textContent = 'Hints are unavailable until today\'s frame has loaded.';
    return;
  }
  try {
    const result = await requestPuzzle('hint', type);
    const value = result?.value;
    if (value === undefined || value === null || value === '') throw new Error('Missing hint value');
    puzzle[type] = String(value);
    valueElement.textContent = puzzle[type];
    lockHints(button);
    saveHint(type, puzzle[type]);
  } catch {
    feedback.className = 'feedback failure';
    feedback.textContent = 'That hint could not be loaded. Please try again.';
  }
}

$('#yearHint').addEventListener('click', (event) => revealHint('year', event.currentTarget, $('#yearValue')));
$('#genreHint').addEventListener('click', (event) => revealHint('genre', event.currentTarget, $('#genreValue')));

function restoreHint() {
  let savedHint;
  const storageKey = `blrrdle-hint-${puzzle.number}`;
  try { savedHint = JSON.parse(localStorage.getItem(storageKey)); } catch {
    try { localStorage.removeItem(storageKey); } catch { /* nothing to restore */ }
    return;
  }
  if (!savedHint || !['year', 'genre'].includes(savedHint.type) || !savedHint.value) return;
  puzzle[savedHint.type] = String(savedHint.value);
  const valueElement = savedHint.type === 'year' ? $('#yearValue') : $('#genreValue');
  const button = savedHint.type === 'year' ? $('#yearHint') : $('#genreHint');
  valueElement.textContent = puzzle[savedHint.type];
  lockHints(button);
}

$('#helpButton').addEventListener('click', () => $('#helpDialog').showModal());
$('#closeHelp').addEventListener('click', () => $('#helpDialog').close());
$('#startButton').addEventListener('click', () => { $('#helpDialog').close(); input.focus(); });
async function renderArchive() {
  const list = $('#archiveList');
  list.innerHTML = '<li class="archive-empty">Loading past puzzles…</li>';
  try {
    const archive = await requestPuzzle('archive');
    const puzzles = archive.puzzles ?? [];
    if (!puzzles.length) {
      list.innerHTML = '<li class="archive-empty">No past puzzles yet. Come back tomorrow.</li>';
      return;
    }
    list.replaceChildren(...puzzles.map((archivePuzzle) => {
    const item = document.createElement('li');
    const done = localStorage.getItem(`blrrdle-complete-${archivePuzzle.puzzle_number}`) === 'true';
    const isToday = String(archivePuzzle.puzzle_number) === todayPuzzleNumber;
    const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${archivePuzzle.puzzle_date}T00:00:00Z`));
    item.innerHTML = `<span>#${archivePuzzle.puzzle_number}</span><em>${date}${done ? ' · Completed' : ''}</em>`;
    if (isToday || !done) {
      const play = document.createElement('button');
      play.type = 'button';
      play.textContent = isToday ? 'Today' : 'Play';
      play.addEventListener('click', () => {
        try {
          if (isToday) sessionStorage.removeItem('blrrdle-open-archive-puzzle');
          else sessionStorage.setItem('blrrdle-open-archive-puzzle', String(archivePuzzle.puzzle_number));
        } catch { /* session storage is optional */ }
        location.assign(location.pathname);
      });
      item.append(play);
    }
    return item;
    }));
  } catch {
    list.innerHTML = '<li class="archive-empty">The archive is temporarily unavailable.</li>';
  }
}
$('#archiveButton').addEventListener('click', () => { $('#archiveDialog').showModal(); renderArchive(); });
$('#closeArchive').addEventListener('click', () => $('#archiveDialog').close());
async function shareResult() {
  const text = `Blrrdle ${puzzle.number}: ${Math.min(guesses + 1, 3)}/3 ✦\nhttps://blrrdle.com`;
  try { await navigator.clipboard.writeText(text); return 'Copied'; } catch { return 'Copy unavailable'; }
}
$('#resultShare').addEventListener('click', async (event) => {
  event.currentTarget.textContent = await shareResult();
});
$('#closeResult').addEventListener('click', () => $('#resultDialog').close());

async function initialiseGame() {
  feedback.textContent = 'Loading today’s frame…';
  await loadLivePuzzle();
  restoreProgress();
  updateFrame();
  restoreHint();
}

initialiseGame();
