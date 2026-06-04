# Configuration Complète du Paiement Konnect

## 📋 Checklist de Configuration

### ✅ Backend

1. **Dépendances**
   ```bash
   cd backend
   npm install
   # Les paquets suivants doivent être installés:
   # - axios (pour les requêtes HTTP à Konnect)
   # - dotenv (pour les variables d'environnement)
   # - express
   # - mysql2
   ```

2. **Variables d'Environnement (`.env`)**
   ```bash
   # Vérifier que ces variables sont configurées:
   KONNECT_BASE_URL=https://api.preprod.konnect.network/api/v2
   KONNECT_API_KEY=6a01ed252fd977d033152245:R8IEcaP0HAzmpS2S9jODpvw
   KONNECT_WALLET_ID=6a01ed292fd977d03315225c
   WEBHOOK_URL=https://deploy-hydroxide-snazzy.ngrok-free.dev
   FRONTEND_URL=http://localhost:5173
   ```

3. **Démarrage du Serveur**
   ```bash
   npm run dev
   # Devrait afficher: ✅ Connected to MySQL database
   #                   Server running on http://localhost:5000
   ```

### ✅ Frontend

1. **Dépendances**
   ```bash
   cd frontend
   npm install
   ```

2. **Démarrage**
   ```bash
   npm run dev
   # Devrait démarrer sur http://localhost:5173
   ```

3. **Variables d'Environnement (.env.local, optionnel)**
   ```bash
   VITE_API_URL=http://localhost:5000/api
   ```

### ✅ Ngrok Tunnel

L'intégration webhook Konnect nécessite une URL accessible publiquement.

1. **Installer Ngrok**
   ```bash
   # Windows: https://ngrok.com/download
   # macOS: brew install ngrok
   # Linux: apt-get install ngrok
   ```

2. **Démarrer le Tunnel**
   ```bash
   ngrok http 5000
   # Copier l'URL générée (ex: https://xxx-xxx.ngrok-free.dev)
   ```

3. **Mettre à jour `.env`**
   ```bash
   WEBHOOK_URL=https://xxx-xxx.ngrok-free.dev
   ```

4. **Important**: 
   - Ngrok génère une nouvelle URL à chaque redémarrage
   - Mettre à jour WEBHOOK_URL après chaque redémarrage
   - Garder le tunnel actif pendant les tests

## 🔍 Vérifier la Configuration

### 1. Vérifier que le serveur démarre sans erreurs
```bash
cd backend
npm run dev
```

Vous devriez voir:
```
✅ Connected to MySQL database
Server running on http://localhost:5000
```

### 2. Vérifier que le PaymentService est configuré
```bash
curl http://localhost:5000/api/payments/verify/test
```

### 3. Vérifier la connectivité Konnect
```bash
# Le serveur essaiera de communiquer avec Konnect
# Vérifier les logs pour voir si la configuration API fonctionne
```

## 📊 Vérifier les Tables de Base de Données

### Table `payments`
```sql
SELECT * FROM payments LIMIT 1;
```

Devrait avoir les colonnes:
- `id` (INT)
- `order_id` (INT)
- `customer_id` (INT)
- `amount` (DECIMAL)
- `status` (VARCHAR) - 'pending', 'completed', 'failed'
- `konnect_session_id` (VARCHAR)
- `konnect_payment_id` (VARCHAR) **← Important**
- `merchant_reference` (VARCHAR)
- `created_at` (DATETIME)

### Table `subscriptions`
```sql
SELECT * FROM subscriptions LIMIT 1;
```

Devrait avoir les colonnes:
- `id` (INT)
- `user_id` (INT)
- `plan_id` (INT)
- `status` (VARCHAR) - 'pending', 'active', 'canceled'
- `konnect_payment_id` (VARCHAR)
- `konnect_session_id` (VARCHAR)
- `current_period_start` (DATETIME)
- `current_period_end` (DATETIME)
- `next_payment_date` (DATE)

### Si les colonnes Konnect manquent

```sql
-- Pour payments
ALTER TABLE payments ADD COLUMN konnect_session_id VARCHAR(255) AFTER payment_method;
ALTER TABLE payments ADD COLUMN konnect_payment_id VARCHAR(255) AFTER konnect_session_id;
ALTER TABLE payments ADD COLUMN merchant_reference VARCHAR(255) AFTER konnect_payment_id;

-- Pour subscriptions
ALTER TABLE subscriptions ADD COLUMN konnect_payment_id VARCHAR(255) AFTER payment_id;
ALTER TABLE subscriptions ADD COLUMN konnect_session_id VARCHAR(255) AFTER konnect_payment_id;
ALTER TABLE subscriptions ADD COLUMN merchant_reference VARCHAR(255) AFTER konnect_session_id;
```

