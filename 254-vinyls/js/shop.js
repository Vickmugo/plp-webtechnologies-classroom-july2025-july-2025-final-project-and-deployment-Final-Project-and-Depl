document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('vinylGrid');
  if(!grid) return;

  // Placeholder: fetch from your backend /api/vinyls
  const vinyls = await fetch('/api/vinyls').then(r=>r.json()).catch(()=> [
    {id:1,artist:'Adele',title:'30',price:4500,genre:'Pop',img:'images/adele.jpg',trade:true,sale:false},
    {id:2,artist:'Sauti Sol',title:'Live and Die...',price:3200,genre:'Kenyan',img:'images/Sauti Sol - Kenyan favorite.jpeg',trade:false,sale:true},
  ]);

  function render(list){
    grid.innerHTML = '';
    list.forEach(v=>{
      const a = document.createElement('article'); a.className='vinyl-card';
      a.innerHTML = `
        <img src="${v.img}" alt="${v.title} — ${v.artist}">
        <div class="card-body">
          <h3>${v.title}</h3>
          <p class="artist">${v.artist}</p>
          <p class="meta">${v.genre}</p>
          <div class="price-row"><span class="price">KSh ${v.price}</span><button class="btn small" data-id="${v.id}">Add to cart</button></div>
          <div class="badges">${v.trade?'<span class="badge">Trade-in</span>':''}${v.sale?'<span class="badge sale">Sale</span>':''}</div>
        </div>`;
      grid.appendChild(a);
    });
  }
  render(vinyls);

  // wire filters quickly (example)
  document.getElementById('filterGenre').addEventListener('change', (e)=>{
    const val = e.target.value;
    render(val ? vinyls.filter(v=>v.genre===val) : vinyls);
  });
});
