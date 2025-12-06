// Frontend configuration. For production set REACT_APP_API_URL in your environment
export const API_BASE = (function(){
  // Vite exposes env variables as import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE
  }
  // fallback to relative
  return ''
})()

export const COLOR_PRIMARY = '#064E3B' // emerald-800
export const COLOR_ACCENT = '#06B6D4' // cyan-400
