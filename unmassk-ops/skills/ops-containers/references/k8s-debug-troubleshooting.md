# Kubernetes Troubleshooting Workflows

Step-by-step diagnostic workflows for Kubernetes issues.

**Routing guide:**

| Symptom | Workflow |
|---------|----------|
| Pod not scheduling | Pod Pending |
| Pod repeatedly restarts | Pod CrashLoopBackOff |
| Image pull fails | Pod ImagePullBackOff |
| Service or DNS failing | Network Troubleshooting |
| Resource pressure | Resource and Performance |
| PVC / storage issue | Storage Troubleshooting |
| Rollout blocked | Deployment and Rollout |

**Safety:** treat `kubectl delete --force`, `kubectl drain`, `kubectl rollout restart`, and `kubectl rollout undo` as disruptive. Capture current state before running them.

---

## General approach

```
1. Identify the problem layer:
   Application → Pod → Service → Node → Cluster → Storage → Configuration

2. Gather initial information:
   kubectl get pods -n <namespace>
   kubectl get events -n <namespace> --sort-by='.lastTimestamp'
   kubectl describe pod <pod-name> -n <namespace>

3. Follow the workflow matching the pod state:
   Pending          → Pod Pending workflow
   ImagePullBackOff → Image Pull workflow
   CrashLoopBackOff → CrashLoopBackOff workflow
   Running (not working) → Network workflow
   Error/Unknown    → Node/Cluster workflow
```

---

## Pod Pending workflow

```
1. kubectl describe pod <pod> → Check Events section
   |
2. Check scheduling blocker:
   - Insufficient resources?     → kubectl top nodes
   - Node selector mismatch?     → check pod spec nodeSelector
   - Taints/tolerations issue?   → kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
   - PVC not bound?              → kubectl get pvc -n <namespace>
   - ResourceQuota exhausted?    → kubectl get resourcequota -n <namespace>
   |
3. Fix:
   - Add cluster capacity, OR
   - Adjust nodeSelector / tolerations, OR
   - Create PV or fix storage class, OR
   - Increase ResourceQuota
```

---

## Pod CrashLoopBackOff workflow

```
1. kubectl logs <pod> --previous
   |
2. Analyze crash reason:
   - Application error?         → fix code or config
   - Missing env vars?          → kubectl get pod <pod> -o yaml | grep -A 10 env
   - Missing volumes?           → kubectl get pod <pod> -o yaml | grep -A 10 volumeMounts
   - OOMKilled?                 → kubectl describe pod <pod> | grep -A 10 lastState
   - Liveness probe too strict? → kubectl get pod <pod> -o yaml | grep -A 10 livenessProbe
   |
3. Apply fix:
   kubectl apply -f updated-config.yaml
   kubectl get pods -w  # Watch for stable Running state
```

---

## Pod ImagePullBackOff workflow

```
1. kubectl describe pod <pod> → Find exact error message
   |
2. Verify image:
   - Does image exist?    → docker pull <image> (test locally)
   - Correct tag?         → check deployment/pod spec
   - Private registry?    → check imagePullSecrets
   |
3. Fix authentication:
   kubectl create secret docker-registry <secret> \
     --docker-server=<server> \
     --docker-username=<user> \
     --docker-password=<pass>
   |
4. Add imagePullSecrets to pod spec or ServiceAccount
   |
5. kubectl get pods -w  # Confirm pods reach Running
```

---

## Network troubleshooting workflow

### Service connectivity

```
1. kubectl get svc <service-name> -n <namespace>
   |
2. kubectl get endpoints <service-name> -n <namespace>
   - No endpoints? → service selector does not match pod labels
   |
3. Test DNS:
   kubectl run tmp-shell --rm -i --tty --image nicolaka/netshoot -- /bin/bash
   nslookup <service-name>.<namespace>.svc.cluster.local
   |
   DNS fails? → check CoreDNS pods and logs (see below)
   |
4. Test connectivity:
   curl <service-name>.<namespace>.svc.cluster.local:<port>
   |
   Fails? → check:
   - Network policies: kubectl get networkpolicies -n <namespace>
   - targetPort matches pod containerPort
   - Pods are Ready: kubectl get pods -n <namespace>
   |
5. For external access:
   - LoadBalancer: check external IP assigned
   - Ingress:      kubectl get ingress -n <namespace>
   - NodePort:     access via <node-ip>:<nodePort>
```

