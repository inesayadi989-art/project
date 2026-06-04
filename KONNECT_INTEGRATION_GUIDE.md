# Guide d'Intégration Konnect - Sandbox

## Configuration Actuelle ✅

Votre projet est configuré pour utiliser **Konnect Sandbox** (preprod).

### Clés de Configuration (`.env`)
```
KONNECT_BASE_URL=https://api.preprod.konnect.network/api/v2
KONNECT_API_KEY=6a01ed252fd977d033152245:R8IEcaP0HAzmpS2S9jODpvw
KONNECT_WALLET_ID=6a01ed292fd977d03315225c
WEBHOOK_URL=https://deploy-hydroxide-snazzy.ngrok-free.dev
FRONTEND_URL=http://localhost:5173
```

## Flux de Paiement

### 1. **Paiement Client (Achat de Produits)**

#### Étape 1: Créer une commande
```bash
POST /api/orders
```

#### Étape 2: Créer une session de paiement
```bash
POST /api/payments/create-payment
{
  "orderId": 123
}
```

**Réponse:**
```json
{
  "success": true,
  "paymentId": 1,
  "sessionId": "konnect_payment_ref",
  "paymentUrl": "https://checkout.konnect.network/...",
  "redirectUrl": "https://checkout.konnect.network/...",
  "isFallback": false
}
```

#### Étape 3: Rediriger vers Konnect
```javascript
window.location.href = response.paymentUrl;
```

#### Étape 4: Webhook - Konnect envoie une notification
- **GET**: `/api/payments/webhook?payment_ref=xxx`
- **POST**: `/api/payments/webhook` (JSON payload)

Le système met automatiquement à jour:
- ✅ Status du paiement (`pending` → `completed`)
- ✅ Status de la commande (`pending` → `confirmed`)
- ✅ Date de paiement (`paid_at`)

### 2. **Paiement Vendeur (Abonnement)**

#### Étape 1: Obtenir les plans
```bash
GET /api/subscriptions/plans
```

**Réponse:**
```json
{
  "plans": [
    {
      "id": 1,
      "name": "Plan Vendeur",
      "slug": "single-plan",
      "amount": 9.99,
      "interval_type": "month",
      "interval_count": 1
    }
  ]
}
```

#### Étape 2: Créer une session de paiement d'abonnement
```bash
POST /api/subscriptions/create
{
  "planId": 1,
  "paymentMethod": "card"  // or "d17"
}
```

**Réponse:**
```json
{
  "success": true,
  "subscriptionId": 5,
  "paymentUrl": "https://checkout.konnect.network/...",
  "sessionId": "konnect_payment_ref",
  "isFallback": false
}
```

#### Étape 3: Rediriger vers Konnect
```javascript
window.location.href = response.paymentUrl;
```

#### Étape 4: Webhook - Activation automatique
Le système met automatiquement à jour:
- ✅ Status de l'abonnement (`pending` → `active`)
- ✅ Période actuelle (`current_period_start` et `current_period_end`)
- ✅ Date du prochain paiement (`next_payment_date`)

## Méthodes de Paiement Konnect

Le système supporte:
1. **Wallet Konnect** - Portefeuille numérique
2. **Carte Bancaire** - Visa/MasterCard
3. **e-DINAR** - Service de paiement tunisien

## Endpoints Webhook

### GET Request (Redirect Callback)
```
GET https://deploy-hydroxide-snazzy.ngrok-free.dev/api/payments/webhook?payment_ref=KONNECT_REF
```

### POST Request (Optional)
```
POST https://deploy-hydroxide-snazzy.ngrok-free.dev/api/payments/webhook
Content-Type: application/json

{
  "paymentRef": "KONNECT_REF",
  "status": "completed",
  ...
}
```

## Vérifier le Statut

### Vérifier un paiement
```bash
GET /api/payments/verify/{paymentId}
```

### Vérifier une souscription
```bash
GET /api/subscriptions/{subscriptionId}
```

## URLs de Callback

### Succès
```
{FRONTEND_URL}/payment/success?paymentId={paymentId}
// Ou pour abonnement:
{FRONTEND_URL}/payment/success?type=subscription&subscriptionId={subscriptionId}
```

