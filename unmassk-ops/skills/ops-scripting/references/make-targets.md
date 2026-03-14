# Makefile Targets

## Syntax

```makefile
target: prerequisites
	recipe
```

- **target**: file to create or action to perform
- **prerequisites**: files/targets that must be up-to-date first
- **recipe**: shell commands (must be indented with TAB)

## .PHONY Targets

Phony targets don't represent files — they represent actions.

```makefile
.PHONY: all clean install uninstall test check help
.PHONY: build dist distclean format lint docs
```

Without `.PHONY`: if a file named `clean` exists, `make clean` won't run.
With `.PHONY`: make always runs the recipe and skips unnecessary filesystem checks.

## Standard GNU Targets

### all (default)

```makefile
.PHONY: all
all: $(TARGET)
```

- Must be the first target (becomes default)
- Should compile the entire program
- Must NOT install, clean, or run tests

### install

```makefile
.PHONY: install
install: all
	$(INSTALL) -d $(DESTDIR)$(BINDIR)
	$(INSTALL_PROGRAM) $(TARGET) $(DESTDIR)$(BINDIR)/
	$(INSTALL) -d $(DESTDIR)$(LIBDIR)
	$(INSTALL_DATA) lib$(PROJECT).a $(DESTDIR)$(LIBDIR)/
	$(INSTALL) -d $(DESTDIR)$(MAN1DIR)
	$(INSTALL_DATA) docs/$(PROJECT).1 $(DESTDIR)$(MAN1DIR)/
```

Requirements: depend on `all`, respect `DESTDIR` and `PREFIX`, create directories, set permissions, be idempotent.

### uninstall

```makefile
.PHONY: uninstall
uninstall:
	$(RM) $(DESTDIR)$(BINDIR)/$(TARGET)
	$(RM) $(DESTDIR)$(LIBDIR)/lib$(PROJECT).a
	$(RM) $(DESTDIR)$(INCLUDEDIR)/$(PROJECT).h
```

### clean

```makefile
.PHONY: clean
clean:
	$(RM) $(OBJECTS) $(TARGET)
	$(RM) -r $(BUILDDIR)
```

Remove built files, keep configuration. Must allow rebuilding without reconfiguring.

### distclean

```makefile
.PHONY: distclean
distclean: clean
	$(RM) config.h config.log config.status
	$(RM) Makefile
	$(RM) -r autom4te.cache/
```

Depends on `clean`. Removes configure-generated files. After distclean, only `./configure` should work.

### test / check

```makefile
.PHONY: test check
test: $(TARGET)
	./run_tests.sh

check: test
```

### dist / distcheck

```makefile
.PHONY: dist
dist:
	@mkdir -p dist
	tar -czf dist/$(PROJECT)-$(VERSION).tar.gz \
		--transform 's,^,$(PROJECT)-$(VERSION)/,' \
		--exclude='.git*' --exclude='*.o' .

.PHONY: distcheck
distcheck: dist
	@mkdir -p $(BUILDDIR)/distcheck
	tar -xzf dist/$(PROJECT)-$(VERSION).tar.gz -C $(BUILDDIR)/distcheck
	cd $(BUILDDIR)/distcheck/$(PROJECT)-$(VERSION) && ./configure && make && make check
	$(RM) -r $(BUILDDIR)/distcheck
```

### help (self-documenting)

```makefile
.PHONY: help
help:
	@sed -n 's/^## //p' $(MAKEFILE_LIST) | column -t -s ':' | sed 's/^/  /'

## Build the application
.PHONY: build
build: $(TARGET)

## Run all tests
.PHONY: test
test:
	./run_tests.sh
```

The `##` comments before targets are parsed by the help target.

## Dependencies

### Order-Only Prerequisites

```makefile
# Normal prerequisite: rebuild target if this changes
# Order-only (|): only check existence, not timestamp
$(OBJDIR)/%.o: %.c | $(OBJDIR)
	$(CC) -c $< -o $@

$(OBJDIR):
	mkdir -p $@
```

Use for directory creation — directory timestamp changes don't trigger rebuilds.

### Circular Dependencies

```makefile
# WRONG
a: b
b: a   # Error: Circular a <- b dependency dropped

# RIGHT
a: c
b: c
c:
	touch c
```

## Pattern Rules

```makefile
# Basic
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# With directories
$(OBJDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@

# Assembly
%.s: %.c
	$(CC) $(CFLAGS) -S $< -o $@
```

### Static Pattern Rules

More efficient than pattern rules for known file lists:

```makefile
OBJECTS := main.o utils.o helper.o

$(OBJECTS): %.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# Equivalent to explicit rules for each file
# Faster: make knows exact targets
```

## Target-Specific Variables

```makefile
debug: CFLAGS += -g -O0 -DDEBUG
debug: $(TARGET)

release: CFLAGS += -O3 -DNDEBUG
release: $(TARGET)

# Pattern-specific
test_%: CFLAGS += -DTESTING
test_%: LDLIBS += -lcheck
```

## Double-Colon Rules

```makefile
# Multiple recipes for the same target
install::
	$(INSTALL) $(TARGET) $(BINDIR)/

install::
	$(INSTALL) lib$(PROJECT).a $(LIBDIR)/
```

Each recipe runs independently. Use for modular install steps.

## Intermediate Files

```makefile
.INTERMEDIATE: $(OBJECTS)      # deleted after use
.SECONDARY: important.o        # kept after use
.PRECIOUS: %.o                 # never deleted
```

## Complete Example: Multi-Directory C Project

```makefile
.DELETE_ON_ERROR:

PROJECT := myapp
CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2
PREFIX ?= /usr/local

SRCDIR := src
BUILDDIR := build
OBJDIR := $(BUILDDIR)/obj

SOURCES := $(wildcard $(SRCDIR)/*.c)
OBJECTS := $(SOURCES:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
DEPENDS := $(OBJECTS:.o=.d)
TARGET := $(BUILDDIR)/$(PROJECT)

.PHONY: all clean install test help

## Build everything (default)
all: $(TARGET)

$(TARGET): $(OBJECTS)
	@mkdir -p $(@D)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(OBJDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(DEPENDS)

## Install to PREFIX
install: $(TARGET)
	install -d $(DESTDIR)$(PREFIX)/bin
	install -m 755 $(TARGET) $(DESTDIR)$(PREFIX)/bin/$(PROJECT)

## Run tests
test: $(TARGET)
	./run_tests.sh

## Remove build artifacts
clean:
	$(RM) -r $(BUILDDIR)

## Show available targets
help:
	@sed -n 's/^## //p' $(MAKEFILE_LIST)
```
