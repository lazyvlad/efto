<?php

namespace App\Support;

/**
 * The site's pages for players, in categories: the menu at the top, and the tabs under a page's
 * heading for the other pages of its category, are both made from this. A new page goes in
 * here, in its category. (The admin's own: App\Support\AdminMenu.)
 */
class SiteMenu
{
    /**
     * The categories in order, each with its pages: route name, label, the routes that count as
     * it ("active": a game's page is High Scores'), and whether it needs an account.
     *
     * @return array<string, array{label: string, pages: array<int, array{route: string, label: string, active: array<int, string>, account?: bool}>}>
     */
    public static function categories(): array
    {
        return [
            'play' => [
                'label' => __('Play'),
                'pages' => [
                    ['route' => 'home', 'label' => __('Play'), 'active' => ['home', 'play']],
                ],
            ],
            'scores' => [
                'label' => __('Scores'),
                'pages' => [
                    ['route' => 'highscores', 'label' => __('High Scores'), 'active' => ['highscores', 'games.show']],
                    ['route' => 'live', 'label' => __('Live'), 'active' => ['live']],
                    ['route' => 'games.history', 'label' => __('My Games'), 'active' => ['games.history'], 'account' => true],
                ],
            ],
            'guide' => [
                'label' => __('Guide'),
                'pages' => [
                    ['route' => 'whats-new', 'label' => __('What\'s new'), 'active' => ['whats-new']],
                    ['route' => 'items', 'label' => __('Items'), 'active' => ['items']],
                    ['route' => 'about', 'label' => __('About'), 'active' => ['about']],
                ],
            ],
            'tools' => [
                'label' => __('Tools'),
                'pages' => [
                    ['route' => 'tools', 'label' => __('All tools'), 'active' => ['tools']],
                    ['route' => 'tools.audio-cutter', 'label' => __('Audio Cutter'), 'active' => ['tools.audio-cutter']],
                ],
            ],
        ];
    }

    /** A category's pages the visitor can open (My Games only with an account) */
    public static function pages(string $category): array
    {
        return array_values(array_filter(
            self::categories()[$category]['pages'] ?? [],
            fn (array $page) => empty($page['account']) || auth()->check()
        ));
    }

    /** The category the page being shown is in, or null */
    public static function current(): ?string
    {
        foreach (self::categories() as $key => $category) {
            foreach ($category['pages'] as $page) {
                if (request()->routeIs(...$page['active'])) {
                    return $key;
                }
            }
        }

        return null;
    }

    /** Whether a page is the one being shown */
    public static function isOn(array $page): bool
    {
        return request()->routeIs(...$page['active']);
    }
}
