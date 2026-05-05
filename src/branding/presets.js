import kalaLogo from "../assets/branding/kala/logo/logo_Kala.png"

const defaultBrand = {
  appName: "Turnero",
  colors: {
    primary: "#0f5a46",
    accent: "#2ea27f",
    danger: "#8f1736",
    bg: "#f3f7f3",
    surface: "#ffffff",
    surfaceAlt: "#edf4ee",
  },
  logo: "",
}

const kalaBrand = {
  appName: "Turnero",
  colors: {
    primary: "#8c9ac4",
    accent: "#6b77a4",
    danger: "#8f1736",
    bg: "#f8f7f2",
    surface: "#f3ece4",
    surfaceAlt: "#ead9ca",
  },
  logo: kalaLogo,
}

export { defaultBrand as default, kalaBrand as kala }
