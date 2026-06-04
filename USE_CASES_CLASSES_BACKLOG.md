# 📋 Souk.tn - Use Cases Globaux, Classes et Backlog

---

## 🎯 USE CASES GLOBAUX

### 1️⃣ ACHETEUR (Customer)

#### UC-1: Parcourir et Acheter
- **Acteur**: Acheteur
- **Pré-conditions**: Acheteur pas connecté
- **Flux**:
  1. Parcourir la boutique (`/shop`)
  2. Filtrer par catégorie, prix, note
  3. Consulter fiche produit (`/product/:id`)
  4. Ajouter au panier
  5. Accéder au panier

#### UC-2: Passer Commande
- **Acteur**: Acheteur (connecté)
- **Pré-conditions**: Articles dans le panier
- **Flux**:
  1. Aller à `/checkout`
  2. Remplir adresse de livraison (Étape 1)
  3. Choisir mode paiement (Étape 2):
     - Espèces à la livraison
     - Carte bancaire
  4. Confirmer commande
  5. Redirection vers `/payment/success` ou `/payment/failure`

#### UC-3: Gérer Profil
- **Acteur**: Acheteur (connecté)
- **Pré-conditions**: Compte acheteur actif
- **Flux**:
  1. Accéder à `/profile`
  2. Modifier informations personnelles
  3. Changer mot de passe
  4. Sauvegarder

#### UC-4: Consulter Commandes
- **Acteur**: Acheteur (connecté)
- **Flux**:
  1. Aller à `/orders`
  2. Voir historique des commandes
  3. Consulter détails de chaque commande

---

### 2️⃣ VENDEUR (Seller)

#### UC-5: S'inscrire comme Vendeur
- **Acteur**: Utilisateur non-authentifié
- **Flux**:
  1. Accéder à `/register`
  2. Choisir rôle "Vendeur"
  3. Remplir formulaire d'inscription
  4. Créer compte

#### UC-6: Gérer Boutique
- **Acteur**: Vendeur (connecté)
- **Pré-conditions**: Compte vendeur actif
- **Flux**:
  1. Aller à `/seller/store`
  2. Modifier informations boutique (nom, description, logo, etc.)
  3. Sauvegarder

#### UC-7: Gérer Produits
- **Acteur**: Vendeur (connecté)
- **Flux**:
  1. Accéder à `/seller/products`
  2. Ajouter nouveau produit
  3. Modifier produit existant
  4. Supprimer produit
  5. Gérer stock et prix

#### UC-8: Consulter Commandes Vendeur
- **Acteur**: Vendeur (connecté)
- **Flux**:
  1. Aller à `/seller/orders`
  2. Voir commandes reçues
  3. Mettre à jour statut de commande (pending → shipped → delivered)

#### UC-9: Souscrire à Abonnement
- **Acteur**: Vendeur (connecté)
- **Pré-conditions**: Vendeur sans abonnement actif
- **Flux**:
  1. Aller à `/seller/subscription`
  2. Voir plans disponibles
  3. Cliquer sur plan
  4. Aller à `/seller/subscription/configure`
  5. Choisir mode paiement:
     - **D17 Mobile** (SMS OTP)
     - **Carte bancaire**
  6. Effectuer paiement

#### UC-10: Paiement D17 (Vendeur)
- **Acteur**: Vendeur
- **Pré-conditions**: Sélectionné D17 comme paiement
- **Flux**:
  1. Accéder à `/payment/d17?subscriptionId=X`
  2. Entrer numéro téléphone tunisien
  3. Recevoir code OTP par SMS
  4. Entrer code OTP
  5. Vérifier paiement
  6. Redirection à `/payment/success?subscriptionId=X&type=subscription`

#### UC-11: Paiement Carte (Vendeur)
- **Acteur**: Vendeur
- **Pré-conditions**: Sélectionné Carte comme paiement
- **Flux**:
  1. Accéder à `/payment/card?subscriptionId=X`
  2. Remplir formulaire carte (numéro, expiration, CVV)
  3. Valider code OTP
  4. Redirection à succès/échec

---

### 3️⃣ ADMIN (Administrator)

#### UC-12: Gérer Utilisateurs
- **Acteur**: Admin (connecté)
- **Pré-conditions**: Compte admin
- **Flux**:
  1. Aller à `/admin/users`
  2. Voir liste des utilisateurs
  3. Bannir utilisateur si nécessaire

