<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Sub-folder hosting (e.g. https://dev.example.com/input/): the .htaccess in the project root
// forwards every request into public/, which leaves the script name as ".../public/index.php"
// while the address the visitor asked for has no "/public" in it. Drop it from the script name
// so Laravel works out the right base address ("/input") for routes, redirects and assets.
// With the web root pointed straight at public/ (production) this does nothing.
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
if (str_ends_with($scriptName, '/public/index.php')
    && ! str_starts_with($_SERVER['REQUEST_URI'] ?? '', dirname($scriptName).'/')) {
    $_SERVER['SCRIPT_NAME'] = substr($scriptName, 0, -strlen('/public/index.php')).'/index.php';
    $_SERVER['PHP_SELF'] = $_SERVER['SCRIPT_NAME'];
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
