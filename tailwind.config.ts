import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        paper: "#f7f1e6",
        cedar: "#14685d",
        fig: "#7a3d5b",
        saffron: "#c88a1a",
        palm: "#0f4f46",
        mist: "#ece5d8",
      },
      fontFamily: {
        sans: [
          "Amiri",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
