<section
    x-data="avatarUploader({ uploadUrl: @js(route('profile.avatar.store')), csrfToken: @js(csrf_token()) })"
>
    <header>
        <h2 class="text-lg font-medium text-gray-900">
            {{ __('Profile Image') }}
        </h2>

        <p class="mt-1 text-sm text-gray-600">
            {{ __('Shown next to your name and your scores. JPG, PNG, WebP or GIF, up to 4 MB.') }}
        </p>
    </header>

    <div class="mt-6 flex items-center gap-5">
        <x-avatar :user="$user" class="h-24 w-24 text-4xl" />

        <div class="flex flex-wrap items-center gap-3">
            {{-- Without scripts this is a plain upload: the picture is cropped around its centre --}}
            <form method="post" action="{{ route('profile.avatar.store') }}" enctype="multipart/form-data" x-ref="form">
                @csrf

                <label class="btn cursor-pointer">
                    {{ $user->avatar ? __('Change image') : __('Choose image') }}
                    <input
                        type="file"
                        name="avatar"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        class="sr-only"
                        @change="choose($event)"
                    >
                </label>

                <noscript><button class="btn btn-secondary">{{ __('Upload') }}</button></noscript>
            </form>

            @if ($user->avatar)
                <form method="post" action="{{ route('profile.avatar.destroy') }}">
                    @csrf
                    @method('delete')

                    <x-secondary-button type="submit">{{ __('Remove') }}</x-secondary-button>
                </form>
            @endif

            @if (in_array(session('status'), ['avatar-updated', 'avatar-removed']))
                <p
                    x-data="{ show: true }"
                    x-show="show"
                    x-transition
                    x-init="setTimeout(() => show = false, 2000)"
                    class="text-sm text-gray-600"
                >{{ __('Saved.') }}</p>
            @endif
        </div>
    </div>

    <x-input-error class="mt-3" :messages="$errors->avatar->get('avatar')" />
    <p class="mt-3 text-sm text-red-600" x-show="error" x-text="error" x-cloak></p>

    {{-- The cropper, shown once a file has been chosen. Shown with a class rather than x-show:
         the cropper measures this box as soon as it starts, and x-show reveals a moment later. --}}
    <div class="mt-6 hidden" :class="{ hidden: ! cropping }">
        <p class="text-sm text-gray-600">
            {{ __('Drag to position the picture, scroll or pinch to zoom. The circle is what others will see.') }}
        </p>

        <div class="avatar-cropper mt-3">
            <img x-ref="image" alt="">
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3">
            <x-secondary-button @click="zoom(-0.1)" aria-label="{{ __('Zoom out') }}">−</x-secondary-button>
            <x-secondary-button @click="zoom(0.1)" aria-label="{{ __('Zoom in') }}">+</x-secondary-button>
            <x-secondary-button @click="rotate()">{{ __('Rotate') }}</x-secondary-button>

            <span class="flex-1"></span>

            <x-secondary-button @click="close()">{{ __('Cancel') }}</x-secondary-button>
            <x-primary-button type="button" @click="save()" x-bind:disabled="busy">
                <span x-text="busy ? @js(__('Saving…')) : @js(__('Save image'))">{{ __('Save image') }}</span>
            </x-primary-button>
        </div>
    </div>
</section>
