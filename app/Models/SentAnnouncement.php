<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A general message an admin sent to all players, kept as a record of what went out.
 */
class SentAnnouncement extends Model
{
    protected $table = 'announcements';

    protected $fillable = ['user_id', 'subject', 'body', 'button_text', 'button_url', 'sent_to', 'failed'];

    protected function casts(): array
    {
        return ['sent_to' => 'integer', 'failed' => 'integer'];
    }

    /**
     * The admin who sent it.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
