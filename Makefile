SELENIUM_JAR = selenium-server-standalone-2.45.0.jar
SELENIUM_URL = http://selenium-release.storage.googleapis.com/2.45/$(SELENIUM_JAR)

.PHONY: install selenium-server

install:
	@echo "    Downloading selenium-server..."
	@wget $(SELENIUM_URL) --quiet -O $(SELENIUM_JAR)
	@echo "    Done"

selenium-server:
	@java -jar $(SELENIUM_JAR)
