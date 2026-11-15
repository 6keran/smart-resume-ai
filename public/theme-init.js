(function() {
  try {
    var t = 'light';
    var m = t === 'dark' ? 'dark' : 'light';
    var r = document.documentElement;
    r.classList.remove('dark');
    r.classList.add('light');
    r.setAttribute('data-theme', 'light');
    r.style.colorScheme = 'light';
  } catch (e) {}
})();
