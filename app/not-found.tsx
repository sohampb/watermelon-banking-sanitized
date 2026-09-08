import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <p>This banking page does not exist yet, or the link is no longer valid.</p>
      <Link href="/" className="primary-button">
        Back to banking
      </Link>
    </main>
  );
}
