/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Cal Sans"', "sans-serif"],
        sans: ['"DM Sans"', "ui-sans-serif", "system-ui"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        shell: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
          hover: "var(--bg-hover)",
        },
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          warning: "var(--accent-warning)",
          danger: "var(--accent-danger)",
          success: "var(--accent-success)",
        },
      },
      boxShadow: {
        glow: "0 0 32px var(--accent-glow)",
      },
    },
  },
  plugins: [],
};
