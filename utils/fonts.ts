
/**
 * Liste des polices Google Fonts disponibles pour les créateurs.
 * Mélange de Serif, Sans-Serif, Display et Handwriting.
 */
export const GOOGLE_FONTS = [
  'Inter', // UI default
  'Montserrat', // Modern Sans
  'Roboto', // Neutral Sans
  'Lato', // Friendly Sans
  'Poppins', // Geometric Sans
  'Oswald', // Bold Condensed
  'Playfair Display', // Elegant Serif
  'Merriweather', // Readable Serif
  'Lora', // Contemporary Serif
  'Great Vibes', // Cursive / Wedding
  'Dancing Script', // Cursive / Casual
  'Pacifico', // Fun / Retro
  'Courier New', // Monospace (System fallback)
];

/**
 * Charge dynamiquement une police Google Font dans le document.
 * Vérifie si la police est déjà chargée pour éviter les doublons.
 */
export const loadFont = (fontFamily: string) => {
  if (!fontFamily || fontFamily === 'Courier New') return;

  const linkId = `font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
  
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    // On charge les graisses 400 (Regular) et 700 (Bold)
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }
};