### Échec
```
{FRONTEND_URL}/payment/failure?paymentId={paymentId}
// Ou pour abonnement:
{FRONTEND_URL}/payment/failure?type=subscription&subscriptionId={subscriptionId}
```

## Corrections Apportées ✅

### 1. Propriétés de Réponse
- ✅ Ajout de `paymentUrl` et `redirectUrl`
- ✅ Ajout de `sessionId` et `paymentId`
- ✅ Changement de `fallback` à `isFallback`

### 2. Endpoints Webhook
- ✅ Ajout du endpoint GET `/webhook`
- ✅ Maintien du endpoint POST `/webhook`
- ✅ Support des deux formats (GET query params et POST body)

### 3. Méthodes Manquantes
- ✅ Ajout de `verifyWebhookSignature()`
- ✅ Ajout de `handleWebhookGET()`

### 4. Routes Corrigées
- ✅ payments.js - Webhooks GET et POST
- ✅ subscriptions.js - Webhooks GET et POST

## Flux de Test (Sandbox)

### 1. Démarrer le serveur
```bash
cd backend
npm install
npm run dev
```

### 2. Démarrer le frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Tester un achat (Client)
1. Créer un compte client
2. Ajouter des produits au panier
3. Aller à `/checkout`
4. Soumettre l'adresse de livraison
5. Cliquer sur "Payer avec Konnect"
6. Redirection vers Konnect (sandbox)
7. Utiliser les cartes de test Konnect
8. Redirection automatique vers success/failure

### 4. Tester un abonnement (Vendeur)
1. Créer un compte vendeur
2. Aller à `/pricing` ou `/seller/dashboard`
3. Cliquer sur "S'abonner"
4. Sélectionner le plan et la méthode de paiement
5. Cliquer "Continuer"
6. Redirection vers Konnect (sandbox)
7. Compléter le paiement
8. Redirection automatique + activation de l'abonnement

## Cartes de Test Konnect

Pour tester dans Konnect Sandbox, utilisez ces cartes:

| Numéro | Expiration | CVV | Statut |
|--------|-----------|-----|--------|
| 4111111111111111 | 12/25 | 123 | ✅ Acceptée |
| 5555555555554444 | 12/25 | 123 | ✅ Acceptée |
| 378282246310005 | 12/25 | 1234 | ✅ Acceptée |

## Logs et Debugging

### Logs Backend
```bash
# Voir les logs de création de paiement
[✅ Konnect payment created: PAYMENT_REF]

# Voir les logs de webhook
[📥 Payment webhook received: payment_ref=PAYMENT_REF]
[✅ Payment webhook processed: {success: true}]
```

### Logs Frontend
```bash
# Voir les requêtes API
[API Request: /api/payments/create-payment]

# Voir les réponses
[paymentUrl: https://checkout.konnect.network/...]
```

## Problèmes Courants

### 1. "Konnect not configured"
**Cause**: Clés API manquantes ou invalides
**Solution**: Vérifier `.env` et les clés Konnect

### 2. "Invalid Konnect response"
**Cause**: Erreur de communication avec Konnect
**Solution**: Vérifier ngrok tunnel et WEBHOOK_URL

### 3. Webhook non reçu
**Cause**: Ngrok tunnel fermé ou URL incorrecte
**Solution**: Redémarrer ngrok et mettre à jour WEBHOOK_URL

### 4. Paiement toujours "pending"
**Cause**: Webhook pas traité ou status non reconnu
**Solution**: Checker les logs backend pour les erreurs

## Migration vers Production

### 1. Mettre à jour `.env`
```bash
KONNECT_BASE_URL=https://api.konnect.network/api/v2  # Production
KONNECT_API_KEY=your-production-api-key
KONNECT_WALLET_ID=your-production-wallet-id
WEBHOOK_URL=https://your-production-domain.com
```

### 2. Activer la vérification de signature
Décommenter le code dans `PaymentService.verifyWebhookSignature()`:
```javascript
const secret = process.env.KONNECT_WEBHOOK_SECRET;
const hash = crypto.createHmac('sha256', secret).update(...).digest('hex');
return hash === signature;
```

### 3. Configurer HTTPS
Les webhooks en production nécessitent HTTPS

## Contacts Konnect

- **Support**: https://konnect.io/support
- **Docs**: https://konnect-docs.io
- **Dashboard**: https://dashboard.konnect.network

