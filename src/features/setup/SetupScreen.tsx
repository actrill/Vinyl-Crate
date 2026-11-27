import { useState } from 'react';
import { DiscogsError } from '../../api/client';
import { syncNow } from '../../state/hooks';
import { saveCredentials } from '../../state/settings';
import { makeClient, useApp } from '../../state/store';
import './setup.css';

export function SetupScreen() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    const t = token.trim();
    if (!u || !t) { setError('Enter both your Discogs username and your token.'); return; }
    setBusy(true);
    setError(null);
    try {
      const identity = await makeClient(u, t).identity();
      if (identity.username.toLowerCase() !== u.toLowerCase()) {
        setError(`That token belongs to "${identity.username}", not "${u}". Check the username, or use the matching token.`);
        return;
      }
      await saveCredentials(identity.username, t);
      useApp.getState().connect(identity.username, t);
      void syncNow();
    } catch (err) {
      setError(err instanceof DiscogsError && err.isAuth
        ? 'Discogs did not accept that token. Copy it again from Settings → Developers on discogs.com.'
        : "Can't reach Discogs. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="setup">
      <div className="setup-record" aria-hidden>
        <div className="setup-label" />
      </div>
      <h1>Crate</h1>
      <p className="muted">Your Discogs collection, on your phone and on the shelf.</p>
      <form className="stack setup-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="username">Discogs username</label>
          <input id="username" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false}
            value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="token">Personal access token</label>
          <input id="token" className="input" type="password" autoComplete="off" spellCheck={false}
            value={token} onChange={(e) => setToken(e.target.value)} />
          <p className="small muted">Find it on discogs.com under Settings → Developers → Generate new token.</p>
        </div>
        {error && <p role="alert" className="setup-error">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Connect'}</button>
        <p className="small muted">Your token stays on this phone. Crate only reads from Discogs and never changes your collection.</p>
        <p className="small muted">Just looking? Use the username <strong>demo</strong> with any token to try sample data.</p>
      </form>
    </main>
  );
}
