this is still incomplete work, with more features to be added

254 Vinyls is a responsive web app that recommends vinyl records to users based on their Spotify listening habits. By connecting your Spotify account, the platform analyzes your favorite artists and genres to provide personalized vinyl suggestions.

## 📖 Features

* 🎵 **Spotify Integration** – Log in with Spotify to fetch your listening data.
* 💿 **Personalized Recommendations** – AI-driven vinyl suggestions tailored to your taste.
* 📱 **Responsive Navigation** – Navigation menu appears on hover or click and adapts to all screen sizes.
* 🖼 **Vinyl Image Library** – Uses an online vinyl image library for rich visuals.
* 🌐 **GitHub Pages Hosting** – Easy deployment and free hosting.

## 📂 Folder Structure

```
254-vinyls/
│
├── index.html          # Landing page  
├── vinyl.html          # Vinyl recommendation page  
├── css/  
│   └── styles.css      # Custom styles  
├── js/  
│   └── script.js       # Interactivity and Spotify API integration  
├── assets/  
│   └── images/         # Placeholder images/icons  
└── README.md           # Project documentation  
```

## 🛠 Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript, TailwindCSS
* **API Integration:** Spotify Web API
* **Hosting:** GitHub Pages

## 🚀 Getting Started

### Prerequisites

* [Node.js 18+](https://nodejs.org/) and npm
* A [Spotify Developer account](https://developer.spotify.com/) with a registered app (for OAuth credentials)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/254-vinyls.git
   cd 254-vinyls
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the template and update it with your Spotify credentials and app URLs.

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   |----------|-------------|
   | `SPOTIFY_CLIENT_ID` | Client ID from the Spotify developer dashboard |
   | `SPOTIFY_CLIENT_SECRET` | Client secret from the Spotify developer dashboard |
   | `SPOTIFY_REDIRECT_URI` | Redirect URI registered in Spotify (e.g. `http://localhost:3000/auth/spotify/callback`) |
   | `POST_LOGIN_REDIRECT` | Where to send users after authenticating (defaults to `/spotify-connect.html`) |
   | `COOKIE_SECRET` | Any random string to sign Spotify session cookies |
   | `PORT` | Optional port override (default `3000`) |

4. **Run the dev server (serves API + static frontend)**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to use the app.

### Deploying to GitHub Pages

1. Push your project to a GitHub repository.
2. On GitHub, go to **Settings > Pages**.
3. Under **Source**, choose the `main` branch and `/ (root)` folder.
4. Click **Save**—your site will be live at:

   ```
   https://your-username.github.io/254-vinyls/
   ```

## 📸 Screenshots

*Add screenshots or GIFs showcasing your site here.*

## 🎧 Spotify API integration

The backend implements the Authorization Code flow with refresh tokens. Once users connect their Spotify account, the server stores access + refresh tokens in signed HTTP-only cookies and exposes a few proxy endpoints:

* `GET /api/spotify/profile` – Spotify profile details
* `GET /api/spotify/top-artists` – Top 10 artists
* `GET /api/spotify/top-tracks` – Top 10 tracks
* `GET /api/vinyls/recommended` – Vinyl picks matched to their listening trends
* `GET /api/vinyls` – Public vinyl catalog used by the store page

Utility routes:

* `GET /auth/spotify` – Initiates the OAuth flow
* `GET /auth/spotify/callback` – Handles Spotify redirect and persists tokens
* `POST /auth/spotify/refresh` – Forces a refresh token exchange
* `POST /auth/spotify/logout` – Clears all stored Spotify cookies

All Spotify requests are made server-side. The frontend only calls your API, keeping the client secret safe and enabling secure refresh token rotation.

## 🧪 Local testing checklist

* Connect a Spotify account via `spotify-connect.html`
* Verify top artists/tracks render correctly and recommended vinyls populate
* Refresh the session (`Refresh data` button) to confirm token rotation
* Browse `vinyl.html` and use the genre/sort filters powered by `/api/vinyls`

## 🧩 Future Improvements

* Add shopping cart and checkout integration.
* Improve AI recommendations with more data points.
* Include search, filter, and sort options for vinyls. ✅ (initial filters added)
* Build a backend for user accounts and persistent preferences.

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo.
2. Create a feature branch:

   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:

   ```bash
   git commit -m "Add feature-name"
   ```
4. Push to the branch:

   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---
