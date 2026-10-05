<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-8 pt-8 pb-4">
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">How to Use Shoresh</h2>
        <p class="text-gray-500 text-sm mt-1">Learn to read classic Jewish texts, one word at a time</p>
      </div>

      <!-- Content -->
      <div class="px-8 pb-8 overflow-y-auto flex-1 space-y-6">
        <section class="rounded-xl bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">What Shoresh Does</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Shoresh is free.</strong> It helps you read classic Jewish texts in Hebrew and Aramaic one word at a time. You can see what each word means, where it comes from, and how it fits into the sentence. Over time, you build your vocabulary and learn to read on your own.
          </p>
          <p class="text-slate-600 text-sm leading-relaxed">
            <strong class="text-slate-900">Shoresh or Sefaria?</strong> Use Shoresh to learn the language: words, roots, and grammar. Use <a href="https://www.sefaria.org/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Sefaria.org</a> for deeper study, like full commentaries, source sheets, and study plans such as Daf Yomi.
          </p>
        </section>

        <section>
          <h3 class="font-semibold text-slate-900 mb-3 text-base">Finding a Text</h3>
          <ol class="space-y-2 text-slate-600 text-sm">
            <li class="flex gap-3"><span class="font-semibold text-slate-400 shrink-0">1.</span> <span>Pick a category, like Tanakh, Talmud, or Liturgy. Or type a book name in the <strong>Search books</strong> box at the top.</span></li>
            <li class="flex gap-3"><span class="font-semibold text-slate-400 shrink-0">2.</span> <span>Choose a book.</span></li>
            <li class="flex gap-3"><span class="font-semibold text-slate-400 shrink-0">3.</span> <span>Some books, like the Siddur, are split into parts. If you see a list, pick the part you want.</span></li>
            <li class="flex gap-3"><span class="font-semibold text-slate-400 shrink-0">4.</span> <span>Use the <strong>Next</strong> and <strong>Prev</strong> buttons at the bottom to move between chapters or sections.</span></li>
          </ol>
        </section>

        <section>
          <h3 class="font-semibold text-slate-900 mb-3 text-base">Tools on the Reading Page</h3>
          <p class="text-slate-600 text-sm mb-3">When you open a book, you'll see these buttons and icons:</p>
          <figure class="my-3">
            <a href="/help/reader.webp" target="_blank" rel="noopener" title="Open a bigger picture">
              <img src="/help/reader.webp" alt="The reading page for Genesis chapter 1. Buttons across the top; link, note, and copy icons next to each verse; English on the left and Hebrew on the right." width="992" height="430" loading="lazy" class="w-full h-auto rounded-lg border border-slate-200 shadow-sm" />
            </a>
            <figcaption class="text-xs text-slate-500 mt-1.5">The reading page. The buttons are across the top. The small icons next to each verse number are Links, Note, and Copy.</figcaption>
          </figure>
          <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse">
              <tbody class="divide-y divide-slate-200">
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5 w-32">🔤 Hide EN / Show EN</td><td class="text-slate-600 px-2 py-1.5">Hides or shows the English column, so you can practice with only the Hebrew.</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">🌐 Translate</td><td class="text-slate-600 px-2 py-1.5">Translates the whole chapter into plain English. See "Translate a Whole Chapter" below.</td></tr>
                <tr class="bg-slate-50">
                  <td class="font-medium text-slate-700 px-2 py-1.5">
                    <span class="inline-flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Links
                    </span>
                  </td>
                  <td class="text-slate-600 px-2 py-1.5">Shows commentaries and other texts that connect to this verse. Pick one to read it.</td>
                </tr>
                <tr>
                  <td class="font-medium text-slate-700 px-2 py-1.5">
                    <span class="inline-flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Return
                    </span>
                  </td>
                  <td class="text-slate-600 px-2 py-1.5">After you jump to a commentary, this button takes you back to the verse you started from. It shows that verse's number, like 23:1.</td>
                </tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">📝 Note</td><td class="text-slate-600 px-2 py-1.5">Write your own note about this verse. (Needs a free account.)</td></tr>
                <tr>
                  <td class="font-medium text-slate-700 px-2 py-1.5">
                    <span class="inline-flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </span>
                  </td>
                  <td class="text-slate-600 px-2 py-1.5">Copies the verse so you can paste it somewhere else. You get the verse name, the Hebrew, and Sefaria's English. A green check mark means it worked.</td>
                </tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Usage</td><td class="text-slate-600 px-2 py-1.5">Many screens have a <strong>Usage</strong> button. Click it for quick tips about that screen.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-xl bg-sky-50/70 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Translate a Whole Chapter <span class="ml-1 align-middle text-[10px] font-semibold uppercase tracking-wide bg-sky-600 text-white rounded px-1.5 py-0.5">New</span></h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            Want to know what the whole chapter says? Click <strong>🌐 Translate</strong> at the top of the reading page. A window opens with the Hebrew on one side and a plain English translation on the other, one paragraph at a time.
          </p>
          <figure class="my-3">
            <a href="/help/chapter-translation.webp" target="_blank" rel="noopener" title="Open a bigger picture">
              <img src="/help/chapter-translation.webp" alt="The chapter translation window for Genesis 1, with plain English on the left, Hebrew on the right, and Copy and Share buttons at the bottom." width="896" height="684" loading="lazy" class="w-full h-auto rounded-lg border border-slate-200 shadow-sm" />
            </a>
            <figcaption class="text-xs text-slate-500 mt-1.5">The whole chapter in plain English, next to the Hebrew.</figcaption>
          </figure>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li>Paragraphs fill in one by one. A blue bar at the top shows how far along it is.</li>
            <li>If a paragraph doesn't load, click <strong>Retry</strong> next to it.</li>
            <li>When it's done, click <strong>📋 Copy</strong> to copy the whole chapter, or <strong>📤 Share</strong> to send it with your phone's or computer's share menu. If your device has no share menu, the button says <strong>Share (copy)</strong> and copies the text instead.</li>
            <li>Chapters people have already translated open much faster the next time.</li>
            <li>This translation is written by AI (OpenAI). It aims to be easy to read, so it may not match Sefaria's English word for word.</li>
          </ul>
        </section>

        <section class="rounded-xl bg-blue-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Word-by-Word Translation</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            Click or tap any part of the Hebrew or Aramaic text. Shoresh takes the words from there up to the next punctuation mark (like a comma or period) and breaks them down word by word. It shows what each word means and how it works in the sentence. This is done by AI (OpenAI).
          </p>
          <figure class="my-3">
            <a href="/help/word-dialog.webp" target="_blank" rel="noopener" title="Open a bigger picture">
              <img src="/help/word-dialog.webp" alt="The word-by-word window for Genesis 1:3. The Hebrew sentence and its English are at the top, followed by a card for each word." width="990" height="695" loading="lazy" class="w-full h-auto rounded-lg border border-slate-200 shadow-sm" />
            </a>
            <figcaption class="text-xs text-slate-500 mt-1.5">Click a phrase to see this window. Each word gets its own card below the sentence.</figcaption>
          </figure>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li><strong>Long phrases:</strong> If you pick a lot of words, Shoresh asks you to choose which ones to translate. This keeps the wait short. You can change this limit in Settings.</li>
            <li><strong>Shorter is better:</strong> For the best results, pick one sentence at a time.</li>
            <li><strong>Copy:</strong> Use <strong>📋 Hebrew</strong> or <strong>📋 English</strong> at the top to copy the sentence.</li>
            <li><strong>Grammar:</strong> Click the <strong>Grammar</strong> button to get a plain-language explanation of how the whole sentence is put together.</li>
            <li><strong>Listen:</strong> Click the Hebrew sentence at the top to hear it read out loud. Click any single Hebrew word to hear how it sounds.</li>
          </ul>
        </section>

        <section>
          <h3 class="font-semibold text-slate-900 mb-3 text-base">Word Cards</h3>
          <p class="text-slate-600 text-sm mb-3">Each word gets its own card. Here's what you'll see on it:</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse">
              <tbody class="divide-y divide-slate-200">
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5 w-32">Word</td><td class="text-slate-600 px-2 py-1.5">The Hebrew word. Click it to hear it.</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Translation</td><td class="text-slate-600 px-2 py-1.5">What the word means in English.</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Root</td><td class="text-slate-600 px-2 py-1.5">The word's "shoresh." Most Hebrew words grow from a root of three letters. Words with the same root have related meanings.</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">2×, 3×…</td><td class="text-slate-600 px-2 py-1.5">How many times the word shows up in this phrase.</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Part of Speech</td><td class="text-slate-600 px-2 py-1.5">What job the word does, like noun (a thing), verb (an action), or adjective (a describing word).</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Gender</td><td class="text-slate-600 px-2 py-1.5">In Hebrew, words are masculine, feminine, or both.</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Tense</td><td class="text-slate-600 px-2 py-1.5">For verbs: when the action happens (past, present, future, and so on).</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Binyan</td><td class="text-slate-600 px-2 py-1.5">The pattern a Hebrew verb follows, like Qal, Piel, or Hiphil. Each pattern changes the meaning a little.</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Language</td><td class="text-slate-600 px-2 py-1.5">Hebrew or Aramaic.</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Grammar Notes</td><td class="text-slate-600 px-2 py-1.5">Extra tips about the word.</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Same-root examples</td><td class="text-slate-600 px-2 py-1.5">Other words built from the same root, with their meanings.</td></tr>
              </tbody>
            </table>
          </div>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside mt-3">
            <li><strong>⭐ Add:</strong> Saves the word to My Word List. A ✅ means it's saved. If you have more than one list, use the <strong>Adding to</strong> menu to choose which list. (Needs a free account.)</li>
            <li><strong>Modern Hebrew Sentences:</strong> Shows three example sentences that use the word in today's Hebrew.</li>
          </ul>
        </section>

        <section class="rounded-xl bg-teal-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Concordance Word Explorer</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            A concordance is a list of every place a word shows up. On any word card, click the
            <span class="inline-flex items-center justify-center w-5 h-5 align-middle mx-0.5 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
              </svg>
            </span>
            icon (it looks like a lollipop). You'll see where that root appears across the Torah, Tanakh, and Talmud.
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li>You can type a root yourself, in Hebrew letters (ק־ד־שׁ) or English letters (K-D-Sh).</li>
            <li>Group the results by type of book (like Torah or Talmud), or by single book.</li>
            <li>Click any result to open that verse in the reader.</li>
          </ul>
        </section>

        <section class="rounded-xl bg-green-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">📚 My Word List</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Needs a free account.</strong> This is your own vocabulary list. Save words with the ⭐ <strong>Add</strong> button, then open the list with the <strong>📚 My Word List</strong> button. (On phones it's called <strong>Vocabulary</strong>.)
          </p>
          <figure class="my-3">
            <a href="/help/word-list.webp" target="_blank" rel="noopener" title="Open a bigger picture">
              <img src="/help/word-list.webp" alt="My Word Lists window showing a list named Genesis 1 Vocabulary with Rename, New List, Share, and Share with Class buttons, a search box, and a Study button." width="768" height="610" loading="lazy" class="w-full h-auto rounded-lg border border-slate-200 shadow-sm" />
            </a>
            <figcaption class="text-xs text-slate-500 mt-1.5">My Word List. Use the menu at the top to switch lists.</figcaption>
          </figure>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li><strong>Search</strong> your list to find a word fast.</li>
            <li>Click where a word came from to jump back to that verse.</li>
            <li><strong>Archive</strong> words you know well to hide them. Bring them back from the Archived tab any time.</li>
            <li><strong>Reset stats</strong> to start over on a word's study record.</li>
            <li><strong>More than one list:</strong> Click <strong>+ New List</strong> to make lists by topic, book, or goal. Use the menu at the top to switch lists, and <strong>Rename</strong> to change a name.</li>
            <li><strong>Share a list:</strong> Click <strong>Share</strong> and type a friend's email. Choose whether they can only look (<strong>Read only</strong>) or also make changes (<strong>Read &amp; write</strong>). You can change this or stop sharing later. Your main "Default" list can't be shared.</li>
          </ul>
        </section>

        <section class="rounded-xl bg-amber-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Study with Flashcards</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Needs a free account.</strong> In My Word List, click <strong>Study</strong>. Each card shows a Hebrew word. Try to remember what it means, then tap <strong>Show translation</strong>. Tap <strong>Know it</strong> if you got it right, or <strong>Need practice</strong> if you didn't.
          </p>
          <figure class="my-3">
            <a href="/help/flashcards.webp" target="_blank" rel="noopener" title="Open a bigger picture">
              <img src="/help/flashcards.webp" alt="Two flashcards. The first shows a Hebrew word with Play, Copy to clipboard, and Show translation buttons. The second shows the English meaning with Need practice and Know it buttons." width="1320" height="331" loading="lazy" class="w-full h-auto rounded-lg border border-slate-200 shadow-sm" />
            </a>
            <figcaption class="text-xs text-slate-500 mt-1.5">Left: the front of a card. Right: after you tap Show translation.</figcaption>
          </figure>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li>Words you know come back a few more times to help them stick.</li>
            <li>Click <strong>Play</strong> to hear the word. Click <strong>Copy</strong> to copy it.</li>
            <li>You can choose how long a study session is in Settings. Your scores are on the Settings page too.</li>
          </ul>
        </section>

        <section class="rounded-xl bg-purple-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">📝 My Notes</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Needs a free account.</strong> Click the 📝 icon next to any verse to write down a thought, question, or idea about it.
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li>Click <strong>📝 My Notes</strong> to see all your notes, sorted by book.</li>
            <li>Change or delete a note any time.</li>
            <li>Check the boxes next to several notes to print them or copy them all at once.</li>
            <li>Click a note's verse name to go back to that verse.</li>
            <li>Only you can see your notes. They show up on every device you sign in on.</li>
          </ul>
        </section>

        <section class="rounded-xl bg-indigo-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">🏫 Classes</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">For students:</strong> Your teacher will give you an invite code. Go to <strong>Settings</strong>, find <strong>My Class</strong>, and type in the code. After you join:
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside mb-3">
            <li>Word lists your teacher shares show up in My Word List on their own. They are marked as class lists, and you can study them but not change them.</li>
            <li>Click <strong>🏫 Class Notes</strong> to read notes your teacher has posted for the class.</li>
            <li>You can leave a class from the Settings page.</li>
          </ul>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">For teachers</strong> (a teacher account is needed): Click <strong>🏫 Teacher</strong> to open the Teacher Dashboard.
          </p>
          <figure class="my-3">
            <a href="/help/teacher.webp" target="_blank" rel="noopener" title="Open a bigger picture">
              <img src="/help/teacher.webp" alt="The Teacher Dashboard showing a class called Hebrew 101 with its invite code, a list of four students with their study numbers, and a Word List Progress chart." width="1020" height="1170" loading="lazy" class="w-full h-auto rounded-lg border border-slate-200 shadow-sm" />
            </a>
            <figcaption class="text-xs text-slate-500 mt-1.5">The Teacher Dashboard, using a sample class.</figcaption>
          </figure>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li>Click <strong>+ New Class</strong> to make a class. Each class gets its own invite code to give to students.</li>
            <li>See who is in each class and how much each student has studied. You can remove a student if needed.</li>
            <li>To give your class a word list, open My Word List, pick a list, and click <strong>📚 Share with Class</strong>.</li>
            <li>The <strong>Word List Progress</strong> chart shows how each student is doing on each word: ✅ got it right, ⭕ tried but not right yet, — not studied yet.</li>
          </ul>
        </section>

        <section class="rounded-xl bg-slate-100/80 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Settings</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Needs a free account.</strong> Click <strong>Settings</strong> at the top of the page to:
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li><strong>Flashcards:</strong> Choose how many words are in each study session, how many cards you see in total, and how often words you know come back.</li>
            <li><strong>Long phrases:</strong> Choose how many words you can pick before Shoresh asks you to narrow it down. More words means a longer wait.</li>
            <li><strong>Your study results:</strong> See how many words you've studied and how many you got right.</li>
            <li><strong>My Class:</strong> Join or leave a class.</li>
          </ul>
        </section>

        <section class="rounded-xl bg-rose-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Getting Help</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            Found a problem or have an idea? Click <strong>Support</strong> at the top of any page. (You'll need to be signed in.)
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li>Make a new support ticket. Mark it as a <strong>Bug</strong> (something is broken), a <strong>Suggestion</strong> (an idea), or <strong>Help</strong> (a question).</li>
            <li>Shoresh fills in which page you were on, so you don't have to explain where you were.</li>
            <li>Check <strong>My support tickets</strong> to see if a ticket is still open and read our replies.</li>
          </ul>
        </section>

        <section class="rounded-xl border-2 border-blue-200 bg-blue-50/80 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Your Free Account</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            <strong class="text-slate-900">Shoresh is free. You never need a credit card.</strong> Anyone can read texts and get translations. Make a free account to also use My Word List, flashcards, My Notes, Classes, Settings, and Support. Click <strong>Login</strong> at the top to sign in with Google or with your email. Your saved work is private and follows you to every device.
          </p>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
          <h3 class="font-semibold text-slate-900 mb-3 text-base">About This Project</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-3">
            Made by <a href="https://cogitations.com" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700 hover:underline font-medium">Cogitations</a>. Shoresh is not part of Sefaria.org, and Sefaria does not run or endorse it.
          </p>
          <ul class="space-y-2 text-slate-600 text-sm">
            <li><strong class="text-slate-700">Texts:</strong> The Hebrew and English texts come from <a href="https://developers.sefaria.org/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Sefaria</a>. We show them; Sefaria provides them.</li>
            <li><strong class="text-slate-700">AI help:</strong> Word-by-word translations, chapter translations, grammar notes, example sentences, and read-aloud audio come from <a href="https://openai.com/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">OpenAI</a>, not Sefaria. AI can make mistakes, so double-check anything important.</li>
          </ul>
          <p class="text-slate-600 text-sm mt-3 leading-relaxed">
            Shoresh couldn't exist without Sefaria. Please think about <a href="https://donate.sefaria.org/" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium">donating to Sefaria</a> to help keep Jewish texts free for everyone.
          </p>
        </section>

        <section class="pt-4 border-t border-slate-200">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">License & Feedback</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Licensed under the <strong>Business Source License 1.1 (BSL 1.1)</strong>. Non‑commercial use and production use for entities with less than $1M in revenue are permitted without a commercial license. Each version automatically converts to <strong>Common Public Attribution License (CPAL) 1.0</strong> three years after the last update by the original author. © 2025–2026 Irv Shapiro / Cogitations, LLC. <a href="https://github.com/ishapiro/sefaria-tutor" target="_blank" rel="noopener" class="text-blue-600 hover:underline">View on GitHub</a>. Suggestions welcome: <a href="mailto:ishapiro@cogitations.com" class="text-blue-600 hover:underline">ishapiro@cogitations.com</a>
          </p>
        </section>
      </div>

      <!-- Footer -->
      <div class="px-8 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
        <button type="button" class="w-full sm:w-auto px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center justify-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400" @click="$emit('close')">Got it</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

const props = defineProps<{
  open: boolean
}>()

const { setSupportView, clearSupportView } = useSupportPageContext()
watch(() => props.open, (isOpen) => {
  if (isOpen) setSupportView(SUPPORT_VIEW_NAMES.HELP)
  else clearSupportView()
}, { immediate: true })

defineEmits<{
  close: []
}>()
</script>
