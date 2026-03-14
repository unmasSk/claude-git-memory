# Makefile Structure

## Recommended Layout Order

1. Modern preamble (SHELL, .ONESHELL, .SHELLFLAGS, .DELETE_ON_ERROR, MAKEFLAGS)
2. User-overridable variables (`?=`): CC, CFLAGS, PREFIX
3. Project variables (`:=`): SOURCES, OBJECTS, DEPENDS, TARGET
4. `.PHONY` declarations
5. Default target (`all`)
6. Build rules
7. Install rules
8. Clean rules
9. Test rules
10. Help target

## Modern Preamble

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
| `SHELL := bash` | Use bash instead of `/bin/sh` |
| `.ONESHELL:` | Entire recipe runs in single shell — `cd` persists |
| `.SHELLFLAGS := -eu -o pipefail -c` | Fail on errors, undefined vars, pipe failures |
| `.DELETE_ON_ERROR:` | Delete corrupt target if recipe fails |
| `--warn-undefined-variables` | Alert on undefined Make variable references |
| `--no-builtin-rules` | Disable ~90 built-in rules for faster builds |

**Without `.ONESHELL:`**, each recipe line runs in a separate shell, so `cd /dir` has no effect on the next line.

## Variable Organization

### User-Overridable (use `?=`)

```makefile
CC ?= gcc
CXX ?= g++
AR ?= ar
RANLIB ?= ranlib
INSTALL ?= install
RM ?= rm -f
CFLAGS ?= -Wall -Wextra -O2
LDFLAGS ?=
LDLIBS ?=
PREFIX ?= /usr/local
EXEC_PREFIX ?= $(PREFIX)
BINDIR ?= $(EXEC_PREFIX)/bin
LIBDIR ?= $(EXEC_PREFIX)/lib
INCLUDEDIR ?= $(PREFIX)/include
DESTDIR ?=
```

`?=` only sets if not already defined — allows `make CC=clang` or `export CC=clang` overrides.

### Project Variables (use `:=`)

```makefile
PROJECT := myapp
VERSION := 1.0.0
SRCDIR := src
BUILDDIR := build
OBJDIR := $(BUILDDIR)/obj

SOURCES := $(wildcard $(SRCDIR)/*.c)
OBJECTS := $(SOURCES:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
DEPENDS := $(OBJECTS:.o=.d)
TARGET := $(BUILDDIR)/$(PROJECT)
```

`:=` evaluates immediately (once), preventing repeated wildcard filesystem scans.

## Automatic Variables

| Variable | Meaning |
|----------|---------|
| `$@` | target filename |
| `$<` | first prerequisite |
| `$^` | all prerequisites (duplicates removed) |
| `$+` | all prerequisites (with duplicates) |
| `$?` | prerequisites newer than target |
| `$*` | stem of pattern match |
| `$(@D)` | directory part of `$@` |
| `$(@F)` | file part of `$@` |

## Dependency Generation

Automatic dependency tracking with compiler flags:

```makefile
$(OBJDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(DEPENDS)
```

- `-MMD`: generate dependency file (`.d`)
- `-MP`: add phony targets for headers — prevents errors if header is deleted
- `-include` (with `-`): ignore missing files on first build

## Multi-Directory Projects

### Non-Recursive (Preferred)

```makefile
SRC_SOURCES := $(wildcard src/*.c)
LIB_SOURCES := $(wildcard lib/*.c)
ALL_SOURCES := $(SRC_SOURCES) $(LIB_SOURCES)
OBJECTS := $(ALL_SOURCES:%.c=$(BUILDDIR)/%.o)

$(TARGET): $(OBJECTS)
	$(CC) $^ -o $@

$(BUILDDIR)/%.o: %.c
	@mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@
```

Advantages: single make invocation, accurate dependency tracking, correct parallel builds.

### Recursive (Avoid)

```makefile
SUBDIRS := src lib tests
all:
	for dir in $(SUBDIRS); do $(MAKE) -C $$dir; done
```

Problems: incorrect dependency tracking across directories, multiple invocations (slow), broken parallel builds. See "Recursive Make Considered Harmful" (Peter Miller).

## Recipe Formatting

```makefile
# @ suppresses echo; - ignores errors
clean:
	@echo "Cleaning..."
	-$(RM) *.o

# Multi-line with continuation (each line = separate shell, unless .ONESHELL:)
good:
	cd subdir && \
	$(MAKE) all

# With .ONESHELL: these work naturally
deploy:
	cd subdir
	$(MAKE) all
```

## Include Files

```makefile
include config.mk          # error if missing
-include optional.mk       # no error if missing
-include $(DEPENDS)        # include auto-generated deps
```

## VPATH

```makefile
vpath %.c src
vpath %.h include
# Make finds src/main.c automatically for main.o: main.c
```

## Complete Example

```makefile
.DELETE_ON_ERROR:
.SUFFIXES:

CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2
PREFIX ?= /usr/local

PROJECT := example
VERSION := 1.0.0
SRCDIR := src
BUILDDIR := build
OBJDIR := $(BUILDDIR)/obj

SOURCES := $(wildcard $(SRCDIR)/*.c)
OBJECTS := $(SOURCES:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
DEPENDS := $(OBJECTS:.o=.d)
TARGET := $(BUILDDIR)/$(PROJECT)

.PHONY: all clean install help

all: $(TARGET)

$(TARGET): $(OBJECTS)
	@mkdir -p $(@D)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(OBJDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(DEPENDS)

install: $(TARGET)
	install -d $(DESTDIR)$(BINDIR)
	install -m 755 $(TARGET) $(DESTDIR)$(BINDIR)/$(PROJECT)

clean:
	$(RM) -r $(BUILDDIR)

help:
	@echo "Targets: all install clean"
```
