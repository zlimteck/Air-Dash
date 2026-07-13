import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Air-Dash",
    short_name: "Air-Dash",
    description: "Live network status and account dashboard for AirVPN.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d16",
    theme_color: "#0b0d16",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
