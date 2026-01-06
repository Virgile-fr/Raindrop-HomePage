# Sécurité - Raindrop HomePage

## 🔒 Bonnes pratiques de sécurité

### Gestion du Token Raindrop

#### ⚠️ IMPORTANT
Votre token Raindrop est une information sensible qui donne accès à vos favoris. Traitez-le comme un mot de passe.

#### Méthodes de configuration (par ordre de sécurité)

1. **Prompt au démarrage** (RECOMMANDÉ)
   - Ne configurez pas de token dans `token.js`
   - Laissez la valeur par défaut `XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX`
   - Le token sera demandé au premier lancement
   - Stocké localement dans le navigateur uniquement

2. **Fichier local non-versionné**
   - Créez un fichier `token.local.js` (déjà dans .gitignore)
   - Ne commitez JAMAIS ce fichier
   - Utile pour le développement local

3. **URL avec token** (DÉCONSEILLÉ pour usage permanent)
   - Utilisez uniquement pour la configuration initiale
   - Format: `https://votre-url.com/VOTRE-TOKEN`
   - ⚠️ Le token sera visible dans:
     - L'historique du navigateur
     - Les logs serveur
     - Les marque-pages
     - Les partages d'écran
   - Ne partagez JAMAIS cette URL

### Protections implémentées

#### 1. Protection XSS (Cross-Site Scripting)
- Tous les contenus utilisateur sont échappés avant insertion dans le DOM
- Fonction `escapeHtml()` utilisée pour tous les titres et URLs
- Validation stricte des entrées

#### 2. Content Security Policy (CSP)
- Headers CSP configurés dans index.html et 404.html
- Restrictions sur les sources de scripts, styles et images
- Autorisation uniquement des domaines nécessaires:
  - `api.raindrop.io` (API Raindrop)
  - `www.google.com` (Favicons Google)
  - `favicon.vemetric.com` (Favicons Vemetric)
  - `kit.fontawesome.com` (Icônes)

#### 3. Attributs de sécurité
- `rel="noopener noreferrer"` sur tous les liens externes
- Prévient les attaques de type "tabnabbing"
- Protège contre le suivi cross-origin

#### 4. Validation du token
- Regex stricte pour valider le format UUID du token
- Vérification avant stockage dans localStorage
- Messages d'erreur clairs pour les tokens invalides

### localStorage et données sensibles

Le token est stocké dans `localStorage` pour éviter de le redemander à chaque visite.

**Risques:**
- Accessible via JavaScript (d'où l'importance de la protection XSS)
- Persiste jusqu'à suppression manuelle ou nettoyage du navigateur
- Partagé entre tous les onglets du même domaine

**Protection:**
- Ne visitez cette page que sur des appareils de confiance
- Utilisez un navigateur à jour
- Évitez les extensions de navigateur non fiables

### Effacer votre token

Pour supprimer votre token stocké localement:

```javascript
// Dans la console du navigateur (F12)
localStorage.removeItem('token');
```

Ou videz complètement le localStorage:
```javascript
localStorage.clear();
```

### Signaler une vulnérabilité

Si vous découvrez une faille de sécurité:
1. **NE PAS** créer une issue publique
2. Contactez le mainteneur via email ou message privé
3. Incluez:
   - Description de la vulnérabilité
   - Steps pour reproduire
   - Impact potentiel
   - Suggestions de correction si possible

### Checklist de sécurité pour les contributeurs

Avant chaque commit, vérifiez:
- [ ] Aucun token réel n'est présent dans le code
- [ ] Les nouvelles entrées utilisateur sont échappées
- [ ] Pas de `innerHTML` avec des données non échappées
- [ ] Les nouvelles URLs externes ont `rel="noopener noreferrer"`
- [ ] Le CSP est à jour si de nouveaux domaines sont utilisés
- [ ] Pas de clés API, tokens, ou credentials dans le code
- [ ] Les fichiers sensibles sont dans .gitignore

### Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

**Dernière mise à jour:** 2026-01-06
