#!/bin/bash

# Website Deployment Script
# Creates directory structure and nginx configuration for new websites

# ===== CONFIGURATION =====
WEB_ROOT_BASE="/var/www"
NGINX_CONFIG_DIR="/etc/nginx"
WEB_USER="nginx"
WEB_GROUP="nginx"

# ===== SCRIPT =====
set -e  # Exit on any error

echo "🚀 Website Deployment Script"
echo "============================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Get domain name from user
read -p "🌐 Enter domain name (e.g., example.com): " DOMAIN

if [[ -z "$DOMAIN" ]]; then
    echo "❌ Domain name cannot be empty"
    exit 1
fi

# Validate domain name format (basic check)
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
    echo "⚠️  Warning: Domain name format seems unusual. Continue anyway? (y/N)"
    read -r CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

SITE_DIR="$WEB_ROOT_BASE/$DOMAIN"
HTML_DIR="$SITE_DIR/html"
NGINX_CONFIG="$NGINX_CONFIG_DIR/$DOMAIN.conf"

echo ""
echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Site directory: $SITE_DIR"
echo "   HTML directory: $HTML_DIR"
echo "   Nginx config: $NGINX_CONFIG"
echo ""

# Check if site already exists
if [[ -d "$SITE_DIR" ]]; then
    echo "⚠️  Directory $SITE_DIR already exists!"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

if [[ -f "$NGINX_CONFIG" ]]; then
    echo "⚠️  Nginx config $NGINX_CONFIG already exists!"
    read -p "Overwrite? (y/N): " OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

echo "🏗️  Creating directory structure..."

# Create directories
mkdir -p "$HTML_DIR"

# Set ownership
chown -R "$WEB_USER:$WEB_GROUP" "$SITE_DIR"

# Set permissions
chmod 755 "$SITE_DIR"
chmod 755 "$HTML_DIR"

echo "✅ Created: $SITE_DIR"
echo "✅ Created: $HTML_DIR"
echo "✅ Set ownership to $WEB_USER:$WEB_GROUP"

echo "📝 Creating nginx configuration..."

# Create nginx config file
cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    root $HTML_DIR;
    index index.php index.html index.htm;

    # Logging
    access_log /var/log/nginx/$DOMAIN.access.log;
    error_log /var/log/nginx/$DOMAIN.error.log;

    # Redirect www to non-www
    if (\$host ~* ^www\\.(.*)$) {
        set \$host_without_www \$1;
        rewrite ^/(.*)\$ \$scheme://\$host_without_www/\$1 permanent;
    }

    # Remove trailing slashes
    if (!-d \$request_filename) {
        rewrite ^/(.+)/\$ /\$1 permanent;
    }

    # Let's Encrypt ACME challenge
    location ~ /\\.well-known/acme-challenge {
        allow all;
    }

    # Deny access to hidden files
    location ~ /\\. {
        deny all;
    }

    # Static file caching
    location ~* ^.+\\.(jpg|jpeg|gif|css|png|js|ico|woff|webp)\$ {
        access_log off;
        expires 30d;
    }

    # Try files
    try_files \$uri \$uri/ /index.php?/\$uri&\$args;

    # PHP processing
    location ~ \\.php\$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to .htaccess files
    location ~ /\\.ht {
        deny all;
    }
}
EOF

echo "✅ Created nginx config: $NGINX_CONFIG"

# Create a basic index.html file
cat > "$HTML_DIR/index.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to $DOMAIN</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        p { color: #666; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Welcome to $DOMAIN</h1>
        <p>Your website is now set up and ready to go!</p>
        <p>This is a placeholder page. Replace this file with your website content.</p>
        <hr>
        <p><small>Created by Website Deployment Script</small></p>
    </div>
</body>
</html>
EOF

chown "$WEB_USER:$WEB_GROUP" "$HTML_DIR/index.html"
chmod 644 "$HTML_DIR/index.html"

echo "✅ Created placeholder index.html"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "   ✅ Domain: $DOMAIN"
echo "   ✅ Directory: $SITE_DIR"
echo "   ✅ HTML root: $HTML_DIR"
echo "   ✅ Nginx config: $NGINX_CONFIG"
echo "   ✅ Ownership: $WEB_USER:$WEB_GROUP"
echo ""
echo "📝 Next steps:"
echo "   1. Test nginx config: nginx -t"
echo "   2. Reload nginx: systemctl reload nginx"
echo "   3. Upload your website files to: $HTML_DIR"
echo "   4. Configure SSL with certbot: certbot --nginx -d $DOMAIN"
echo ""
echo "🌐 Your website should be accessible at: http://$DOMAIN" 