"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * The hero's own QR code — it points at this site, which is the shortest
 * possible way to show what the thing does.
 */
export function SampleQr({ value }: { value: string }) {
  return (
    <figure className="sample">
      <div className="sample-name">Scan me</div>
      <div className="sample-code">
        <QRCodeSVG
          value={value}
          size={512}
          level="M"
          marginSize={0}
          bgColor="#ffffff"
          fgColor="#0e0e0d"
          title="A QR code that opens actuallyfreeqr"
        />
      </div>
      <figcaption className="sample-foot">
        This one opens this website. Yours opens whatever you type.
      </figcaption>
    </figure>
  );
}
