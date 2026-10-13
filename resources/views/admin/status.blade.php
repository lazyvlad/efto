{{-- What the last action did, or why it was refused --}}
@if (session('status'))
    <div class="bg-white shadow sm:rounded-lg px-4 sm:px-6 py-3 text-sm text-green-600">{{ session('status') }}</div>
@endif
@if ($errors->any())
    <div class="bg-white shadow sm:rounded-lg px-4 sm:px-6 py-3 text-sm text-red-600">{{ $errors->first() }}</div>
@endif