#### UC-13: Approuver Boutiques Vendeurs
- **Acteur**: Admin
- **Flux**:
  1. Aller à `/admin/users`
  2. Voir vendeurs en attente
  3. Approuver ou rejeter boutique

#### UC-14: Gérer Produits Admin
- **Acteur**: Admin
- **Flux**:
  1. Aller à `/admin/products`
  2. Approuver/rejeter produits
  3. Marquer comme "featured"

#### UC-15: Voir Toutes les Commandes
- **Acteur**: Admin
- **Flux**:
  1. Aller à `/admin/orders`
  2. Voir toutes les commandes du système
  3. Filtrer/rechercher

#### UC-16: Dashboard Admin
- **Acteur**: Admin
- **Flux**:
  1. Aller à `/admin`
  2. Voir statistiques et métriques

---

## 📦 CLASSES GLOBALES (Entités)

### User / Profile
```typescript
interface Profile {
  id: number;
  email: string;
  full_name: string;
  password_hash: string;
  role: 'customer' | 'seller' | 'admin';
  avatar_url?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  governorate?: string;
  postal_code?: string;
  is_banned: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Product
```typescript
interface Product {
  id: number;
  store_id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_price?: number;
  stock: number;
  tags?: string[];
  is_featured: boolean;
  is_approved: boolean;
  is_active: boolean;
  rating_avg: number;
  review_count: number;
  view_count: number;
  sold_count: number;
  product_images: ProductImage[];
  created_at: Date;
  updated_at: Date;
}
```

### Store (Boutique Vendeur)
```typescript
interface Store {
  id: number;
  owner_id: number;
  name: string;
  slug: string;
  description: string;
  logo_url?: string;
  banner_url?: string;
  phone?: string;
  email?: string;
  governorate?: string;
  address?: string;
  is_approved: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Order (Commande Client)
```typescript
interface Order {
  id: number;
  customer_id: number;
  store_id: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed';
  payment_method: 'cash' | 'card';
  payment_id?: number;
  shipping_address: JSON;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

### OrderItem
```typescript
interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  created_at: Date;
}
```

### Payment (Paiement Client)
```typescript
interface Payment {
  id: number;
  order_id: number;
  customer_id: number;
  amount: number;
  currency: 'TND';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: 'card' | 'cash';
  konnect_payment_id?: string;
  konnect_session_id?: string;
  merchant_reference?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_url?: string;
  error_message?: string;
  metadata?: JSON;
  created_at: Date;
  updated_at: Date;
}
```

### SellerSubscription (Abonnement Vendeur)
```typescript
interface SellerSubscription {
  id: number;
  seller_id: number;
  plan_id: number;
  status: 'active' | 'pending' | 'past_due' | 'cancelled';
  current_period_start: Date;
  current_period_end: Date;
  next_payment_date?: Date;
  payment_method: 'd17' | 'card';
  konnect_session_id?: string;
  konnect_payment_id?: string;
  merchant_reference?: string;
  transaction_ref?: string;
  payment_status: 'pending' | 'completed' | 'failed';
  interval: 'monthly' | 'yearly';
  plan_name: string;
  amount_paid: number;
  created_at: Date;
  updated_at: Date;
}
```

### SubscriptionPlan
```typescript
interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  amount: number;
  currency: 'TND';
  interval_type: 'monthly' | 'yearly';
  features: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Category
```typescript
interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
}
```

### CartItem
```typescript
interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Product;
}
```

---

## 📊 BACKLOG - Tâches à Faire

### 🔴 CRITIQUE (Must Have)

- [ ] **Payment - Corriger erreur 500 sur /api/orders**
  - [ ] Debugger la création de commande
  - [ ] Vérifier les paramètres mandatoires
  - [ ] Tester le flux complet

- [ ] **Payment - Paiement Client (Carte + Fallback)**
  - [x] Formulaire de carte dans Checkout
  - [x] Fallback local quand Konnect pas configuré
  - [ ] Tester flux complet avec vraie carte
  - [ ] Vérifier redirection succès/échec

- [ ] **D17 OTP - Tests Réels**
  - [x] Intégration Twilio Verify
  - [x] Validation 6-digit OTP
  - [ ] Tester avec numéro réel
  - [ ] Gérer cas d'erreur (SMS non reçu, etc.)

- [ ] **Seller Subscription - Paiement Complet**
  - [x] Page de configuration subscription
  - [x] Choix D17 vs Carte
  - [ ] Webhook Konnect pour confirmation
  - [ ] Email de confirmation

