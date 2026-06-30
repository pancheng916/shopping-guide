import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        success: {
          50: '#F0FDF4',
          500: '#22C55E',
          600: '#16A34A',
        },
        danger: {
          500: '#EF4444',
          600: '#DC2626',
        },
        text: {
          primary: '#1A1A2E',
          secondary: '#4A4A6A',
          tertiary: '#8B8BA7',
          price: '#E04400',
        },
        bg: {
          body: '#FFF8F4',
          white: '#FFFFFF',
          card: '#FFFFFF',
          hover: '#FFF7ED',
        },
        border: {
          DEFAULT: '#F0E8E0',
          light: '#FFF0E6',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        sm: '0 1px 3px rgba(233, 88, 12, 0.06)',
        md: '0 4px 12px rgba(233, 88, 12, 0.08)',
        lg: '0 8px 24px rgba(233, 88, 12, 0.12)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '20px',
      },
    },
  },
  plugins: [],
};

export default config;
