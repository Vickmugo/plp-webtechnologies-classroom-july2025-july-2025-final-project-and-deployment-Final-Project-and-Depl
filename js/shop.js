document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('vinylGrid');
  if (!grid) return;

  const genreSelect = document.getElementById('filterGenre');
  const sortSelect = document.getElementById('sortBy');

  let vinyls = [];
  try {
    const response = await fetch('/api/vinyls');
    if (response.ok) {
      vinyls = await response.json();
    }
  } catch (error) {
    console.error('Failed to load vinyl catalog from API, using fallback dataset.', error);
  }

  if (!vinyls.length) {
    vinyls = getFallbackVinyls();
  }

  populateGenres(vinyls, genreSelect);
  applyFilters();

  genreSelect?.addEventListener('change', applyFilters);
  sortSelect?.addEventListener('change', applyFilters);

  function applyFilters() {
    const selectedGenre = genreSelect?.value || '';
    const sortBy = sortSelect?.value || 'popular';

    let list = [...vinyls];

    if (selectedGenre) {
      list = list.filter((vinyl) => (vinyl.genre || '').toLowerCase() === selectedGenre.toLowerCase());
    }

    list = sortVinyls(list, sortBy);
    render(list);
  }

  function render(list) {
    if (!list.length) {
      grid.innerHTML = '<p>No vinyls match your filters yet.</p>';
      return;
    }

    const currency = list[0]?.currency || 'KES';
    const formatPrice = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency
    });

    grid.innerHTML = list
      .map((vinyl) => {
        const badges = [
          vinyl.trade ? '<span class="badge">Trade-in</span>' : '',
          vinyl.sale ? '<span class="badge sale">Sale</span>' : ''
        ]
          .filter(Boolean)
          .join('');

        return `
          <article class="vinyl-card">
            <img src="${vinyl.img}" alt="${vinyl.title} — ${vinyl.artist}" loading="lazy">
            <div class="card-body">
              <div class="card-title">
                <h3>${vinyl.title}</h3>
                ${vinyl.releaseYear ? `<span class="badge year">${vinyl.releaseYear}</span>` : ''}
              </div>
              <p class="artist">${vinyl.artist} ${vinyl.genre ? `• ${vinyl.genre}` : ''}</p>
              <p class="meta">${vinyl.description || ''}</p>
              <div class="price-row">
                <span class="price">${formatPrice.format(vinyl.price || 0)}</span>
                <button class="btn small tertiary" data-id="${vinyl.id}" type="button">Add to cart</button>
              </div>
              <div class="badges">
                ${badges}
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }
});

function populateGenres(vinyls, select) {
  if (!select) return;
  const genres = Array.from(
    new Set(
      vinyls
        .map((vinyl) => vinyl.genre)
        .filter(Boolean)
        .map((genre) => genre.trim())
    )
  ).sort((a, b) => a.localeCompare(b));

  const options = ['<option value="">All</option>', ...genres.map((genre) => `<option value="${genre}">${genre}</option>`)];
  select.innerHTML = options.join('');
}

function sortVinyls(list, sortBy) {
  switch (sortBy) {
    case 'new':
      return list.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
    case 'price-low':
      return list.sort((a, b) => (a.price || 0) - (b.price || 0));
    case 'price-high':
      return list.sort((a, b) => (b.price || 0) - (a.price || 0));
    case 'popular':
    default:
      return list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }
}

function getFallbackVinyls() {
  return [
    {
      id: 'adele-30',
      artist: 'Adele',
      title: '30',
      genre: 'Pop',
      releaseYear: 2021,
      popularity: 95,
      price: 4500,
      currency: 'KES',
      img: 'images/Adele.jpg',
      description: 'Limited edition heavyweight pressing with poster insert.',
      trade: true,
      sale: false
    },
    {
      id: 'sauti-sol-midnight-train',
      artist: 'Sauti Sol',
      title: 'Midnight Train',
      genre: 'Afro-pop',
      releaseYear: 2020,
      popularity: 92,
      price: 3800,
      currency: 'KES',
      img: 'images/Sauti Sol - Kenyan favorite.jpeg',
      description: 'Kenyan Afropop excellence on 180g vinyl.',
      trade: false,
      sale: true
    },
    {
      id: 'kendrick-lamar-damn',
      artist: 'Kendrick Lamar',
      title: 'DAMN.',
      genre: 'Hip Hop',
      releaseYear: 2017,
      popularity: 96,
      price: 4700,
      currency: 'KES',
      img: 'images/coverimage.png',
      description: 'Pulitzer-winning hip-hop classic, double LP.',
      trade: true,
      sale: false
    }
  ];
}
