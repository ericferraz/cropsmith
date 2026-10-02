import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Cropper from "cropperjs";
import type { AspectPreset, CropData, EditorLabels, ExportOptions, ImageEditorHandle, ImageEditorProps } from "./types";

const DEFAULT_ASPECTS: AspectPreset[] = [
  { label: "Livre", value: null },
  { label: "16:9", value: 16 / 9 },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
];

const DEFAULT_LABELS: EditorLabels = { aspect: "Proporção", zoom: "Zoom", rotate: "Girar", flip: "Espelhar", reset: "Resetar" };

const RED = "#e5251f";

const S = {
  root: { display: "flex", flexDirection: "column", gap: 12, fontFamily: "inherit", color: "inherit" } as const,
  stage: { position: "relative", width: "100%", background: "#111", borderRadius: 10, overflow: "hidden" } as const,
  img: { display: "block", maxWidth: "100%", opacity: 0 } as const,
  bar: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 } as const,
  group: { display: "flex", alignItems: "center", gap: 6 } as const,
  label: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", opacity: 0.6 } as const,
  chip: {
    border: "1px solid rgba(127,127,127,.35)", background: "transparent", color: "inherit",
    borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", lineHeight: 1,
  } as const,
  chipOn: { background: RED, color: "#fff", borderColor: RED } as const,
  icon: {
    display: "inline-grid", placeItems: "center", width: 32, height: 32, borderRadius: 8,
    border: "1px solid rgba(127,127,127,.35)", background: "transparent", color: "inherit", cursor: "pointer",
  } as const,
  range: { flex: 1, minWidth: 90 } as const,
  val: { fontSize: 11, fontVariantNumeric: "tabular-nums", minWidth: 34, textAlign: "right", opacity: 0.75 } as const,
};

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  zoomIn: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3M11 8v6M8 11h6",
  zoomOut: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3M8 11h6",
  rotL: "M3 9a9 9 0 1 1 1.6 5M3 4v5h5",
  rotR: "M21 9a9 9 0 1 0-1.6 5M21 4v5h-5",
  flipH: "M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4",
  flipV: "M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4",
  reset: "M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.3 2.6L3 8M3 3v5h5",
};

/**
 * Editor de imagem (Client Component) sobre o Cropper.js: caixa de recorte com alças
 * (arraste cantos/bordas para reenquadrar, o centro para mover), zoom, rotação em
 * qualquer ângulo, espelhar e proporção livre/travada.
 *
 * O recorte é renderizado com `export()` (Blob/WebP) para enviar ao servidor, ou as
 * coordenadas (`getCropData()`) podem ser processadas no back com `cropsmith/server`.
 * Exponha a API imperativa via `ref` (ver {@link ImageEditorHandle}).
 *
 * Requer o CSS do Cropper uma vez no app: `import "cropperjs/dist/cropper.css"`.
 *
 * @example
 * const ref = useRef<ImageEditorHandle>(null);
 * <ImageEditor ref={ref} src={url} aspect={16/9} />;
 * const blob = await ref.current?.export({ type: "image/webp", quality: 0.92 });
 */
