# Common Kubernetes Issues

Symptom-to-fix lookup for the most common Kubernetes problems. Use after collecting diagnostics.

Routing: match symptom → run debugging commands → apply fix → verify fix removed symptom.

For an end-to-end decision flow, use `k8s-debug-troubleshooting.md`.

---

## Pod issues

### CrashLoopBackOff

**Symptoms:** Pod repeatedly crashes and restarts. Status shows `CrashLoopBackOff`. Restart count increasing.

**Common causes:**
1. Application error causing immediate exit
2. Missing environment variables or configuration
3. Insufficient memory (OOMKilled)
4. Aggressive liveness probe causing restart before app is ready
5. Missing volumes or dependencies

**Debugging:**
```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 5 resources
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 livenessProbe
```

**Fix:** Correct the application crash, add missing configuration, increase resource limits, or relax the liveness probe `initialDelaySeconds`.

---

### ImagePullBackOff / ErrImagePull

**Symptoms:** Pod status shows `ImagePullBackOff` or `ErrImagePull`. Pod fails to start. Events show image pull errors.

**Common causes:**
1. Wrong image name or tag
2. Private registry requires authentication
3. Missing or incorrect image pull secret
4. Registry rate limiting

**Debugging:**
```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get pod <pod-name> -n <namespace> -o yaml | grep image:
kubectl get pod <pod-name> -n <namespace> -o yaml | grep imagePullSecrets -A 2
kubectl get secrets -n <namespace>
```

**Fix:**
```bash
# Create image pull secret
kubectl create secret docker-registry <secret-name> \
  --docker-server=<registry> \
  --docker-username=<user> \
  --docker-password=<pass> \
  -n <namespace>
```

Add `imagePullSecrets` to the pod spec or attach to the ServiceAccount.

---

### Pending — pod not scheduling

**Symptoms:** Pod stuck in `Pending`. Pod never gets scheduled.

**Common causes:**
1. Insufficient cluster resources (CPU or memory)
2. Node selector does not match any node
3. Taints on nodes prevent scheduling
4. PersistentVolumeClaim not bound
5. Affinity rules cannot be satisfied

**Debugging:**
```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl top nodes
kubectl describe nodes
kubectl get pvc -n <namespace>
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
kubectl get resourcequota -n <namespace>
```

**Fix:** Add cluster capacity, adjust node selectors, add tolerations, fix PVC binding, or relax affinity rules.

---

### OOMKilled (out of memory)

**Symptoms:** Pod restarts with exit code 137. Last state shows `OOMKilled`.

**Debugging:**
```bash
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 lastState
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 5 resources
kubectl top pod <pod-name> -n <namespace> --containers
```

**Fix:** Increase memory limits, fix memory leaks in the application, or add memory requests/limits if missing.

---

## Service and networking issues

### Service not accessible

**Symptoms:** Cannot connect to service from inside or outside the cluster. Connection timeout or refused.

**Common causes:**
1. Service selector does not match pod labels
2. Target port mismatch
3. Network policies blocking traffic
4. Pods not ready

**Debugging:**
```bash
kubectl get svc <service-name> -n <namespace> -o yaml
kubectl get endpoints <service-name> -n <namespace>
kubectl get pods -n <namespace> --show-labels
kubectl get networkpolicies -n <namespace>

# Test connectivity from another pod
kubectl run tmp-shell --rm -i --tty --image nicolaka/netshoot -- /bin/bash
# Inside: curl <service-name>.<namespace>.svc.cluster.local
```

**Fix:** Align service selector with pod labels exactly. Verify `targetPort` matches the container port name or number. Check network policies.

---

### DNS resolution failures

**Symptoms:** Pods cannot resolve service names. `nslookup` / `dig` fail. DNS timeouts.

**Common causes:**
1. CoreDNS not running
2. Network policies blocking port 53

**Debugging:**
```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns
kubectl exec <pod-name> -n <namespace> -- nslookup kubernetes.default
kubectl exec <pod-name> -n <namespace> -- cat /etc/resolv.conf
kubectl get svc -n kube-system kube-dns
```

**Fix:**
```bash
kubectl rollout restart deployment/coredns -n kube-system
```

Verify network policies allow UDP+TCP port 53 egress.

---

## Volume and storage issues

### PVC stuck in Pending

**Debugging:**
```bash
kubectl describe pvc <pvc-name> -n <namespace>
kubectl get pv
kubectl get storageclass
```

**Fix:** Create a matching PersistentVolume (static provisioning) or verify the storage class dynamic provisioner is working.

---

## Deployment issues

### Deployment stuck / not rolling out

**Symptoms:** New version not deployed. Old pods still running. Rollout stuck.

**Debugging:**
```bash
kubectl rollout status deployment/<name> -n <namespace>
kubectl rollout history deployment/<name> -n <namespace>
kubectl get rs -n <namespace>
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

**Fix:**
```bash
# If new pods are failing — investigate the new pods
kubectl get pods -n <namespace> -l app=<label>

# Rollback if needed
kubectl rollout undo deployment/<name> -n <namespace>
```

---

## Resource and configuration issues

### ConfigMap or Secret not found

**Symptoms:** Pod fails to start. Events show volume mount errors or missing environment variables.

**Debugging:**
```bash
kubectl get configmaps -n <namespace>
kubectl get secrets -n <namespace>
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 env
```

**Fix:** Create the missing ConfigMap or Secret. Verify names and keys match exactly (case-sensitive). Verify namespace matches.

---

## Performance issues

### High CPU or memory usage

```bash
kubectl top nodes
kubectl top pods -n <namespace>
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 Limits
```

**Fix:** Adjust resource requests/limits, scale horizontally, or optimize application.

---

## Done criteria

Troubleshooting is complete when:
- [ ] Symptom matched to one issue section above
- [ ] At least one `Debugging Steps` command produced evidence for the diagnosis
- [ ] Fix applied and verified with `kubectl get` / `kubectl describe` / `kubectl logs`
- [ ] No new critical warning events appeared after the fix
- [ ] Any disruptive command (restart, rollback, force delete) was justified
