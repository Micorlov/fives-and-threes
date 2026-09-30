const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAhqEJy-gh4QuZivbfhlXET351x1-UguJU',
  authDomain: 'fives-and-threes-multiplayer.firebaseapp.com',
  projectId: 'fives-and-threes-multiplayer',
  storageBucket: 'fives-and-threes-multiplayer.firebasestorage.app',
  messagingSenderId: '338474059683',
  appId: '1:338474059683:web:0fc200b1f24974a55a3c16',
};
const ALLOWED_EMAIL = 'micorlov@gmail.com';

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
const authGate = document.querySelector('#auth-gate');
const appShell = document.querySelector('#app-shell');
const authNote = document.querySelector('#auth-note');

document.querySelector('#google-sign-in').addEventListener('click', async () => {
  authNote.textContent = 'Redirecting to Google sign-in…';
  authNote.classList.remove('error');
  try {
    await auth.signInWithRedirect(googleProvider);
  } catch (error) {
    authNote.textContent = 'Sign-in could not be started. Check your connection and try again.';
    authNote.classList.add('error');
  }
});

auth.onAuthStateChanged(async (user) => {
  if (user?.email?.toLowerCase() === ALLOWED_EMAIL) {
    authGate.style.display = 'none';
    appShell.classList.add('authenticated');
    return;
  }
  appShell.classList.remove('authenticated');
  authGate.style.display = 'grid';
  if (user) {
    authNote.textContent = `Access denied for ${user.email}. Use ${ALLOWED_EMAIL}.`;
    authNote.classList.add('error');
    await auth.signOut();
  }
});

const players = [
  { name: 'Michael Orlov', initials: 'MO', rating: 1286, level: 18, streak: 12, playTime: '9h 24m', matches: 48, points: 2840, active: '2m ago', status: 'Online', color: 'gold' },
  { name: 'Bella Theriault', initials: 'BT', rating: 1214, level: 15, streak: 7, playTime: '7h 16m', matches: 39, points: 2190, active: '8m ago', status: 'Online', color: 'rose' },
  { name: 'Josephine', initials: 'JO', rating: 1188, level: 13, streak: 4, playTime: '5h 42m', matches: 31, points: 1735, active: '18m ago', status: 'Online', color: 'blue' },
  { name: 'Alec Snyder', initials: 'AS', rating: 1112, level: 10, streak: 2, playTime: '3h 08m', matches: 24, points: 990, active: '1h ago', status: 'Away', color: 'green' },
  { name: 'Mikhail V.', initials: 'MV', rating: 1064, level: 8, streak: 0, playTime: '2h 11m', matches: 17, points: 612, active: '3h ago', status: 'Away', color: 'purple' },
  { name: 'Kittie Hawks', initials: 'KH', rating: 982, level: 6, streak: 1, playTime: '58m', matches: 9, points: 288, active: 'Yesterday', status: 'Offline', color: 'slate' },
];

const activities = [
  ['◆', 'Michael won a match', 'Score 121 — streak extended to 12 days', '2m ago', ''],
  ['★', 'Bella claimed daily reward', 'Day 7 reward · +250 points', '8m ago', 'gold'],
  ['▦', 'Josephine unlocked milestone', 'Century Club · 100 points in a match', '18m ago', 'blue'],
  ['♙', 'Alec joined a new match', 'Playing against Mikhail V.', '1h ago', ''],
  ['✦', 'New player registered', 'Welcome to the table, Rachel Hall', '2h ago', 'gold'],
];

const matches = [
  ['#FT-0126', 'Michael Orlov · Bella Theriault', 'Michael Orlov', '121 — 88', '14m 22s', '2m ago', 'Completed'],
  ['#FT-0125', 'Josephine · Alec Snyder', 'Josephine', '121 — 97', '18m 04s', '18m ago', 'Completed'],
  ['#FT-0124', 'Mikhail V. · Kittie Hawks', 'Mikhail V.', '82 — 61', '9m 40s', '42m ago', 'Completed'],
  ['#FT-0123', 'Michael Orlov · AI opponent', 'Michael Orlov', '121 — 64', '11m 09s', '1h ago', 'Completed'],
  ['#FT-0122', 'Bella Theriault · AI opponent', '—', 'In progress', '—', '1h ago', 'Live'],
];

