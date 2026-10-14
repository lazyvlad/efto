<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A post on the What's new page. Its body is Markdown; one not yet published is a draft.
 */
class NewsPost extends Model
{
    protected $fillable = ['user_id', 'title', 'version', 'body', 'published_at'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    /** The admin who wrote it */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Posts players can see, newest first */
    public function scopePublished(Builder $query): Builder
    {
        return $query->whereNotNull('published_at')->where('published_at', '<=', now())->orderByDesc('published_at');
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null && $this->published_at->isPast();
    }

    /** The body as HTML: Markdown, with any HTML written in it shown as text */
    public function html(): string
    {
        return Str::markdown($this->body, ['html_input' => 'escape', 'allow_unsafe_links' => false]);
    }
}
