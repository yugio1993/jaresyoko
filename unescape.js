const fs = require('fs');
const content = fs.readFileSync('reverted_script.txt', 'utf8').trim();
// JSON strings start and end with quotes
try {
    const unescaped = JSON.parse(content);
    fs.writeFileSync('script.js', unescaped, 'utf8');
    console.log('Successfully reverted script.js');
} catch (e) {
    // If it doesn't have quotes, maybe it's just raw?
    console.error('Error parsing JSON:', e);
}
