import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0284C7',
          'light-blue': '#06B6D4',
          'gradient-start': '#0284C7',
          'gradient-middle': '#06B6D4',
          'gradient-end': '#22D3EE',
        },
        error: {
          default: '#EF4444',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to right, #0284C7, #06B6D4, #22D3EE)',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        gradient: 'gradient 4s ease infinite',
      },
    },
  },
  plugins: [],
};

export default config;