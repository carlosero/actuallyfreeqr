/**
 * Composes the downloadable / shareable image: the label on top, the QR code
 * in the middle, the destination underneath. Done entirely on a canvas in the
 * browser — no image server, nothing uploaded anywhere.
 */

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const INK = "#0b0b0b";
const MUTED = "#6b6b66";
/** Always a white quiet zone: dark-on-light is what scanners are happiest with. */
const PAPER = "#ffffff";

type ComposeOptions = {
  /** The canvas the QR code was drawn into. */
  source: HTMLCanvasElement;
  name: string;
  caption: string;
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines) break;
    }
  }

  if (lines.length < maxLines) lines.push(current);

  const last = lines[lines.length - 1];
  if (ctx.measureText(last).width > maxWidth) {
    lines[lines.length - 1] = truncateToWidth(ctx, last, maxWidth);
  }
  return lines.slice(0, maxLines);
}

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

/**
 * Draws the poster at the QR canvas's native resolution so the modules are
 * copied 1:1 with no resampling — the printed code stays razor sharp.
 */
export function composeQrPoster(options: ComposeOptions): HTMLCanvasElement {
  const { source, name, caption } = options;

  const qrSize = source.width;
  const unit = qrSize / 1000;
  // The QR arrives with its own quiet zone baked in; this is breathing room
  // around it, not the quiet zone itself.
  const padding = Math.round(62 * unit);

  const nameFontSize = Math.round(62 * unit);
  const nameLineHeight = Math.round(nameFontSize * 1.18);
  const captionFontSize = Math.round(30 * unit);

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Canvas is not available in this browser.");

  measure.font = `700 ${nameFontSize}px ${FONT_STACK}`;
  const nameLines = name.trim()
    ? wrapText(measure, name.trim(), qrSize, 2)
    : [];

  measure.font = `400 ${captionFontSize}px ${FONT_STACK}`;
  const captionLine = caption.trim()
    ? truncateToWidth(measure, caption.trim(), qrSize)
    : "";

  const nameBlock = nameLines.length
    ? nameLines.length * nameLineHeight + Math.round(46 * unit)
    : 0;
  const captionBlock = captionLine
    ? Math.round(44 * unit) + captionFontSize
    : 0;

  const canvas = document.createElement("canvas");
  canvas.width = qrSize + padding * 2;
  canvas.height = padding * 2 + nameBlock + qrSize + captionBlock;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  let cursorY = padding;

  if (nameLines.length) {
    ctx.fillStyle = INK;
    ctx.font = `700 ${nameFontSize}px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    nameLines.forEach((line, index) => {
      ctx.fillText(line, centerX, cursorY + nameFontSize + index * nameLineHeight);
    });
    cursorY += nameBlock;
  }

  ctx.drawImage(source, padding, cursorY, qrSize, qrSize);
  cursorY += qrSize;

  if (captionLine) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 ${captionFontSize}px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.fillText(captionLine, centerX, cursorY + Math.round(44 * unit));
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not turn the QR code into an image."));
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give Safari a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
