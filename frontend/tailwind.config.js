/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- Add this line
  ],
  darkMode: "class", // <-- Add this line
  theme: {
    extend: {},
  },
  plugins: [],
}