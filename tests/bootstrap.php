<?php

// With the configuration cached (php artisan config:cache), Laravel ignores the settings in
// phpunit.xml: the tests would run against the real database of the machine they are on and
// empty it as they reset its tables. On 2026-10-16 that wiped dev2's database. They refuse to
// start until the cache is gone (php artisan config:clear, or optimize:clear).
if (is_file(__DIR__.'/../bootstrap/cache/config.php')) {
    fwrite(STDERR, "\nThe configuration is cached (bootstrap/cache/config.php): the tests would run against the real database.\n"
        ."Run \"php artisan config:clear\" first, then the tests again.\n\n");
    exit(1);
}

require __DIR__.'/../vendor/autoload.php';
