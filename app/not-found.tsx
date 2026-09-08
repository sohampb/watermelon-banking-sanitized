import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>Quote not found</h1>
      <p>This record does not exist yet, or the plan details have not been completed.</p>
      <Link href="/" className="primary-button">
        Start a new quote
      </Link>
    </main>
  );
}
