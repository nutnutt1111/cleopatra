export function initAuthTheme() {
  const savedTheme = localStorage.getItem('cleopatra-theme') || 'neutral';
  const savedMode = localStorage.getItem('cleopatra-mode') || 'light';

  document.documentElement.setAttribute('data-theme', savedTheme);

  if (savedMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function markAuthPageLoaded() {
  document.body.classList.add('loaded');
}
