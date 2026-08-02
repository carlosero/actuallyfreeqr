"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { QrErrorBoundary } from "./qr-error-boundary";
import { canvasToBlob, composeQrPoster, downloadBlob } from "@/lib/png";
import {
  MAX_NAME_LENGTH,
  MAX_PAYLOAD_LENGTH,
  buildEditHref,
  describePayload,
  payloadByteLength,
  prettyTarget,
  safeHref,
  toFileName,
} from "@/lib/payload";

/** Resolution of the offscreen canvas used to build the downloadable image. */
const EXPORT_SIZE = 1024;

export function QrView() {
  const params = useSearchParams();
  const data = (params.get("data") ?? params.get("url") ?? "").trim();
  const name = (params.get("name") ?? "").trim().slice(0, MAX_NAME_LENGTH);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toastTimer = useRef<number | null>(null);

  const [image, setImage] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isTooLong = payloadByteLength(data) > MAX_PAYLOAD_LENGTH;
  const target = data ? prettyTarget(data) : "";
  const href = data ? safeHref(data) : null;
  const fileName = toFileName(name || target);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  // The tab title doubles as the bookmark title, so make it the code's name.
  // Next resolves this page's metadata after hydration and would otherwise
  // overwrite it, hence watching the head rather than setting it once.
  useEffect(() => {
    if (!name) return;
    const wanted = `${name} · actuallyfreeqr`;
    const apply = () => {
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [name]);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
    setCanFullscreen(
      typeof document !== "undefined" && Boolean(document.fullscreenEnabled),
    );
    const onFullscreenChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Keep the screen on while a code is on display — this page spends its life
  // propped up on a table at events.
  useEffect(() => {
    if (!data) return;
    type WakeLockSentinel = { release: () => Promise<void> };
    const wakeLock = (
      navigator as unknown as {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
      }
    ).wakeLock;
    if (!wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || released) return;
      try {
        sentinel = await wakeLock.request("screen");
      } catch {
        // Denied (low battery, background tab). Nothing to do about it.
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", acquire);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release().catch(() => {});
    };
  }, [data]);

  // Build the shareable PNG up front. iOS only allows navigator.share() while
  // the tap that triggered it is still "fresh", so it cannot wait on a canvas.
  useEffect(() => {
    if (!data || isTooLong) {
      setImage(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    void (async () => {
      try {
        const poster = composeQrPoster({ source: canvas, name, caption: target });
        const blob = await canvasToBlob(poster);
        if (cancelled) return;
        setImage(new File([blob], fileName, { type: "image/png" }));
      } catch {
        if (!cancelled) setImage(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data, name, target, fileName, isTooLong]);

  const copyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
      return;
    } catch {
      // Clipboard API blocked — fall through to the old-school approach.
    }
    try {
      const scratch = document.createElement("textarea");
      scratch.value = url;
      scratch.setAttribute("readonly", "");
      scratch.style.position = "fixed";
      scratch.style.opacity = "0";
      document.body.appendChild(scratch);
      scratch.select();
      document.execCommand("copy");
      scratch.remove();
      flash("Link copied");
    } catch {
      flash("Copy the address bar to share this code");
    }
  }, [flash]);

  const handleDownload = useCallback(() => {
    if (image) {
      downloadBlob(image, fileName);
      flash("Image saved");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    void (async () => {
      try {
        const poster = composeQrPoster({ source: canvas, name, caption: target });
        downloadBlob(await canvasToBlob(poster), fileName);
        flash("Image saved");
      } catch {
        flash("Could not build the image");
      }
    })();
  }, [image, fileName, name, target, flash]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (image && navigator.canShare?.({ files: [image] })) {
        await navigator.share({ files: [image], title: name || "QR code" });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: name || "QR code", url });
        return;
      }
    } catch (error) {
      // The share sheet was dismissed — that is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    await copyLink();
  }, [image, name, copyLink]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      flash("This browser will not go full screen");
    }
  }, [flash]);

  if (!data) {
    return (
      <div className="qr-empty">
        <div>
          <h1>This link has no QR code in it</h1>
          <p>
            A QR page carries its code in the address itself. Make one and the
            link you get back will always render it.
          </p>
          <Link href="/create" className="btn btn-lg">
            Make a QR code
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-stage" ref={stageRef}>
      <header className="qr-head">
        <h1 className="qr-title">{name || "QR code"}</h1>
        {isFullscreen ? null : (
          <Link href="/create" className="qr-back">
            New code
          </Link>
        )}
      </header>

      <div className="qr-frame">
        {isTooLong ? (
          <p className="qr-fallback">
            This link carries more than {MAX_PAYLOAD_LENGTH} characters, which is
            more than a QR code can hold.
          </p>
        ) : (
          <QrErrorBoundary
            resetKey={data}
            fallback={
              <p className="qr-fallback">This data will not fit in a QR code.</p>
            }
          >
            <QRCodeSVG
              className="qr-code"
              value={data}
              size={1024}
              level="M"
              // Four blank modules is the quiet zone the QR spec asks for, and
              // it doubles as the white border around the code on screen.
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#0e0e0d"
              title={name ? `QR code for ${name}` : "QR code"}
            />
          </QrErrorBoundary>
        )}
      </div>

      <footer className="qr-foot">
        <p className="qr-target">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {target}
            </a>
          ) : (
            target
          )}
          <small>{describePayload(data)}</small>
        </p>

        <div className="qr-actions">
          <button type="button" className="btn btn-accent" onClick={handleDownload}>
            Download image
          </button>
          {canShare ? (
            <button type="button" className="btn btn-ghost" onClick={handleShare}>
              Share
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={copyLink}>
            Copy link
          </button>
          {canFullscreen ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>
          ) : null}
          <Link href={buildEditHref(name, data)} className="btn btn-ghost">
            Edit
          </Link>
        </div>
      </footer>

      {isTooLong ? null : (
        <div className="offscreen" aria-hidden="true">
          <QrErrorBoundary resetKey={data} fallback={null}>
            <QRCodeCanvas
              ref={canvasRef}
              value={data}
              size={EXPORT_SIZE}
              level="M"
              // Same quiet zone as on screen, so a printed copy is as
              // scannable as the one on the display.
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#0e0e0d"
            />
          </QrErrorBoundary>
        </div>
      )}

      {toast ? (
        <p className="toast" role="status">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
