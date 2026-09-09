
# DJIBABOUYA FOOT TV

Application Cloudflare Worker/D1 inspirée des fonctionnalités visibles sur VISION FOOT.

## Inclus
- écran spectateur plein écran avec la photo fournie comme **fond du panneau TV**;
- direct vidéo/HLS ou lecteur intégré;
- tableau de score, équipes, chrono START/STOP/RESET et temps additionnel;
- publicités texte/image par URL;
- replay + ralentis;
- panneau de remplacement;
- rappel des buts/événements;
- composition 11 joueurs et systèmes 4-4-2, 4-3-3, 3-4-3, 4-2-3-1, 3-5-2;
- créateur/publication d'affiche;
- messages spectateurs;
- panneau Admin protégé par mot de passe;
- synchronisation des données via D1 et polling des écrans.

## Déploiement Cloudflare
1. Créer une base D1 nommée `djibabouya-foot-tv`.
2. Exécuter `schema.sql` sur cette base.
3. Remplacer `REMPLACE_PAR_TON_DATABASE_ID` dans `wrangler.jsonc`.
4. Installer Wrangler puis lancer `npx wrangler deploy`.

Le mot de passe Admin demandé est enregistré sous forme de hash SHA-256 dans `worker.js`, pas en clair.

## Important pour le direct
Un navigateur ne reçoit pas directement un flux RTMP. Pour un vrai direct, utilise un service de diffusion qui fournit une URL de lecture HLS/MP4 ou un lecteur intégré, puis colle cette URL dans ADMIN > DIRECT.

## Photo TV
`public/djibabouya-tv.jpg` est utilisée par le CSS sur `.tv-photo`, c'est-à-dire le panneau que voient les spectateurs. Elle n'est pas le simple arrière-plan du panneau Admin.


### Automatisation Twitch

La chaîne Twitch `banialfaty` est configurée par défaut. L’écran TV utilise l’API JavaScript officielle du lecteur Twitch et écoute les événements `ONLINE` et `OFFLINE`. Quand la chaîne passe en LIVE, le lecteur est automatiquement affiché sur l’écran TV; quand elle repasse hors ligne, la photo de l’écran TV réapparaît. Aucune action de l’Admin n’est nécessaire.
