{{-- Where an account ($user) stands, in a few words --}}
@if ($user->isBlocked())
    <span class="text-red-600">{{ __('blocked') }}</span>
@elseif ($user->canUseRewards())
    <span class="text-green-600">{{ __('activated') }}</span>
@else
    <span class="text-amber-600">{{ __('not activated') }}</span>
@endif
@if ($user->is_admin)
    <span class="text-indigo-600">· {{ __('admin') }}</span>
@endif
