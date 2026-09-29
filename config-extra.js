// ============================================================
//  RÉGLAGES SUPPLÉMENTAIRES (v5) — à compléter
//  Ce fichier s'ajoute à config.js, qui garde vos clés Supabase.
// ============================================================
window.APP_CONFIG_EXTRA = {
  // Vos réseaux sociaux : collez l'adresse complète de chaque compte.
  // Une icône s'affiche en bas du site et sur la page Contact dès qu'une adresse est remplie.
  SOCIAL: {
    youtube: "https://www.youtube.com/channel/UCSHKBZi1ftYQhkAdng838Ag",
    tiktok: "https://www.tiktok.com/@holavecino97",
    instagram: "https://www.instagram.com/holavecino97/",
    facebook: "https://www.facebook.com/profile.php?id=61594897831343"
  },

  // Liens exacts de vos produits Gumroad (bouton « Share » ou « Copy link » de chaque produit).
  // S'ils sont remplis, ils remplacent les liens construits à partir de GUMROAD_STORE dans config.js.
  GUMROAD_LINKS: {
    premium: "https://regardful6.gumroad.com/l/lhoyfk",        // Hola Vecino Premium (9,90 €/mois ou 79 €/an)
    pro: "https://regardful6.gumroad.com/l/hv-pro",            // Annonce professionnelle (14,90 €/mois ou 119 €/an)
    youtube: "https://regardful6.gumroad.com/l/hv-youtube",    // Chaîne YouTube référencée (4,90 €/mois)
    rental: "https://regardful6.gumroad.com/l/hv-location",    // Location d'un bien, 30 jours (9,90 €)
    featured: "https://regardful6.gumroad.com/l/hv-vedette",  // Mise en vedette (5 €/mois)
    pro_full: "https://regardful6.gumroad.com/l/annonce-completepng",        // Annonce professionnelle complète (49,90 €/mois ou 499 €/an) — lien personnalisé : hv-pro-complet
    guide_complete: "https://regardful6.gumroad.com/l/hv-guide-complet",  // Guide complet (9,90 €)
    guide_achat: "https://regardful6.gumroad.com/l/hv-guide-achat",     // Guide « Acheter un bien » (4,90 €)
    guide_impots: "https://regardful6.gumroad.com/l/hv-guide-impots",    // Guide « Les impôts la première année » (4,90 €)
    guide_autonomo: "https://regardful6.gumroad.com/l/hv-guide-autonomo",  // Guide « Devenir autónomo » (4,90 €)
    guide_retraite: "https://regardful6.gumroad.com/l/hv-guide-retraite",  // Guide « Prendre sa retraite en Espagne » (4,90 €)
    guide_pack: "https://regardful6.gumroad.com/l/hv-guides-pack",      // Pack des 5 guides (19,90 €)
    course: "https://regardful6.gumroad.com/l/hv-cours-espagnol"           // Cours « Parlez espagnol ! » (12,90 €) — un seul produit contenant les 4 PDF (FR, EN, DE, NL)
  },

  // Tarifs supplémentaires affichés sur le site (en euros)
  PRICES_EXTRA: { pro_full_month: 49.90, pro_full_year: 499, guide_complete: 9.90, guide_theme: 4.90, guide_pack: 19.90, course: 12.90 },

  // Identifiant de votre chaîne YouTube (commence par UC, 24 caractères).
  // Il sert à afficher vos dernières vidéos sur le site. Voir le guide pour le trouver.
  YOUTUBE_CHANNEL_ID: "UCSHKBZi1ftYQhkAdng838Ag",

  // Drive personnel (réservé aux membres Premium)
  DRIVE_QUOTA_MB: 50,
  DRIVE_FILE_MB: 10
};
Object.assign(window.APP_CONFIG, window.APP_CONFIG_EXTRA);
window.APP_CONFIG.PRICES = Object.assign({}, window.APP_CONFIG.PRICES || {}, window.APP_CONFIG_EXTRA.PRICES_EXTRA || {});
