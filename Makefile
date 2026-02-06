CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2
LIBS = -lmicrohttpd -lcurl -ljson-c
TARGET = server
SOURCE = server.c

# Default target
all: $(TARGET)

# Build the server
$(TARGET): $(SOURCE)
	$(CC) $(CFLAGS) -o $(TARGET) $(SOURCE) $(LIBS)

# Clean build artifacts
clean:
	rm -f $(TARGET)

# Install dependencies (Ubuntu/Debian)
install-deps:
	sudo apt-get update
	sudo apt-get install -y libmicrohttpd-dev libcurl4-openssl-dev libjson-c-dev git

# Run the server
run: $(TARGET)
	./$(TARGET)

# Check if required libraries are available
check-libs:
	@echo "Checking for required libraries..."
	@pkg-config --exists libmicrohttpd || (echo "libmicrohttpd not found. Run 'make install-deps'" && exit 1)
	@pkg-config --exists libcurl || (echo "libcurl not found. Run 'make install-deps'" && exit 1)
	@pkg-config --exists json-c || (echo "json-c not found. Run 'make install-deps'" && exit 1)
	@echo "All required libraries are available!"

.PHONY: all clean install-deps run check-libs