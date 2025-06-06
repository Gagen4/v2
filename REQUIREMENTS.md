# Deployment Requirements

## Server Requirements

### System Requirements
- Linux-based OS (Ubuntu/Debian recommended)
- Minimum 1GB RAM
- 10GB available disk space
- Root access to the server
- Open ports: 80 (HTTP), 443 (HTTPS), 22 (SSH)

### Software Requirements

#### Node.js Environment
- Node.js 18.x or higher
- npm (comes with Node.js)
- PM2 (global installation)

#### Database
- Microsoft SQL Server connection
- SQL Server credentials and connection string

### Node.js Dependencies
```json
{
  "bcryptjs": "^2.4.3",
  "cookie-parser": "^1.4.7",
  "cors": "^2.8.5",
  "express": "^4.21.2",
  "express-session": "^1.18.1",
  "jsonwebtoken": "^9.0.2",
  "mssql": "^10.0.4"
}
```

## Front-end Requirements

### Libraries and Frameworks
- Leaflet.js (for map functionality)
- Modern web browser support
- JavaScript ES6+ support

### Client-side Assets
- Map marker icons
- CSS styles
- JavaScript modules
  - mapInit.js
  - drawing.js
  - tools.js

## Security Requirements
- SSL/TLS certificate (recommended for production)
- Firewall configuration (UFW)
- Secure environment variables for:
  - JWT secret
  - Database credentials
  - Session secret

## Deployment Structure
```
/var/www/map-app/
├── front/
│   ├── css/
│   ├── js/
│   ├── leaflet/
│   └── index.html
├── MapServer/
├── server.js
├── package.json
└── package-lock.json
```

## Environment Variables
The following environment variables should be set:
- `DB_HOST` - SQL Server host
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret for JWT token generation
- `SESSION_SECRET` - Secret for session management

## Post-Deployment Requirements
- PM2 process manager running
- Firewall properly configured
- Database migrations completed
- File permissions properly set
- Regular backup system in place 