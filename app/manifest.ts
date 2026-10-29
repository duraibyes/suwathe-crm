import type { MetadataRoute } from "next";

// Lets you "Add to Home screen" on your phone, so the CRM opens like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suwathe CRM",
    short_name: "Suwathe CRM",
    description: "Leads, follow-ups, payments and renewals",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fc",
    theme_color: "#071b3d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
