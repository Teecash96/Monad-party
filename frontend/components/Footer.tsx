import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>Proof of Play</p>
      <nav aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy#deletion">Data deletion</Link>
      </nav>
    </footer>
  );
}
