"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function BankingAppAccessLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/banking-access/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to unlock banking access.");
      return;
    }

    router.push("/banking");
    router.refresh();
  }

  return (
    <div className="banking-app-access-page">
      <header className="banking-app-access-header">
        <div>
          <div className="banking-brand-lockup">
            <span className="banking-brand-mark" aria-hidden="true">W</span>
            <p className="banking-kicker">Watermelon Banking</p>
          </div>
          <h1>Banking Test App Access</h1>
          <p className="banking-login-subtitle">
            Sign in once to unlock the protected banking test application.
          </p>
        </div>
      </header>

      <main className="banking-app-access-card">
        <section className="banking-app-access-panel">
          <div className="banking-login-panel__top">
            <div>
              <span className="banking-panel-icon" aria-hidden="true">W</span>
              <p className="banking-panel-label">Application gate</p>
              <p className="banking-panel-copy">One extra check in front of the banking test environment.</p>
            </div>
            <div className="banking-login-badge">Outer Login</div>
          </div>
          <div className="banking-login-points">
            <div>Unlocks the banking test application</div>
            <div>Then keeps the existing account login unchanged</div>
            <div>Session expires after 8 hours</div>
          </div>
        </section>

        <form
          id="banking-app-access-login-form"
          className="banking-app-access-form"
          name="bankingAppAccessLoginForm"
          onSubmit={handleSubmit}
        >
          <div className="banking-form-heading">
            <h2>Unlock banking app</h2>
            <p>Enter the test application credentials to continue.</p>
          </div>

          <label className="banking-field" htmlFor="banking-app-access-username">
            <span>Username</span>
            <input
              id="banking-app-access-username"
              className="banking-app-access-input"
              autoComplete="username"
              name="username"
              placeholder="Enter username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="banking-field" htmlFor="banking-app-access-password">
            <span>Password</span>
            <input
              id="banking-app-access-password"
              className="banking-app-access-input"
              autoComplete="current-password"
              name="password"
              placeholder="Enter password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="banking-error-text">{error}</p> : null}

          <button
            id="banking-app-access-submit-button"
            className="banking-sign-in-button banking-app-access-submit-button"
            name="unlockBankingApp"
            type="submit"
            disabled={loading}
          >
            {loading ? "Unlocking..." : "Continue"}
          </button>
        </form>
      </main>
    </div>
  );
}