const initials = (name) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const avatar = (label, color = '') => `<span class="avatar player-avatar ${color ? `avatar-${color}` : ''}">${label}</span>`;
const fmt = (num) => new Intl.NumberFormat('en-US').format(num);

function renderLeaderboard() {
  document.querySelector('#leaderboard-body').innerHTML = players.slice(0, 5).map((player, index) => `
    <tr><td><span class="rank">${index + 1}</span></td><td><div class="player-cell">${avatar(player.initials, player.color)}${player.name}</div></td><td class="rating">${player.rating}</td><td class="streak">${player.streak ? `★ ${player.streak}d` : '—'}</td><td>${player.playTime}</td><td>${fmt(player.points)}</td><td>${player.active}</td><td><button class="table-action" aria-label="Open ${player.name}">···</button></td></tr>`).join('');
}

function renderPlayers(query = '') {
  const filtered = players.filter((player) => player.name.toLowerCase().includes(query.toLowerCase()));
  document.querySelector('#players-body').innerHTML = filtered.map((player) => `
    <tr><td><div class="player-cell">${avatar(player.initials, player.color)}${player.name}</div></td><td class="rating">${player.rating}</td><td>Lvl ${player.level}</td><td class="streak">${player.streak ? `★ ${player.streak} days` : '—'}</td><td>${player.playTime}</td><td>${player.matches}</td><td>${player.active}</td><td><span class="tag ${player.status === 'Online' ? 'live' : 'archived'}">${player.status}</span></td></tr>`).join('') || '<tr><td colspan="8" class="empty-state">No players found</td></tr>';
}

function renderActivity() {
  document.querySelector('#activity-list').innerHTML = activities.map(([icon, title, detail, time, tone]) => `<div class="activity-item"><span class="activity-bullet ${tone}">${icon}</span><div><strong>${title}</strong><span>${detail}</span></div><span class="activity-time">${time}</span></div>`).join('');
}

function renderMatches() {
  document.querySelector('#matches-body').innerHTML = matches.map(([id, playersText, winner, score, duration, started, result]) => `<tr><td class="rating">${id}</td><td>${playersText}</td><td>${winner}</td><td>${score}</td><td>${duration}</td><td>${started}</td><td><span class="tag ${result === 'Live' ? 'live' : 'scheduled'}">${result}</span></td></tr>`).join('');
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tabName}`));
  const labels = { overview: 'Overview', players: 'Players', matches: 'Matches', content: 'Content & rewards', notifications: 'Notifications', analytics: 'Analytics', health: 'Health' };
  document.querySelector('#page-title').textContent = labels[tabName] || 'Overview';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-tab]');
  const target = event.target.closest('[data-tab-target]');
  if (nav) switchTab(nav.dataset.tab);
  if (target) switchTab(target.dataset.tabTarget);
  if (event.target.closest('#refresh-button, #activity-refresh')) {
    document.querySelector('#last-sync').textContent = 'just now';
    showToast('Dashboard data refreshed');
  }
  if (event.target.closest('#export-button')) showToast('Report ready — local export simulated');
  if (event.target.closest('#add-player')) showToast('Test player added to the local preview');
  if (event.target.closest('#save-content')) showToast('Content settings saved locally');
  if (event.target.closest('#compose-notification')) showToast('Notification composer is ready');
  if (event.target.closest('#send-test')) showToast('Test notification queued locally');
});

document.querySelector('#player-search').addEventListener('input', (event) => renderPlayers(event.target.value));
document.querySelector('#chart-range').addEventListener('change', (event) => showToast(`Showing ${event.target.value.toLowerCase()}`));

renderLeaderboard();
renderPlayers();
renderActivity();
renderMatches();
