import defaultBrand, { kala as kalaBrand } from "./presets"

const PRESETS = {
  default: defaultBrand,
  kala: kalaBrand,
}

export function getBrand() {
  const presetName = import.meta.env.VITE_BRAND_PRESET || "default"
  return PRESETS[presetName] || PRESETS.default
}

export function applyBrandToCssVars(brand) {
  if (typeof document === "undefined") return

  const rootStyle = document.documentElement.style
  rootStyle.setProperty("--brand-primary", brand?.colors?.primary || "")
  rootStyle.setProperty("--brand-accent", brand?.colors?.accent || "")
  rootStyle.setProperty("--brand-danger", brand?.colors?.danger || "")
}
