# actuallyfreeqr

A QR code generator with no sign-up, no email, no account, no tracking and no
expiry date. Type a name and a link, get a QR code you can share, print and
bookmark.

There is no backend. No database, no API route, no analytics. The site is a
handful of static files, and every QR code is drawn by the visitor's own
browser.

## The idea

Most "free" QR generators encode a link to *their* domain and forward the scan
on to you. That redirect is the thing they can later meter, charge for, or
switch off — which is why so many printed QR codes eventually die.

Here the code contains your address and nothing else. A phone reads it and goes
straight there. Three consequences follow, and they are the whole product:

- **The codes never expire.** They do not depend on this site existing.
- **Scans cannot be tracked.** They never touch our servers, so there is no
  counter, no dashboard and no log. That is not a policy, it is arithmetic.
- **There is nothing to sign up for**, because there is nothing to store.

## Pages

| Route     | What it does                                                        |
| --------- | ------------------------------------------------------------------- |
| `/`       | Landing page: what this is and what it refuses to ask you for.       |
| `/create` | The form. Name plus a link, text, contact card, WhatsApp or phone.   |
| `/qr`     | The code itself, as large as the screen allows.                      |

### The `/qr` URL is the QR code

`/qr` takes its content entirely from the query string:

```
/qr?name=Spring%20launch%20party&data=https%3A%2F%2Fexample.com%2Ftickets
```

- `name` — the label shown above the code (`url` is accepted as an alias for
  `data`, for hand-written links).
- `data` — the exact text encoded into the QR code. A URL opens in the phone's
  browser, a `BEGIN:VCARD` payload offers to save a contact, anything else is
  shown as text. Two kinds of URL get special treatment: `https://wa.me/<number>`
  (optionally `?text=<message>`) opens a WhatsApp chat, and `tel:<number>`
  offers to call it. The form builds both from a plain phone number, and
  **Edit** reads them back into the right fields.

Because the whole code lives in the address, that link *is* the code. Bookmark
it, message it to a colleague, put it on a slide — everyone who opens it sees
the same thing, and it keeps working for as long as the destination does.

From that page you can download a print-ready PNG (label, code and destination,
composed on a canvas in the browser), share it through the OS share sheet, copy
the link, or go full screen for propping a laptop up at an event.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export into ./out
npm run typecheck
```

## Deploying

`netlify.toml` is set up already: build with `npm run build`, publish `out/`.
Connect the repository to Netlify and it needs no further configuration — there
are no environment variables to set and no functions to deploy.

Set `NEXT_PUBLIC_SITE_URL` if you serve it from a custom domain; canonical
links and the social card fall back to Netlify's deploy URL otherwise.

The security headers in `netlify.toml` include a content security policy that
only allows the site to talk to itself. "We don't track you" is therefore
enforced by the browser rather than promised in a footer.

## Built with

- [Next.js](https://nextjs.org) in `output: "export"` mode — static HTML, no server.
- [qrcode.react](https://github.com/zpao/qrcode.react) — QR encoding in the browser,
  rendered as SVG on screen and to a canvas for the downloadable image.
- Hand-written CSS. Three colours: paper, ink, and a highlighter.
