// ============================================================
//  CONFIGURATION — les seules valeurs à modifier
// ============================================================
window.APP_CONFIG = {
  // Nom affiché sur le site
  APP_NAME: "Hola Vecino",

  // Supabase > Project Settings > API (URL et clé publique « anon » / « publishable »)
  SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
  SUPABASE_ANON_KEY: "VOTRE_CLE_PUBLIQUE_ANON",

  // Analyse IA du budget, réservée aux membres Premium.
  // Utilise votre clé API Anthropic (variable ANTHROPIC_API_KEY sur Netlify). Mettre false pour la couper.
  AI_ENABLED: true,

  // Coordonnées affichées sur la page Contact
  CONTACT_EMAIL: "hola.vecino@hotmail.com",
  CONTACT_PHONE: "+32 456 81 52 62",

  // Votre boutique Gumroad : remplacez VOTRE-COMPTE par votre nom d'utilisateur Gumroad.
  // Les produits doivent avoir exactement ces liens personnalisés (voir README).
  GUMROAD_STORE: "https://VOTRE-COMPTE.gumroad.com/l/",
  GUMROAD_PRODUCTS: { premium: "hv-premium", pro: "hv-pro", youtube: "hv-youtube", rental: "hv-location", featured: "hv-vedette" },

  // Tarifs affichés sur le site (en euros). Gardez les mêmes montants sur Gumroad.
  PRICES: {
    premium_month: 9.90, premium_year: 79,
    pro_month: 14.90, pro_year: 119,
    youtube_month: 4.90,
    rental_30: 9.90,
    featured_month: 5
  }
};
