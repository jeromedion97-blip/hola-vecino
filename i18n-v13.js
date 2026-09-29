// Textes ajoutés en v13 (pilotage administrateur)
(() => {
const add = {
fr: { ap_title:"Pilotage", ap_tab_members:"Membres", ap_tab_welcome:"Bienvenue et annonces", ap_tab_ideas:"Idées de l'IA",
  ap_search:"Rechercher un nom, un e-mail ou une ville…", ap_f_all:"Tous", ap_f_new:"Nouveaux (7 j)", ap_f_premium:"Premium", ap_f_inactive:"Inactifs (30 j)", ap_f_pro:"Pros à vérifier",
  ap_joined:"Inscrit le", ap_last:"dernière connexion", ap_remove_premium:"Retirer le Premium",
  ap_welcome_t:"Message de bienvenue automatique", ap_welcome_d:"Envoyé depuis votre compte dans la messagerie de chaque nouvel inscrit, dans sa langue. Il reçoit aussi un e-mail de notification.",
  ap_welcome_on:"Envoyer le message de bienvenue aux nouveaux inscrits", ap_placeholder:"Astuce : {prenom} sera remplacé par le prénom du membre.", ap_preview:"Aperçu",
  ap_broadcast_t:"Message à tous les membres", ap_broadcast_d:"Pour annoncer une nouveauté, un événement ou une offre. Chaque membre le reçoit dans sa messagerie, dans sa langue.",
  ap_broadcast_btn:"Envoyer à tous", ap_broadcast_empty:"Écrivez d'abord le message en français.", ap_broadcast_confirm:"Envoyer ce message à tous les membres ? Cette action ne peut pas être annulée.", ap_broadcast_sent:"messages envoyés.",
  ap_ideas_t:"Idées et analyses de l'IA", ap_ideas_d:"L'IA lit les suggestions, commentaires, avis, sujets du forum et pages les plus vues (sans les noms des membres), puis vous propose des idées d'articles, des améliorations et les actions de la semaine.",
  ap_ideas_run:"Analyser le site", ap_ideas_running:"Analyse en cours, environ 20 à 40 secondes…", ap_ideas_none:"Aucune analyse pour l'instant. Cliquez sur « Analyser le site ».", ap_ideas_date:"Dernière analyse :", ap_ideas_volume:"contenus analysés :",
  ap_pos:"Ce qu'ils apprécient", ap_neg:"Ce qui les gêne", ap_req:"Ce qu'ils demandent", ap_articles:"Idées d'articles", ap_write:"Rédiger", ap_improve:"Améliorations proposées",
  ap_impact:"Impact", ap_effort:"Effort", ap_actions:"À faire cette semaine", ap_moderation:"À surveiller", ap_suggest:"Suggérer avec l'IA", ap_suggesting:"L'IA prépare 3 propositions…", ap_pick:"Choisissez une proposition : elle sera placée dans l'éditeur, où vous pourrez la modifier.", ap_use:"Utiliser ce texte", ap_picked:"Texte placé dans l'éditeur (Français). Modifiez-le si besoin.",
  ap_then_translate:"Relisez, puis traduisez et enregistrez.", ap_last_edit:"Dernière modification :", ap_bc_topic:"Sujet de l'annonce (pour les suggestions de l'IA)", ap_bc_topic_ph:"Ex. : nouveau cours d'espagnol, soirée à Alicante, nouvelles fonctions…", ap_lvl_high:"fort", ap_lvl_medium:"moyen", ap_lvl_low:"faible", ap_lvl_small:"léger", ap_lvl_large:"important" },
en: { ap_title:"Control centre", ap_tab_members:"Members", ap_tab_welcome:"Welcome and announcements", ap_tab_ideas:"AI ideas",
  ap_search:"Search a name, an email or a city…", ap_f_all:"All", ap_f_new:"New (7 d)", ap_f_premium:"Premium", ap_f_inactive:"Inactive (30 d)", ap_f_pro:"Pros to verify",
  ap_joined:"Joined", ap_last:"last login", ap_remove_premium:"Remove Premium",
  ap_welcome_t:"Automatic welcome message", ap_welcome_d:"Sent from your account to every new member's inbox, in their language. They also get an email notification.",
  ap_welcome_on:"Send the welcome message to new members", ap_placeholder:"Tip: {prenom} is replaced by the member's first name.", ap_preview:"Preview",
  ap_broadcast_t:"Message to all members", ap_broadcast_d:"To announce a new feature, an event or an offer. Each member receives it in their inbox, in their language.",
  ap_broadcast_btn:"Send to all", ap_broadcast_empty:"Write the message in French first.", ap_broadcast_confirm:"Send this message to all members? This cannot be undone.", ap_broadcast_sent:"messages sent.",
  ap_ideas_t:"AI ideas and analysis", ap_ideas_d:"The AI reads suggestions, comments, reviews, forum topics and most viewed pages (without member names), then suggests article ideas, improvements and this week's actions.",
  ap_ideas_run:"Analyse the site", ap_ideas_running:"Analysing, about 20 to 40 seconds…", ap_ideas_none:"No analysis yet. Click “Analyse the site”.", ap_ideas_date:"Last analysis:", ap_ideas_volume:"items analysed:",
  ap_pos:"What they like", ap_neg:"What bothers them", ap_req:"What they ask for", ap_articles:"Article ideas", ap_write:"Write", ap_improve:"Suggested improvements",
  ap_impact:"Impact", ap_effort:"Effort", ap_actions:"To do this week", ap_moderation:"To keep an eye on", ap_suggest:"Suggest with AI", ap_suggesting:"The AI is preparing 3 proposals…", ap_pick:"Pick a proposal: it will be placed in the editor, where you can edit it.", ap_use:"Use this text", ap_picked:"Text placed in the editor (French). Edit it if needed.",
  ap_then_translate:"Review it, then translate and save.", ap_last_edit:"Last edited:", ap_bc_topic:"Subject of the announcement (for AI suggestions)", ap_bc_topic_ph:"E.g. new Spanish course, evening in Alicante, new features…", ap_lvl_high:"high", ap_lvl_medium:"medium", ap_lvl_low:"low", ap_lvl_small:"small", ap_lvl_large:"large" }
};
for (const l in add) Object.assign(window.I18N[l], add[l]);
})();
