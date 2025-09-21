document.addEventListener('DOMContentLoaded', () => {
  // mobile menu
  const btn = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if(btn && nav){
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // optional: change greeting messages every few seconds (for variety)
  const greetings = [
    'Welcome to 254 Vinyls — Kenyan & global vinyl for every mood',
    'Weekly bargains — Check the Black Friday-style deals',
    'Trade-in your old records — Earn store credit',
    'New releases + classics — Curated for collectors'
  ];
  const gEl = document.getElementById('greetingText');
  if(gEl){
    let i=0;
    setInterval(()=> {
      i = (i+1) % greetings.length;
      // cross-fade by temporarily changing text then letting animation continue
      gEl.textContent = greetings[i];
    }, 8000);
  }
  const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');

// Toggle nav on button click
menuToggle.addEventListener('click', () => {
  mainNav.classList.toggle('open');
});
// Close nav when a link is clicked (for single-page behavior)
mainNav.addEventListener('click', (e) => {
  if(e.target.tagName === 'A'){
    mainNav.classList.remove('open');
  }
}
);
}); 