export const ImageEditor = forwardRef<ImageEditorHandle, ImageEditorProps>(function ImageEditor(
  { src, aspect = null, aspectPresets = DEFAULT_ASPECTS, rotation = true, flip = true, toolbar = true, height = 360, className, labels, onReady, onChange },
  ref
) {
  const imgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const scaleX = useRef(1);
  const scaleY = useRef(1);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  onChangeRef.current = onChange;
  onReadyRef.current = onReady;

  const [rotateDeg, setRotateDeg] = useState(0);
  const [aspectValue, setAspectValue] = useState<number | null>(aspect);
  const L = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  const emit = () => {
    const c = cropperRef.current;
    if (c && onChangeRef.current) onChangeRef.current(c.getData(true) as CropData);
  };

  const handle = useMemo<ImageEditorHandle>(
    () => ({
      getCropData: () => (cropperRef.current ? (cropperRef.current.getData(true) as CropData) : null),
      export: (opts?: ExportOptions) =>
        new Promise<Blob | null>((resolve) => {
          const canvas = getCanvas(cropperRef.current, opts);
          if (!canvas) return resolve(null);
          canvas.toBlob((b) => resolve(b), opts?.type ?? "image/webp", opts?.quality ?? 0.92);
        }),
      exportDataURL: (opts?: ExportOptions) => {
        const canvas = getCanvas(cropperRef.current, opts);
        return canvas ? canvas.toDataURL(opts?.type ?? "image/webp", opts?.quality ?? 0.92) : null;
      },
      rotateTo: (deg: number) => {
        cropperRef.current?.rotateTo(deg);
        setRotateDeg(deg);
      },
      zoom: (delta: number) => cropperRef.current?.zoom(delta),
      flipHorizontal: () => {
        scaleX.current *= -1;
        cropperRef.current?.scaleX(scaleX.current);
      },
      flipVertical: () => {
        scaleY.current *= -1;
        cropperRef.current?.scaleY(scaleY.current);
      },
      setAspect: (value: number | null) => {
        cropperRef.current?.setAspectRatio(value ?? NaN);
        setAspectValue(value);
      },
      reset: () => {
        scaleX.current = 1;
        scaleY.current = 1;
        cropperRef.current?.reset();
        cropperRef.current?.scaleX(1);
        cropperRef.current?.scaleY(1);
        setRotateDeg(0);
      },
    }),
    []
  );

  useImperativeHandle(ref, () => handle, [handle]);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    scaleX.current = 1;
    scaleY.current = 1;
    setRotateDeg(0);
    const cropper = new Cropper(el, {
      aspectRatio: aspect ?? NaN,
      viewMode: 1,
      dragMode: "move",
      autoCropArea: 0.85,
      background: false,
      responsive: true,
      restore: false,
      checkOrientation: true,
      guides: true,
      center: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      ready() {
        onReadyRef.current?.(handle);
        emit();
      },
      crop() {
        emit();
      },
    });
    cropperRef.current = cropper;
    return () => {
      cropper.destroy();
      cropperRef.current = null;
    };
    // Recria o cropper quando a imagem muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className={className} style={S.root}>
      <div style={{ ...S.stage, height }}>
        <img ref={imgRef} src={src} alt="" crossOrigin="anonymous" style={S.img} />
      </div>

      {toolbar && (
        <div style={S.bar}>
          {aspectPresets.length > 0 && (
            <div style={S.group} role="group" aria-label={L.aspect}>
              {aspectPresets.map((p) => {
                const on = (p.value ?? null) === (aspectValue ?? null);
                return (
                  <button key={p.label} type="button" onClick={() => handle.setAspect(p.value)} aria-pressed={on} style={{ ...S.chip, ...(on ? S.chipOn : null) }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          <div style={S.group}>
            <button type="button" onClick={() => handle.zoom(-0.1)} aria-label="Diminuir zoom" style={S.icon}><Icon d={ICONS.zoomOut} /></button>
            <button type="button" onClick={() => handle.zoom(0.1)} aria-label="Aumentar zoom" style={S.icon}><Icon d={ICONS.zoomIn} /></button>
          </div>

          {rotation && (
            <div style={{ ...S.group, flex: 1, minWidth: 160 }}>
              <span style={S.label}>{L.rotate}</span>
              <button type="button" onClick={() => handle.rotateTo(rotateDeg - 90)} aria-label="Girar -90°" style={S.icon}><Icon d={ICONS.rotL} /></button>
              <input
                type="range" min={-180} max={180} step={1} value={rotateDeg}
                onChange={(e) => handle.rotateTo(Number(e.target.value))}
                aria-label={L.rotate} style={S.range}
              />
              <button type="button" onClick={() => handle.rotateTo(rotateDeg + 90)} aria-label="Girar +90°" style={S.icon}><Icon d={ICONS.rotR} /></button>
              <span style={S.val}>{Math.round(rotateDeg)}°</span>
            </div>
          )}

          {flip && (
            <div style={S.group}>
              <button type="button" onClick={handle.flipHorizontal} aria-label="Espelhar horizontal" style={S.icon}><Icon d={ICONS.flipH} /></button>
              <button type="button" onClick={handle.flipVertical} aria-label="Espelhar vertical" style={S.icon}><Icon d={ICONS.flipV} /></button>
            </div>
          )}

          <button type="button" onClick={handle.reset} style={{ ...S.chip, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon d={ICONS.reset} size={14} />
            {L.reset}
          </button>
        </div>
      )}
    </div>
  );
});

function getCanvas(cropper: Cropper | null, opts?: ExportOptions): HTMLCanvasElement | null {
  if (!cropper) return null;
  return cropper.getCroppedCanvas({
    maxWidth: opts?.maxWidth,
    maxHeight: opts?.maxHeight,
    fillColor: opts?.fillColor ?? "#ffffff",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });
}
