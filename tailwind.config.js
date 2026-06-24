/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            // Let highlight.js & custom CSS fully own code styling
            pre: false,
            'pre code': false,
            code: false,
            'code::before': false,
            'code::after': false,
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
