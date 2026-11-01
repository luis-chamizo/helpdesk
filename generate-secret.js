// generate-secret.js
const crypto = require('crypto');

// Genera una clave aleatoria de 64 bytes (128 caracteres hexadecimales)
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('Tu nueva JWT_SECRET:');
console.log(jwtSecret);
console.log('\n¡Copia esta clave y pégala en tu archivo .env!');