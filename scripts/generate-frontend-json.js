const fs = require('fs');

const data = fs.readFileSync('routes-analysis.txt', 'utf-8');
const blocks = data.split('---').filter(b => b.trim().length > 0);

let md = `# Frontend API JSON Reference\n\n`;
md += `This exhaustive table/reference explains the exact JSON body structures expected to be sent, and precisely what JSON structure will be returned on a Status \`200/201\` success based on the backend handler files.\n\n`;
md += `> **Remember:** All protected endpoints require the \`x-user-id\` header. **Endpoints under \`ml-*\` auto-resolve \`coupleId\` from this header.**\n\n`;

for (let block of blocks) {
    const lines = block.trim().split('\n');
    let routeLine = lines.find(l => l.startsWith('ROUTE: '));
    if (!routeLine) continue;
    
    let route = routeLine.replace('ROUTE: ', '').replace(/\\/g, '/').replace('src/app/api', '/api').replace('/route.ts', '');
    if (route.endsWith('/')) route = route.slice(0, -1);
    
    let reqLine = lines.find(l => l.startsWith('REQ VARS: '));
    let reqVarsStr = reqLine ? reqLine.replace('REQ VARS: ', '').trim() : '';
    let reqVars = reqVarsStr ? reqVarsStr.split(',').map(s => s.trim()) : [];
    
    // Attempt to figure out method
    let methods = [];
    if (reqVars.length > 0 || route.includes('delete') || route.includes('update') || route.includes('create') || route.includes('resend')) methods.push('POST/PATCH');
    else methods.push('GET/DELETE');
    
    // Find expected success response line
    let resLines = lines.filter(l => l.startsWith(' - '));
    let successLine = resLines.find(l => l.includes('{ status: 200 }') || l.includes('{ status: 201 }'));
    // If no explicit 200/201, see if it returns a non error object
    if (!successLine) {
        successLine = resLines.find(l => !l.includes('error:') && !l.includes("status: 4") && !l.includes("status: 5"));
    }
    
    let successFormat = "{}";
    if (successLine) {
       let matched = successLine.match(/ - ({.*})/);
       if (matched) successFormat = matched[1];
       else successFormat = successLine.replace(' - ', '').split(', { status')[0].trim();
    }
    
    md += `### \`${methods.join('/')}\` \`${route}\`\n\n`;
    
    if (reqVars.length > 0) {
        md += `**Request JSON expected:**\n\`\`\`json\n{\n`;
        reqVars.forEach(v => {
            let key = v.split('=')[0].trim();
            let type = "string";
            if (key.startsWith('is')) type = "boolean";
            if (key.includes('Id')) type = "string (UUID)";
            if (key.includes('Date') || key.includes('At')) type = "string (ISO Date)";
            if (key.includes('Count') || key.includes('limit')) type = "number";
            md += `  "${key}": "${type}",\n`;
        });
        md += `}\n\`\`\`\n\n`;
    } else {
        if (!route.includes('[id]')) {
           md += `**Request Body:** None required.\n\n`;
        } else {
           md += `**Request Body:** None. Path parameter provides ID.\n\n`;
        }
    }
    
    md += `**Success Response (2xx):**\n\`\`\`javascript\n${successFormat}\n\`\`\`\n\n`;
    md += `---\n\n`;
}

fs.writeFileSync('FRONTEND_API_DOCS.md', md, 'utf-8');
console.log('Done mapping exactly JSON expectations to FRONTEND_API_DOCS.md');
