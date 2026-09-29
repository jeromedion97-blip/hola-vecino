// Textes ajoutés en v12 (articles illustrés dans le fil)
(() => {
const add = {
fr: { art_cover:"Image de couverture", art_cover_upload:"Importer une photo", art_cover_gen:"Générer une couverture", art_cover_remove:"Retirer l'image", art_cover_none:"Aucune image pour l'instant.",
  art_cover_help:"Utilisez vos propres photos ou des images libres de droits. La couverture générée reprend le titre de l'article aux couleurs d'Hola Vecino.", art_cover_ok:"Image ajoutée. Pensez à enregistrer.", art_cover_need_title:"Écrivez d'abord un titre.",
  art_feed_note:"À la publication, l'article apparaît automatiquement dans le fil Présentations : les membres peuvent réagir et commenter.",
  art_react:"Réagir et commenter", art_react_login:"Inscrivez-vous gratuitement pour réagir et commenter cet article", wall_article_tag:"Article", wall_read:"Lire l'article" },
en: { art_cover:"Cover image", art_cover_upload:"Upload a photo", art_cover_gen:"Generate a cover", art_cover_remove:"Remove image", art_cover_none:"No image yet.",
  art_cover_help:"Use your own photos or royalty-free images. The generated cover shows the article title in Hola Vecino colours.", art_cover_ok:"Image added. Remember to save.", art_cover_need_title:"Write a title first.",
  art_feed_note:"When published, the article automatically appears in the Introductions feed: members can react and comment.",
  art_react:"React and comment", art_react_login:"Sign up for free to react and comment on this article", wall_article_tag:"Article", wall_read:"Read the article" },
es: { art_react:"Reaccionar y comentar", art_react_login:"Regístrate gratis para reaccionar y comentar este artículo", wall_article_tag:"Artículo", wall_read:"Leer el artículo" },
de: { art_react:"Reagieren und kommentieren", art_react_login:"Melde dich kostenlos an, um diesen Artikel zu kommentieren", wall_article_tag:"Artikel", wall_read:"Artikel lesen" },
nl: { art_react:"Reageren en commentaar geven", art_react_login:"Schrijf je gratis in om op dit artikel te reageren", wall_article_tag:"Artikel", wall_read:"Artikel lezen" }
};
for (const l in add) Object.assign(window.I18N[l], add[l]);
})();
