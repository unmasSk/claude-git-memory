# Makefile Best Practices

## Modern Preamble

Always start with:

```makefile
SHELL := bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules
```

| Setting | Purpose |
|---------|---------|
| `SHELL := bash` | Use bash instead of /bin/sh |
| `.ONESHELL:` | Entire recipe runs in single shell — `cd` persists |
| `.SHELLFLAGS := -eu -o pipefail -c` | Fail on errors, undefined vars, pipe failures |
| `.DELETE_ON_ERROR:` | Delete corrupt target if recipe fails |
| `--warn-undefined-variables` | Alert on undefined Make variable references |
| `--no-builtin-rules` | Disable ~90 built-in rules for faster builds |

## Special Targets

### .DELETE_ON_ERROR (Critical)

Without this: a failed build leaves a partial file. Next `make` sees it and skips rebuilding. Hard to debug.

```makefile
.DELETE_ON_ERROR:
# rest of Makefile

# Protect specific files from deletion on error
.PRECIOUS: expensive-to-rebuild.dat
```

### .PHONY (Required for all non-file targets)

```makefile
.PHONY: all build clean test install deploy
```

Without `.PHONY`: if a file named `clean` exists, `make clean` won't run.

### .SUFFIXES (Performance)

```makefile
.SUFFIXES:           # disable ~90 built-in suffix rules
```

### .DEFAULT_GOAL

```makefile
# Method 1: First target is default (put 'all' first)
.PHONY: all
all: build test

# Method 2: Explicit
.DEFAULT_GOAL := build
```

## Variable Management

Use the right operator:

```makefile
# := for computed values — evaluated once
SOURCES := $(wildcard src/*.c)
OBJECTS := $(SOURCES:.c=.o)
BUILD_TIME := $(shell date +%Y%m%d-%H%M%S)

# ?= for user-overridable defaults
CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2
PREFIX ?= /usr/local

# += to extend
CFLAGS += -I./include

# Never use = for shell calls or wildcards — re-evaluated every use
# BAD: SOURCES = $(wildcard src/*.c)
```

## Recipes

### Tabs, Not Spaces

Makefiles require TAB characters for recipe indentation. Configure your editor:

```vim
" Vim
autocmd FileType make setlocal noexpandtab
```

```json
// VS Code settings.json
"[makefile]": {
    "editor.insertSpaces": false,
    "editor.detectIndentation": false
}
```

### Error Handling

```makefile
# @ suppresses echo, - ignores errors
clean:
	@echo "Cleaning..."
	-$(RM) *.o

# With .ONESHELL: use set -e (already active via .SHELLFLAGS)
test:
	echo "Running tests..."
	go test ./...
	echo "All tests passed!"

# Multi-line without .ONESHELL: use backslash + explicit set -e
test:
	@set -e; \
	go test ./...; \
	echo "All tests passed!"
```

### Verbose Mode

```makefile
VERBOSE ?= 0
ifeq ($(VERBOSE),1)
    Q :=
else
    Q := @
endif

build:
	$(Q)$(CC) $(CFLAGS) -o app $(SOURCES)

# make build VERBOSE=1 shows commands
```

## Dependency Management

### Automatic (C/C++)

```makefile
%.o: %.c
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(OBJECTS:.o=.d)
```

### Order-Only Prerequisites

```makefile
# | means: must exist, but changes don't trigger rebuild
$(BUILD_DIR)/app: $(SOURCES) | $(BUILD_DIR)
	$(CC) -o $@ $^

$(BUILD_DIR):
	mkdir -p $@
```

### VPATH

```makefile
vpath %.c src
vpath %.h include

# Make finds src/main.c automatically for main.o: main.c
```

## File Organization

### Modular Makefiles

```makefile
# Main Makefile
include config/variables.mk
include rules/build.mk
include rules/test.mk

.PHONY: all
all: build test
```

### Namespaced Targets

```makefile
# Prefer / over - for namespacing
.PHONY: docker/build docker/push docker/clean

docker/build:
	docker build -t $(IMAGE) .

docker/push:
	docker push $(IMAGE)
```

## Portability

```makefile
# Use variables for tools, not hard-coded paths
CC ?= gcc
PYTHON ?= python3

# Use PREFIX for installation
PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin

install:
	install -d $(DESTDIR)$(BINDIR)
	install -m 755 app $(DESTDIR)$(BINDIR)/

# Platform detection when necessary
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    PLATFORM := macos
endif
ifeq ($(UNAME_S),Linux)
    PLATFORM := linux
endif
```

## Self-Documenting Help Target

```makefile
.PHONY: help
help:
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

build: ## Build the application
	@go build -o app

test: ## Run all tests
	@go test ./...

clean: ## Remove build artifacts
	@rm -rf $(BUILD_DIR)
```

## Parallel Builds

```makefile
# .NOTPARALLEL disables parallel for entire Makefile
# .NOTPARALLEL: target serializes that target's prerequisites (Make 4.4+)
.NOTPARALLEL: deploy

deploy: deploy-database deploy-backend deploy-frontend
	@echo "Deployment complete"

# .WAIT orders prerequisites without creating dependencies (Make 4.4+)
ci: lint fmt .WAIT test .WAIT build
```

Run with `make -j$(nproc)` or `make -j4`.

## Summary Checklist

- [ ] `.DELETE_ON_ERROR:` declared at top
- [ ] All non-file targets declared `.PHONY`
- [ ] Tabs for recipe indentation (not spaces)
- [ ] `:=` for computed values, `?=` for user overrides
- [ ] Dependencies properly specified (use `-MMD -MP`)
- [ ] Error handling in critical recipes
- [ ] `all` is the default target (first or `.DEFAULT_GOAL`)
- [ ] No hardcoded credentials or paths
- [ ] Help target provided
- [ ] `.SUFFIXES:` disables built-in rules
- [ ] Parallel build safety considered
- [ ] Tools configurable (`CC ?= gcc`)
- [ ] Pattern rules instead of duplicate explicit rules
