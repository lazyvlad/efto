<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [\App\Http\Middleware\RejectBlocked::class]);
        // The guest's account is found before anything asks who is playing
        $middleware->prependToPriorityList(
            before: \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
            prepend: \App\Http\Middleware\ResolveGuestHunter::class,
        );
        $middleware->alias(['admin' => \App\Http\Middleware\EnsureAdmin::class, 'guest.hunter' => \App\Http\Middleware\ResolveGuestHunter::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
