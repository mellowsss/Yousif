# Yousif's Projects

This repository hosts a few small front-end projects. The newest addition is a Spotify stats page that shows your top tracks and artists. To use it you need a Spotify developer account.

## Spotify Setup
1. Create a Spotify developer application at [Spotify Developer Dashboard](https://developer.spotify.com/).
2. Add `http://localhost/spotify.html` (or whichever URL you use to serve `spotify.html`) as a redirect URI in your app settings.
3. Copy your **Client ID** and replace the `YOUR_SPOTIFY_CLIENT_ID` placeholder in `spotify.js`. The login button warns you if you forget this step.
4. Serve the project over HTTP (for example, `npx serve` or `python3 -m http.server`) and open `spotify.html`. Log in with Spotify when prompted.
   Your top tracks load automatically after you authenticate.

If Spotify shows an `INVALID_CLIENT` error, double-check that your client ID is correct and that the redirect URI exactly matches what you configured on the dashboard.

The page lets you view your top tracks or artists over different time ranges and uses a simple vibrant theme.
