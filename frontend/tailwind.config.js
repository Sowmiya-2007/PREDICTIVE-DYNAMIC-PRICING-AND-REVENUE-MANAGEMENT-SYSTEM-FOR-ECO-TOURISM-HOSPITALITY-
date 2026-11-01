/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Forest Green - Primary Brand
        forest: {
          50: '#F2F7F4',
          100: '#E1EFE7',
          200: '#C3DFCE',
          300: '#9BCAB0',
          400: '#69AD8B',
          500: '#40916C',
          600: '#2D6A4F',
          700: '#1B4332',
          800: '#143526',
          900: '#0E241B',
          950: '#081711',
        },
        // Emerald Green - Highlights, positive indicators & accents
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
        },
        // Soft Sage - Secondary backgrounds, subtle borders, tags
        sage: {
          25: '#FAFBF9',
          50: '#F4F7F4',
          100: '#E8ECE8',
          200: '#D5DDD6',
          300: '#B8C5BA',
          400: '#96A99A',
          500: '#758C7A',
          600: '#5A6F5F',
          700: '#46564A',
          800: '#364239',
          900: '#273029',
          950: '#181E19',
        },
        // Warm Ivory - Main surface & canvas
        ivory: {
          50: '#FCFBF8',
          100: '#F8F6F0',
          200: '#F1EDE2',
          300: '#E7E0D0',
          400: '#D9CDB8',
        },
        // Charcoal - Premium text typography
        charcoal: {
          50: '#F5F6F7',
          100: '#E6E8EB',
          200: '#CDD1D7',
          300: '#9DA5B1',
          400: '#687486',
          500: '#475467',
          600: '#344054',
          700: '#1D2939',
          800: '#101828',
          900: '#0C111D',
          950: '#06080E',
        },
        earth: {
          50: '#fdfbf7',
          100: '#f9f5eb',
          200: '#f2e9d2',
          300: '#e7d6b3',
          400: '#d9bd8d',
          500: '#c8a268',
          600: '#b48a54',
          700: '#966e43',
          800: '#7a5839',
          900: '#644831',
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(16, 24, 40, 0.04), 0 1px 2px -1px rgba(16, 24, 40, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(14, 36, 27, 0.08), 0 8px 10px -6px rgba(14, 36, 27, 0.04)',
        'elevated': '0 20px 30px -10px rgba(14, 36, 27, 0.12), 0 10px 15px -5px rgba(14, 36, 27, 0.04)',
        'subtle': '0 0 0 1px rgba(16, 24, 40, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
