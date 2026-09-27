# Hola Vecino — guide de mise en ligne

Application pour les expatriés en Espagne : démarches, estimation des finances, communauté (carte, forum, messagerie, événements), bons plans, chaînes YouTube, suggestions et contact. 5 langues (FR, EN, ES, DE, NL). Partie payante via Gumroad, entièrement automatique.

**Outils** : GitHub (code), Netlify (hébergement, votre offre actuelle), Supabase (comptes et base de données, offre gratuite), Gumroad (paiements, commission sur chaque vente, sans abonnement fixe).

Comptez environ une heure pour tout installer la première fois. Suivez les étapes dans l'ordre.

---

## 1. Base de données Supabase

1. Créez un compte gratuit sur supabase.com, puis **New project**. Choisissez la région **Frankfurt (eu-central-1)** pour que les données restent en Europe.
2. Menu **SQL Editor → New query**. Collez puis lancez (**Run**) ces quatre fichiers, **un par un et dans cet ordre** :
   1. `supabase/schema.sql`
   2. `supabase/migration-v2.sql`
   3. `supabase/migration-v3.sql`
   4. `supabase/migration-v4.sql`
   Chacun doit afficher « Success ».
3. Menu **Project Settings → API**, notez :
   - la **Project URL** ;
   - la clé publique **anon** (ou « publishable ») ;
   - la clé secrète **service_role**. Elle ne doit **jamais** apparaître dans les fichiers du site : elle va uniquement dans les réglages Netlify (étape 4).

## 2. Configurer le site

Dans `js/config.js`, remplacez :
- `SUPABASE_URL` et `SUPABASE_ANON_KEY` par vos valeurs ;
- `VOTRE-COMPTE` dans `GUMROAD_STORE` par votre nom d'utilisateur Gumroad.

Les coordonnées de contact (hola.vecino@hotmail.com, +32 456 81 52 62) et les tarifs sont déjà remplis.

## 3. Mettre en ligne

1. Créez un nouveau dépôt GitHub (par exemple `hola-vecino`) et envoyez-y tous les fichiers en gardant la structure des dossiers.
2. Netlify : **Add new site → Import an existing project → GitHub** → choisissez le dépôt → **Deploy**. Aucun réglage de build n'est nécessaire.
3. Notez l'adresse du site, par exemple `https://hola-vecino.netlify.app`.

## 4. Variables secrètes sur Netlify

Netlify → votre site → **Site configuration → Environment variables → Add a variable** :

| Nom | Valeur |
|---|---|
| `SUPABASE_URL` | la Project URL |
| `SUPABASE_ANON_KEY` | la clé publique anon |
| `SUPABASE_SERVICE_ROLE_KEY` | la clé secrète service_role |
| `ANTHROPIC_API_KEY` | votre clé API (même clé que Second Regard ou une nouvelle) |
| `GUMROAD_PING_SECRET` | un long mot de passe inventé, par exemple 30 lettres et chiffres au hasard |
| `GUMROAD_ALLOW_TEST` | `true` pendant vos tests, à supprimer ensuite |

Puis **Deploys → Trigger deploy → Deploy site** pour que les variables soient prises en compte.

## 5. Connexion et e-mails (Supabase)

**Authentication → URL Configuration** : mettez l'adresse Netlify dans **Site URL** et dans **Redirect URLs**.

L'envoi d'e-mails intégré à Supabase est très limité (quelques e-mails par heure). Pour démarrer, désactivez **Confirm email** dans **Authentication → Sign In / Providers → Email**. Plus tard, branchez un service d'envoi gratuit (par exemple Brevo) dans **Authentication → Emails → SMTP Settings** et réactivez la confirmation.

## 6. Vous nommer administrateur

