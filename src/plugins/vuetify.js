import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#4E44D8',
          secondary: '#455A64',
          error: '#C62828',
          success: '#2E7D32',
          warning: '#F9A825',
          background: '#F5F7FA',
        },
      },
    },
  },
  defaults: {
    VBtn: { style: 'text-transform: none; letter-spacing: normal;' },
    VCard: { rounded: 'lg', variant: 'outlined', style: 'border-color: #E0E0E0;' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    // The outlined VCard default above is transparent by design (fine for
    // content cards sitting on the white page background) — but a dialog's
    // card needs an opaque surface to actually stand out against its own
    // dimmed scrim, otherwise the page behind bleeds straight through it.
    // Vuetify's nested-defaults scoping overrides VCard just for cards
    // rendered inside a VDialog, without touching every dialog's markup.
    VDialog: {
      VCard: { variant: 'elevated', style: '' },
    },
  },
})
