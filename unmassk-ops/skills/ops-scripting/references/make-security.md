# Makefile Security

## Secrets Management

Never hardcode credentials in Makefiles. They end up in version control, logs, and process listings.

```makefile
# WRONG
DB_PASSWORD := mysecretpassword
AWS_SECRET := AKIAIOSFODNN7EXAMPLE

# CORRECT: Fail at definition time if not set
DB_PASSWORD ?= $(error DB_PASSWORD is not set)
AWS_SECRET_KEY ?= $(error AWS_SECRET_KEY is not set)
```

### .env Files

```makefile
# Include .env if it exists — never commit .env
-include .env
export

# Verify .gitignore contains .env
check-env:
	@grep -q '^\.env$$' .gitignore || echo "WARNING: Add .env to .gitignore!"
```

### Runtime Secrets (Preferred for Production)

```makefile
# AWS Secrets Manager — fetch at runtime, don't cache in Make variables
deploy:
	@DB_PASSWORD=$$(aws secretsmanager get-secret-value \
		--secret-id prod/db/password \
		--query SecretString --output text) && \
	./deploy.sh

# HashiCorp Vault
deploy:
	@DB_PASSWORD=$$(vault kv get -field=password secret/database) && \
	./deploy.sh
```

## Shell Injection Prevention

### Input Validation

```makefile
# Validate PROJECT_NAME contains only safe characters
PROJECT_NAME := $(strip $(PROJECT_NAME))
ifneq ($(PROJECT_NAME),$(shell echo '$(PROJECT_NAME)' | tr -cd 'a-zA-Z0-9_-'))
$(error PROJECT_NAME contains invalid characters. Use only [a-zA-Z0-9_-])
endif
```

### Quote Variables in Shell Commands

```makefile
# WRONG
process:
	./script.sh $(USER_INPUT)    # unquoted — shell splits on spaces/special chars

# CORRECT
process:
	./script.sh '$(USER_INPUT)'
```

### Validate Allowed Values

```makefile
ALLOWED_BRANCHES := main develop staging
BRANCH ?= main

deploy:
	@echo "$(ALLOWED_BRANCHES)" | grep -wq "$(BRANCH)" || \
		{ echo "Error: Invalid branch '$(BRANCH)'"; exit 1; }
	ssh user@$(SERVER) "cd /app && git pull origin '$(BRANCH)'"
```

### Dangerous Patterns to Avoid

```makefile
# NEVER: allows arbitrary command execution
run-command:
	$(USER_COMMAND)

# NEVER: pipe untrusted input to shell
execute:
	echo $(INPUT) | sh

# NEVER: eval with user input
eval-input:
	@eval $(USER_INPUT)
```

## Variable Expansion Security

```makefile
# Use := so values aren't re-evaluated
SAFE_VALUE := $(shell whoami)

# Passwords with $ — double the $ to escape
# If password is "pa$$word":
PASSWORD := pa$$$$word
```

## File System Security

### Path Traversal Prevention

```makefile
# WRONG
read-file:
	cat $(FILE_PATH)    # user can pass ../../../etc/passwd

# SAFER
SAFE_DIR := ./data
read-file:
	@case "$(FILE_PATH)" in \
		$(SAFE_DIR)/*) cat "$(FILE_PATH)" ;; \
		*) echo "ERROR: Invalid path" >&2; exit 1 ;; \
	esac
```

### Secure Temporary Files

```makefile
process:
	@TMPFILE=$$(mktemp) && \
	trap 'rm -f "$$TMPFILE"' EXIT && \
	./generate-config > "$$TMPFILE" && \
	./process-config "$$TMPFILE"
```

### File Permissions

```makefile
install-config:
	install -m 600 config.secret $(DESTDIR)/etc/myapp/

install-dirs:
	install -d -m 700 $(DESTDIR)/var/lib/myapp/secrets
```

## CI/CD Security

### Suppress Secrets from Logs

```makefile
# WRONG: password visible in build output
deploy:
	curl -u user:$(PASSWORD) https://api.example.com

# CORRECT: @ suppresses command echo
deploy:
	@curl -u user:$(PASSWORD) https://api.example.com

# BEST: use credential helper
deploy:
	@curl --netrc-file ~/.netrc https://api.example.com
```

### Fail Securely

```makefile
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c

deploy:
	@test -n "$(API_KEY)" || { echo "ERROR: API_KEY not set" >&2; exit 1; }
	@./deploy.sh
```

### Environment Isolation

```makefile
# Unexport sensitive environment variables
unexport HISTFILE
unexport AWS_SESSION_TOKEN

# Explicitly export only what's needed
export PATH
export HOME
```

## Network Security

```makefile
# Always verify downloads
download:
	curl -fsSL -o package.tar.gz https://example.com/package.tar.gz
	sha256sum -c checksums.sha256

# Force HTTPS + TLS 1.2
CURL_OPTS := --proto '=https' --tlsv1.2

download:
	curl $(CURL_OPTS) -fsSL -o file.txt https://example.com/file.txt
```

## Container Security

```makefile
# Build with non-root user IDs
docker/build:
	docker build \
		--build-arg USER_ID=$$(id -u) \
		--build-arg GROUP_ID=$$(id -g) \
		-t $(IMAGE) .

# Scan for vulnerabilities
docker/scan: docker/build
	@command -v trivy >/dev/null 2>&1 || \
		{ echo "WARNING: trivy not found, skipping scan"; exit 0; }
	trivy image --exit-code 1 --severity HIGH,CRITICAL $(IMAGE)

# WRONG: secret visible in image layers
docker/build:
	docker build --build-arg API_KEY=$(API_KEY) -t myapp .

# CORRECT: BuildKit secrets
docker/build:
	DOCKER_BUILDKIT=1 docker build \
		--secret id=api_key,src=.api_key \
		-t myapp .
```

## Security Checklist

- [ ] No hardcoded credentials, API keys, or passwords
- [ ] Secrets loaded from environment or secret manager
- [ ] `.env` in `.gitignore`
- [ ] User input validated before use in shell commands
- [ ] Shell commands use proper quoting
- [ ] No `eval` with external input
- [ ] Downloads verified with checksums or signatures
- [ ] Sensitive commands prefixed with `@` to suppress logs
- [ ] Temporary files created with `mktemp` and cleaned up
- [ ] File permissions appropriately restrictive
- [ ] Container builds don't expose secrets in layers
- [ ] `HISTFILE` unexported in CI
