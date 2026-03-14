# Makefile Patterns

## Pattern Rules

Pattern rules use `%` to match filenames.

```makefile
# Compile .c to .o
%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

# Generate assembly
%.s: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -S $< -o $@

# Preprocess
%.i: %.c
	$(CC) $(CPPFLAGS) -E $< -o $@
```

### With Directories

```makefile
build/obj/%.o: src/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

# Multiple source directories — one rule per source dir
build/obj/%.o: lib/%.c
	@mkdir -p $(@D)
	$(CC) -c $< -o $@
```

### Pattern Rule Variables

```makefile
# $* is the stem (matched part)
%.pdf: %.tex
	pdflatex $*        # for report.tex: pdflatex report

%.html: %.md
	pandoc $< -o $@

%.pdf: %.md
	pandoc $< -o $@
```

## Static Pattern Rules

More efficient and explicit than pattern rules for known file lists.

```makefile
# Syntax: $(targets): target-pattern: prereq-pattern
OBJECTS := main.o utils.o helper.o

$(OBJECTS): %.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# With directories
SOURCES := $(wildcard src/*.c)
OBJECTS := $(SOURCES:src/%.c=build/obj/%.o)

$(OBJECTS): build/obj/%.o: src/%.c
	@mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@

# Multiple dependencies
$(OBJECTS): %.o: %.c config.h
	$(CC) $(CFLAGS) -c $< -o $@
```

Advantages over pattern rules: make knows exact targets, faster rule resolution, easier to debug.

## Implicit Rules

GNU Make has built-in implicit rules. Disable them for explicit Makefiles:

```makefile
.SUFFIXES:           # disable all built-in suffix rules
```

Define your own:

```makefile
%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

%.o: %.cpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -MMD -MP -c $< -o $@

%.o: %.s
	$(AS) $(ASFLAGS) -c $< -o $@
```

## Dependency Generation

### Automatic (Preferred)

```makefile
SOURCES := $(wildcard src/*.c)
OBJECTS := $(SOURCES:src/%.c=build/obj/%.o)
DEPENDS := $(OBJECTS:.o=.d)

build/obj/%.o: src/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(DEPENDS)
```

Flags: `-MMD` generates `.d` file, `-MP` adds phony targets for headers (prevents errors if a header is deleted), `-include` (with dash) ignores missing files on first build.

## Common Project Patterns

### Single-Directory C

```makefile
.DELETE_ON_ERROR:
.SUFFIXES:

CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2

TARGET := myapp
SOURCES := $(wildcard *.c)
OBJECTS := $(SOURCES:.c=.o)
DEPENDS := $(OBJECTS:.o=.d)

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@

%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(DEPENDS)

clean:
	$(RM) $(TARGET) $(OBJECTS) $(DEPENDS)
```

### Multi-Directory C

```makefile
.DELETE_ON_ERROR:
.SUFFIXES:

PROJECT := myapp
CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2 -Iinclude

SRCDIR := src
BUILDDIR := build
OBJDIR := $(BUILDDIR)/obj

SOURCES := $(wildcard $(SRCDIR)/*.c)
OBJECTS := $(SOURCES:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
DEPENDS := $(OBJECTS:.o=.d)
TARGET := $(BUILDDIR)/$(PROJECT)

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJECTS)
	@mkdir -p $(@D)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(OBJDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

-include $(DEPENDS)

clean:
	$(RM) -r $(BUILDDIR)
```

### Mixed C/C++

```makefile
CC ?= gcc
CXX ?= g++
CFLAGS ?= -Wall -O2
CXXFLAGS ?= -Wall -O2 -std=c++17

C_SOURCES := $(wildcard $(SRCDIR)/*.c)
CXX_SOURCES := $(wildcard $(SRCDIR)/*.cpp)
C_OBJECTS := $(C_SOURCES:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
CXX_OBJECTS := $(CXX_SOURCES:$(SRCDIR)/%.cpp=$(OBJDIR)/%.o)
ALL_OBJECTS := $(C_OBJECTS) $(CXX_OBJECTS)
DEPENDS := $(ALL_OBJECTS:.o=.d)

# Link with C++ compiler (for C++ standard library)
$(TARGET): $(ALL_OBJECTS)
	@mkdir -p $(@D)
	$(CXX) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(OBJDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

$(OBJDIR)/%.o: $(SRCDIR)/%.cpp
	@mkdir -p $(@D)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -MMD -MP -c $< -o $@
```

### Go Project

