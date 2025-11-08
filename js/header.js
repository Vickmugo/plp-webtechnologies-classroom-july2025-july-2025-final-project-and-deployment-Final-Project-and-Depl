document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const open = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    mainNav.addEventListener('click', (event) => {
      if (event.target.tagName === 'A') {
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const greetings = [
    'Welcome to 254 Vinyls — Kenyan & global vinyl for every mood',
    'Weekly bargains — Check the Black Friday-style deals',
    'Trade-in your old records — Earn store credit',
    'New releases + classics — Curated for collectors'
  ];

  const greetingElement = document.getElementById('greetingText');
  if (greetingElement) {
    let index = 0;
    setInterval(() => {
      index = (index + 1) % greetings.length;
      greetingElement.textContent = greetings[index];
    }, 8000);
  }
});
