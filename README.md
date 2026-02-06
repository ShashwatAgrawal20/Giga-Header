# Giga-Header

A neobrutalist web application that converts C projects into header-only files.

## Features

- **Neobrutalist Design**: Bold, high-contrast visual style with thick borders and vibrant colors
- **C Backend**: Lightweight HTTP server written in C using libmicrohttpd
- **Git Integration**: Clones repositories and detects C projects
- **Header-Only Conversion**: Merges all C source files into a single header file
- **Real-time Processing**: Shows conversion status and provides download links

## Requirements

- GCC compiler
- libmicrohttpd-dev
- libcurl4-openssl-dev  
- libjson-c-dev
- git

## Installation

### Ubuntu/Debian
```bash
make install-deps
```

### Other Systems
Install the required libraries manually:
- libmicrohttpd
- libcurl
- json-c
- git

## Building and Running

```bash
make
make run
```

The server will start on port 8080. Open http://localhost:8080 in your browser.

## Usage

1. Enter a Git repository URL (must be a C project)
2. Click "Convert Project"
3. Wait for the conversion to complete
4. Download the generated header-only file

## Architecture

- **Frontend**: Single HTML page with neobrutalist CSS styling
- **Backend**: C HTTP server using libmicrohttpd
- **Processing**: File system operations and string manipulation
- **API**: RESTful endpoint `/convert` with JSON responses

## Clean Up

```bash
make clean
```

## License

MIT License