- [ ] **Admin Dashboard - Visualisation**
  - [ ] Statistiques vendeurs
  - [ ] Suivi commandes en temps réel
  - [ ] Monitoring paiements

---

### 🟠 HAUTE PRIORITÉ (Should Have)

- [ ] **Email Notifications**
  - [ ] Email confirmation commande client
  - [ ] Email confirmation souscription vendeur
  - [ ] Email alerte paiement échoué

- [ ] **Inventory Management**
  - [ ] Alertes stock faible
  - [ ] Réservation produits pendant checkout
  - [ ] Libération stock si paiement échoue

- [ ] **Order Tracking**
  - [ ] Suivi en temps réel avec WebSocket
  - [ ] Notification vendeur nouvelle commande
  - [ ] Notification client changement statut

- [ ] **Seller Analytics**
  - [ ] Dashboard ventes
  - [ ] Graphiques revenus
  - [ ] Top produits vendus

- [ ] **Review System**
  - [ ] Notation produits
  - [ ] Avis clients
  - [ ] Affichage moyenne note

---

### 🟡 MOYENNE PRIORITÉ (Nice to Have)

- [ ] **Search & Filter Advanced**
  - [ ] Recherche full-text
  - [ ] Filtres multiples
  - [ ] Sauvegarde recherches

- [ ] **Wishlist**
  - [ ] Ajouter produits aux favoris
  - [ ] Partager wishlist
  - [ ] Notifications prix baisse

- [ ] **Messaging System**
  - [ ] Chat acheteur-vendeur
  - [ ] Support client

- [ ] **Mobile App**
  - [ ] Version mobile responsive
  - [ ] App native iOS
  - [ ] App native Android

- [ ] **Multi-language**
  - [ ] Support AR/FR/EN
  - [ ] Traductions dynamiques

---

### 🟢 BASSE PRIORITÉ (Could Have)

- [ ] **AI Shopping Assistant**
  - [ ] IA recommandation produits
  - [ ] Chat assistant

- [ ] **Loyalty Program**
  - [ ] Points de fidélité
  - [ ] Réductions fidèles

- [ ] **Social Features**
  - [ ] Partage réseaux sociaux
  - [ ] Influencer program

- [ ] **Advanced Analytics**
  - [ ] Heat maps boutique
  - [ ] User behavior tracking
  - [ ] A/B testing

---

## 🚀 ROADMAP PAR SPRINT

### Sprint 1 : Authentification et gestion des utilisateurs (priorité haute)
- Authentification : inscription, connexion, mot de passe.
- Gestion des utilisateurs : création, lecture, modification du profil, rôle `customer` / `seller` / `admin`.
- Contrôle des accès : pages publiques, pages protégées, navigation selon rôle.
- Switch vendeur/client : interface pour basculer du mode vendeur au mode client.
- Use cases : authentification, gérer utilisateurs, consulter la plateforme en tant que client.

### Sprint 2 : Consultation de la plateforme et gestion du panier (priorité haute)
- Consultation du catalogue : page shop, recherche, filtres, catégories, fiche produit.
- Use case commun : consulter la plateforme pour tous les utilisateurs.
- Gestion du panier : ajout, modification de quantité, suppression, vue du total.
- Passage de commande pour les clients et vendeurs en mode client.
- Use cases : gérer panier, passer commande (vendeur en mode client).

### Sprint 3 : Gestion boutique, produits et abonnement vendeur (priorité moyenne)
- Gestion boutique vendeur : créer et éditer les informations de la boutique.
- Gestion produits : créer, modifier, supprimer, gérer le stock, prix, image.
- Abonnement vendeur : souscription, renouvellement, page abonnement vendeur.
- Use cases : passer abonnement (vendeur), gérer boutique, gérer produits.

### Sprint 4 : Traitement administrateur, commandes et dashboards (priorité moyenne)
- Traitement des abonnements par l’admin : validation, gestion, suivi.
- Traitement des commandes par l’admin : suivi, annulation, support, gestion du flux.
- Dashboard vendeur : commandes reçues, performances, notifications, actions.
- Dashboard admin : gestion utilisateurs, commandes, abonnements, statistiques.
- Use cases : traiter abonnement (admin), traiter commande (admin), dashboards admin et vendeur.

