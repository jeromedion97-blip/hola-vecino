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
    featured: "https://regardful6.gumroad.com/l/hv-vedette"   // Mise en vedette (5 €/mois)
  },

  // Identifiant de votre chaîne YouTube (commence par UC, 24 caractères).
  // Il sert à afficher vos dernières vidéos sur le site. Voir le guide pour le trouver.
  YOUTUBE_CHANNEL_ID: "UCSHKBZi1ftYQhkAdng838Ag",

  // Drive personnel (réservé aux membres Premium)
  DRIVE_QUOTA_MB: 50,
  DRIVE_FILE_MB: 10
};
Object.assign(window.APP_CONFIG, window.APP_CONFIG_EXTRA);
