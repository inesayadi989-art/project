#!/bin/bash
# 🚀 COMMANDES EXACTES POUR DÉMARRER - Konnect Integration

# ============================================================================
# TERMINAL 1: BACKEND
# ============================================================================
cd backend
npm install
npm run dev

# Attendez de voir:
# ✅ Connected to MySQL database
# Server running on http://localhost:5000


# ============================================================================
# TERMINAL 2: NGROK (Important pour les webhooks!)
# ============================================================================
# Installer ngrok si besoin: https://ngrok.com/download

ngrok http 5000

# Copier l'URL générée (ex: https://abc123-def456.ngrok-free.dev)
# ⚠️ NOTE: À chaque redémarrage de ngrok, une nouvelle URL est générée
#          Vous devrez mettre à jour WEBHOOK_URL dans backend/.env


# ============================================================================
# METTRE À JOUR .env SI NÉCESSAIRE
# ============================================================================
# Si ngrok génère une nouvelle URL:
# 1. Ouvrir backend/.env
# 2. Remplacer WEBHOOK_URL par la nouvelle URL de ngrok
# 3. Sauvegarder
# 4. Redémarrer le backend (Ctrl+C et npm run dev)


# ============================================================================
# TERMINAL 3: FRONTEND
# ============================================================================
cd frontend
npm install
npm run dev

# Attendez de voir:
# ➜  Local:   http://localhost:5173/


# ============================================================================
# RÉSULTAT
# ============================================================================
# Vous devriez maintenant avoir:
# - Backend sur http://localhost:5000
# - Frontend sur http://localhost:5173
# - Webhook tunnel sur https://xxx-xxx.ngrok-free.dev

# Ouvrir http://localhost:5173 dans votre navigateur


# ============================================================================
# TEST OPTIONNEL: VALIDATION DE LA CONFIGURATION
# ============================================================================
# Dans un 4e terminal (après que tout soit démarré):
cd backend
node test_konnect_integration.js

# Cela teste tous les endpoints et valide la configuration


# ============================================================================
# CARTES DE TEST POUR PAIEMENT
# ============================================================================
# Numéro:     4111111111111111
# Expiration: 12/25
# CVV:        123
# Nom:        Test Card


# ============================================================================
# TEST MANUEL: FLUX DE PAIEMENT
# ============================================================================

# 1. PAIEMENT CLIENT (Achat de produit):
#    - Créer un compte "client"
#    - Ajouter un produit au panier
#    - Aller à http://localhost:5173/checkout
#    - Remplir l'adresse
#    - Cliquer "Payer avec Konnect"
#    - Utiliser la carte de test ci-dessus
#    - Vérifier les logs backend pour: ✅ Konnect payment created

# 2. PAIEMENT VENDEUR (Abonnement):
#    - Créer un compte "vendeur"
#    - Aller à http://localhost:5173/pricing
#    - Cliquer "S'abonner"
#    - Sélectionner un plan
#    - Cliquer "Continuer"
#    - Utiliser la carte de test ci-dessus
#    - Vérifier activation automatique de l'abonnement


# ============================================================================
# VÉRIFIER LES LOGS
# ============================================================================

# Backend - Chercher ces messages:
# ✅ Konnect payment created: PAYMENT_REF
# 📥 Payment webhook received: payment_ref=PAYMENT_REF
# ✅ Payment webhook processed: {success: true}

# Frontend - Console (F12):
# API Request: /api/payments/create-payment
# paymentUrl: https://checkout.konnect.network/...

# Base de données:
mysql -u root souk_tn -e "SELECT * FROM payments ORDER BY created_at DESC LIMIT 1\\G"


# ============================================================================
# PROBLÈMES COURANTS
# ============================================================================

# Problème: "Konnect not configured"
# → C'est normal! Cela signifie que c'est en fallback mode
# → Les clés API sandbox sont dans .env et ça marche

# Problème: Webhook non reçu
# → Vérifier que ngrok est actif
# → Vérifier que WEBHOOK_URL dans .env match l'URL de ngrok
# → Redémarrer le backend après modification

# Problème: "Payment not found" dans webhook
# → Vérifier que la colonne 'konnect_payment_id' existe dans 'payments'
# → Consulter KONNECT_SETUP.md pour la structure BD complète


# ============================================================================
# DOCUMENTATION DISPONIBLE
# ============================================================================

# START_HERE.md              - Les 7 étapes pour démarrer ⭐
# CHANGES_SUMMARY.md         - Détail de chaque correction
# KONNECT_INTEGRATION_GUIDE.md - Guide architectural complet
# KONNECT_QUICK_START.md     - Démarrage rapide
# KONNECT_SETUP.md          - Configuration et troubleshooting détaillés
# README_KONNECT_FR.md      - Résumé complet en français
# DOCUMENTATION_INDEX.md    - Index de tous les guides


# ============================================================================
# RÉSUMÉ
# ============================================================================

# 1. Terminal 1: npm run dev (backend)
# 2. Terminal 2: ngrok http 5000 (webhook)
# 3. Terminal 3: npm run dev (frontend)
# 4. Ouvrir http://localhost:5173
# 5. Tester: Créer compte → Ajouter produit → Payer
# 6. Vérifier: Logs backend et base de données


# ============================================================================
# C'EST PRÊT! 🚀
# ============================================================================
