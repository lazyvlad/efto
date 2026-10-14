<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewsPost;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Write, change and publish the posts on the What's new page.
 */
class NewsPostController extends Controller
{
    public function index(): View
    {
        return view('admin.news.index', [
            'posts' => NewsPost::with('user')->orderByRaw('published_at is null desc')->orderByDesc('published_at')->latest()->get(),
        ]);
    }

    public function create(): View
    {
        return view('admin.news.form', ['post' => new NewsPost]);
    }

    public function store(Request $request): RedirectResponse
    {
        $post = NewsPost::create($this->validated($request, null) + ['user_id' => $request->user()->id]);

        return redirect()->route('admin.news.edit', $post)->with('status', $post->isPublished()
            ? __('Published on the What\'s new page.')
            : __('Saved as a draft: only admins see it.'));
    }

    public function edit(NewsPost $news): View
    {
        return view('admin.news.form', ['post' => $news]);
    }

    public function update(Request $request, NewsPost $news): RedirectResponse
    {
        $news->update($this->validated($request, $news));

        return redirect()->route('admin.news.edit', $news)->with('status', $news->isPublished()
            ? __('Saved. It is on the What\'s new page.')
            : __('Saved as a draft: only admins see it.'));
    }

    public function destroy(NewsPost $news): RedirectResponse
    {
        $news->delete();

        return redirect()->route('admin.news.index')->with('status', __('Post deleted.'));
    }

    /**
     * What the form asked for. Publishing keeps the date a post first went up; taking it down
     * makes it a draft again.
     */
    private function validated(Request $request, ?NewsPost $post): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'version' => ['nullable', 'string', 'max:20'],
            'body' => ['required', 'string', 'max:30000'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        return [
            'title' => $data['title'],
            'version' => $data['version'] ?? null,
            'body' => trim($data['body']),
            'published_at' => $request->boolean('publish') ? ($post?->published_at ?? now()) : null,
        ];
    }
}
