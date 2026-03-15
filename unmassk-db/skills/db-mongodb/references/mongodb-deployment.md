# MongoDB Deployment

## Atlas (Cloud)

Recommended for most use cases.

1. Create free M0 cluster at mongodb.com/atlas
2. Whitelist IP address
3. Create database user
4. Get connection string

```javascript
const uri = "mongodb+srv://user:pass@cluster.mongodb.net/database?retryWrites=true&w=majority";
const client = new MongoClient(uri);
```

Features: auto-scaling, automated backups, multi-cloud (AWS/Azure/GCP), multi-region, Atlas Search, Vector Search, Charts, Data Federation, serverless instances.

## Self-Managed

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-8.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

Configuration (mongod.conf):
```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
net:
  port: 27017
  bindIp: 127.0.0.1
security:
  authorization: enabled
replication:
  replSetName: "myReplicaSet"
```

## Kubernetes

```yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-replica-set
spec:
  members: 3
  type: ReplicaSet
  version: "8.0"
  security:
    authentication:
      modes: ["SCRAM"]
  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: mongodb-admin-password
      roles:
        - name: root
          db: admin
  statefulSet:
    spec:
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            resources:
              requests:
                storage: 10Gi
```