```makefile
PROJECT := myapp
GO ?= go
PREFIX ?= /usr/local

VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LD_FLAGS := -ldflags "-X main.version=$(VERSION)"
SOURCES := $(shell find . -name '*.go' -not -path './vendor/*')
GO_SUM := $(wildcard go.sum)

.PHONY: all build install test clean fmt lint mod-tidy

all: build

$(PROJECT): $(SOURCES) go.mod $(GO_SUM)
	$(GO) build $(GOFLAGS) $(LD_FLAGS) -o $@ ./cmd/$(PROJECT)

build: $(PROJECT)

install: $(PROJECT)
	install -d $(DESTDIR)$(PREFIX)/bin
	install -m 755 $(PROJECT) $(DESTDIR)$(PREFIX)/bin/

test:
	$(GO) test -v ./...

fmt:
	$(GO) fmt ./...

lint:
	golangci-lint run

mod-tidy:
	$(GO) mod tidy

clean:
	$(RM) $(PROJECT)
	$(GO) clean
```

### Python Project

```makefile
PYTHON ?= python3
PIP ?= $(PYTHON) -m pip

.PHONY: all build install develop test lint format clean

all: build

build:
	$(PYTHON) -m build

install:
	$(PIP) install .

develop:
	$(PIP) install -e .[dev]

test:
	$(PYTHON) -m pytest tests/ -v

lint:
	$(PYTHON) -m flake8 src/ tests/

format:
	$(PYTHON) -m black src/ tests/

clean:
	$(RM) -r build/ dist/ *.egg-info/
	$(RM) -r .pytest_cache/ .coverage htmlcov/
	find . -type d -name '__pycache__' -exec rm -r {} +
	find . -type f -name '*.pyc' -delete
```

### Multi-Binary C Project

```makefile
PROGRAMS := tool1 tool2 tool3
TARGETS := $(addprefix $(BUILDDIR)/,$(PROGRAMS))

LIBSRC := $(wildcard $(SRCDIR)/common/*.c)
LIBOBJ := $(LIBSRC:$(SRCDIR)/%.c=$(OBJDIR)/%.o)

.PHONY: all clean $(PROGRAMS)

all: $(TARGETS)

$(BUILDDIR)/tool1: $(OBJDIR)/tool1.o $(LIBOBJ)
$(BUILDDIR)/tool2: $(OBJDIR)/tool2.o $(LIBOBJ)
$(BUILDDIR)/tool3: $(OBJDIR)/tool3.o $(LIBOBJ)

$(TARGETS):
	@mkdir -p $(@D)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@
```

### Docker Integration

```makefile
REGISTRY := docker.io
IMAGE := $(REGISTRY)/$(PROJECT):$(VERSION)
IMAGE_LATEST := $(REGISTRY)/$(PROJECT):latest

.PHONY: docker/build docker/push docker/run docker/clean

docker/build:
	docker build -t $(IMAGE) -t $(IMAGE_LATEST) .

docker/push: docker/build
	docker push $(IMAGE)
	docker push $(IMAGE_LATEST)

docker/run: docker/build
	docker run --rm -it $(IMAGE)

docker/clean:
	docker rmi $(IMAGE) $(IMAGE_LATEST) 2>/dev/null || true
```

## Advanced Patterns

### Recursive Directory Processing

```makefile
SOURCES := $(shell find src -name '*.c')
OBJECTS := $(SOURCES:src/%.c=build/obj/%.o)
OBJDIRS := $(sort $(dir $(OBJECTS)))

$(OBJDIRS):
	@mkdir -p $@

$(OBJECTS): | $(OBJDIRS)

build/obj/%.o: src/%.c
	$(CC) $(CFLAGS) -c $< -o $@
```

### Multiple Build Configurations

```makefile
.PHONY: all debug release profile

all: release

debug: CFLAGS += -g -O0 -DDEBUG
debug: TARGET := build/debug/$(PROJECT)
debug: $(TARGET)

release: CFLAGS += -O3 -DNDEBUG
release: TARGET := build/release/$(PROJECT)
release: $(TARGET)

profile: CFLAGS += -pg -O2
profile: TARGET := build/profile/$(PROJECT)
profile: $(TARGET)

$(TARGET): $(OBJECTS)
	@mkdir -p $(@D)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@
```

### Conditional ccache

```makefile
ifneq ($(shell command -v ccache 2>/dev/null),)
    CC := ccache $(CC)
    CXX := ccache $(CXX)
endif
```
