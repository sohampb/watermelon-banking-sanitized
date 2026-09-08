"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const TRANSFER_REASONS = [
  "Rent",
  "Family Support",
  "Utilities",
  "Education",
  "Medical",
  "Investment",
  "Shopping",
  "Travel",
  "Loan Repayment",
  "Other"
];

type TransactionRow = {
  transactionId: string;
  createdAt: string;
  description: string;
  transactionType: string;
  direction: "Credit" | "Debit";
  counterparty: string;
  amountDisplay: string;
  balanceAfterDisplay: string;
};

type DashboardData = {
  user: {
    username: string;
    displayName: string;
    accountNumber: string;
    balanceDisplay: string;
  };
  transferDestinations: Array<{
    username: string;
    displayName: string;
    accountNumber: string;
  }>;
  recentTransactions: TransactionRow[];
};

type DashboardShellProps = {
  initialData: DashboardData;
};

function downloadStatement(base64Content: string, fileName: string) {
  const binaryString = window.atob(base64Content);
  const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(initialData);
  const [transferForm, setTransferForm] = useState({
    destinationUsername: initialData.transferDestinations[0]?.username ?? "",
    amount: "",
    recipientEmail: "",
    otp: ""
  });
  const [statementCount, setStatementCount] = useState("5");
  const [statementEmail, setStatementEmail] = useState("");
  const [statementRows, setStatementRows] = useState<TransactionRow[]>(
    initialData.recentTransactions
  );
  const [transferMessage, setTransferMessage] = useState("");
  const [statementMessage, setStatementMessage] = useState("");
  const [transferError, setTransferError] = useState("");
  const [statementError, setStatementError] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [reasonMenuOpen, setReasonMenuOpen] = useState(false);
  const [portfolioExpanded, setPortfolioExpanded] = useState(true);
  const [statementExpanded, setStatementExpanded] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [generatingStatement, setGeneratingStatement] = useState(false);

  function toggleReason(reason: string) {
    setSelectedReasons((current) =>
      current.includes(reason)
        ? current.filter((item) => item !== reason)
        : [...current, reason]
    );
  }

  async function handleLogout() {
    await fetch("/api/banking/logout", {
      method: "POST"
    });
    router.push("/banking");
    router.refresh();
  }

  async function handleSendOtp() {
    setTransferError("");
    setTransferMessage("");
    setSendingOtp(true);

    const response = await fetch("/api/banking/transfer/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(transferForm)
    });

    const data = await response.json();
    setSendingOtp(false);

    if (!response.ok) {
      setTransferError(data.error ?? "Unable to send OTP.");
      return;
    }

    setTransferMessage(data.message ?? "OTP sent.");
  }

  async function handleTransferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingTransfer(true);
    setTransferError("");
    setTransferMessage("");

    const response = await fetch("/api/banking/transfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(transferForm)
    });

    const data = await response.json();
    setSubmittingTransfer(false);

    if (!response.ok) {
      setTransferError(data.error ?? "Unable to complete transfer.");
      return;
    }

    setDashboard(data.dashboard);
    setStatementRows(data.dashboard.recentTransactions);
    setTransferForm((current) => ({
      ...current,
      amount: "",
      otp: ""
    }));
    setReasonMenuOpen(false);
    setTransferMessage(
      `Transfer successful. Transaction ID: ${data.transactionId}${
        selectedReasons.length ? ` • Reasons: ${selectedReasons.join(", ")}` : ""
      }`
    );
  }

  async function handleStatementGenerate() {
    setGeneratingStatement(true);
    setStatementError("");
    setStatementMessage("");

    const response = await fetch("/api/banking/statement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        transactionCount: statementCount,
        email: statementEmail
      })
    });

    const data = await response.json();
    setGeneratingStatement(false);

    if (!response.ok) {
      setStatementError(data.error ?? "Unable to generate statement.");
      return;
    }

    setStatementRows(data.rows);
    downloadStatement(data.downloadBase64, data.fileName);
    setStatementMessage(
      data.emailed
        ? "Statement downloaded and emailed successfully."
        : "Statement downloaded successfully."
    );
  }

  return (
    <div className="banking-dashboard-page">
      <aside className="banking-sidebar">
        <div className="banking-sidebar-brand">
          <span className="banking-sidebar-brand__mark">W</span>
          <div>
            <strong>Watermelon Banking</strong>
            <span>Digital banking portal</span>
          </div>
        </div>
        <nav className="banking-sidebar-nav" aria-label="Banking dashboard navigation">
          <a
            id="banking-sidebar-home-link"
            className="banking-sidebar-nav-link banking-sidebar-home-link"
            data-name="bankingSidebarHomeLink"
            href="#overview"
          >
            Home
          </a>
          <a
            id="banking-sidebar-notifications-link"
            className="banking-sidebar-nav-link banking-sidebar-notifications-link"
            data-name="bankingSidebarNotificationsLink"
            href="#overview"
          >
            Notifications
          </a>
          <a
            id="banking-sidebar-accounts-link"
            className="banking-sidebar-nav-link banking-sidebar-accounts-link"
            data-name="bankingSidebarAccountsLink"
            href="#overview"
          >
            Accounts
          </a>
          <a
            id="banking-sidebar-transfers-link"
            className="banking-sidebar-nav-link banking-sidebar-transfers-link"
            data-name="bankingSidebarTransfersLink"
            href="#transfer"
          >
            Transfers
          </a>
          <a
            id="banking-sidebar-statements-link"
            className="banking-sidebar-nav-link banking-sidebar-statements-link"
            data-name="bankingSidebarStatementsLink"
            href="#statement"
          >
            Statements
          </a>
          <a
            id="banking-sidebar-profile-link"
            className="banking-sidebar-nav-link banking-sidebar-profile-link"
            data-name="bankingSidebarProfileLink"
            href="#overview"
          >
            Manage Profile
          </a>
        </nav>
      </aside>

      <main className="banking-main">
        <header className="banking-topbar">
          <div className="banking-topbar-copy">
            <p className="banking-kicker">Welcome back</p>
            <h1>{dashboard.user.displayName}</h1>
            <p className="banking-subtle-text">
              Savings account {dashboard.user.accountNumber}
            </p>
          </div>

          <div className="banking-topbar-actions">
            <div className="banking-status-pill">Savings account active</div>
            <Link
              id="banking-dashboard-admin-link"
              className="banking-outline-link banking-dashboard-admin-link"
              data-name="bankingDashboardAdminLink"
              href="/banking/admin"
            >
              Admin App
            </Link>
            <button
              id="banking-dashboard-logout-button"
              className="banking-outline-button banking-dashboard-logout-button"
              name="logoutFromBankingAccount"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="banking-collapsible-shell" id="overview">
          <div className="banking-collapsible-heading banking-collapsible-heading--hero">
            <div>
              <p className="banking-kicker">Portfolio summary</p>
              <h2>Everyday banking, presented in one streamlined workspace.</h2>
            </div>
            <button
              id="banking-portfolio-collapse-toggle"
              className="banking-collapse-toggle banking-portfolio-collapse-toggle"
              name="togglePortfolioSummary"
              type="button"
              aria-expanded={portfolioExpanded}
              onClick={() => setPortfolioExpanded((current) => !current)}
            >
              {portfolioExpanded ? "−" : "+"}
            </button>
          </div>
          {portfolioExpanded ? (
            <div className="banking-hero-card banking-hero-card--collapsible">
              <div className="banking-hero-copy">
                <p>
                  Review the savings balance, authorize outgoing transfers with email
                  OTP, and export a recent statement in a few steps.
                </p>
              </div>
              <div className="banking-hero-stats">
                <div className="banking-hero-stat">
                  <span>Available balance</span>
                  <strong>{dashboard.user.balanceDisplay}</strong>
                </div>
                <div className="banking-hero-stat">
                  <span>Recent transactions</span>
                  <strong>{dashboard.recentTransactions.length}</strong>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="banking-card-grid">
          <article className="banking-info-card">
            <div className="banking-card-eyebrow">Primary account</div>
            <h2>Savings Account</h2>
            <div className="banking-balance-number">{dashboard.user.balanceDisplay}</div>
            <p>Available balance for transfers and statement generation.</p>
            <a
              id="banking-overview-view-account-link"
              className="banking-card-link banking-overview-view-account-link"
              data-name="bankingOverviewViewAccountLink"
              href="#statement"
            >
              View Account
            </a>
          </article>

          <article className="banking-info-card">
            <div className="banking-card-eyebrow">Activity</div>
            <h2>Recent Activity</h2>
            <p className="banking-info-copy">
              {dashboard.recentTransactions[0]
                ? `${dashboard.recentTransactions[0].description} • ${dashboard.recentTransactions[0].amountDisplay}`
                : "No transactions yet."}
            </p>
            <a
              id="banking-overview-view-statement-link"
              className="banking-card-link banking-overview-view-statement-link"
              data-name="bankingOverviewViewStatementLink"
              href="#statement"
            >
              View Statement
            </a>
          </article>

          <article className="banking-info-card">
            <div className="banking-card-eyebrow">Payments</div>
            <h2>Transfer Center</h2>
            <p className="banking-info-copy">
              Send funds securely after validating with an OTP emailed to your chosen
              address.
            </p>
            <a
              id="banking-overview-view-transfers-link"
              className="banking-card-link banking-overview-view-transfers-link"
              data-name="bankingOverviewViewTransfersLink"
              href="#transfer"
            >
              View Transfers
            </a>
          </article>

          <article className="banking-info-card">
            <div className="banking-card-eyebrow">Documents</div>
            <h2>Statements</h2>
            <p className="banking-info-copy">
              Generate the last X transactions as an Excel file and optionally email
              the attachment.
            </p>
            <a
              id="banking-overview-view-statements-link"
              className="banking-card-link banking-overview-view-statements-link"
              data-name="bankingOverviewViewStatementsLink"
              href="#statement"
            >
              View Statements
            </a>
          </article>
        </section>

        <section className="banking-section-card" id="transfer">
          <div className="banking-section-heading">
            <div className="banking-transfer-heading">
              <h2>Transfer Money</h2>
              {selectedReasons.length ? (
                <p className="banking-transfer-reasons">
                  Reason for Transfer: {selectedReasons.join(", ")}
                </p>
              ) : null}
            </div>
            <p>
              Choose the destination user, amount, OTP email, then confirm with the
              OTP you receive.
            </p>
          </div>

          <div className="banking-section-banner">
            Four demo beneficiaries appear first for realism. Only the seeded
            banking-user destination is currently enabled for actual transfers.
          </div>

          <form
            id="banking-transfer-form"
            className="banking-transfer-form banking-dashboard-transfer-form"
            name="bankingTransferForm"
            onSubmit={handleTransferSubmit}
          >
            <label className="banking-field" htmlFor="banking-transfer-from-account">
              <span>Transfer From</span>
              <input
                id="banking-transfer-from-account"
                className="banking-transfer-input banking-transfer-from-account-input"
                name="transferFromAccount"
                readOnly
                value={`${dashboard.user.displayName} Savings Account`}
              />
            </label>

            <label className="banking-field" htmlFor="banking-transfer-to-account">
              <span>Transfer To</span>
              <select
                id="banking-transfer-to-account"
                className="banking-transfer-select banking-transfer-to-account-select"
                name="destinationUsername"
                value={transferForm.destinationUsername}
                onChange={(event) =>
                  setTransferForm((current) => ({
                    ...current,
                    destinationUsername: event.target.value
                  }))
                }
              >
                {dashboard.transferDestinations.map((destination) => (
                  <option key={destination.username} value={destination.username}>
                    {destination.displayName} ({destination.accountNumber})
                  </option>
                ))}
              </select>
            </label>

            <label className="banking-field" htmlFor="banking-transfer-amount">
              <span>Amount</span>
              <input
                id="banking-transfer-amount"
                className="banking-transfer-input banking-transfer-amount-input"
                inputMode="decimal"
                name="amount"
                placeholder="0.00"
                value={transferForm.amount}
                onChange={(event) =>
                  setTransferForm((current) => ({
                    ...current,
                    amount: event.target.value
                  }))
                }
              />
            </label>

            <label className="banking-field" htmlFor="banking-transfer-recipient-email">
              <span>OTP Email Address</span>
              <input
                id="banking-transfer-recipient-email"
                className="banking-transfer-input banking-transfer-recipient-email-input"
                name="recipientEmail"
                type="email"
                placeholder="recipient@example.com"
                value={transferForm.recipientEmail}
                onChange={(event) =>
                  setTransferForm((current) => ({
                    ...current,
                    recipientEmail: event.target.value
                  }))
                }
              />
            </label>

            <div className="banking-field">
              <span>Reason for Transfer</span>
              <div className="banking-multiselect">
                <button
                  id="banking-transfer-reason-menu-button"
                  type="button"
                  className="banking-multiselect-trigger banking-transfer-reason-menu-button"
                  name="toggleTransferReasonMenu"
                  onClick={() => setReasonMenuOpen((current) => !current)}
                  aria-expanded={reasonMenuOpen}
                >
                  <span>
                    {selectedReasons.length
                      ? selectedReasons.join(", ")
                      : "Select one or more reasons"}
                  </span>
                  <strong>{reasonMenuOpen ? "−" : "+"}</strong>
                </button>
                {reasonMenuOpen ? (
                  <div className="banking-multiselect-menu">
                    {TRANSFER_REASONS.map((reason) => {
                      const reasonId = `banking-transfer-reason-${reason
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")}`;

                      return (
                      <label
                        key={reason}
                        className="banking-multiselect-option"
                        htmlFor={reasonId}
                      >
                        <input
                          id={reasonId}
                          className="banking-transfer-reason-checkbox"
                          name="transferReasons"
                          type="checkbox"
                          value={reason}
                          checked={selectedReasons.includes(reason)}
                          onChange={() => toggleReason(reason)}
                        />
                        <span>{reason}</span>
                      </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <label className="banking-field" htmlFor="banking-transfer-otp">
              <span>OTP</span>
              <input
                id="banking-transfer-otp"
                className="banking-transfer-input banking-transfer-otp-input"
                inputMode="numeric"
                name="otp"
                placeholder="Enter OTP"
                value={transferForm.otp}
                onChange={(event) =>
                  setTransferForm((current) => ({
                    ...current,
                    otp: event.target.value
                  }))
                }
              />
            </label>

            <div className="banking-action-row">
              <button
                id="banking-transfer-send-otp-button"
                className="banking-outline-button banking-transfer-send-otp-button"
                disabled={sendingOtp}
                name="sendTransferOtp"
                onClick={() => void handleSendOtp()}
                type="button"
              >
                {sendingOtp ? "Sending OTP..." : "Send OTP"}
              </button>
              <button
                id="banking-transfer-submit-button"
                className="banking-primary-button banking-transfer-submit-button"
                disabled={submittingTransfer}
                name="submitBankingTransfer"
                type="submit"
              >
                {submittingTransfer ? "Processing..." : "Transfer Funds"}
              </button>
            </div>
          </form>

          {transferError ? <p className="banking-error-text">{transferError}</p> : null}
          {transferMessage ? <p className="banking-success-text">{transferMessage}</p> : null}
        </section>

        <section className="banking-section-card" id="statement">
          <div className="banking-collapsible-heading">
            <div className="banking-section-heading banking-section-heading--compact">
              <h2>Account Statement</h2>
              <p>
                Request the last X transactions, download them as Excel, and optionally
                send the statement to an email address.
              </p>
            </div>
            <button
              id="banking-statement-collapse-toggle"
              className="banking-collapse-toggle banking-statement-collapse-toggle"
              name="toggleAccountStatement"
              type="button"
              aria-expanded={statementExpanded}
              onClick={() => setStatementExpanded((current) => !current)}
            >
              {statementExpanded ? "−" : "+"}
            </button>
          </div>

          {statementExpanded ? (
            <>
              <div className="banking-statement-controls">
                <label className="banking-field" htmlFor="banking-statement-transaction-count">
                  <span>Last X Transactions</span>
                  <input
                    id="banking-statement-transaction-count"
                    className="banking-statement-input banking-statement-transaction-count-input"
                    inputMode="numeric"
                    name="transactionCount"
                    value={statementCount}
                    onChange={(event) => setStatementCount(event.target.value)}
                  />
                </label>

                <label className="banking-field" htmlFor="banking-statement-email">
                  <span>Email Statement To</span>
                  <input
                    id="banking-statement-email"
                    className="banking-statement-input banking-statement-email-input"
                    name="statementEmail"
                    type="email"
                    placeholder="recipient@example.com"
                    value={statementEmail}
                    onChange={(event) => setStatementEmail(event.target.value)}
                  />
                </label>

                <button
                  id="banking-statement-generate-button"
                  className="banking-primary-button banking-statement-generate-button"
                  disabled={generatingStatement}
                  name="generateAccountStatement"
                  onClick={() => void handleStatementGenerate()}
                  type="button"
                >
                  {generatingStatement ? "Generating..." : "Get Statement"}
                </button>
              </div>

              {statementError ? <p className="banking-error-text">{statementError}</p> : null}
              {statementMessage ? <p className="banking-success-text">{statementMessage}</p> : null}

              <div className="banking-table-wrap">
                <table className="banking-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Counterparty</th>
                      <th>Amount</th>
                      <th>Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementRows.length ? (
                      statementRows.map((row) => (
                        <tr key={row.transactionId}>
                          <td>{row.transactionId}</td>
                          <td>{new Date(row.createdAt).toLocaleString("en-US")}</td>
                          <td
                            className={
                              row.direction === "Debit"
                                ? "banking-transaction-direction banking-transaction-direction--debit"
                                : "banking-transaction-direction banking-transaction-direction--credit"
                            }
                          >
                            {row.direction}
                          </td>
                          <td>{row.counterparty}</td>
                          <td>{row.amountDisplay}</td>
                          <td>{row.balanceAfterDisplay}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>No transactions available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
