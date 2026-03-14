# Common Makefile Mistakes

## Critical Errors

### 1. Missing .DELETE_ON_ERROR

```makefile
# WRONG
.PHONY: all
all: app.bin

app.bin: app.c
	$(CC) -o $@ $<
# If compilation fails: partial app.bin remains.
# Next 'make' sees the file → skips rebuild → broken build.
```

```makefile
# CORRECT
.DELETE_ON_ERROR:
.PHONY: all
all: app.bin
```

GNU Make Manual: *"This is almost always what you want make to do, but it is not historical practice; so for compatibility, you must explicitly request it."*

### 2. Spaces Instead of Tabs

```makefile
# WRONG
build:
    echo "Building..."  # spaces
# Error: *** missing separator. Stop.

# CORRECT
build:
	echo "Building..."  # TAB character
```

Detection: mbake detects and fixes this automatically.

### 3. Missing .PHONY Declarations

```makefile
# WRONG
clean:
	rm -rf build
# If a file named 'clean' exists: make: 'clean' is up to date.

# CORRECT
.PHONY: clean test all install
```

### 4. Not Clearing .SUFFIXES

```makefile
# CORRECT: disable ~90 built-in rules for faster builds
.SUFFIXES:
```

## Dependency Errors

### 5. Missing Header Dependencies

```makefile
# WRONG
%.o: %.c
	$(CC) $(CFLAGS) -c $<
# Headers change → .o files don't rebuild

# CORRECT: Auto-generate dependencies
%.o: %.c
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(OBJECTS:.o=.d)
```

### 6. Phony Target as Prerequisite of Real Target

```makefile
# WRONG
.PHONY: generate
app.o: app.c generate   # app.o rebuilds EVERY time
	$(CC) -c app.c -o app.o

# CORRECT: depend on actual generated file
config.h:
	./gen-config.sh

app.o: app.c config.h
	$(CC) -c app.c -o app.o
```

### 7. Circular Dependencies

```makefile
# WRONG
A: B
B: A   # Error: Circular A <- B dependency dropped

# CORRECT
A: C
B: C
C:
	touch c
```

### 8. Assuming Build Order Without Dependencies

```makefile
# WRONG
all: build test deploy
test:
	./scripts/test.sh    # assumes app exists
deploy:
	./scripts/deploy.sh  # assumes tests passed
# 'make test' or 'make deploy' alone will fail

# CORRECT
test: build
	./scripts/test.sh
deploy: test
	./scripts/deploy.sh
```

## Variable Errors

### 9. Using = Instead of := for Shell Calls

```makefile
# WRONG
BUILD_TIME = $(shell date)   # Shell called every use — different values!
GIT_HASH = $(shell git rev-parse HEAD)  # Called multiple times

# CORRECT
BUILD_TIME := $(shell date)   # Evaluated once
GIT_HASH := $(shell git rev-parse HEAD)
```

### 10. Shell Variables Not Escaped

```makefile
# WRONG
build:
	for file in *.c; do \
		echo "Compiling $file"; \   # $file = Make var (empty!)
	done

# CORRECT
build:
	for file in *.c; do \
		echo "Compiling $$file"; \  # $$file = shell var
	done
```

### 11. Undefined Variables Without Defaults

```makefile
# WRONG
install:
	cp app $(PREFIX)/bin/   # if PREFIX unset → installs to /bin/

# CORRECT
PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin
install:
	install -d $(DESTDIR)$(BINDIR)
	install -m 755 app $(DESTDIR)$(BINDIR)/
```

### 12. Overriding Built-In Variables

```makefile
# WRONG
MAKEFLAGS = -j4      # overrides Make's internal flags
MAKE = my-build-tool # breaks recursive make

# CORRECT
BUILD_FLAGS := -j4
```

### 13. Wildcard Re-Evaluation

