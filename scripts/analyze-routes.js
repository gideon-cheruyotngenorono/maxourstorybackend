const fs = require('fs');
const path = require('path');

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const routes = scanDirectory('src/app/api');
let output = [];

for (const route of routes) {
  const content = fs.readFileSync(route, 'utf-8');
  
  // Try to find req.json() calls or validators
  const jsonCalls = content.match(/await req\.json\(\)[^]*?(NextResponse\.json\([^]*?\))/g);
  let resBodies = [];
  const resMatches = content.matchAll(/NextResponse\.json\((.*?)\)/gs);
  
  for (const match of resMatches) {
    resBodies.push(match[1].replace(/\s+/g, ' ').slice(0, 150));
  }
  
  // Find parsed object destructions
  let reqDestructure = '';
  const parsedMatch = content.match(/const\s+\{([^}]+)\}\s*=\s*(?:parsed\.data|await req\.json\(\)|body)/);
  if (parsedMatch) {
      reqDestructure = parsedMatch[1].replace(/\s+/g, ' ').trim();
  }

  output.push(`---
ROUTE: ${route}
REQ VARS: ${reqDestructure}
RES BODIES:
${resBodies.map(r => ' - ' + r).join('\n')}
`);
}

fs.writeFileSync('routes-analysis.txt', output.join('\n'));
console.log('Analysis complete, wrote to routes-analysis.txt');
