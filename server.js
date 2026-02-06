const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const url = require('url');

const PORT = 8080;
const TEMP_DIR = '/tmp/c_converter';

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function extractRepoName(gitUrl) {
    const lastSlash = gitUrl.lastIndexOf('/');
    if (lastSlash === -1) return null;
    
    const nameStart = lastSlash + 1;
    const dotGit = gitUrl.indexOf('.git', nameStart);
    
    if (dotGit !== -1) {
        return gitUrl.substring(nameStart, dotGit);
    }
    return gitUrl.substring(nameStart);
}

function isCFile(filename) {
    return path.extname(filename) === '.c';
}

function isHeaderFile(filename) {
    return path.extname(filename) === '.h';
}

function scanDirectory(dirPath, counts = { c: 0, headers: 0 }) {
    try {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && file !== '.' && file !== '..') {
                scanDirectory(fullPath, counts);
            } else if (stat.isFile()) {
                if (isCFile(file)) counts.c++;
                else if (isHeaderFile(file)) counts.headers++;
            }
        }
    } catch (err) {
        console.error('Error scanning directory:', err);
    }
    
    return counts;
}

function processCFile(filePath, headerFile) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        headerFile.write(`// === File: ${filePath} ===\n`);
        
        const lines = content.split('\n');
        for (const line of lines) {
            if (!line.trim().startsWith('#include')) {
                headerFile.write(line + '\n');
            }
        }
        headerFile.write('\n');
    } catch (err) {
        console.error(`Error processing file ${filePath}:`, err);
    }
}

function processDirectory(dirPath, headerFile) {
    try {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && file !== '.' && file !== '..') {
                processDirectory(fullPath, headerFile);
            } else if (stat.isFile() && isCFile(file)) {
                processCFile(fullPath, headerFile);
            }
        }
    } catch (err) {
        console.error('Error processing directory:', err);
    }
}

function createHeaderOnlyFile(repoDir, repoName) {
    const headerFilename = `${repoName}_combined.h`;
    const headerPath = path.join(TEMP_DIR, headerFilename);
    
    const headerFile = fs.createWriteStream(headerPath);
    
    headerFile.write(`#ifndef ${repoName.toUpperCase()}_COMBINED_H\n`);
    headerFile.write(`#define ${repoName.toUpperCase()}_COMBINED_H\n\n`);
    
    headerFile.write('// Auto-generated header-only file from C project\n');
    headerFile.write(`// Repository: ${repoName}\n\n`);
    
    headerFile.write('#include <stdio.h>\n');
    headerFile.write('#include <stdlib.h>\n');
    headerFile.write('#include <string.h>\n');
    headerFile.write('#include <stdint.h>\n\n');
    
    processDirectory(repoDir, headerFile);
    
    headerFile.write(`#endif // ${repoName.toUpperCase()}_COMBINED_H\n`);
    headerFile.end();
    
    return headerFilename;
}

async function convertGitRepository(gitUrl) {
    return new Promise((resolve) => {
        const repoName = extractRepoName(gitUrl);
        
        if (!repoName) {
            resolve({ success: false, error: 'Invalid repository URL' });
            return;
        }
        
        const repoDir = path.join(TEMP_DIR, repoName);
        
        if (fs.existsSync(repoDir)) {
            fs.rmSync(repoDir, { recursive: true, force: true });
        }
        
        exec(`git clone ${gitUrl} ${repoDir}`, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: 'Failed to clone repository' });
                return;
            }
            
            const counts = scanDirectory(repoDir);
            
            if (counts.c === 0) {
                fs.rmSync(repoDir, { recursive: true, force: true });
                resolve({ success: false, error: 'No C files found in repository' });
                return;
            }
            
            const headerFilename = createHeaderOnlyFile(repoDir, repoName);
            
            fs.rmSync(repoDir, { recursive: true, force: true });
            
            resolve({
                success: true,
                repository: repoName,
                c_files_count: counts.c,
                header_files_count: counts.headers,
                filename: headerFilename
            });
        });
    });
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.method === 'GET' && parsedUrl.pathname === '/') {
        try {
            const htmlContent = fs.readFileSync('index.html', 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlContent);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading page');
        }
    } else if (req.method === 'POST' && parsedUrl.pathname === '/convert') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const gitUrl = data.git_url;
                
                if (!gitUrl) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Missing git_url field' }));
                    return;
                }
                
                const result = await convertGitRepository(gitUrl);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
    } else if (req.method === 'GET' && parsedUrl.pathname.startsWith('/download/')) {
        const filename = parsedUrl.pathname.substring(10);
        const filePath = path.join(TEMP_DIR, filename);
        
        try {
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath);
                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Content-Disposition': `attachment; filename="${filename}"`
                });
                res.end(fileContent);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
            }
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error downloading file');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`Giga-Header Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});

process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    process.exit(0);
});