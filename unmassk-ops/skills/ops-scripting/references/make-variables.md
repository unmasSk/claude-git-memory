# Makefile Variables

## Assignment Operators

| Operator | Behavior |
|----------|----------|
| `=` | Recursive — right-hand side evaluated every time variable is used |
| `:=` | Simple — evaluated once at definition time |
| `?=` | Conditional — assigns only if variable is undefined or empty |
| `+=` | Append — adds to existing value, preserves expansion type |

```makefile
# = re-evaluates every use (can cause infinite recursion, slow for shell calls)
BUILD_TIME = $(shell date)   # Different value each use!

# := evaluates once (use for wildcards, shell calls, computed values)
BUILD_TIME := $(shell date)  # Fixed at definition time

# ?= respects environment and command-line overrides
CC ?= gcc                    # make CC=clang works

# += adds to existing
CFLAGS ?= -Wall
CFLAGS += -I./include        # Result: -Wall -I./include
```

## Standard GNU Variables

### Compiler and Tools (use `?=`)

```makefile
CC ?= gcc
CXX ?= g++
AR ?= ar
RANLIB ?= ranlib
INSTALL ?= install
INSTALL_DATA ?= $(INSTALL) -m 644
INSTALL_PROGRAM ?= $(INSTALL) -m 755
RM ?= rm -f
YACC ?= bison -y
LEX ?= flex
PKG_CONFIG ?= pkg-config
```

### Compiler Flags (use `?=`)

```makefile
CPPFLAGS ?=                    # preprocessor flags (includes, defines)
CFLAGS ?= -Wall -Wextra -O2
CXXFLAGS ?= -Wall -Wextra -O2
LDFLAGS ?=                     # linker flags (library paths)
LDLIBS ?=                      # libraries to link (-lname)
```

Preserve user flags, then add project-specific:

```makefile
CFLAGS ?= -Wall -Wextra -O2
CFLAGS += -I./include -DPROJECT_VERSION=\"$(VERSION)\"

# Use pkg-config for external libraries
CFLAGS += $(shell $(PKG_CONFIG) --cflags openssl)
LDLIBS += $(shell $(PKG_CONFIG) --libs openssl)
```

### Installation Directories (use `?=`)

```makefile
PREFIX ?= /usr/local
EXEC_PREFIX ?= $(PREFIX)
BINDIR ?= $(EXEC_PREFIX)/bin
LIBDIR ?= $(EXEC_PREFIX)/lib
INCLUDEDIR ?= $(PREFIX)/include
DATAROOTDIR ?= $(PREFIX)/share
DATADIR ?= $(DATAROOTDIR)
SYSCONFDIR ?= $(PREFIX)/etc
LOCALSTATEDIR ?= $(PREFIX)/var
MANDIR ?= $(DATAROOTDIR)/man
MAN1DIR ?= $(MANDIR)/man1
DOCDIR ?= $(DATAROOTDIR)/doc/$(PROJECT)
DESTDIR ?=                     # staged installation prefix
```

Usage:

```makefile
install: $(TARGET)
	$(INSTALL) -d $(DESTDIR)$(BINDIR)
	$(INSTALL_PROGRAM) $(TARGET) $(DESTDIR)$(BINDIR)/
	$(INSTALL) -d $(DESTDIR)$(MAN1DIR)
	$(INSTALL_DATA) docs/$(PROJECT).1 $(DESTDIR)$(MAN1DIR)/
```

## Automatic Variables

| Variable | Meaning | D/F variant |
|----------|---------|-------------|
| `$@` | target filename | `$(@D)` dir, `$(@F)` file |
| `$<` | first prerequisite | `$(<D)`, `$(<F)` |
| `$^` | all prerequisites (no duplicates) | `$(^D)`, `$(^F)` |
| `$+` | all prerequisites (with duplicates) | — |
| `$?` | prerequisites newer than target | — |
| `$*` | stem of pattern match | `$(*D)`, `$(*F)` |

