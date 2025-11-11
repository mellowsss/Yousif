export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, code_verifier } = req.body;

  if (!code || !code_verifier) {
    return res.status(400).json({ error: 'Missing code or code_verifier' });
  }

  const CLIENT_ID = 'd35862ff5a9d403db6fa8a321327b7f4';
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const REDIRECT_URI = 'https://yousif-pi.vercel.app/spotify.html';

  if (!CLIENT_SECRET) {
    return res.status(500).json({ error: 'Server configuration error: Client secret not found' });
  }

  // Create Basic auth header
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: code_verifier
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error || 'Token exchange failed',
        error_description: data.error_description || '',
        details: data
      });
    }

    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

