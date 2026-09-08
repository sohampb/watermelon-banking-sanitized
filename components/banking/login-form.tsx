"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

function makeCaptchaPair() {
  return {
    left: Math.floor(Math.random() * 9) + 1,
    right: Math.floor(Math.random() * 9) + 1
  };
}

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("bankinguser1");
  const [password, setPassword] = useState("password");
  const [captcha, setCaptcha] = useState({ left: 6, right: 8 });
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [disableCaptcha, setDisableCaptcha] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCaptcha(makeCaptchaPair());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/banking/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password,
        disableCaptcha,
        captchaAnswer: Number(captchaAnswer),
        captchaLeft: captcha.left,
        captchaRight: captcha.right
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Unable to sign in.");
      setCaptchaAnswer("");
      setCaptcha(makeCaptchaPair());
      setSubmitting(false);
      return;
    }

    router.push(data.redirectTo ?? "/banking/dashboard");
    router.refresh();
  }

  return (
    <div className="banking-login-page">
      <div className="banking-login-header">
        <div className="banking-login-title">
          <div className="banking-brand-lockup">
            <span className="banking-brand-mark" aria-hidden="true">W</span>
            <p className="banking-kicker">Watermelon Banking</p>
          </div>
          <h1>Secure Digital Banking</h1>
          <p className="banking-login-subtitle">
            A refined demo portal for balances, transfers, OTP authorization, and
            statement retrieval.
          </p>
        </div>
        <Link
          id="banking-login-admin-link"
          className="banking-outline-link banking-login-admin-link"
          data-name="bankingLoginAdminLink"
          href="/banking/admin"
        >
          Admin App
        </Link>
      </div>

      <div className="banking-login-card">
        <div className="banking-login-panel">
          <div className="banking-login-panel__top">
            <p className="banking-panel-label">Access details</p>
            <div className="banking-login-badge">Protected Demo</div>
          </div>

          <div className="banking-login-metric">
            <span>Supported users</span>
            <strong>6 active accounts</strong>
          </div>

          <div className="banking-login-credentials">
            <div className="banking-credential-chip">bankinguser1 / password</div>
            <div className="banking-credential-chip">bankinguser2 / password</div>
            <div className="banking-credential-chip">bankinguser3 / password</div>
            <div className="banking-credential-chip">bankinguser4 / password</div>
            <div className="banking-credential-chip">bankinguser5 / password</div>
            <div className="banking-credential-chip">bankinguser6 / password</div>
          </div>

          <div className="banking-login-points">
            <div>Simple captcha at sign-in</div>
            <div>Email OTP needed for transfers</div>
            <div>Downloadable and emailable Excel statements</div>
          </div>
        </div>

        <form
          id="banking-account-login-form"
          className="banking-login-form banking-account-login-form"
          name="bankingAccountLoginForm"
          onSubmit={handleSubmit}
        >
          <div className="banking-form-heading">
            <h2>Sign in</h2>
            <p>Enter your credentials to continue to the banking dashboard.</p>
          </div>

          <label className="banking-field" htmlFor="banking-account-username">
            <span>Username</span>
            <input
              id="banking-account-username"
              className="banking-login-input banking-login-username-input"
              autoComplete="username"
              name="username"
              placeholder="bankinguser1"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="banking-field" htmlFor="banking-account-password">
            <span>Password</span>
            <input
              id="banking-account-password"
              className="banking-login-input banking-login-password-input"
              autoComplete="current-password"
              name="password"
              type="password"
              placeholder="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <div className="banking-captcha-block">
            <p className="banking-panel-label">Captcha</p>
            <label className="banking-captcha-row" htmlFor="banking-login-disable-captcha">
              <input
                id="banking-login-disable-captcha"
                className="banking-login-checkbox banking-login-disable-captcha-checkbox"
                name="disableCaptcha"
                checked={disableCaptcha}
                onChange={(event) => setDisableCaptcha(event.target.checked)}
                style={{
                  accentColor: "#1f6b79",
                  height: "22px",
                  minHeight: "22px",
                  width: "42px"
                }}
                type="checkbox"
              />
              <span className="banking-captcha-symbol">Disable captcha</span>
            </label>
            <div className="banking-captcha-row">
              <div className="banking-captcha-box">{captcha.left}</div>
              <span className="banking-captcha-symbol">+</span>
              <div className="banking-captcha-box">{captcha.right}</div>
              <span className="banking-captcha-symbol">=</span>
              <input
                id="banking-login-captcha-answer"
                className="banking-captcha-input banking-login-captcha-answer-input"
                disabled={disableCaptcha}
                inputMode="numeric"
                name="captchaAnswer"
                placeholder="?"
                value={captchaAnswer}
                onChange={(event) => setCaptchaAnswer(event.target.value)}
              />
              <button
                id="banking-login-refresh-captcha-button"
                className="banking-captcha-refresh banking-login-refresh-captcha-button"
                name="refreshCaptcha"
                type="button"
                onClick={() => {
                  setCaptcha(makeCaptchaPair());
                  setCaptchaAnswer("");
                }}
              >
                ↻
              </button>
            </div>
            <span className="banking-forgot-link">Forgot Password</span>
          </div>

          {error ? <p className="banking-error-text">{error}</p> : null}

          <div className="banking-login-footer">
            <div className="banking-login-security-note">
              Session access is limited to demo users and test banking workflows.
            </div>
            <button
              id="banking-account-login-submit-button"
              className="banking-sign-in-button banking-account-login-submit-button"
              disabled={submitting}
              name="signInToBankingAccount"
              type="submit"
            >
              {submitting ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
