#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const srcDir = path.resolve(__dirname, '../client/src');
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// Helper to check if a file should be processed
const shouldProcessFile = (file) => {
  const ext = path.extname(file);
  return fileExtensions.includes(ext) && !file.includes('node_modules');
};

// Find all files recursively
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (shouldProcessFile(filePath)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Load all files
console.log('Finding all TypeScript and JavaScript files...');
const files = findFiles(srcDir);
console.log(`Found ${files.length} files to process`);

// Process each file
let modifiedFiles = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check if file has '@/' imports
  if (content.includes('@/')) {
    console.log(`Processing: ${path.relative(process.cwd(), file)}`);
    
    // Get relative path from current file to src directory
    const relativeToSrc = path.relative(path.dirname(file), srcDir).replace(/\\/g, '/');
    const relPath = relativeToSrc === '' ? './' : relativeToSrc + '/';
    
    // Replace imports
    let newContent = content.replace(
      /from\s+["']@\/([^"']+)["']/g, 
      (match, importPath) => `from "${relPath}${importPath}"`
    );
    
    // Replace other imports like import type { X } from "@/y"
    newContent = newContent.replace(
      /import\s+(?:type\s+)?{[^}]+}\s+from\s+["']@\/([^"']+)["']/g,
      (match, importPath) => match.replace(`@/${importPath}`, `${relPath}${importPath}`)
    );
    
    // Save back
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedFiles++;
  }
});

console.log(`Modified ${modifiedFiles} files`);
console.log('Running vite to check if imports work now...');

try {
  console.log('\nAttempting to run the project...');
  console.log('-------------------------------');
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.log('Project launched but there might still be issues to fix manually');
} 