```makefile
# WRONG: wildcard searches filesystem on every use
build:
	$(CC) -o app $(wildcard src/*.c)

# CORRECT
SOURCES := $(wildcard src/*.c)
build:
	$(CC) -o app $(SOURCES)
```

## Syntax Errors

### 14. Missing Colon

```makefile
# WRONG
build $(SOURCES)
	$(CC) -o app $^
# Error: *** missing separator.

# CORRECT
build: $(SOURCES)
	$(CC) -o app $^
```

### 15. Space After Backslash

```makefile
# WRONG (space after \)
SOURCES = main.c \[space]
          utils.c

# CORRECT (no space after \)
SOURCES = main.c \
          utils.c
```

## Security Errors

### 16. Hardcoded Credentials

```makefile
# WRONG
API_KEY = sk-1234567890

# CORRECT
deploy:
	@test -n "$$API_KEY" || { echo "ERROR: API_KEY not set" >&2; exit 1; }
	curl -H "Authorization: Bearer $$API_KEY" https://api.example.com/
```

### 17. Unsafe Variable Expansion in rm

```makefile
# WRONG — catastrophic if BUILD_DIR is empty or /
clean:
	rm -rf $(BUILD_DIR)/*

# CORRECT
BUILD_DIR := build    # set a safe default
clean:
	@test -n "$(BUILD_DIR)" || { echo "BUILD_DIR unset"; exit 1; }
	$(RM) -r $(BUILD_DIR)
```

### 18. Command Injection via User Input

```makefile
# WRONG
deploy:
	ssh user@$(SERVER) "cd /app && git pull origin $(BRANCH)"
# BRANCH="; rm -rf /" would run: git pull origin ; rm -rf /

# CORRECT: Validate first
ALLOWED_BRANCHES := main develop staging
BRANCH ?= main
deploy:
	@echo "$(ALLOWED_BRANCHES)" | grep -wq "$(BRANCH)" || \
		{ echo "Error: Invalid branch $(BRANCH)"; exit 1; }
	ssh user@$(SERVER) "cd /app && git pull origin '$(BRANCH)'"
```

## Performance Errors

### 19. Not Using Pattern Rules

```makefile
# WRONG: Duplicated rules
main.o: main.c
	$(CC) $(CFLAGS) -c main.c -o main.o
utils.o: utils.c
	$(CC) $(CFLAGS) -c utils.c -o utils.o

# CORRECT
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

### 20. Recursive Make

```makefile
# WRONG: Incorrect dependency tracking, slow, broken parallel builds
SUBDIRS := src lib tests
all:
	for dir in $(SUBDIRS); do $(MAKE) -C $$dir; done

# CORRECT: Non-recursive
SRC_SOURCES := $(wildcard src/*.c)
LIB_SOURCES := $(wildcard lib/*.c)
ALL_OBJECTS := $(SRC_SOURCES:.c=.o) $(LIB_SOURCES:.c=.o)
```

See "Recursive Make Considered Harmful" (Peter Miller).

### 21. Parallel Build Race Conditions

```makefile
# WRONG: Both run npm install simultaneously with make -j2
build-frontend:
	npm install
	npm run build

build-backend:
	npm install
	go build

# CORRECT: Share the prerequisite
node_modules: package.json
	npm install
	@touch node_modules

build-frontend: node_modules
	npm run build

build-backend: node_modules
	go build
```

## Quick Fix Checklist

- [ ] `.DELETE_ON_ERROR:` at top
- [ ] TAB characters (not spaces) for recipes
- [ ] All non-file targets declared `.PHONY`
- [ ] `.SUFFIXES:` declared
- [ ] Dependencies complete (use `-MMD -MP`)
- [ ] `:=` for shell calls and wildcards
- [ ] Shell variables escaped with `$$`
- [ ] Dangerous operations validated
- [ ] No hardcoded secrets
- [ ] Pattern rules instead of duplicate explicit rules
- [ ] No recursive Make
- [ ] Parallel build safety considered
