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
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();
const authGate = document.querySelector('#auth-gate');
const appShell = document.querySelector('#app-shell');
const authNote = document.querySelector('#auth-note');

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const relativeTime = (date) => {
  if (!date) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
const formatDuration = (milliseconds) => {
  const totalMinutes = Math.floor((milliseconds || 0) / 60000);
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
};
const levelForXp = (xp) => {
  let level = 1;
  while (level < 200 && xp >= (level * 500) + (250 * level * (level - 1)) / 2) level += 1;
  return level;
};

document.querySelector('#google-sign-in').addEventListener('click', async () => {
  authNote.textContent = 'Redirecting to Google sign-in…';
  authNote.classList.remove('error');
  try {
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    authNote.textContent = 'Sign-in could not be started. Check your connection and try again.';
    authNote.classList.add('error');
  }
});

auth.onAuthStateChanged(async (user) => {
  if (user?.email?.toLowerCase() === ALLOWED_EMAIL) {
    authGate.style.display = 'none';
    appShell.classList.add('authenticated');
    subscribeToLiveData();
    return;
  }
  unsubscribeUsers?.();
  unsubscribeMatches?.();
  unsubscribeUsers = null;
  unsubscribeMatches = null;
  appShell.classList.remove('authenticated');
  authGate.style.display = 'grid';
  if (user) {
    authNote.textContent = `Access denied for ${user.email}. Use ${ALLOWED_EMAIL}.`;
    authNote.classList.add('error');
    await auth.signOut();
  }
});

function subscribeToLiveData() {
  unsubscribeUsers?.();
  unsubscribeMatches?.();
  unsubscribeUsers = db.collection('users').onSnapshot((snapshot) => {
    players = snapshot.docs.map((doc) => {
      const data = doc.data();
      const profile = data.profile || {};
      const stats = data.stats || {};
      const lastActive = data.lastActiveAt?.toDate?.() || null;
      const activeRecently = lastActive && Date.now() - lastActive.getTime() < 5 * 60 * 1000;
      return {
        uid: doc.id,
        name: data.displayName || `Player ${doc.id.slice(0, 6)}`,
        initials: (data.displayName || 'P').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        rating: profile.rating || 0,
        level: levelForXp(profile.xp || 0),
        streak: profile.streak?.current || 0,
        playTime: formatDuration(data.playTimeMs || 0),
        playTimeMs: data.playTimeMs || 0,
        matches: stats.matchesPlayed || 0,
        points: profile.points || 0,
        active: relativeTime(lastActive),
        status: activeRecently ? 'Online' : 'Offline',
        color: 'green',
        lastActive,
      };
    });
    renderAllLiveData();
  }, (error) => showToast(`Live player data unavailable: ${error.code || 'error'}`));

  unsubscribeMatches = db.collection('sessions').orderBy('createdAt', 'desc').limit(50).onSnapshot((snapshot) => {
    matches = snapshot.docs.map((doc) => {
      const data = doc.data();
      const startedAt = data.createdAt?.toDate?.() || null;
      const player = players.find((item) => item.uid === data.playerUid);
      const playerName = player?.name || `Player ${(data.playerUid || '').slice(0, 6)}`;
      return {
        id: `#${doc.id.slice(0, 8).toUpperCase()}`,
        playersText: `${playerName} · ${data.opponentName || 'AI opponent'}`,
        winner: data.won ? playerName : (data.opponentName || 'AI opponent'),
        opponentName: data.opponentName || 'AI opponent',
        score: `${data.score?.player ?? 0} — ${data.score?.opponent ?? 0}`,
        started: relativeTime(startedAt),
      };
    });
    renderAllLiveData();
  }, (error) => showToast(`Live match data unavailable: ${error.code || 'error'}`));
}

function renderAllLiveData() {
  renderLeaderboard();
  renderPlayers();
  renderActivity();
  renderMatches();
  const active = players.filter((player) => player.lastActive && Date.now() - player.lastActive.getTime() < 24 * 60 * 60 * 1000).length;
  const totalPlayTime = players.reduce((sum, player) => sum + (player.playTimeMs || 0), 0);
  document.querySelector('#metric-active').textContent = active;
  document.querySelector('#metric-matches').textContent = players.reduce((sum, player) => sum + player.matches, 0);
  const average = players.length ? totalPlayTime / players.length : 0;
  const totalMinutes = Math.floor(average / 60000);
  document.querySelector('#metric-session').innerHTML = `${Math.floor(totalMinutes / 60)}h <small>${String(totalMinutes % 60).padStart(2, '0')}m</small>`;
  document.querySelector('#last-sync').textContent = 'just now';
}

auth.getRedirectResult().catch((error) => {
  if (error?.code) {
    authNote.textContent = error.code === 'auth/unauthorized-domain'
      ? 'This website is not authorized for sign-in yet.'
      : `Google sign-in failed (${error.code.replace('auth/', '')}).`;
    authNote.classList.add('error');
  }
});

let players = [];
let matches = [];
let unsubscribeUsers = null;
let unsubscribeMatches = null;

const initials = (name) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const avatar = (label, color = '') => `<span class="avatar player-avatar ${color ? `avatar-${color}` : ''}">${label}</span>`;
const fmt = (num) => new Intl.NumberFormat('en-US').format(num);

function renderLeaderboard() {
  document.querySelector('#leaderboard-body').innerHTML = players.slice().sort((a, b) => b.rating - a.rating).slice(0, 5).map((player, index) => `
    <tr><td><span class="rank">${index + 1}</span></td><td><div class="player-cell">${avatar(escapeHtml(player.initials), player.color)}${escapeHtml(player.name)}</div></td><td class="rating">${player.rating}</td><td class="streak">${player.streak ? `★ ${player.streak}d` : '—'}</td><td>${escapeHtml(player.playTime)}</td><td>${fmt(player.points)}</td><td>${escapeHtml(player.active)}</td><td><button class="table-action" aria-label="Open ${escapeHtml(player.name)}">···</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty-state">No live players yet</td></tr>';
}

function renderPlayers(query = '') {
  const filtered = players.filter((player) => player.name.toLowerCase().includes(query.toLowerCase()));
  document.querySelector('#players-body').innerHTML = filtered.map((player) => `
    <tr><td><div class="player-cell">${avatar(escapeHtml(player.initials), player.color)}${escapeHtml(player.name)}</div></td><td class="rating">${player.rating}</td><td>Lvl ${player.level}</td><td class="streak">${player.streak ? `★ ${player.streak} days` : '—'}</td><td>${escapeHtml(player.playTime)}</td><td>${player.matches}</td><td>${escapeHtml(player.active)}</td><td><span class="tag ${player.status === 'Online' ? 'live' : 'archived'}">${escapeHtml(player.status)}</span></td></tr>`).join('') || '<tr><td colspan="8" class="empty-state">No players found</td></tr>';
}

function renderActivity() {
  const recent = matches.slice(0, 5);
  document.querySelector('#activity-list').innerHTML = recent.map((match) => `<div class="activity-item"><span class="activity-bullet gold">◆</span><div><strong>${escapeHtml(match.winner)} won a match</strong><span>${escapeHtml(match.score)} against ${escapeHtml(match.opponentName)}</span></div><span class="activity-time">${escapeHtml(match.started)}</span></div>`).join('') || '<div class="empty-state">No live activity yet</div>';
}

function renderMatches() {
  document.querySelector('#matches-body').innerHTML = matches.map((match) => `<tr><td class="rating">${escapeHtml(match.id)}</td><td>${escapeHtml(match.playersText)}</td><td>${escapeHtml(match.winner)}</td><td>${escapeHtml(match.score)}</td><td>—</td><td>${escapeHtml(match.started)}</td><td><span class="tag scheduled">Completed</span></td></tr>`).join('') || '<tr><td colspan="7" class="empty-state">No live matches yet</td></tr>';
}

function exportPlayers() {
  const rows = [['Player', 'Rating', 'Level', 'Streak', 'Play time ms', 'Matches', 'Points', 'Last active']];
  players.forEach((player) => rows.push([player.name, player.rating, player.level, player.streak, player.playTimeMs, player.matches, player.points, player.lastActive?.toISOString?.() || '']));
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = `fives-and-threes-players-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Live player report exported');
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
  if (event.target.closest('#export-button')) exportPlayers();
});

document.querySelector('#player-search').addEventListener('input', (event) => renderPlayers(event.target.value));
document.querySelector('#panel-date').textContent = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());

renderLeaderboard();
renderPlayers();
renderActivity();
renderMatches();
