// ============================================================
//  RÉGLAGES SUPPLÉMENTAIRES (v5) — à compléter
//  Ce fichier s'ajoute à config.js, qui garde vos clés Supabase.
// ============================================================
window.APP_CONFIG_EXTRA = {
  // Vos réseaux sociaux : collez l'adresse complète de chaque compte.
  // Une icône s'affiche en bas du site et sur la page Contact dès qu'une adresse est remplie.
  SOCIAL: {
    youtube: "",     // exemple : "https://www.youtube.com/@holavecino"
    tiktok: "",      // exemple : "https://www.tiktok.com/@holavecino"
    instagram: ""    // exemple : "https://www.instagram.com/holavecino"
  },

  // Identifiant de votre chaîne YouTube (commence par UC, 24 caractères).
  // Il sert à afficher vos dernières vidéos sur le site. Voir le guide pour le trouver.
  YOUTUBE_CHANNEL_ID: "",

  // Drive personnel (réservé aux membres Premium)
  DRIVE_QUOTA_MB: 50,
  DRIVE_FILE_MB: 10
};
Object.assign(window.APP_CONFIG, window.APP_CONFIG_EXTRA);
