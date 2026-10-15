<?php

namespace App\Support;

/**
 * The admin section's pages, in categories: the menu at the top of every admin page and the
 * Overview's guide to them are both made from this. A new page goes in here, in its category.
 */
class AdminMenu
{
    /**
     * The categories in order, each with its pages: route name, label, and what it is for.
     *
     * @return array<string, array{label: string, pages: array<int, array{route: string, label: string, about: string, active: string}>}>
     */
    public static function categories(): array
    {
        return [
            'players' => [
                'label' => __('Players'),
                'pages' => [
                    ['route' => 'admin.users.index', 'active' => 'admin.users.*', 'label' => __('Accounts'), 'about' => __('Find a player; activate, block, set the purse, unlock content for each hunter.')],
                    ['route' => 'admin.games.index', 'active' => 'admin.games.*', 'label' => __('Games'), 'about' => __('Every game played, how it ended, and its score; take a score off the board.')],
                ],
            ],
            'news' => [
                'label' => __('News'),
                'pages' => [
                    ['route' => 'admin.news.index', 'active' => 'admin.news.*', 'label' => __('What\'s new'), 'about' => __('The posts on the site\'s What\'s new page: write, publish, change.')],
                    ['route' => 'admin.announcements.index', 'active' => 'admin.announcements.*', 'label' => __('Announcements'), 'about' => __('An email to every player who keeps news emails on.')],
                ],
            ],
            'game' => [
                'label' => __('Game'),
                'pages' => [
                    ['route' => 'admin.settings.edit', 'active' => 'admin.settings.*', 'label' => __('Settings'), 'about' => __('The game\'s numbers that can be changed without a new version.')],
                ],
            ],
            'tools' => [
                'label' => __('Tools'),
                'pages' => [
                    ['route' => 'admin.perf.index', 'active' => 'admin.perf.*', 'label' => __('Performance'), 'about' => __('Debug mode\'s recordings: how the game ran in a player\'s browser.')],
                ],
            ],
        ];
    }

    /** The category the page being shown is in, or null (the Overview) */
    public static function current(): ?string
    {
        foreach (self::categories() as $key => $category) {
            foreach ($category['pages'] as $page) {
                if (request()->routeIs($page['active'])) {
                    return $key;
                }
            }
        }

        return null;
    }
}
