import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        canvas: '#F4F4EA',
        surface: '#FAF9F4',
        card: '#FFFFFF',
        lime: {
          DEFAULT: '#E5FF36',
          hover: '#DCF726',
          tint: '#FDF8D0',
          olive: '#95AA1C',
        },
        ink: {
          DEFAULT: '#111111',
          soft: '#222222',
          muted: '#777777',
        },
        line: '#E5E5DC',
      },
      borderRadius: {
        card: '26px',
        chart: '28px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(17, 17, 17, 0.03)',
        float: '0 8px 28px rgba(17, 17, 17, 0.08)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