## 🧪 Test Pas à Pas

### Scénario 1: Tester l'Intégration Konnect

1. **Démarrer le backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Démarrer ngrok** (dans un autre terminal)
   ```bash
   ngrok http 5000
   # Copier l'URL générée
   ```

3. **Mettre à jour `.env`** avec l'URL ngrok

4. **Redémarrer le backend** pour appliquer la nouvelle URL

5. **Démarrer le frontend** (dans un 3e terminal)
   ```bash
   cd frontend
   npm run dev
   ```

6. **Ouvrir le navigateur**
   ```
   http://localhost:5173
   ```

### Scénario 2: Tester un Paiement Client

1. Créer un compte client
2. Ajouter des produits au panier
3. Aller à `/checkout`
4. Compléter les informations d'adresse
5. Cliquer "Payer avec Konnect"
6. **Vous devriez voir**: 
   - URL Konnect dans la console du navigateur
   - Log backend: `✅ Konnect payment created: PAYMENT_REF`

### Scénario 3: Tester un Abonnement

1. Créer un compte vendeur
2. Aller à `/pricing`
3. Cliquer "S'abonner"
4. Sélectionner le plan
5. Cliquer "Continuer"
6. **Vous devriez voir**:
   - URL Konnect
   - Log backend: `✅ Konnect payment created: PAYMENT_REF`

## 🛠️ Troubleshooting

### Problème: "Konnect not configured"
```
Cause: Les clés API sont manquantes ou invalides
Solution:
1. Vérifier .env: KONNECT_API_KEY et KONNECT_WALLET_ID
2. S'assurer qu'ils ne commencent pas par "your-"
3. Redémarrer le serveur après modification
```

### Problème: Webhook non reçu
```
Cause: ngrok tunnel fermé ou URL incorrecte
Solution:
1. Vérifier que ngrok est actif: ngrok config | grep version
2. Copier la nouvelle URL après chaque redémarrage de ngrok
3. Mettre à jour WEBHOOK_URL dans .env
4. Redémarrer le backend
```

### Problème: "Invalid Konnect response"
```
Cause: Erreur de communication avec Konnect API
Solution:
1. Vérifier les logs pour le message d'erreur exact
2. Vérifier que KONNECT_BASE_URL est correct
3. Vérifier la connectivité internet
4. Essayer de faire une requête manuelle:
   curl -H "x-api-key: YOUR_KEY" https://api.preprod.konnect.network/api/v2/payments/init-payment
```

### Problème: "Payment not found"
```
Cause: Le webhook contient un payment_ref que nous ne trouvons pas
Solution:
1. Vérifier que konnect_payment_id est sauvegardé correctement
2. Vérifier que le webhook contient le bon payment_ref
3. Consulter les logs pour voir ce qui est reçu
```

## 📚 Fichiers Importants

```
backend/
├── .env                          ← Configuration
├── services/PaymentService.js    ← Logique Konnect
├── routes/payments.js            ← Endpoints paiement
├── routes/subscriptions.js       ← Endpoints abonnement
├── middleware/auth.js            ← Authentification
└── test_konnect_integration.js   ← Tests

frontend/
├── src/
│   ├── lib/api.ts               ← Client API
│   ├── hooks/usePayment.ts      ← Hook paiement
│   └── hooks/useSubscriptions.ts ← Hook abonnement
└── .env.local                    ← Config frontend

Documentation/
├── KONNECT_INTEGRATION_GUIDE.md  ← Guide complet
├── KONNECT_QUICK_START.md        ← Démarrage rapide
└── KONNECT_SETUP.md              ← Ce fichier
```

## 🔐 Sécurité

### Development (Sandbox)
- ✅ Clés API sandbox utilisées
- ⚠️ HTTPS non requis
- ⚠️ Signature webhook non vérifiée (pour faciliter les tests)

### Production
- 🔒 Utiliser clés API production
- 🔒 Activer HTTPS
- 🔒 Activer la vérification HMAC des signatures
- 🔒 Configurer variables d'environnement sécurisées
- 🔒 Mettre à jour KONNECT_WEBHOOK_SECRET

## 📞 Aide et Support

### Logs à vérifier
```bash
# Backend logs
npm run dev

# Frontend logs
Ouvrir DevTools (F12) > Console

# Logs de base de données
mysql -u root souk_tn -e "SELECT * FROM payments ORDER BY created_at DESC LIMIT 1\G"
```

### Contacts
- Konnect Support: https://konnect.io/support
- Konnect Docs: https://konnect-docs.io
- Dashboard Konnect: https://dashboard.konnect.network

