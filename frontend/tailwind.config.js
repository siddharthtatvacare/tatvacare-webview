/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tc: {
          green:       '#1a7a4a',
          'green-mid': '#1d8a54',
          'green-dark':'#155c38',
          'green-bg':  '#eaf6ef',
          'green-border': '#b8dfc9',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