1. Créez votre compte sur le site et remplissez votre profil.
2. Dans Supabase → **SQL Editor**, lancez (avec l'adresse de votre compte) :
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'hola.vecino@hotmail.com';
   ```
3. Rechargez le site : le lien **Administration** apparaît dans le menu. En tant qu'administrateur, vous avez aussi accès à tout le Premium.

## 7. Produits Gumroad

Créez ces 5 produits. **Le lien personnalisé (URL) doit être exactement celui indiqué** : c'est ainsi que le site reconnaît ce qui a été acheté.

| Produit | Type | Prix | Lien personnalisé |
|---|---|---|---|
| Hola Vecino Premium | Abonnement (membership), mensuel + annuel | 9,90 €/mois, 79 €/an | `hv-premium` |
| Annonce professionnelle | Abonnement, mensuel + annuel | 14,90 €/mois, 119 €/an | `hv-pro` |
| Chaîne YouTube référencée | Abonnement mensuel | 4,90 €/mois | `hv-youtube` |
| Location d'un bien (30 jours) | Produit numérique, paiement unique | 9,90 € | `hv-location` |
| Mise en vedette | Abonnement mensuel | 5 €/mois | `hv-vedette` |

Pour le produit à paiement unique, ajoutez simplement un message de remerciement comme contenu.

Ensuite, reliez Gumroad au site : **Settings → Advanced → Ping**, collez :
```
https://VOTRE-SITE.netlify.app/.netlify/functions/gumroad?secret=VOTRE_GUMROAD_PING_SECRET
```
(en remplaçant l'adresse et le secret de l'étape 4).

**Fonctionnement** : quand quelqu'un paie avec la même adresse e-mail que son compte, un crédit est créé automatiquement. Le Premium s'active tout seul à la connexion suivante, ou avec le bouton « J'ai payé : actualiser mon accès ». Pour une annonce, la personne l'enregistre, paie, puis clique sur « Publier avec un crédit » dans **Mes annonces**. Chaque renouvellement d'abonnement ajoute la période suivante. Si un abonnement est arrêté, l'accès s'arrête à la fin de la période payée.

## 8. Formulaire de contact (Netlify Forms)

1. Netlify → **Forms** → activez **Form detection**, puis redéployez le site.
2. Le formulaire « contact » apparaît. Dans **Form notifications → Add notification → Email notification**, indiquez `hola.vecino@hotmail.com`.
Chaque message envoyé depuis la page Contact vous arrive alors par e-mail.

## 9. Tester avant d'ouvrir au public

- Créez deux comptes, remplissez les profils, envoyez un message de l'un à l'autre.
- Faites un achat de test Premium sur Gumroad avec l'adresse d'un des comptes, puis cliquez sur « J'ai payé » : les outils avancés doivent se débloquer.
- Créez une annonce, faites un achat de test « Location », publiez-la avec le crédit : elle doit apparaître dans Bons plans.
- Envoyez un message depuis la page Contact et vérifiez votre boîte mail.
- Supprimez ensuite la variable `GUMROAD_ALLOW_TEST` sur Netlify et redéployez.

---

## Au quotidien : l'espace Administration

- **Signalements** : ouvrir le contenu, le supprimer ou classer le signalement.
- **Annonces** : refuser une annonce, ou la publier 30 jours sans paiement (utile pour un partenaire ou pour remplir les rubriques au lancement).
- **Derniers achats** : les paiements reçus via Gumroad.
- **Contacts utiles** : valider les recommandations des membres ou ajouter vos propres contacts.
- **Membres** : attribuer le badge vérifié, offrir 30 jours de Premium, supprimer un profil.
- **Suggestions** : changer le statut d'une idée (prévue, réalisée, pas retenue) directement sur la page Suggestions.

## Faire revenir les membres sur le long terme

- **Tableau de bord « Mon Espagne »** : une fois connecté, l'accueil montre les événements à venir dans sa ville, les nouveaux arrivants à accueillir, les discussions et bons plans locaux, sa prochaine étape de vie et les voisins les plus serviables.
- **Étapes de vie** : au-delà de l'installation, les échéances suivent le membre sur 10 ans (1 an, résidence permanente à 5 ans, nationalité à 10 ans).
- **Badges et points d'entraide** : Nouvel arrivant, Installé de longue date, Voisin serviable, Pilier de la communauté, Organisateur, Idée réalisée. Ils s'affichent sur les profils et donnent envie d'aider.
- **Événements réguliers** : l'organisateur relance la « prochaine édition » d'un clic (même lieu, mêmes questions, une semaine plus tard), idéal pour un café des expats chaque jeudi.

## Ce qui est gratuit, ce qui est payant

- **Gratuit pour les membres** : guide des démarches (étapes, par pays d'origine, lexique), simulateur de budget, profil, carte, forum, messagerie, inscription aux événements, lecture des bons plans et des chaînes YouTube, suggestions.
- **Premium** : analyse IA du budget, comparateur de villes, checklist personnalisée, échéances avec rappels, export du budget en PDF, création d'événements.
- **Annonces payantes** : restaurants, hôtels, services, locations de membres et chaînes YouTube, toutes marquées « Sponsorisé ».

## Coûts

- Supabase : gratuit. Un projet sans activité pendant 7 jours est mis en pause ; il se relance d'un clic.
- Netlify : votre offre actuelle.
- Gumroad : une commission sur chaque vente, rien si vous ne vendez pas.
- IA : quelques centimes au plus par analyse, uniquement pour les membres Premium. Mettez `AI_ENABLED: false` dans `js/config.js` pour la couper.

## À prévoir avant d'encaisser

Pour vendre des abonnements et des annonces, ajoutez sur le site des **conditions générales de vente** et des **mentions légales** (identité du vendeur, numéro d'entreprise, droit de rétractation, résiliation). Elles dépendent de votre statut d'indépendant : faites-les valider par votre guichet d'entreprises ou un comptable.

## Mises à jour

- Pour modifier un texte : `js/i18n.js`, `js/i18n-v2.js`, `js/i18n-v3.js`.
- Pour les démarches, guides par pays, échéances, lexique et charte : `js/guide.js` et `js/content-v2.js`. Vérifiez les liens officiels de temps en temps.
- Pour les tarifs : `PRICES` dans `js/config.js`, **et** les mêmes prix sur Gumroad.
- Moyennes du simulateur par ville : `CITIES` en haut de `js/app.js`, à mettre à jour chaque année.
- Après une mise à jour importante, changez `VERSION` en haut de `sw.js` pour que l'application installée sur les téléphones se rafraîchisse.

## Structure

```
index.html, style.css, manifest.webmanifest, sw.js, icons/
js/config.js          vos réglages (Supabase, contact, Gumroad, tarifs)
js/i18n*.js           traductions
js/guide.js           étapes des démarches
js/content-v2.js      checklist, guides par pays, échéances, lexique, charte
js/app.js             cœur de l'application
js/events.js          événements et notifications
js/admin.js           administration
js/market.js          Premium, bons plans, YouTube, annonces, suggestions, contact
js/engage.js          tableau de bord personnel et badges d'entraide
supabase/*.sql        base de données (à lancer dans l'ordre)
netlify/functions/    analyse IA (analyse.mjs) et paiements Gumroad (gumroad.mjs)
netlify.toml          réglages Netlify
```
