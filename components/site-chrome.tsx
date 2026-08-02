import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="actuallyfreeqr, home">
      actually<b>free</b>qr
    </Link>
  );
}

export function SiteHeader({ cta = true }: { cta?: boolean }) {
  return (
    <header className="site-head">
      <Wordmark />
      {cta ? (
        <Link href="/create" className="btn">
          Make a QR code
        </Link>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <p>
        No cookies. No analytics. No accounts. Your QR codes are yours and they
        point straight at your link, never through us.
      </p>
      <p>
        <Link href="/create">Make a QR code</Link>
      </p>
    </footer>
  );
}
