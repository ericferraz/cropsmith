/**
 * Dados de recorte no sistema de coordenadas da imagem natural (pixels do original).
 * Compatível com `Cropper#getData()` — use no servidor para extrair/girar a partir
 * do original com o Sharp (ver `cropsmith/server`).
 */
export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}

/** Proporção pré-definida exibida na barra de ferramentas. `null` = livre. */
export interface AspectPreset {
  label: string;
  value: number | null;
}

/** Opções de exportação do recorte renderizado (canvas → Blob/DataURL). */
export interface ExportOptions {
  /** MIME type. Padrão: "image/webp". */
  type?: string;
  /** 0–1. Padrão: 0.92. */
  quality?: number;
  /** Limita o lado maior do canvas exportado (px). */
  maxWidth?: number;
  maxHeight?: number;
  /** Cor de fundo para áreas transparentes (ex.: após rotação). */
  fillColor?: string;
}

/** Labels da UI — permite traduzir a barra de ferramentas. */
export interface EditorLabels {
  aspect: string;
  zoom: string;
  rotate: string;
  flip: string;
  reset: string;
}

export interface ImageEditorProps {
  /** URL/ObjectURL/dataURL da imagem a editar. */
  src: string;
  /** Proporção inicial travada (ex.: 16/9). `null`/omitido = livre. */
  aspect?: number | null;
  /** Presets de proporção na barra. Passe `[]` para esconder. */
  aspectPresets?: AspectPreset[];
  /** Habilita o controle de rotação. Padrão: true. */
  rotation?: boolean;
  /** Habilita os controles de espelhar (flip). Padrão: true. */
  flip?: boolean;
  /** Mostra a barra de ferramentas embutida. Padrão: true. */
  toolbar?: boolean;
  /** Altura da área do editor (CSS). Padrão: 360px. */
  height?: number | string;
  /** Classe no contêiner raiz. */
  className?: string;
  /** Labels traduzíveis da barra. */
  labels?: Partial<EditorLabels>;
  /** Chamado quando o editor está pronto, com a API imperativa. */
  onReady?: (handle: ImageEditorHandle) => void;
  /** Chamado a cada mudança do recorte (arrastar/zoom/rotacionar). */
  onChange?: (data: CropData) => void;
}

/** API imperativa exposta via `ref`. */
export interface ImageEditorHandle {
  /** Coordenadas atuais do recorte (para processar no servidor a partir do original). */
  getCropData(): CropData | null;
  /** Renderiza o recorte (com zoom/rotação/flip) para um Blob. */
  export(options?: ExportOptions): Promise<Blob | null>;
  /** Mesma renderização, como dataURL (síncrono). */
  exportDataURL(options?: ExportOptions): string | null;
  /** Define o ângulo absoluto (graus). */
  rotateTo(deg: number): void;
  /** Zoom relativo (ex.: 0.1 / -0.1). */
  zoom(delta: number): void;
  flipHorizontal(): void;
  flipVertical(): void;
  /** Trava a proporção (`null` = livre). */
  setAspect(value: number | null): void;
  /** Volta ao estado inicial. */
  reset(): void;
}
