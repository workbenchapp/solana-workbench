import { defineConfig } from 'windicss/helpers';

function cssVarRgbHelper(cssVariable: string) {
  return ({
    opacityVariable,
    opacityValue,
  }: {
    opacityVariable: string;
    opacityValue: number;
  }) => {
    if (opacityValue !== undefined)
      return `rgba(var(--${cssVariable}), ${opacityValue})`;

    if (opacityVariable !== undefined)
      return `rgba(var(--${cssVariable}), var(${opacityVariable}, 1))`;

    return `rgb(var(--${cssVariable}))`;
  };
}

export default defineConfig({
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Roboto"'],
        mono: ['"Space Mono"'],
      },
      colors: {
        primary: {
          base: cssVarRgbHelper('primary-base'),
          dark: cssVarRgbHelper('primary-dark'),
          light: cssVarRgbHelper('primary-light'),
        },
        accent: {
          base: cssVarRgbHelper('accent-base'),
          dark: cssVarRgbHelper('accent-dark'),
          light: cssVarRgbHelper('accent-light'),
        },
        surface: {
          100: cssVarRgbHelper('surface-100'),
          200: cssVarRgbHelper('surface-200'),
          300: cssVarRgbHelper('surface-300'),
          400: cssVarRgbHelper('surface-400'),
          500: cssVarRgbHelper('surface-500'),
          600: cssVarRgbHelper('surface-600'),
        },
        contrast: cssVarRgbHelper('contrast'),
      },
    },
  },
});
