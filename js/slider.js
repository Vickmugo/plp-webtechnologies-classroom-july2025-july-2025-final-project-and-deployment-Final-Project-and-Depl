document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('artistSlider');
  if(!slider) return;
  const slides = Array.from(slider.querySelectorAll('.slide'));
  let idx = 0;
  const show = (i) => {
    slides.forEach((s,si)=> s.classList.toggle('active', si===i));
  };
  show(idx);

  // auto-rotate (interval can be controlled or replaced with backend-driven data)
  const intervalMS = 6000;
  let timer = setInterval(()=> { idx = (idx+1) % slides.length; show(idx); }, intervalMS);

  // manual controls
  document.getElementById('prevSlide').addEventListener('click', ()=>{ clearInterval(timer); idx = (idx-1+slides.length)%slides.length; show(idx); });
  document.getElementById('nextSlide').addEventListener('click', ()=>{ clearInterval(timer); idx = (idx+1)%slides.length; show(idx); });

  // Optional: pause on hover to improve accessibility
  slider.addEventListener('mouseenter', ()=> clearInterval(timer));
  slider.addEventListener('mouseleave', ()=> timer = setInterval(()=> { idx = (idx+1) % slides.length; show(idx); }, intervalMS));
});
