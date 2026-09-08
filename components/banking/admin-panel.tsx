"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type AccountSummary = {
  username: string;
  displayName: string;
  accountNumber: string;
  balanceDisplay: string;
};

type AdminPanelProps = {
  initialAccounts: AccountSummary[];
};

const SHADOW_DEPTH = 10;

const SHADOW_CONTROL_STYLE = `
  :host {
    display: block;
  }

  .shadow-layer {
    display: block;
  }

  select,
  input {
    width: 100%;
    border-radius: 9px;
    border: 1px solid #d7dedb;
    background: #fffdf9;
    color: #202428;
    font: 500 1rem/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 0.9rem 1rem;
    outline: none;
    box-sizing: border-box;
  }

  input::placeholder {
    color: #6b7280;
  }
`;

type DeepShadowSelectProps = {
  controlClassName: string;
  id: string;
  name: string;
  value: string;
  options: AccountSummary[];
  onValueChange: (value: string) => void;
};

function DeepShadowSelect({
  controlClassName,
  id,
  name,
  value,
  options,
  onValueChange
}: DeepShadowSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onValueChangeRef = useRef(onValueChange);

  onValueChangeRef.current = onValueChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = "";

    const rootHost = document.createElement("div");
    container.append(rootHost);

    let host = rootHost;
    let finalShadow: ShadowRoot | null = null;

    for (let level = 0; level < SHADOW_DEPTH; level += 1) {
      const shadowRoot = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = SHADOW_CONTROL_STYLE;
      shadowRoot.append(style);

      if (level === SHADOW_DEPTH - 1) {
        finalShadow = shadowRoot;
      } else {
        const nextHost = document.createElement("div");
        nextHost.className = "shadow-layer";
        shadowRoot.append(nextHost);
        host = nextHost;
      }
    }

    if (!finalShadow) {
      return;
    }

    const select = document.createElement("select");
    select.id = id;
    select.name = name;
    select.className = controlClassName;
    select.dataset.name = name;
    options.forEach((account) => {
      const option = document.createElement("option");
      option.value = account.username;
      option.textContent = `${account.displayName} (${account.accountNumber})`;
      select.append(option);
    });
    select.value = value;
    select.addEventListener("change", (event) => {
      onValueChangeRef.current((event.target as HTMLSelectElement).value);
    });
    finalShadow.append(select);

    return () => {
      container.innerHTML = "";
    };
  }, [controlClassName, id, name, options, value]);

  return (
    <div
      id={`${id}-host`}
      className="banking-shadow-control-host banking-admin-shadow-select-host"
      data-name={`${name}Host`}
      ref={containerRef}
    />
  );
}

type DeepShadowInputProps = {
  controlClassName: string;
  id: string;
  name: string;
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
};

function DeepShadowInput({
  controlClassName,
  id,
  name,
  value,
  placeholder,
  onValueChange
}: DeepShadowInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onValueChangeRef = useRef(onValueChange);

  onValueChangeRef.current = onValueChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = "";

    const rootHost = document.createElement("div");
    container.append(rootHost);

    let host = rootHost;
    let finalShadow: ShadowRoot | null = null;

    for (let level = 0; level < SHADOW_DEPTH; level += 1) {
      const shadowRoot = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = SHADOW_CONTROL_STYLE;
      shadowRoot.append(style);

      if (level === SHADOW_DEPTH - 1) {
        finalShadow = shadowRoot;
      } else {
        const nextHost = document.createElement("div");
        nextHost.className = "shadow-layer";
        shadowRoot.append(nextHost);
        host = nextHost;
      }
    }

    if (!finalShadow) {
      return;
    }

    const input = document.createElement("input");
    input.id = id;
    input.name = name;
    input.className = controlClassName;
    input.dataset.name = name;
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = placeholder;
    input.value = value;
    input.addEventListener("input", (event) => {
      onValueChangeRef.current((event.target as HTMLInputElement).value);
    });
    finalShadow.append(input);
    inputRef.current = input;

    return () => {
      inputRef.current = null;
      container.innerHTML = "";
    };
  }, [controlClassName, id, name, placeholder]);

  useEffect(() => {
    const input = inputRef.current;

    if (input && input.value !== value) {
      input.value = value;
    }
  }, [value]);

  return (
    <div
      id={`${id}-host`}
      className="banking-shadow-control-host banking-admin-shadow-input-host"
      data-name={`${name}Host`}
      ref={containerRef}
    />
  );
}

export function AdminPanel({ initialAccounts }: AdminPanelProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [username, setUsername] = useState(initialAccounts[0]?.username ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/banking/admin/fund", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        amount
      })
    });

    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to add funds.");
      return;
    }

    setAccounts(data.accounts);
    setAmount("");
    setMessage(data.message ?? "Funds added successfully.");
  }

  return (
    <div className="banking-admin-page">
      <header className="banking-admin-header">
        <div>
          <div className="banking-brand-lockup">
            <span className="banking-brand-mark" aria-hidden="true">W</span>
            <p className="banking-kicker">Watermelon Banking</p>
          </div>
          <h1>Admin Funding Console</h1>
          <p className="banking-subtle-text">
            Use this page to add savings balance into either seeded banking account.
          </p>
        </div>

        <Link
          id="banking-admin-back-to-login-link"
          className="banking-outline-link banking-admin-back-to-login-link"
          data-name="bankingAdminBackToLoginLink"
          href="/banking"
        >
          Back to Login
        </Link>
      </header>

      <div className="banking-admin-grid">
        <section className="banking-section-card">
          <div className="banking-section-heading">
            <h2>Add Funds</h2>
            <p>Pick an account, enter an amount, and credit the savings balance.</p>
          </div>

          <form
            id="banking-admin-add-funds-form"
            className="banking-transfer-form banking-admin-add-funds-form"
            name="bankingAdminAddFundsForm"
            onSubmit={handleSubmit}
          >
            <label className="banking-field" htmlFor="banking-admin-account-select">
              <span>Account</span>
              <DeepShadowSelect
                id="banking-admin-account-select"
                name="adminFundingAccount"
                controlClassName="banking-admin-account-select banking-admin-shadow-select"
                options={accounts}
                value={username}
                onValueChange={setUsername}
              />
            </label>

            <label className="banking-field" htmlFor="banking-admin-funding-amount">
              <span>Amount</span>
              <DeepShadowInput
                id="banking-admin-funding-amount"
                name="adminFundingAmount"
                controlClassName="banking-admin-funding-amount-input banking-admin-shadow-input"
                placeholder="0.00"
                value={amount}
                onValueChange={setAmount}
              />
            </label>

            <button
              id="banking-admin-add-balance-button"
              className="banking-primary-button banking-admin-add-balance-button"
              disabled={submitting}
              name="addBankingBalance"
              type="submit"
            >
              {submitting ? "Adding..." : "Add Balance"}
            </button>
          </form>

          {error ? <p className="banking-error-text">{error}</p> : null}
          {message ? <p className="banking-success-text">{message}</p> : null}
        </section>

        <section className="banking-section-card">
          <div className="banking-section-heading">
            <h2>Current Accounts</h2>
            <p>These balances come directly from PostgreSQL through Prisma.</p>
          </div>

          <div className="banking-admin-account-list">
            {accounts.map((account) => (
              <article className="banking-admin-account-card" key={account.username}>
                <h3>{account.displayName}</h3>
                <p>{account.accountNumber}</p>
                <strong>{account.balanceDisplay}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
