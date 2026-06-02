import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

interface Props {
  value: string;
  size?: number;
  className?: string;
}

export function QrCode({ value, size = 180, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCodeLib.toCanvas(ref.current, value, { width: size, margin: 1 }).catch(() => {});
  }, [value, size]);
  return <canvas ref={ref} className={className} aria-label="QR code" />;
}
