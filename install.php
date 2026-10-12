<?php

// First-time database setup. Run from the project root, after .env has the database settings:
//
//     php install.php
//
// If the database named in DB_DATABASE already exists, nothing is touched. Otherwise it is
// created and the migrations are run.

use Illuminate\Contracts\Console\Kernel;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

if (! is_file(__DIR__.'/vendor/autoload.php')) {
    fwrite(STDERR, "vendor/ is missing - run \"composer install\" first.\n");
    exit(1);
}

if (! is_file(__DIR__.'/.env')) {
    fwrite(STDERR, ".env is missing - copy .env.example to .env and fill in the database settings.\n");
    exit(1);
}

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$connection = config('database.default');
$db = config("database.connections.$connection");

if (! in_array($db['driver'] ?? null, ['mysql', 'mariadb'], true)) {
    fwrite(STDERR, "DB_CONNECTION is \"$connection\" - this script only sets up MySQL/MariaDB.\n");
    exit(1);
}

$name = $db['database'];

if ($name === null || $name === '' || str_contains($name, '`')) {
    fwrite(STDERR, "DB_DATABASE is empty or not a usable database name.\n");
    exit(1);
}

try {
    // Connect to the server without selecting a database, since it may not exist yet
    $dsn = empty($db['unix_socket'])
        ? "mysql:host={$db['host']};port={$db['port']}"
        : "mysql:unix_socket={$db['unix_socket']}";

    $pdo = new PDO($dsn, $db['username'], $db['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $exists = $pdo->prepare('SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?');
    $exists->execute([$name]);

    if ($exists->fetchColumn() > 0) {
        echo "Database \"$name\" already exists - nothing to do.\n";
        exit(0);
    }

    $pdo->exec("CREATE DATABASE `$name` CHARACTER SET {$db['charset']} COLLATE {$db['collation']}");
} catch (PDOException $e) {
    fwrite(STDERR, 'Database server error: '.$e->getMessage()."\n");
    exit(1);
}

echo "Created database \"$name\".\n";

$status = $kernel->call('migrate', ['--force' => true]);
echo $kernel->output();

if ($status !== 0) {
    fwrite(STDERR, "The migrations failed - fix the problem and run \"php artisan migrate --force\".\n");
    exit(1);
}

echo "Done.\n";
