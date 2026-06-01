<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-stretch sm:items-center sm:justify-center bg-black/50 overflow-hidden"
    @click.self="$emit('close')"
  >
    <div class="bg-white shadow-xl flex flex-col w-full overflow-hidden p-4 sm:rounded-lg sm:p-6 sm:w-[90vw] sm:max-w-3xl sm:h-auto sm:max-h-[90vh]">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 class="text-2xl font-bold">My Word Lists</h2>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-green-500 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-green-50 hover:border-green-600 touch-manipulation"
            @click="showUsageModal = true"
          >
            Usage
          </button>
          <button
            type="button"
            class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
      </div>

      <!-- List selector -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <select
          :value="activeListId === null ? 'default' : String(activeListId)"
          class="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @change="onListSelectChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="default">Default</option>
          <option v-for="list in namedLists" :key="list.id" :value="String(list.id)">
            {{ list.name }}{{ list.isShared ? ' (shared)' : '' }}
          </option>
        </select>

        <!-- Rename inline (named lists only) -->
        <template v-if="activeListId !== null">
          <template v-if="renamingList">
            <input
              v-model="renameValue"
              type="text"
              maxlength="100"
              class="border border-blue-400 rounded-lg px-2 py-1.5 text-sm w-40 focus:ring-2 focus:ring-blue-500"
              placeholder="New name"
              @keyup.enter="submitRename"
              @keyup.escape="renamingList = false"
            />
            <button
              type="button"
              class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              :disabled="!renameValue.trim()"
              @click="submitRename"
            >
              Save
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              @click="renamingList = false"
            >
              Cancel
            </button>
          </template>
          <button
            v-else
            type="button"
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            @click="startRename"
          >
            Rename
          </button>
        </template>

        <button
          type="button"
          class="px-3 py-1.5 text-sm border border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 whitespace-nowrap"
          @click="showCreateListModal = true"
        >
          + New List
        </button>
        <button
          v-if="activeListIsOwned"
          type="button"
          class="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 whitespace-nowrap"
          @click="openShares"
        >
          Share
        </button>
        <button
          v-if="activeListIsOwned && isTeacher && teacherClasses && teacherClasses.length > 0"
          type="button"
          class="px-3 py-1.5 text-sm border border-green-400 text-green-700 rounded-lg hover:bg-green-50 whitespace-nowrap"
          @click="showShareClassModal = true"
        >
          📚 Share with Class
        </button>
        <button
          v-if="activeListIsOwned"
          type="button"
          class="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 whitespace-nowrap"
          @click="showDeleteListConfirm = true"
        >
          Delete List
        </button>
      </div>

      <!-- Shared-list banner -->
      <div
        v-if="activeListId !== null && namedLists.find(l => l.id === activeListId)?.isShared"
        class="mb-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700 flex items-center gap-2"
      >
        <span v-if="namedLists.find(l => l.id === activeListId)?.isClassShared">📚 Class list from</span>
        <span v-else>Shared by</span>
        {{ namedLists.find(l => l.id === activeListId)?.ownerName || namedLists.find(l => l.id === activeListId)?.ownerEmail }}
        ·
        <span v-if="isReadOnly">read-only</span>
        <span v-else class="font-medium">read &amp; write</span>
      </div>

      <!-- Active / Archived tabs -->
      <div class="flex gap-1 p-1 mb-4 rounded-lg bg-gray-100 border border-gray-200">
        <button
          type="button"
          class="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium rounded-md touch-manipulation transition-colors"
          :class="viewMode === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          @click="$emit('update:viewMode', 'active')"
        >
          Active
        </button>
        <button
          type="button"
          class="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium rounded-md touch-manipulation transition-colors"
          :class="viewMode === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          @click="$emit('update:viewMode', 'archived')"
        >
          Archived
        </button>
      </div>

      <!-- Search input -->
      <div class="mb-4">
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
          <input
            :value="searchQuery"
            type="text"
            placeholder="Search words..."
            class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
            aria-label="Clear search"
            @click="$emit('update:searchQuery', '')"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Word count + Study (only when Active) -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="text-sm text-gray-600">
          <span v-if="searchQuery">
            Showing {{ filteredWordList.length }} of {{ wordListLength }} words
          </span>
          <span v-else>
            {{ wordListTotal }} word{{ wordListTotal === 1 ? '' : 's' }}
            <span v-if="viewMode === 'active' && hasMore" class="text-gray-400"> · showing {{ wordListLength }}</span>
          </span>
        </span>
        <button
          v-if="viewMode === 'active'"
          type="button"
          class="min-h-[44px] px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm touch-manipulation"
          :disabled="wordListTotal === 0 || !!searchQuery"
          :title="wordListTotal === 0 ? 'Add words to your list to study' : searchQuery ? 'Clear search to study' : 'Study first 20 words'"
          @click="$emit('start-study')"
        >
          Study
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="wordListLoading" class="text-center py-8 text-gray-500">
        Loading your word list...
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredWordList.length === 0" class="text-center py-8">
        <p v-if="searchQuery" class="text-gray-600">
          No words found matching "{{ searchQuery }}"
        </p>
        <p v-else-if="viewMode === 'archived'" class="text-gray-600">
          No archived words. Archive words from your active list to see them here.
        </p>
        <p v-else class="text-gray-600">
          You haven't saved any words yet. Use the "Add" button in the translation dialog to start building your collection.
        </p>
      </div>

      <!-- Word list -->
      <div v-else class="flex-1 min-h-0 flex flex-col space-y-3">
        <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 touch-pan-y">
          <div class="space-y-3">
            <div
              v-for="word in filteredWordList"
              :key="word.id"
              class="w-full border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:border-blue-200 transition-colors relative"
            >
          <!-- Source text reference (clickable) -->
          <div v-if="word.wordData.sourceText || word.wordData.bookTitle" class="mb-2 text-xs text-blue-600 font-medium border-b border-gray-100 pb-2 sm:flex sm:justify-between sm:items-start">
            <div class="sm:flex-1 sm:min-w-0">
              <button
                v-if="word.wordData.sourceText || word.wordData.bookTitle"
                type="button"
                class="block w-full truncate [direction:rtl] hover:underline cursor-pointer"
                @click="$emit('navigate-to-word', word)"
              >
                <bdi v-if="word.wordData.sourceText">{{ word.wordData.sourceText }}</bdi>
                <bdi v-else-if="word.wordData.bookTitle">{{ word.wordData.bookTitle }}</bdi>
              </button>
              <div v-if="word.wordData.bookPath" class="text-gray-500 font-normal mt-0.5">
                {{ word.wordData.bookPath }}
              </div>
            </div>
            <div class="hidden sm:flex sm:flex-col sm:items-end text-xs text-gray-500 font-normal gap-0.5">
              <span>Saved: {{ formatDate(word.createdAt) }}</span>
              <span v-if="word.addedBy" class="text-indigo-500">
                by {{ word.addedBy.name || word.addedBy.email }}
              </span>
            </div>
          </div>
          <!-- Saved date row (when no source text reference) -->
          <div v-else class="mb-2 hidden sm:flex sm:justify-end border-b border-gray-100 pb-2">
            <div class="flex flex-col items-end text-xs text-gray-500 font-normal gap-0.5">
              <span>Saved: {{ formatDate(word.createdAt) }}</span>
              <span v-if="word.addedBy" class="text-indigo-500">
                by {{ word.addedBy.name || word.addedBy.email }}
              </span>
            </div>
          </div>


          <!-- Context phrase (smaller, at top) -->
          <div v-if="word.wordData.originalPhrase || word.wordData.translatedPhrase" class="mb-2 text-xs text-gray-500 border-b border-gray-100 pb-2">
            <div v-if="word.wordData.originalPhrase" class="text-right" style="direction: rtl">
              {{ word.wordData.originalPhrase }}
            </div>
            <div v-if="word.wordData.translatedPhrase" class="text-gray-600">
              {{ word.wordData.translatedPhrase }}
            </div>
          </div>

          <!-- Word entry -->
          <div class="flex flex-col gap-y-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4">
            <div
              v-if="word.wordData.wordEntry?.word"
              class="text-2xl font-bold text-blue-700"
              style="direction: rtl"
            >
              {{ word.wordData.wordEntry.word }}
            </div>
            <div v-if="word.wordData.wordEntry?.wordTranslation" class="text-xl font-semibold text-gray-900">
              {{ word.wordData.wordEntry.wordTranslation }}
            </div>
            <div v-if="word.wordData.wordEntry?.wordRoot && word.wordData.wordEntry.wordRoot !== '—'" class="text-lg text-gray-600">
              <span class="text-xs text-gray-400 uppercase font-bold mr-1">Root:</span>
              {{ word.wordData.wordEntry.wordRoot }}<span v-if="word.wordData.wordEntry.wordRootTranslation" class="text-gray-500"> ({{ word.wordData.wordEntry.wordRootTranslation }})</span>
            </div>
            <NuxtLink
              v-if="concordanceRootOrWord(word)"
              :to="rootExplorerLink(concordanceRootOrWord(word)!)"
              class="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors shrink-0"
              :aria-label="word.wordData.wordEntry?.wordRoot && word.wordData.wordEntry.wordRoot !== '—' ? 'Open concordance for this root' : 'Open concordance for this word'"
              title="Concordance"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
              </svg>
            </NuxtLink>
          </div>

          <!-- Archive / Restore / Reset -->
          <div class="mt-2 flex flex-wrap justify-end gap-2">
            <template v-if="viewMode === 'active'">
              <button
                v-if="word.progress && (word.progress.timesShown > 0 || word.progress.timesCorrect > 0)"
                type="button"
                class="min-h-[44px] px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 text-gray-700 shrink-0"
                :disabled="resettingProgressWordId === word.id"
                @click="$emit('reset-stats', word.id)"
              >
                <span v-if="resettingProgressWordId === word.id" class="animate-pulse">…</span>
                <span v-else>Reset stats</span>
              </button>
              <button
                type="button"
                class="min-h-[44px] px-3 py-2 text-sm border border-gray-300 rounded hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors shrink-0"
                :disabled="deletingWordId === word.id"
                @click="$emit('confirm-delete-word', word.id)"
              >
                <span v-if="deletingWordId === word.id" class="animate-pulse">…</span>
                <span v-else aria-label="Archive">Archive</span>
              </button>
            </template>
            <button
              v-else
              type="button"
              class="min-h-[44px] px-3 py-2 text-sm border border-green-300 rounded hover:bg-green-50 hover:text-green-700 shrink-0"
              :disabled="restoringWordId === word.id"
              @click="$emit('restore-word', word.id)"
            >
              <span v-if="restoringWordId === word.id" class="animate-pulse">…</span>
              <span v-else>Restore</span>
            </button>
          </div>

          <!-- Metadata -->
          <div v-if="word.wordData.wordEntry?.wordPartOfSpeech || word.wordData.wordEntry?.wordGender || word.wordData.wordEntry?.wordTense || word.wordData.wordEntry?.wordBinyan" class="mt-1.5 flex flex-wrap gap-x-3 text-sm text-gray-500 font-medium">
            <span v-if="word.wordData.wordEntry.wordPartOfSpeech && word.wordData.wordEntry.wordPartOfSpeech !== '—'">{{ word.wordData.wordEntry.wordPartOfSpeech }}</span>
            <span v-if="word.wordData.wordEntry.wordGender && word.wordData.wordEntry.wordGender !== '—'">{{ word.wordData.wordEntry.wordGender }}</span>
            <span v-if="word.wordData.wordEntry.wordTense && word.wordData.wordEntry.wordTense !== '—'">{{ word.wordData.wordEntry.wordTense }}</span>
            <span v-if="word.wordData.wordEntry.wordBinyan && word.wordData.wordEntry.wordBinyan !== '—'">{{ word.wordData.wordEntry.wordBinyan }}</span>
          </div>

          <!-- Grammar notes -->
          <div
            v-if="word.wordData.wordEntry?.grammarNotes && word.wordData.wordEntry.grammarNotes !== '—'"
            class="mt-2 text-gray-700 text-sm border-t border-gray-50 pt-2 italic leading-relaxed"
          >
            {{ word.wordData.wordEntry.grammarNotes }}
          </div>

          <!-- Example words with the same root -->
          <div
            v-if="word.wordData.wordEntry?.rootExamples && Array.isArray(word.wordData.wordEntry.rootExamples) && word.wordData.wordEntry.rootExamples.length > 0"
            class="mt-3 pt-3 border-t border-gray-100"
          >
            <div class="text-xs font-semibold text-gray-500 uppercase mb-2">Additional examples with the same root</div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(example, idx) in word.wordData.wordEntry.rootExamples"
                :key="idx"
                class="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm"
              >
                <span class="text-base font-medium text-blue-900" style="direction: rtl">{{ example.word }}</span>
                <span class="text-gray-600">—</span>
                <span class="text-gray-700">{{ example.translation }}</span>
              </div>
            </div>
          </div>

          <!-- Modern Hebrew Example (visible on all screen sizes including mobile) -->
          <div
            v-if="word.wordData.wordEntry?.modernHebrewExample?.sentence && word.wordData.wordEntry?.modernHebrewExample?.translation"
            class="block w-full flex-shrink-0 mt-3 pt-3 border-t border-gray-100"
          >
            <div class="text-xs font-semibold text-gray-500 uppercase mb-2">Modern Hebrew Example</div>
            <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 space-y-1">
              <div class="text-sm text-right text-slate-800 break-words" style="direction: rtl; word-break: break-word;">
                {{ word.wordData.wordEntry.modernHebrewExample.sentence }}
              </div>
              <div class="text-sm text-gray-700">
                {{ word.wordData.wordEntry.modernHebrewExample.translation }}
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
        <div v-if="viewMode === 'active' && hasMore && !searchQuery" class="pt-2 border-t border-gray-200">
          <button
            type="button"
            class="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
            :disabled="wordListLoadingMore"
            @click="$emit('load-more')"
          >
            {{ wordListLoadingMore ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      </div>

      <!-- Close button -->
      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Create list modal -->
    <div
      v-if="showCreateListModal"
      class="absolute inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 rounded-lg"
      @click.self="showCreateListModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 class="text-base font-semibold text-gray-900">Create New List</h3>
        <input
          v-model="newListName"
          type="text"
          maxlength="100"
          placeholder="List name"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @keyup.enter="submitCreateList"
        />
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            @click="showCreateListModal = false; newListName = ''"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            :disabled="!newListName.trim()"
            @click="submitCreateList"
          >
            Create
          </button>
        </div>
      </div>
    </div>

    <!-- Delete list confirmation modal -->
    <div
      v-if="showDeleteListConfirm"
      class="absolute inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 rounded-lg"
      @click.self="showDeleteListConfirm = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 class="text-base font-semibold text-gray-900">Delete List</h3>
        <p class="text-sm text-gray-700">
          Delete list <strong>{{ activeListName }}</strong> and all
          <strong>{{ wordListTotal }}</strong> word{{ wordListTotal === 1 ? '' : 's' }} in it?
          This cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            @click="showDeleteListConfirm = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            @click="confirmDeleteList"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Share list modal -->
    <div
      v-if="showShareModal"
      class="absolute inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 rounded-lg"
      @click.self="showShareModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900">Share "{{ activeListName }}"</h3>
          <button
            type="button"
            class="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            @click="showShareModal = false"
          >
            <span class="text-lg leading-none">×</span>
          </button>
        </div>

        <!-- Add email input -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">Add person by email</label>
          <div class="flex gap-2">
            <input
              v-model="newShareEmail"
              type="email"
              placeholder="name@example.com"
              class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="shareEmailError ? 'border-red-400' : ''"
              @keyup.enter="submitAddShare"
            />
            <button
              type="button"
              class="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
              :disabled="!newShareEmail.trim()"
              @click="submitAddShare"
            >
              Add
            </button>
          </div>
          <p v-if="shareEmailError" class="text-xs text-red-500">{{ shareEmailError }}</p>
        </div>

        <!-- Current shares -->
        <div class="space-y-2">
          <p class="text-xs font-medium text-gray-600">
            {{ sharesLoading ? 'Loading…' : (activeListShares.length === 0 ? 'Not shared with anyone yet.' : `Shared with ${activeListShares.length} person${activeListShares.length === 1 ? '' : 's'}`) }}
          </p>
          <div
            v-for="share in activeListShares"
            :key="share.id"
            class="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-800 truncate">{{ share.email }}</p>
              <p class="text-xs text-gray-400">
                {{ share.hasAccount ? 'Has account' : 'No account yet' }}
              </p>
            </div>
            <!-- Permission toggle -->
            <select
              :value="share.permission"
              class="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white shrink-0"
              @change="emit('update-share-permission', activeListId!, share.id, ($event.target as HTMLSelectElement).value as 'read' | 'write')"
            >
              <option value="read">Read only</option>
              <option value="write">Read &amp; write</option>
            </select>
            <button
              type="button"
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title="Remove access"
              @click="emit('remove-share', activeListId!, share.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Share with Class modal -->
    <div
      v-if="showShareClassModal"
      class="absolute inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 rounded-lg"
      @click.self="showShareClassModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900">📚 Share "{{ activeListName }}" with a Class</h3>
          <button type="button" class="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" @click="showShareClassModal = false">
            <span class="text-lg leading-none">×</span>
          </button>
        </div>
        <p class="text-xs text-gray-500">Students in the selected class will be able to view and study this list (read-only).</p>
        <div class="space-y-2">
          <div
            v-for="cls in teacherClasses"
            :key="cls.id"
            class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <span class="text-sm font-medium text-gray-800">{{ cls.name }}</span>
            <button
              type="button"
              class="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
              @click="emit('share-with-class', activeListId!, cls.id); showShareClassModal = false"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Usage modal (My Word List) -->
    <div
      v-if="showUsageModal"
      class="absolute inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 rounded-lg"
      @click.self="showUsageModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-sm font-semibold text-gray-900">Usage</h3>
          <button
            type="button"
            class="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
            @click="showUsageModal = false"
          >
            <span class="text-lg leading-none">×</span>
          </button>
        </div>
        <div class="p-4 overflow-y-auto text-sm text-gray-600 space-y-3">
          <p>
            <strong>Add button:</strong> To add words to this list, open a book in the Word Explorer and tap a Hebrew phrase. In the word-by-word translation dialog that opens, click the <strong>“⭐ Add”</strong> button next to any word to save it here. You can add many words over time and then study them with flashcards.
          </p>
          <p>
            <strong>Study:</strong> When you have words in your list, click <strong>Study</strong> to start a flashcard session. Cards show the Hebrew word; tap to reveal the translation, then choose “Need practice” or “Know it.” You can archive words you’ve mastered and restore them later from the Archived tab.
          </p>
          <p>
            <strong>On mobile:</strong> The word list opens full-screen for comfortable reading. Only the card list scrolls — the toolbar and search bar stay fixed at the top. Each card shows the Hebrew word, translation, and root stacked on separate lines. The source reference at the top of each card shows the clickable book title on one line and the category/section path on the line below; long titles are trimmed from the left so the specific chapter or section stays visible.
          </p>
          <p>
            <strong>Multiple lists:</strong> Use the dropdown at the top to switch between your word lists. Click <strong>+ New List</strong> to create a list, and use the <strong>Rename</strong> button to rename it. Each list is independent — words, study stats, and sharing are all per-list.
          </p>
          <p>
            <strong>Sharing:</strong> Any named list (not the Default list) can be shared with other Shoresh users by email. Click <strong>Share</strong> next to the list selector, enter an email address, and choose <strong>Read only</strong> or <strong>Read &amp; write</strong>. Recipients see the shared list in their own My Word List dropdown. You can update permissions or remove access at any time from the Share panel.
          </p>
          <p>
            <strong>Share with Class:</strong> Teachers can click <strong>📚 Share with Class</strong> to push a named list to all students in a class at once. Students see it automatically in their My Word List as a read-only class list. Progress on those words is tracked and visible to the teacher in the Teacher Dashboard.
          </p>
          <p>
            <strong>Concordance icon</strong>
            <span class="inline-flex items-center justify-center w-6 h-6 align-middle mx-0.5 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
              </svg>
            </span>
            (looks like a lollipop): Next to a word’s root, this icon opens the Concordance Word Explorer so you can see every occurrence of that root or word across the texts.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { substantiveWord } from '~/utils/text'
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

const showUsageModal = ref(false)
const showCreateListModal = ref(false)
const showDeleteListConfirm = ref(false)
const showShareModal = ref(false)
const showShareClassModal = ref(false)
const newListName = ref('')
const renamingList = ref(false)
const renameValue = ref('')
const newShareEmail = ref('')
const shareEmailError = ref('')

export interface NamedList {
  id: number
  name: string
  createdAt: number
  updatedAt: number
  wordCount: number
  isShared?: boolean
  isClassShared?: boolean
  ownerEmail?: string | null
  ownerName?: string | null
  sharedPermission?: 'read' | 'write'
}

export interface ListShare {
  id: number
  email: string
  hasAccount: boolean
  permission: 'read' | 'write'
  createdAt: number
}

export interface WordListEntry {
  id: number
  wordData: {
    originalPhrase?: string
    translatedPhrase?: string
    sourceText?: string
    bookTitle?: string
    bookPath?: string
    sefariaRef?: string
    wordEntry: {
      word?: string
      wordTranslation?: string
      rootExamples?: Array<{ word: string; translation: string }>
      [key: string]: unknown
    }
  }
  createdAt: number
  addedBy?: { userId: string; name: string | null; email: string } | null
  progress?: { timesShown: number; timesCorrect: number; attemptsUntilFirstCorrect: number | null }
}

const props = withDefaults(
  defineProps<{
    open: boolean
    viewMode?: 'active' | 'archived'
    searchQuery: string
    filteredWordList: WordListEntry[]
    wordListLength: number
    wordListTotal: number
    wordListLoading: boolean
    wordListLoadingMore: boolean
    deletingWordId: number | null
    restoringWordId?: number | null
    resettingProgressWordId?: number | null
    namedLists?: NamedList[]
    activeListId?: number | null
    activeListShares?: ListShare[]
    sharesLoading?: boolean
    teacherClasses?: Array<{ id: string; name: string }>
    isTeacher?: boolean
  }>(),
  { viewMode: 'active', restoringWordId: null, resettingProgressWordId: null, namedLists: () => [], activeListId: null, activeListShares: () => [], sharesLoading: false, teacherClasses: () => [], isTeacher: false }
)

const activeListName = computed(() => {
  if (props.activeListId === null || props.activeListId === undefined) return 'Default'
  return props.namedLists.find(l => l.id === props.activeListId)?.name ?? 'List'
})

const { setSupportView, clearSupportView } = useSupportPageContext()
watch(() => props.open, (isOpen) => {
  if (isOpen) setSupportView(SUPPORT_VIEW_NAMES.MY_WORD_LIST)
  else clearSupportView()
}, { immediate: true })

const emit = defineEmits<{
  close: []
  'update:viewMode': [mode: 'active' | 'archived']
  'update:searchQuery': [value: string]
  'navigate-to-word': [word: WordListEntry]
  'confirm-delete-word': [wordId: number]
  'restore-word': [wordId: number]
  'reset-stats': [wordId: number]
  'load-more': []
  'start-study': []
  'update:activeListId': [id: number | null]
  'create-list': [name: string]
  'rename-list': [id: number, name: string]
  'confirm-delete-list': [id: number]
  'open-shares': [id: number]
  'add-share': [listId: number, email: string]
  'remove-share': [listId: number, shareId: number]
  'update-share-permission': [listId: number, shareId: number, permission: 'read' | 'write']
  'share-with-class': [listId: number, classId: string]
  'unshare-from-class': [listId: number, classId: string]
}>()

const hasMore = computed(() => props.wordListLength < props.wordListTotal)

function onListSelectChange(value: string) {
  renamingList.value = false
  if (value === 'default') {
    emit('update:activeListId', null)
  } else {
    const id = parseInt(value, 10)
    if (!isNaN(id)) emit('update:activeListId', id)
  }
}

function startRename() {
  renameValue.value = (props.activeListId !== null && props.activeListId !== undefined)
    ? (props.namedLists.find(l => l.id === props.activeListId)?.name ?? '')
    : ''
  renamingList.value = true
}

function submitRename() {
  const name = renameValue.value.trim()
  if (!name || props.activeListId === null || props.activeListId === undefined) return
  emit('rename-list', props.activeListId, name)
  renamingList.value = false
}

function submitCreateList() {
  const name = newListName.value.trim()
  if (!name) return
  emit('create-list', name)
  showCreateListModal.value = false
  newListName.value = ''
}

function confirmDeleteList() {
  if (props.activeListId === null || props.activeListId === undefined) return
  emit('confirm-delete-list', props.activeListId)
  showDeleteListConfirm.value = false
}

const activeListIsOwned = computed(() => {
  if (props.activeListId === null || props.activeListId === undefined) return false
  const list = props.namedLists.find(l => l.id === props.activeListId)
  return list ? !list.isShared : false
})

// True when viewing a shared list that is read-only (class shares always are)
const isReadOnly = computed(() => {
  if (props.activeListId === null || props.activeListId === undefined) return false
  const list = props.namedLists.find(l => l.id === props.activeListId)
  if (!list?.isShared) return false
  if (list.isClassShared) return true
  return list.sharedPermission !== 'write'
})

function openShares() {
  if (props.activeListId === null || props.activeListId === undefined) return
  newShareEmail.value = ''
  shareEmailError.value = ''
  showShareModal.value = true
  emit('open-shares', props.activeListId)
}

function submitAddShare() {
  const email = newShareEmail.value.trim().toLowerCase()
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRe.test(email)) {
    shareEmailError.value = 'Please enter a valid email address'
    return
  }
  if (props.activeListId === null || props.activeListId === undefined) return
  shareEmailError.value = ''
  emit('add-share', props.activeListId, email)
  newShareEmail.value = ''
}

function formatDate (unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString()
}

/** Use root when present and not "—", otherwise the substantive word (after maqaf, leading vav stripped; e.g. אֶל־מֹשֶׁה or וּמֹשֶׁה → מֹשֶׁה). */
function concordanceRootOrWord (word: WordListEntry): string | null {
  const entry = word.wordData?.wordEntry
  if (!entry) return null
  if (entry.wordRoot && String(entry.wordRoot).trim() && entry.wordRoot !== '—') return String(entry.wordRoot).trim()
  if (entry.word?.trim()) {
    const w = String(entry.word).trim()
    return (substantiveWord(w) || w).trim()
  }
  return null
}

function rootExplorerLink (rootOrWord: string) {
  return {
    path: '/root-explorer',
    query: { root: rootOrWord },
  }
}
</script>
