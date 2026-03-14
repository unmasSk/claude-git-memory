# Makefile Optimization

## Parallel Builds

```bash
make -j4              # 4 parallel jobs
make -j$(nproc)       # all CPU cores
make -j               # unlimited (careful with resource limits)
```

### Parallel-Safe Rules

```makefile
# WRONG: Multiple rules write to same file — race condition with -j
target1:
	echo "data1" >> shared.log
target2:
	echo "data2" >> shared.log

# CORRECT: Separate outputs or serialize with dependencies
target2: target1
```

### Controlling Parallelism

```makefile
.NOTPARALLEL:              # disable all parallelism in this Makefile

# Make 4.4+: serialize only specific target's prerequisites
.NOTPARALLEL: deploy

deploy: deploy-database deploy-backend deploy-frontend
# Each step runs sequentially, but other targets unaffected
```

### .WAIT (Make 4.4+)

`.WAIT` orders prerequisites without creating false dependencies:

```makefile
# lint and fmt run in parallel, then test.unit and test.integration in parallel,
# then build — using .WAIT for explicit phase ordering
ci: lint fmt .WAIT test.unit test.integration .WAIT build

# Database migrations before tests
test: migrate .WAIT run-tests
```

- `.WAIT` only affects parallel builds (`make -j`)
- Available in GNU Make 4.4+ (check: `make --version`)
- Use for ordering without dependency — if actual dependency exists, use `:` instead

### Comparison

| Mechanism | Use Case | Make Version |
|-----------|----------|--------------|
| `b: a` | Actual dependency | All |
| `.WAIT` | Ordering without dependency | 4.4+ |
| `.NOTPARALLEL:` | Disable all parallel | All |
| `.NOTPARALLEL: target` | Serialize target's prereqs | 4.4+ |

## Dependency Tracking

### Automatic (C/C++)

```makefile
%.o: %.c
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(OBJECTS:.o=.d)
```

`-MMD` generates `.d` file. `-MP` adds phony targets for headers — prevents build errors when a header is deleted. `-include` (with dash) ignores missing `.d` files on first build.

### Avoiding Unnecessary Rebuilds

```makefile
# WRONG: Always updates timestamp even if content unchanged
config.h: config.h.in
	sed 's/@VERSION@/$(VERSION)/g' $< > $@

# CORRECT: Only update if content changed
config.h: config.h.in
	sed 's/@VERSION@/$(VERSION)/g' $< > $@.tmp
	cmp -s $@.tmp $@ || mv $@.tmp $@
	rm -f $@.tmp
```

## Performance Techniques

### 1. Use := Not = for Computed Values

```makefile
# SLOW: Re-evaluated every use
SOURCES = $(wildcard src/*.c)
OBJECTS = $(SOURCES:.c=.o)

# FAST: Evaluated once
SOURCES := $(wildcard src/*.c)
OBJECTS := $(SOURCES:.c=.o)
```

### 2. Minimize Shell Invocations

```makefile
# SLOW: Two shell calls, one redundant
FILES = $(shell ls *.c)
COUNT = $(shell ls *.c | wc -l)

# FAST: Use Make functions
FILES := $(wildcard *.c)
COUNT := $(words $(FILES))
```

### 3. Static Pattern Rules

```makefile
OBJECTS := main.o utils.o helper.o

# FASTER: make knows exact file list
$(OBJECTS): %.o: %.c
	$(CC) -c $< -o $@

# SLOWER: make searches for pattern matches
%.o: %.c
	$(CC) -c $< -o $@
```

### 4. Non-Recursive Make

```makefile
# SLOW: Multiple invocations, broken parallel, incorrect dependencies
SUBDIRS := lib1 lib2 app
all:
	for dir in $(SUBDIRS); do $(MAKE) -C $$dir; done

# FAST: Single invocation, accurate deps, parallel-safe
LIB1_SRC := $(wildcard lib1/*.c)
LIB2_SRC := $(wildcard lib2/*.c)
APP_SRC := $(wildcard app/*.c)
ALL_OBJECTS := $(LIB1_SRC:.c=.o) $(LIB2_SRC:.c=.o) $(APP_SRC:.c=.o)
```

See "Recursive Make Considered Harmful" (Peter Miller).

### 5. Intermediate File Management

```makefile
.INTERMEDIATE: $(OBJECTS)   # deleted after use (keeps build dir clean)
.SECONDARY: important.o     # kept after use
.PRECIOUS: %.o %.d          # never deleted (useful for incremental builds)
```

### 6. Compiler Cache

```makefile
ifneq ($(shell command -v ccache 2>/dev/null),)
    CC := ccache $(CC)
    CXX := ccache $(CXX)
endif
```

ccache speeds up clean rebuilds significantly (warm cache: 5-10x speedup).

## Advanced Optimization

### Precompiled Headers

```makefile
$(OBJDIR)/common.h.gch: $(SRCDIR)/common.h
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -x c-header $< -o $@

$(OBJDIR)/%.o: $(SRCDIR)/%.c $(OBJDIR)/common.h.gch
	$(CC) $(CPPFLAGS) $(CFLAGS) -include $(OBJDIR)/common.h -c $< -o $@
```

### Link-Time Optimization

```makefile
release: CFLAGS += -flto -O3
release: LDFLAGS += -flto -O3
release: $(TARGET)
```

### Conditional Rebuild on Content Change

```makefile
# Don't rebuild if only timestamp changed — check content
build/version.h: VERSION
	@new=$$(cat VERSION); \
	old=$$(grep -o '"[^"]*"' $@ 2>/dev/null | tr -d '"'); \
	if [ "$$new" != "$$old" ]; then \
		echo "#define VERSION \"$$new\"" > $@; \
	fi
```

## Profiling

```bash
# Dry run shows what would rebuild
make -n

# Debug output — shows rule matching
make -d 2>&1 | grep -E "Considering|Must remake"

# Time full build
time make -j$(nproc)

# Time clean then full build (measures cold performance)
make distclean && time make -j$(nproc)
```

## Complete Optimized Example

```makefile
.DELETE_ON_ERROR:
.SUFFIXES:

SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
MAKEFLAGS += --warn-undefined-variables --no-builtin-rules

PROJECT := optimized
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

# Use ccache if available
ifneq ($(shell command -v ccache 2>/dev/null),)
    CC := ccache $(CC)
endif

.PHONY: all clean distclean

all: $(TARGET)

$(TARGET): $(OBJECTS)
	@mkdir -p $(@D)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(OBJDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(DEPENDS)

# Minimal clean — keeps .o for faster incremental rebuild
clean:
	$(RM) $(TARGET)

# Full clean
distclean:
	$(RM) -r $(BUILDDIR)
```
