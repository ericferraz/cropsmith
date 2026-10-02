import sharp from "sharp";
import type { CropData } from "../types";

export interface VariantSpec {
  /** Largura máxima (px). */
  width: number;
  /** Altura máxima (px), opcional. */
  height?: number;
  /** Qualidade WebP 1–100. */
  quality?: number;
  /** Modo de redimensionamento (Sharp). Padrão: "inside". */
  fit?: keyof sharp.FitEnum;
}

export interface ImageMeta {
  width: number;
  height: number;
  format: string;
}

export interface ProcessOptions {
  /** Mapa de derivadas a gerar. Padrão: { full: 1600, thumb: 500 }. */
  variants?: Record<string, VariantSpec>;
  /** Qualidade WebP padrão. */
  defaultQuality?: number;
}

export interface ProcessResult {
  meta: ImageMeta;
  /** Original com EXIF normalizado (orientação aplicada), no formato de entrada. */
  original: { buffer: Buffer; format: string };
  /** Derivadas WebP, por chave. */
  variants: Record<string, Buffer>;
}

export const DEFAULT_VARIANTS: Record<string, VariantSpec> = {
  full: { width: 1600, quality: 82 },
  thumb: { width: 500, quality: 78 },
};

/** Lê e valida metadados (lança se não for imagem válida). */
export async function readImageMeta(input: Buffer): Promise<ImageMeta> {
  const m = await sharp(input).metadata();
  if (!m.width || !m.height || !m.format) throw new Error("Arquivo não é uma imagem válida.");
  return { width: m.width, height: m.height, format: m.format };
}

/** Normaliza o original: aplica a orientação EXIF e mantém o formato. */
export async function normalizeOriginal(input: Buffer): Promise<{ buffer: Buffer; format: string }> {
  const img = sharp(input).rotate();
  const meta = await img.metadata();
  const buffer = await img.toBuffer();
  return { buffer, format: meta.format ?? "jpeg" };
}

/** Converte para WebP, limitando a largura (sem ampliar). */
export async function toWebp(input: Buffer, width: number, quality = 82): Promise<Buffer> {
  return sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
}

/** Gera o conjunto de derivadas WebP a partir de uma imagem (já enquadrada). */
export async function makeVariants(input: Buffer, variants: Record<string, VariantSpec> = DEFAULT_VARIANTS, defaultQuality = 82): Promise<Record<string, Buffer>> {
  const out: Record<string, Buffer> = {};
  for (const [key, spec] of Object.entries(variants)) {
    out[key] = await sharp(input)
      .rotate()
      .resize({ width: spec.width, height: spec.height, fit: spec.fit ?? "inside", withoutEnlargement: true })
      .webp({ quality: spec.quality ?? defaultQuality })
      .toBuffer();
  }
  return out;
}

/**
 * Pipeline completo: valida, normaliza o original e gera as derivadas WebP.
 * Use com o recorte renderizado no cliente (`ImageEditor#export()`).
 */
export async function processImage(input: Buffer, opts: ProcessOptions = {}): Promise<ProcessResult> {
  const meta = await readImageMeta(input);
  const original = await normalizeOriginal(input);
  const variants = await makeVariants(input, opts.variants ?? DEFAULT_VARIANTS, opts.defaultQuality ?? 82);
  return { meta, original, variants };
}

/**
 * Recorte a partir do ORIGINAL pelas coordenadas do `CropData` (coordenadas da imagem
 * natural). Preserva o original em alta qualidade. Ideal quando `rotate === 0`; para
 * rotações, prefira o recorte renderizado no cliente (ver README).
 */
export async function extractCrop(original: Buffer, crop: Pick<CropData, "x" | "y" | "width" | "height"> & { rotate?: number }): Promise<Buffer> {
  let img = sharp(original).rotate();
  if (crop.rotate) img = sharp(await img.rotate(crop.rotate).toBuffer());
  const left = Math.max(0, Math.round(crop.x));
  const top = Math.max(0, Math.round(crop.y));
  const width = Math.max(1, Math.round(crop.width));
  const height = Math.max(1, Math.round(crop.height));
  return img.extract({ left, top, width, height }).toBuffer();
}
