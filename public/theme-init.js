(function() {
  try {
    var t = localStorage.getItem('smart_resume_theme') || localStorage.getItem('theme');
    var d = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    var m = t === 'light' || t === 'dark' ? t : (t === 'system' ? d : 'dark');
    var r = document.documentElement;
    r.classList.remove('light', 'dark');
    r.classList.add(m);
    r.setAttribute('data-theme', m);
    r.style.colorScheme = m;
  } catch (e) {}
})();
