export const THEME_KEY = "tr-theme";

/** Inlined in <head> so the saved theme applies before first paint. Dark is the default. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
