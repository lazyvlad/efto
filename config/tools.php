<?php

/*
 * The site's tools, listed on /tools in this order. Each has its own page (its route) under
 * tools/, and a tab under the Tools heading (App\Support\SiteMenu).
 */
return [
    'audio-cutter' => [
        'route' => 'tools.audio-cutter',
        'name' => 'Audio Cutter',
        'summary' => 'Cut a clip out of a recording, listen to any part of it without moving the cut, put clips together into one track, and save it as WAV, MP3 or OGG.',
        'notes' => ['Works in your browser: nothing is uploaded', 'WAV, MP3 192 kbps, OGG'],

        // The game's own sounds, to open in it with one press: files under
        // public/game/assets/audio/, the guild's voice lines as WAV (every browser opens those)
        'samples' => [
            'Voice lines' => [
                ['name' => 'Heal call', 'file' => 'voice/01-heal-call.wav'],
                ['name' => 'Unsure response', 'file' => 'voice/02-unsure-response.wav'],
                ['name' => 'Give it to me', 'file' => 'voice/03-give-it-to-me.wav'],
                ['name' => 'Follow-up', 'file' => 'voice/04-follow-up.wav'],
                ['name' => 'Bravo', 'file' => 'voice/05-bravo.wav'],
                ['name' => 'Thunderfury', 'file' => 'voice/06-thunderfury.wav'],
                ['name' => 'Look at that', 'file' => 'voice/07-look-at-that.wav'],
                ['name' => 'Healer', 'file' => 'voice/09-healer.wav'],
                ['name' => 'Look what happened', 'file' => 'voice/10-look-what-happened.wav'],
                ['name' => 'Batvane', 'file' => 'voice/11-batvane.wav'],
                ['name' => 'Adjusting to play', 'file' => 'voice/12-adjusting-to-play.wav'],
                ['name' => 'I want', 'file' => 'voice/13-i-want.wav'],
                ['name' => 'Final retort', 'file' => 'voice/14-final-retort.wav', 'explicit' => true],
                ['name' => 'Zlatko Zgnan', 'file' => 'voice/15-zlatko-zgnan.wav'],
            ],
            'Sound effects' => [
                ['name' => 'Voice', 'file' => 'sfx/voice.mp3'],
                ['name' => 'Scream', 'file' => 'sfx/scream.mp3'],
                ['name' => 'Uff', 'file' => 'sfx/uff.mp3'],
                ['name' => 'Total', 'file' => 'sfx/total.mp3'],
                ['name' => 'Smukajte', 'file' => 'sfx/SMUKAJTE.mp3'],
                ['name' => 'Ohoo', 'file' => 'sfx/ohoo.mp3'],
                ['name' => 'Nakoj', 'file' => 'sfx/nakoj.mp3'],
                ['name' => 'Na Marko', 'file' => 'sfx/na-marko.wav'],
                ['name' => 'Neka krka peto', 'file' => 'sfx/neka_krka_peto.mp3'],
                ['name' => 'We got it', 'file' => 'sfx/weGotIt2.mp3'],
                ['name' => 'Roll', 'file' => 'sfx/roll.mp3'],
                ['name' => 'DFT', 'file' => 'sfx/dft.mp3'],
                ['name' => 'Disenchant', 'file' => 'sfx/disenchant.mp3'],
                ['name' => 'Fireball impact', 'file' => 'sfx/fireballimpact.mp3'],
                ['name' => 'Frostbolt', 'file' => 'sfx/frostbolt.mp3'],
                ['name' => 'Shadow Bolt', 'file' => 'sfx/shadow-bolt.mp3'],
                ['name' => 'Health potion', 'file' => 'sfx/health_potion.mp3'],
                ['name' => 'Mana potion', 'file' => 'sfx/mana_potion.wav'],
                ['name' => 'Speed boost', 'file' => 'sfx/speedboost.wav'],
                ['name' => 'Reverse gravity', 'file' => 'sfx/reverse_gravity.mp3'],
                ['name' => 'Pet chomp', 'file' => 'sfx/pet-chomp.wav'],
            ],
            'Music' => [
                ['name' => 'The game\'s music', 'file' => 'music/background.mp3'],
            ],
        ],
    ],
];
