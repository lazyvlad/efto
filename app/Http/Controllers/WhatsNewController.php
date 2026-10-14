<?php

namespace App\Http\Controllers;

use App\Models\NewsPost;
use Illuminate\View\View;

/**
 * The What's new page: what changed in the game, newest first.
 */
class WhatsNewController extends Controller
{
    public function index(): View
    {
        return view('whats-new', [
            'posts' => NewsPost::published()->paginate(10),
        ]);
    }
}