### Sprint 5 : Intégration externe, optimisation et stabilisation (priorité basse)
- Intégration de Sarra pour le paiement / service externe.
- Optimisations : performance, responsive, sécurité, UX.
- Tests finaux : recette, correction de bugs, préparation à la production.
- Use cases : intégration de Sarra, mise en production.

---

## 🧭 CHAPITRE : PLANIFICATION DES SPRINTS

### 1. Objectif du chapitre
Ce chapitre décrit la planification complète des sprints pour le projet Souk.tn. Il couvre la méthode, les livrables, les diagrammes globaux et le déroulé de chaque sprint.

### 2. Méthodologie de sprint
- Cadence : 1 à 2 semaines par sprint.
- Rôles : Product Owner, chef de projet, équipe de développement, testeur.
- Cycle : planification, développement, tests, revue, rétrospective.

### 3. Diagramme global de sprint
- Backlog produit → Sprint planning → Exécution → Tests/Recette → Revue → Rétrospective
- Chaque sprint doit livrer un incrément fonctionnel valide et testable.

### 4. Sprints détaillés
#### Sprint 1 : Authentification et gestion des utilisateurs
- Objectif : mettre en place les comptes, les rôles et la navigation sécurisée.
- Livrables : pages login/register, profil, gestion client/vendeur/admin, store d’authentification.
- Cas d’usage : s’inscrire, se connecter, gérer son profil, gérer les rôles, basculer en mode client.

#### Sprint 2 : Consultation de la plateforme et gestion du panier
- Objectif : offrir la consultation du catalogue et le parcours d’achat.
- Livrables : page shop, recherche, fiche produit, panier, checkout, commandes clients.
- Cas d’usage : consulter catalogue, rechercher produits, gérer panier, passer commande.

#### Sprint 3 : Gestion boutique, produits et abonnement vendeur
- Objectif : permettre au vendeur de gérer sa boutique, ses produits et son abonnement.
- Livrables : pages boutique vendeur, gestion produits, souscription abonnement, renouvellement.
- Cas d’usage : gérer boutique, gérer produits, passer abonnement vendeur.

#### Sprint 4 : Traitement admin et dashboards
- Objectif : compléter l’administration et les tableaux de bord métier.
- Livrables : dashboards admin/vendeur, traitement abonnement/admin, traitement commande/admin.
- Cas d’usage : traiter abonnement admin, traiter commande admin, consulter stats et performances.

#### Sprint 5 : Intégration externe et stabilisation
- Objectif : intégrer Sarra et stabiliser la plateforme avant mise en production.
- Livrables : intégration Sarra, responsive, optimisation performance, tests finaux.
- Cas d’usage : intégration Sarra, correction de bugs, mise en production.

### 5. Diagrammes de sprint
#### 5.1. Diagramme de cas d’utilisation global
- Client : parcourir la boutique, ajouter au panier, passer commande, consulter commandes.
- Vendeur : gérer produits, gérer boutique, consulter commandes, basculer en mode client.
- Admin : gérer utilisateurs, suivre commandes, vérifier abonnements.

#### 5.2. Diagramme de séquence global
- Utilisateur se connecte > initialisation du profil > affichage de la navigation selon rôle > accès aux pages.
- Client passe commande > création commande > notification vendeur > suivi commande.

#### 5.3. Diagramme de classes principal
- Entités : Utilisateur, Profil, Produit, Boutique, Panier, Commande, Abonnement, Notification.
- Relations : un vendeur possède une boutique, une commande contient des produits, un client a un panier.

### 6. Processus de pilotage
- Avant sprint : collecte des besoins, rédaction des user stories, estimation, planning.
- Pendant sprint : daily stand-up, suivi des tâches, tests continus.
- Fin de sprint : revue, démonstration, validation PO, rétrospective.

### 7. Roadmap de déploiement
- Sprint 1 : base utilisateur et sécurité.
- Sprint 2 : cœur marketplace et flux d’achat.
- Sprint 3 : logique vente, commande, admin.
- Sprint 4 : qualité, optimisation, release.

---

## ✅ CHECKLIST DE DÉPLOIEMENT

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests E2E passent
- [ ] Audit sécurité complet
- [ ] Performance teste (<2s load time)
- [ ] Backup database configuré
- [ ] SSL certificat installé
- [ ] CDN configuré pour images
- [ ] Monitoring en production
- [ ] Logging centralisé
- [ ] Disaster recovery plan

---

**Dernière mise à jour**: 6 Mai 2026  
**Version**: 1.0  
**Statut**: En développement actif
