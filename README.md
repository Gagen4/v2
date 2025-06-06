# Map Application Deployment Guide

This guide provides instructions for deploying the Map Application using Docker and Docker Compose.

## Prerequisites

- Docker
- Docker Compose
- Domain name (for production deployment)
- SSL certificate (for HTTPS)

## Environment Setup

1. Create a `.env` file in the root directory based on `.env.example`:
```bash
cp .env.example .env
```

2. Update the environment variables in `.env` with your values:
- Database credentials
- JWT secret
- Session secret
- Other configuration values

## Deployment Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd map-application
```

2. Build and start the containers:
```bash
docker-compose up -d --build
```

3. Check the logs to ensure everything is running:
```bash
docker-compose logs -f
```

## SSL Certificate Setup

1. Update the `nginx.conf` file with your domain name.

2. For SSL with Let's Encrypt:
```bash
# Install certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Generate certificate
certbot --nginx -d your-domain.com
```

## Database Setup

1. Ensure your SQL Server instance is accessible from the container network.
2. Update the database connection string in the environment variables.
3. The application will automatically create necessary tables on first run.

## Maintenance

- Monitor logs:
```bash
docker-compose logs -f
```

- Restart services:
```bash
docker-compose restart
```

- Update application:
```bash
git pull
docker-compose up -d --build
```

## Backup

1. Database backup:
```bash
# Replace with your backup script
docker exec -t your-db-container pg_dump -U username database_name > backup.sql
```

2. File backup:
```bash
tar -czf backup.tar.gz ./data
```

## Troubleshooting

1. Check container status:
```bash
docker-compose ps
```

2. View container logs:
```bash
docker-compose logs app
docker-compose logs nginx
```

3. Access container shell:
```bash
docker-compose exec app sh
```

## Security Considerations

1. Always use HTTPS in production
2. Keep environment variables secure
3. Regularly update dependencies
4. Monitor server resources
5. Set up proper firewall rules
6. Enable regular backups

## Support

For issues and support, please create an issue in the repository or contact the development team. 