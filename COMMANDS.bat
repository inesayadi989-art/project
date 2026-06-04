@echo off
REM 🚀 COMMANDES EXACTES POUR DÉMARRER - Konnect Integration (Windows)

echo.
echo ============================================================================
echo DÉMARRAGE DE L'INTÉGRATION KONNECT
echo ============================================================================
echo.

REM ============================================================================
REM TERMINAL 1: BACKEND
REM ============================================================================
echo.
echo [TERMINAL 1] Démarrage du backend...
echo Commandes à exécuter dans un terminal (PowerShell/CMD):
echo.
echo cd backend
echo npm install
echo npm run dev
echo.
echo Attendez de voir:
echo ✅ Connected to MySQL database
echo Server running on http://localhost:5000
echo.
pause

REM ============================================================================
REM TERMINAL 2: NGROK
REM ============================================================================
echo.
echo [TERMINAL 2] Démarrage de ngrok pour les webhooks...
echo.
echo Si ngrok n'est pas installé:
echo   1. Télécharger depuis https://ngrok.com/download
echo   2. Extraire dans un dossier
echo   3. Ajouter à PATH ou naviguer au dossier
echo.
echo Commandes à exécuter dans un terminal:
echo.
echo ngrok http 5000
echo.
echo ⚠️  IMPORTANT: Copier l'URL générée (ex: https://abc123-def456.ngrok-free.dev)
echo.
pause

REM ============================================================================
REM METTRE À JOUR .env
REM ============================================================================
echo.
echo [METTRE À JOUR .env] Si ngrok génère une nouvelle URL:
echo.
echo 1. Ouvrir backend\.env dans un éditeur
echo 2. Trouver la ligne: WEBHOOK_URL=https://...
echo 3. Remplacer par la nouvelle URL de ngrok
echo 4. Sauvegarder le fichier
echo 5. Redémarrer le backend (Ctrl+C et npm run dev)
echo.
pause

REM ============================================================================
REM TERMINAL 3: FRONTEND
REM ============================================================================
echo.
echo [TERMINAL 3] Démarrage du frontend...
echo Commandes à exécuter dans un terminal:
echo.
echo cd frontend
echo npm install
echo npm run dev
echo.
echo Attendez de voir:
echo ➜  Local:   http://localhost:5173/
echo.
pause

REM ============================================================================
REM RÉSULTAT
REM ============================================================================
echo.
echo ============================================================================
echo ✅ RÉSULTAT
echo ============================================================================
echo.
echo Vous devriez maintenant avoir:
echo - Backend sur http://localhost:5000
echo - Frontend sur http://localhost:5173
echo - Webhook tunnel sur https://xxx-xxx.ngrok-free.dev
echo.
echo Ouvrir http://localhost:5173 dans votre navigateur
echo.
pause

REM ============================================================================
REM TEST OPTIONNEL
REM ============================================================================
echo.
echo [OPTIONNEL] Validation de la configuration
echo.
echo cd backend
echo node test_konnect_integration.js
echo.
pause

REM ============================================================================
REM CARTES DE TEST
REM ============================================================================
echo.
echo ============================================================================
echo 💳 CARTES DE TEST POUR PAIEMENT (SANDBOX)
echo ============================================================================
echo.
echo Numéro:     4111111111111111
echo Expiration: 12/25
echo CVV:        123
echo Nom:        Test Card
echo.
pause

REM ============================================================================
REM TEST MANUEL
REM ============================================================================
echo.
echo ============================================================================
echo 🧪 TEST MANUEL: FLUX DE PAIEMENT
echo ============================================================================
echo.
echo [1] PAIEMENT CLIENT (Achat de produit):
echo     - Créer un compte "client"
echo     - Ajouter un produit au panier
echo     - Aller à http://localhost:5173/checkout
echo     - Remplir l'adresse
echo     - Cliquer "Payer avec Konnect"
echo     - Utiliser la carte de test ci-dessus
echo.
echo [2] PAIEMENT VENDEUR (Abonnement):
echo     - Créer un compte "vendeur"
echo     - Aller à http://localhost:5173/pricing
echo     - Cliquer "S'abonner"
echo     - Sélectionner un plan
echo     - Cliquer "Continuer"
echo     - Utiliser la carte de test ci-dessus
echo.
pause

REM ============================================================================
REM VÉRIFIER LES LOGS
REM ============================================================================
echo.
echo ============================================================================
echo 📊 VÉRIFIER LES LOGS
echo ============================================================================
echo.
echo [Backend] Chercher ces messages:
echo   ✅ Konnect payment created: PAYMENT_REF
echo   📥 Payment webhook received: payment_ref=PAYMENT_REF
echo   ✅ Payment webhook processed: {success: true}
echo.
echo [Frontend] Console du navigateur (F12):
echo   API Request: /api/payments/create-payment
echo   paymentUrl: https://checkout.konnect.network/...
echo.
echo [Base de données] Ouvrir MySQL et exécuter:
echo   SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;
echo.
pause

REM ============================================================================
REM PROBLÈMES COURANTS
REM ============================================================================
echo.
echo ============================================================================
echo 🆘 PROBLÈMES COURANTS
echo ============================================================================
echo.
echo [Problème] "Konnect not configured"
echo [Solution] C'est normal! Cela signifie que c'est en fallback mode
echo            Les clés API sandbox sont dans .env et ça marche
echo.
echo [Problème] Webhook non reçu
echo [Solution] - Vérifier que ngrok est actif
echo            - Vérifier que WEBHOOK_URL dans .env match l'URL de ngrok
echo            - Redémarrer le backend après modification
echo.
echo [Problème] "Payment not found" dans webhook
echo [Solution] - Vérifier que la colonne 'konnect_payment_id' existe
echo            - Consulter KONNECT_SETUP.md
echo.
pause

REM ============================================================================
REM DOCUMENTATION
REM ============================================================================
echo.
echo ============================================================================
echo 📚 DOCUMENTATION DISPONIBLE
echo ============================================================================
echo.
echo START_HERE.md                 - Les 7 étapes pour démarrer ⭐
echo CHANGES_SUMMARY.md            - Détail de chaque correction
echo KONNECT_INTEGRATION_GUIDE.md  - Guide architectural complet
echo KONNECT_QUICK_START.md        - Démarrage rapide
echo KONNECT_SETUP.md             - Configuration et troubleshooting
echo README_KONNECT_FR.md         - Résumé complet en français
echo DOCUMENTATION_INDEX.md       - Index de tous les guides
echo.
pause

REM ============================================================================
REM RÉSUMÉ FINAL
REM ============================================================================
echo.
echo ============================================================================
echo 🎉 RÉSUMÉ
echo ============================================================================
echo.
echo 1. Terminal 1: npm run dev (backend)
echo 2. Terminal 2: ngrok http 5000 (webhook)
echo 3. Terminal 3: npm run dev (frontend)
echo 4. Ouvrir http://localhost:5173
echo 5. Tester: Créer compte → Ajouter produit → Payer
echo 6. Vérifier: Logs backend et base de données
echo.
echo ============================================================================
echo ✅ C'EST PRÊT! 🚀
echo ============================================================================
echo.
pause
