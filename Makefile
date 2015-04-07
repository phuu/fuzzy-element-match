BIN = ./node_modules/.bin/
ENTRY = src/index
OUT = build/build.js

.PHONY: all install run watch serve

all:
	@$(BIN)/jspm bundle-sfx --skip-source-maps $(ENTRY) $(OUT)

install:
	@echo Dependencies...
	@(npm install)
	@$(BIN)jspm install

serve:
	@(python -m SimpleHTTPServer 9876)

watch:
	@$(BIN)nodemon -q -w $(dir $(ENTRY)) --exec make

run: install all serve
