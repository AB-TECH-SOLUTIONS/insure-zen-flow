# Configuration dynamique — Vague A complète

Passage de tous les tarifs et référentiels du code (`src/lib/tarifs/*.ts`) vers la base de données, avec versioning par date d'effet et support multi-pays CIMA dès le départ. UI admin dans `/admin/parametres`.

## Ce qui reste en code
- Énumérations métier CIMA (`Categorie` cat1–cat11, `Zone` A/B/C, produits `auto|voyage|vie|risques_divers|gmc`)
- Formules mathématiques du moteur (agrégation prime nette + accessoires + taxes)
- Types TypeScript miroirs des tables DB

## Étape 1 — Migration DB (une seule migration, ~15 tables)

### 1.1 Référentiels géographiques
```text
pays_cima          (code, nom, devise, tva_taux, actif)   — seed 14 pays
regions            (pays_code, code, nom)
villes             (region_id, nom, zone_cema)             — A/B/C
```

### 1.2 Tarifs versionnés (colonnes communes : id, country_code, date_effet, date_fin, actif, created_by)
```text
tarif_bareme_rc          (produit, categorie, cv_min, cv_max, places_max,
                          ptac_max_kg, cu_max_kg, prime_annuelle)
tarif_taux_garantie      (produit, categorie, code_garantie, base_calcul,
                          taux)   — base: valeur_neuve|valeur_venale|prime_rc
tarif_dta_vignette       (usage: transport_commun|autre, cv_min, cv_max, montant)
tarif_accessoires        (prime_nette_min, prime_nette_max, montant)
tarif_options_ipt        (code, label, capital_deces, capital_invalidite,
                          frais_medicaux, prime_par_place)
tarif_frais_fixes        (code, label, montant)   — fichier_central, carte_rose, etc.
tarif_reductions         (code, label, taux_max, plafond)

tarif_voyage_zones       (zone_code, label, coefficient)
tarif_voyage_bareme      (zone_code, duree_min, duree_max, age_min, age_max, prime)

tarif_vie_bareme         (age_min, age_max, taux_annuel)
tarif_vie_periodicites   (code, diviseur, majoration)

tarif_gmc_bareme         (formule, age_min, age_max, prime_annuelle,
                          plafond_annuel, ticket_moderateur)
```

### 1.3 Partenaires unifiés
```text
partenaires   (id, type, nom, code, agrement_num, telephone, email,
               adresse, ville_id, pays_code, specialites jsonb,
               tarifs_conventionnes jsonb, logo_url, actif, created_at,
               updated_at, company_id)
   — type ENUM: hopital|clinique|pharmacie|garage|expert|centre_expertise
```

### 1.4 Paramètres système
```text
app_settings   (key, value jsonb, description, country_code nullable, updated_by)
   — seed: numerotation_format, delai_attestation_provisoire_jours,
           delai_attestation_definitive_jours, verrou_art13_actif,
           duree_validite_devis_jours, taux_tva_default
```

### 1.5 Sécurité
- GRANT authenticated (SELECT sur tarifs, SELECT/INSERT/UPDATE/DELETE sur admin)
- GRANT service_role ALL
- RLS : lecture pour tous les authentifiés (les tarifs actifs), écriture réservée à `admin`/`super_admin` via `has_role`
- Triggers `audit_row_change` sur toutes les tables tarifaires
- Triggers `updated_at`

### 1.6 Seed
Injection des valeurs actuelles de `src/lib/tarifs/auto.ts`, `voyage.ts`, `vie.ts`, `gmc.ts` avec `country_code='CM'` et `date_effet=now()`.

## Étape 2 — Refacto des moteurs de calcul

`src/lib/tarifs/*.ts` devient une **API de lecture DB** :
- `getBaremeRC({ produit, categorie, cv, places, country_code, date })` avec cache React Query
- `getTaux(produit, categorie, code_garantie, country_code, date)`
- `getFraisFixe(code, country_code)`
- `getOptionsIPT(country_code)`

Les composants existants (`VehiculeForm.tsx`, `DecomptePanel.tsx`, cotations client) consomment via hooks `useTarif*`. Aucune interruption fonctionnelle : fallback sur valeurs seed identiques aux constantes actuelles.

## Étape 3 — UI Admin

Nouvelle arborescence sous `/admin/parametres` :

```text
/admin/parametres
  ├─ index (Paramètres.tsx existant, enrichi de tuiles de navigation)
  ├─ /tarifs
  │   ├─ /auto        → tabs Grilles RC | Taux garanties | DTA | IPT | Frais | Réductions
  │   ├─ /voyage      → Zones | Barème âge/durée
  │   ├─ /vie         → Barème âge | Périodicités
  │   └─ /gmc         → Formules
  ├─ /referentiels
  │   ├─ /pays        → 14 pays CIMA (activation, TVA, devise)
  │   ├─ /regions-villes
  │   └─ /categories-vehicules
  ├─ /partenaires     → table unique filtrable par type
  └─ /systeme         → app_settings (formulaire clé/valeur typé)
```

Composants :
- `TarifTable` réutilisable (édition inline, versioning : bouton "Nouvelle version" clone la ligne avec `date_effet=demain`)
- `HistoriquePanel` (lit `audit_logs` filtré par table)
- Sélecteur pays global en haut de `/admin/parametres` (persistance localStorage)

## Étape 4 — Sidebar & routing

- Nouvelle entrée sidebar (rôle admin) : "Paramètres" → sous-menu Tarifs / Référentiels / Partenaires / Système
- Ajout des routes dans `src/App.tsx` (lazy loading)

## Étape 5 — Constantes conservées

`src/lib/tarifs/constants.ts` (nouveau, minimal) :
- `CATEGORIES` (cat1–cat11 labels)
- `PRODUITS` enum
- `BASES_CALCUL` enum
- `PAYS_CIMA_CODES` (14 codes)

## Détails techniques

- Cache : `staleTime: 5min` sur les tarifs (rarement modifiés)
- Migration seed en SQL brut (INSERT en masse) — le fichier fera ~800 lignes
- Types TS régénérés automatiquement après approbation migration
- Aucune modification du moteur mathématique : seule la source des valeurs change
- Rollback : les anciens fichiers `src/lib/tarifs/auto.ts` etc. deviennent des re-exports vers les hooks DB (transition douce)

## Ordre d'exécution

1. Migration DB (attente approbation utilisateur — les types se régénèrent après)
2. Refacto moteurs → hooks
3. Pages UI admin + composants réutilisables
4. Sidebar + routes
5. Suppression progressive des constantes hardcodées

## Hors périmètre (Vague B & C)
- P27 Proposition → Émission (repart après)
- Interface édition formules de calcul (les formules restent en code)
- Import/export CSV des barèmes (peut être ajouté plus tard)
- Simulateur "et si" (comparer 2 versions de barème)
