import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>Monad Party</p>
      <nav aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy#deletion">Data deletion</Link>
      </nav>
    </footer>
  );
}
