import Link from "next/link";

export default function NotFound() {
  return (
    <div className="qr-empty">
      <div>
        <h1>Nothing here</h1>
        <p>
          That page does not exist. The two that do are the front page and the
          form that makes QR codes.
        </p>
        <Link href="/create" className="btn btn-lg">
          Make a QR code
        </Link>
      </div>
    </div>
  );
}