### DNS issues

```
1. kubectl exec <pod> -n <namespace> -- nslookup kubernetes.default
   |
2. kubectl get pods -n kube-system -l k8s-app=kube-dns
   kubectl logs -n kube-system -l k8s-app=kube-dns
   |
3. kubectl get svc -n kube-system kube-dns
   kubectl get endpoints -n kube-system kube-dns
   |
4. kubectl exec <pod> -n <namespace> -- cat /etc/resolv.conf
   |
5. Fix:
   kubectl rollout restart -n kube-system deployment/coredns
   # Verify network policies allow port 53 (UDP+TCP)
```

---

## Resource and performance workflow

```
1. kubectl top nodes
   kubectl top pods --all-namespaces
   |
2. kubectl top pod <pod> -n <namespace> --containers
   kubectl describe pod <pod> -n <namespace> | grep -A 10 "Limits"
   |
3. Analyze:
   - Memory leak?    → check logs for errors
   - CPU spike?      → profile application
   - Limits too low? → increase requests/limits
   |
4. Fix:
   - Increase limits if usage is legitimate
   - Fix application bug if leak
   - Add HPA for scaling: autoscaling/v2
   - Add ResourceQuota to prevent namespace overconsumption
```

### Node resource exhaustion

```
1. kubectl get nodes
   kubectl describe node <node-name>
   |
2. Look for pressure conditions:
   - MemoryPressure
   - DiskPressure
   - PIDPressure
   |
3. kubectl describe node <node-name> | grep -A 20 "Allocated resources"
   |
4. Fix:
   - Evict non-critical pods
   - Add nodes to cluster
   - Adjust resource requests/limits
   - Clean disk if DiskPressure
```

---

## Storage troubleshooting workflow

```
1. kubectl get pvc -n <namespace>
   kubectl describe pvc <pvc-name> -n <namespace>
   |
2. kubectl get pv
   - No matching PV? → check storageClass, dynamic provisioner
   |
3. kubectl describe storageclass <class-name>
   |
4. kubectl logs -n kube-system <provisioner-pod>
   |
5. Fix:
   - Create matching PV (static), OR
   - Fix StorageClass config (dynamic), OR
   - Verify provisioner is running
```

---

## Deployment and rollout workflow

```
1. kubectl rollout status deployment/<name> -n <namespace>
   |
2. kubectl get rs -n <namespace>
   kubectl describe rs <new-replicaset> -n <namespace>
   |
3. kubectl get pods -n <namespace> -l app=<app-label>
   - Pods failing? → follow CrashLoopBackOff or ImagePullBackOff workflow
   |
4. kubectl get deployment <name> -n <namespace> -o yaml | grep -A 10 strategy
   |
5. Options:
   kubectl rollout pause deployment/<name>          # Pause
   kubectl rollout undo deployment/<name>           # Rollback
   kubectl rollout history deployment/<name>        # View history
```

---

## Quick reference commands

```bash
# Pod debugging
kubectl get pods -n <namespace> -o wide
kubectl describe pod <pod> -n <namespace>
kubectl logs <pod> -n <namespace> [-c container]
kubectl logs <pod> -n <namespace> --previous
kubectl exec <pod> -n <namespace> -it -- /bin/sh

# Service debugging
kubectl get svc -n <namespace>
kubectl get endpoints -n <namespace>
kubectl describe svc <service> -n <namespace>

# Events (most recent last)
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# Resource usage
kubectl top nodes
kubectl top pods -n <namespace>

# Network debug pod
kubectl run tmp-shell --rm -i --tty --image nicolaka/netshoot -- /bin/bash

# Cluster health
kubectl get nodes
kubectl cluster-info
```

### Disruptive commands (capture state first)

```bash
kubectl delete pod <pod> -n <namespace> --force --grace-period=0
kubectl rollout restart deployment/<name> -n <namespace>
kubectl rollout undo deployment/<name> -n <namespace>
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

---

## Done criteria

A troubleshooting run is complete when:
- [ ] Issue category mapped to one workflow above
- [ ] Evidence captured (events, logs, describe output, config snapshot)
- [ ] Root cause and fix connected by observable data
- [ ] Post-fix verification succeeded (`kubectl get`, `kubectl rollout status`, or connectivity check)
- [ ] Any disruptive action documented with reason and rollback option