```makefile
hello: hello.o utils.o
	$(CC) $(LDFLAGS) $^ -o $@
	# expands: gcc -o hello hello.o utils.o

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
	# for hello.c: gcc -Wall -c hello.c -o hello.o

build/%.o: src/%.c
	@mkdir -p $(@D)             # $(@D) = "build"
	$(CC) $(CFLAGS) -c $< -o $@
```

## Variable Substitution and Functions

### Pattern Substitution

```makefile
# $(var:pattern=replacement)
SOURCES := src/main.c src/utils.c
OBJECTS := $(SOURCES:.c=.o)
# OBJECTS = src/main.o src/utils.o

OBJECTS := $(SOURCES:src/%.c=build/%.o)
# OBJECTS = build/main.o build/utils.o
```

### Text Functions

```makefile
$(wildcard src/*.c)                         # files matching pattern
$(patsubst %.c,%.o,$(SOURCES))              # pattern substitution
$(filter %.c,$(SOURCES))                    # keep matching
$(filter-out %_test.c,$(SOURCES))           # remove matching
$(sort $(SOURCES))                          # sort, removes duplicates
$(dir src/main.c lib/utils.c)              # → "src/ lib/"
$(notdir src/main.c lib/utils.c)           # → "main.c utils.c"
$(basename src/main.c)                      # → "src/main"
$(suffix src/main.c)                        # → ".c"
$(addprefix $(SRCDIR)/,$(FILES))
$(addsuffix .o,$(NAMES))
$(words $(SOURCES))                         # count words
$(word 2,$(SOURCES))                        # second word
$(subst old,new,text)                       # string replace
$(strip $(VAR))                             # remove leading/trailing whitespace
```

### Shell Function

```makefile
# Use := to evaluate once
GIT_VERSION := $(shell git describe --tags --always 2>/dev/null)
DATE := $(shell date +%Y-%m-%d)
CPU_COUNT := $(shell nproc 2>/dev/null || echo 1)
VERSION := $(shell cat VERSION.txt)
```

### Conditional Functions

```makefile
CFLAGS := $(if $(DEBUG),-g -O0,-O2)         # if/then/else
CC := $(or $(CC),gcc)                        # first non-empty
```

## Environment Variables

```makefile
CC = gcc      # overrides CC from environment
CC ?= gcc     # respects environment CC if set

export CC     # export to recipe shells
unexport INTERNAL_VAR

# Runtime check
ifndef CC
CC := gcc
endif
```

## Target-Specific Variables

```makefile
debug: CFLAGS += -g -O0 -DDEBUG
debug: $(TARGET)

release: CFLAGS += -O3 -DNDEBUG
release: $(TARGET)

tests/%: CFLAGS += -DTESTING
tests/%: LDLIBS += -lcheck
```

## Complete Example

```makefile
# ---- User-Overridable ----
CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2
LDFLAGS ?=
LDLIBS ?=
PREFIX ?= /usr/local
DESTDIR ?=

# ---- pkg-config ----
PKG_CONFIG ?= pkg-config
CFLAGS += $(shell $(PKG_CONFIG) --cflags openssl)
LDLIBS += $(shell $(PKG_CONFIG) --libs openssl)

# ---- Project (use :=) ----
PROJECT := myapp
VERSION := 1.0.0
SRCDIR := src
BUILDDIR := build

SOURCES := $(wildcard $(SRCDIR)/*.c)
OBJECTS := $(SOURCES:$(SRCDIR)/%.c=$(BUILDDIR)/%.o)
DEPENDS := $(OBJECTS:.o=.d)
TARGET := $(BUILDDIR)/$(PROJECT)

GIT_VERSION := $(shell git describe --tags --always 2>/dev/null || echo "unknown")
CFLAGS += -DVERSION=\"$(GIT_VERSION)\"

# ---- Build ----
.DELETE_ON_ERROR:

all: $(TARGET)

$(TARGET): $(OBJECTS)
	@mkdir -p $(@D)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(BUILDDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(DEPENDS)

debug: CFLAGS += -g -O0 -DDEBUG
debug: $(TARGET)

release: CFLAGS += -O3 -DNDEBUG -s
release: $(TARGET)
```
