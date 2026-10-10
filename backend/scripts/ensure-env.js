// Cross-platform: creates .env from .env.example if it doesn't exist (works on Windows, macOS, Linux).
const fs = require('fs');

if (fs.existsSync('.env')) {
  console.log('.env already exists, leaving it untouched');
} else {
  fs.copyFileSync('.env.example', '.env');
  console.log('Created .env from .env.example');
}