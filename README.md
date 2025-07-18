# Yousif's Projects

This repository hosts a few small front-end projects. The newest addition is a Spotify stats page that shows your top tracks and artists. To use it you need a Spotify developer account.

## Spotify Setup
1. Create a Spotify developer application at [Spotify Developer Dashboard](https://developer.spotify.com/).
2. In your app settings enable **Implicit Grant** and add `http://localhost/spotify.html` (or the GitHub Pages URL you use, e.g. `https://USERNAME.github.io/Yousif/spotify.html`) as a redirect URI.
=======
2. Add `http://localhost/spotify.html` (or whichever URL you use to serve `spotify.html`) as a redirect URI in your app settings.
3. Serve the project over HTTP (for example, `npx serve` or `python3 -m http.server`) and open `spotify.html`.
4. Enter your **Client ID** in the field on the page (replace the `YOUR_SPOTIFY_CLIENT_ID` placeholder) and log in with Spotify when prompted. The page remembers it for next time and automatically loads your top tracks after authentication.

If Spotify shows an `INVALID_CLIENT` error, double-check that your client ID is correct and that the redirect URI exactly matches what you configured on the dashboard.
