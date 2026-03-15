# MongoDB Security

## Authentication

Methods: SCRAM (default), X.509 Certificates, LDAP (Enterprise), Kerberos (Enterprise), AWS IAM, OIDC.

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "strongPassword",
  roles: ["root"]
})

use myDatabase
db.createUser({
  user: "appUser",
  pwd: "password",
  roles: [{ role: "readWrite", db: "myDatabase" }]
})
```

## Role-Based Access Control (RBAC)

Built-in roles: `read`, `readWrite`, `dbAdmin`, `dbOwner`, `userAdmin`, `clusterAdmin`, `root`.

```javascript
db.createRole({
  role: "customRole",
  privileges: [
    {
      resource: { db: "myDatabase", collection: "users" },
      actions: ["find", "update"]
    }
  ],
  roles: []
})
```

## Encryption at Rest

```yaml
# mongod.conf
security:
  enableEncryption: true
  encryptionKeyFile: /path/to/keyfile
```

## Encryption in Transit (TLS/SSL)

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /path/to/cert.pem
    CAFile: /path/to/ca.pem
```

## Client-Side Field Level Encryption (CSFLE)

```javascript
const clientEncryption = new ClientEncryption(client, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders: {
    aws: { accessKeyId: "...", secretAccessKey: "..." }
  }
})

const dataKeyId = await clientEncryption.createDataKey("aws", {
  masterKey: { region: "us-east-1", key: "..." }
})

const encryptedClient = new MongoClient(uri, {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders: { aws: {...} },
    schemaMap: {
      "myDatabase.users": {
        bsonType: "object",
        properties: {
          ssn: {
            encrypt: {
              keyId: [dataKeyId],
              algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
            }
          }
        }
      }
    }
  }
})
```
