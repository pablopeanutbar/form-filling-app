/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0071E3',
          hover: '#0066CC',
          active: '#005BB5',
          soft: '#EAF4FF',
          light: '#2997FF'
        },
        former: {
          bg: '#FFFFFF',
          canvas: '#F5F5F7',
          surface: '#FFFFFF',
          'surface-subtle': '#FAFAFC',
          text: '#1D1D1F',
          secondary: '#515154',
          muted: '#6E6E73',
          border: '#E5E7EB',
          'border-strong': '#C7C7CC',
          error: '#D92D20',
          'error-soft': '#FFF0EF',
          success: '#16794D',
          'success-soft': '#EAF7F0',
          warning: '#915B00',
          'warning-soft': '#FFF7E8',
          disabled: '#A1A1A6'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      borderRadius: {
        pill: '9999px',
        card: '14px',
        control: '8px'
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        card: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)'
      }
    }
  },
  plugins: []
};
