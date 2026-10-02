# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [0.1.0] — 2026-10-02

### Adicionado
- `ImageEditor` (React / Client Component) sobre o Cropper.js: recorte com alças
  (cantos e bordas), mover, zoom, rotação em qualquer ângulo, espelhar (flip),
  proporção livre ou travada e resetar.
- API imperativa via `ref` (`ImageEditorHandle`): `export()`, `exportDataURL()`,
  `getCropData()`, `rotateTo()`, `zoom()`, `flipHorizontal/Vertical()`, `setAspect()`, `reset()`.
- Pipeline do servidor `cropsmith/server` (Sharp): `processImage`, `makeVariants`,
  `normalizeOriginal`, `toWebp`, `extractCrop`, `readImageMeta` — original preservado,
  derivadas WebP configuráveis (padrão `full` 1600px e `thumb` 500px).
- Build dual ESM + CJS com tipos (`.d.ts`), diretiva `"use client"` preservada no bundle.
- Documentação completa (README em pt-BR) e ilustrações de uso.
