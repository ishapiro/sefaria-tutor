<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Sefaria Book Reader</h1>
    
    <!-- Spinner while loading the index -->
    <div v-if="loading && (!categories || categories.length === 0)" class="flex justify-center items-center py-12">
      <i class="pi pi-spin pi-spinner" style="font-size: 2.5rem"></i>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Book List -->
      <div v-if="!selectedBook" class="mb-4">
        <div class="flex items-center gap-8 mb-4">
          <span class="p-input-icon-left flex-grow">
            <i class="pi pi-search" />
            <InputText v-model="searchQuery" placeholder="Search books..." class="w-full pl-10 py-2 border rounded" />
          </span>
          <Button 
            icon="pi pi-refresh" 
            label="Refresh Index" 
            @click="refreshIndex" 
            class="p-button-outlined whitespace-nowrap"
            :loading="loading"
          />
        </div>
        <CategoryAccordion 
          :categories="filteredCategories" 
          :loading="loading" 
          @book-select="onBookSelect"
          @tab-open="onCategoryExpand"
        />
        <Dialog v-model:visible="showCategoryDialog" header="Selection Error" :modal="true" :closable="true" :dismissableMask="true" :style="{ width: '350px' }">
          <div class="p-4 text-center">
            <i class="pi pi-exclamation-triangle text-3xl text-red-500 mb-3"></i>
            <div class="mb-2 font-semibold">Please select a book, not a category.</div>
          </div>
        </Dialog>
        <Dialog v-model:visible="showErrorDialog" header="API Error" :modal="true" :closable="true" :dismissableMask="true" :style="{ width: '350px' }">
          <div class="p-4 text-center">
            <i class="pi pi-exclamation-triangle text-3xl text-red-500 mb-3"></i>
            <div class="mb-2 font-semibold">{{ errorMessage }}</div>
          </div>
        </Dialog>
      </div>

      <!-- Book Reader -->
      <div v-else>
        <Card class="mb-4">
          <template #title>
            <div class="flex justify-between items-center">
              <span>
                {{ selectedBook.title }}
                <template v-if="totalRecords > 0 && totalRecords !== 1 && currentChapter">
                  ({{ currentChapter }})
                </template>
              </span>
              <Button icon="pi pi-times" @click="handleCloseBook" class="p-button-text" />
            </div>
          </template>
          <template #content>
            <div v-if="loading" class="text-center">
              <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
            </div>
            <div v-else class="book-content">
              <div v-if="complexSections" class="mb-6">
                <div class="flex items-center mb-2">
                  <button v-if="sectionStack.length > 0" @click="goBackSection" class="mr-2 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">Back</button>
                  <div class="text-lg font-semibold">Select a section:</div>
                </div>
                <ul class="space-y-2">
                  <li v-for="section in complexSections" :key="section.ref">
                    <button @click="fetchBookContent(section.ref)" class="text-blue-600 hover:underline font-medium">
                      {{ section.title }}<span v-if="section.heTitle"> / {{ section.heTitle }}</span>
                    </button>
                  </li>
                </ul>
              </div>
              <div v-if="currentPageText.length === 0 && !loading" class="text-center text-gray-500 py-8">
                <div>
                  This book is not available via the API. Please visit the Sefaria website 
                  at <a href="https://www.sefaria.org" target="_blank">https://www.sefaria.org</a> directly to access it.
                </div>
              </div>
              <div v-else class="verses-flex">
                <div class="verses-header">
                  <div class="english-header">&nbsp;</div>
                  <div class="hebrew-header">Select text to translate</div>
                </div>
                <template v-for="(section, index) in currentPageText" :key="'verse-' + index">
                  <div class="verse-row">
                    <div class="verse-col english-verse">
                      <span class="verse-number">{{ section.displayNumber }}&nbsp;&nbsp;</span>
                      <span v-html="section.en"></span>
                    </div>
                    <div class="verse-col hebrew-verse"
                         @mouseup="handleTextSelection"
                         style="direction: rtl;">
                      <span class="verse-number rtl">{{ toHebrewNumeral(section.displayNumber) }}</span>
                      <span v-html="section.he"></span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
            <Paginator v-if="!complexSections" v-model:first="first" :rows="rowsPerPage" :totalRecords="totalRecords"
                      @page="onPageChange" class="mt-4" />
          </template>
        </Card>
      </div>
    </div>

    <!-- Translation Dialog -->
    <Dialog v-model:visible="showTranslationDialog" 
            :modal="true" 
            :closable="true" 
            :dismissableMask="true"
            :style="{ width: '75vw' }"
            header="Translation">
      <div class="p-4">
        <div v-if="translationLoading" class="text-center">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
        </div>
        <div v-else class="translation-content" v-html="formattedTranslation"></div>
      </div>
    </Dialog>
  </div>
</template>

<script>
import axios from 'axios'
import { ref, computed, onMounted, nextTick } from 'vue'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import CategoryAccordion from './components/CategoryAccordion.vue'
import { marked } from 'marked'
import { log, logTime } from './utils/logger'

export default {
  components: {
    InputText,
    Dialog,
    Accordion,
    AccordionTab,
    DataTable,
    Column,
    CategoryAccordion,
    Button
  },
  data() {
    return {
      fullIndex: null,      // The full index tree
      categories: [],       // Top-level categories for display
      selectedBook: null,
      loading: false,
      currentPageText: [],
      first: 0,
      rowsPerPage: 5,
      totalRecords: 0,
      searchQuery: '',
      showCategoryDialog: false,
      errorMessage: '',
      showErrorDialog: false,
      complexSections: null,
      sectionStack: [],
      tocTree: null,
      expandedCategories: [],
      debug: true,
      showTranslationDialog: false,
      translationLoading: false,
      formattedTranslation: [],
      lastIndexUpdate: null,
      nextSectionRef: null,
      currentChapter: null,
      isComplexBookFlag: false,  // Renamed from isComplexBook to avoid conflict
    }
  },
  computed: {
    filteredCategories() {
      logTime('Start filteredCategories');
      if (!this.searchQuery) {
        logTime('End filteredCategories');
        return this.categories;
      }
      const query = this.searchQuery.toLowerCase();
      function filterCats(cats) {
        return cats
          .map(cat => {
            if (cat.children && cat.children.length) {
              const filteredChildren = filterCats(cat.children);
              if (filteredChildren.length) {
                return { ...cat, children: filteredChildren };
              }
            }
            if ((cat.category || '').toLowerCase().includes(query) || (cat.title || '').toLowerCase().includes(query)) {
              return cat;
            }
            return null;
          })
          .filter(Boolean);
      }
      const result = filterCats(this.categories);
      logTime('End filteredCategories');
      return result;
    }
  },
  async created() {
    logTime('Start created');
    await this.fetchAndCacheFullIndex();
    logTime('End created');
  },
  methods: {
    async fetchAndCacheFullIndex() {
      logTime('Start fetchAndCacheFullIndex');
      
      // Try to load from cache first
      const cachedIndex = localStorage.getItem('sefariaIndex');
      const cachedTimestamp = localStorage.getItem('sefariaIndexTimestamp');
      
      if (cachedIndex && cachedTimestamp) {
        try {
          this.fullIndex = JSON.parse(cachedIndex);
          this.lastIndexUpdate = new Date(cachedTimestamp);
          // Set top-level categories for display
          this.categories = this.fullIndex.map(cat => ({
            ...cat,
            type: 'category',
            path: cat.category || cat.title,
            loaded: false,
            children: []
          }));
          logTime('End fetchAndCacheFullIndex (from cache)');
          return;
        } catch (e) {
          console.error('Error parsing cached index:', e);
          // If there's an error parsing the cache, we'll fetch fresh data
        }
      }
      
      this.loading = true;
      try {
        const response = await axios.get('https://sefaria-proxy-worker.cogitations.workers.dev/proxy/api/index');
        this.fullIndex = response.data;
        this.lastIndexUpdate = new Date();
        
        // Cache the index and timestamp
        localStorage.setItem('sefariaIndex', JSON.stringify(this.fullIndex));
        localStorage.setItem('sefariaIndexTimestamp', this.lastIndexUpdate.toISOString());
        
        // Set top-level categories for display
        this.categories = this.fullIndex.map(cat => ({
          ...cat,
          type: 'category',
          path: cat.category || cat.title,
          loaded: false,
          children: []
        }));
      } catch (error) {
        this.errorMessage = 'Failed to load categories.';
        this.showErrorDialog = true;
      } finally {
        this.loading = false;
        logTime('End fetchAndCacheFullIndex');
      }
    },
    async refreshIndex() {
      // Clear the cache
      localStorage.removeItem('sefariaIndex');
      localStorage.removeItem('sefariaIndexTimestamp');
      
      // Reset the state
      this.fullIndex = null;
      this.categories = [];
      this.selectedBook = null;
      
      // Fetch fresh data
      await this.fetchAndCacheFullIndex();
    },
    onCategoryExpand(category) {
      if (!category.loaded && category.contents) {
        category.children = category.contents.map(child =>
          this.processNode(child, category.path)
        );
        category.loaded = true;
      }
    },
    processNode(node, parentPath) {
      const isCategory = !!node.contents || !!node.category;
      return {
        ...node,
        type: isCategory ? 'category' : 'book',
        path: parentPath + '/' + (node.category || node.title),
        loaded: false,
        children: []
      };
    },
    async onBookSelect(event) {
      this.loading = true;
      
      log(this.debug, 'Book selection event:', {
        type: event.data.type,
        title: event.data.title,
        path: event.data.path,
        categories: event.data.categories,
        fullData: event.data
      });

      if (event.data.type === 'category') {
        this.showCategoryDialog = true;
        this.loading = false;
        return;
      }

      this.selectedBook = event.data;
      this.first = 0;
      
      // Add logging for complex book detection
      const isComplex = await this.isComplexBook(event.data);
      log(this.debug, 'Book complexity check:', {
        title: event.data.title,
        isComplex: isComplex,
        categories: event.data.categories,
        fullData: event.data
      });

      // Set the complex book flag
      this.isComplexBookFlag = isComplex;

      if (isComplex) {
        // For complex books, first try to get the table of contents
        await this.fetchComplexBookToc(event.data);
      } else {
        await this.fetchBookContent();
      }
    },
    async fetchComplexBookToc(book) {
      this.loading = true;
      try {
        // For Talmud books, we need to handle them differently
        if (book.categories?.includes('Talmud')) {
          const ref = book.title.replace(/\s+/g, '_');
          const encodedRef = encodeURIComponent(ref);
          const apiUrl = `https://sefaria-proxy-worker.cogitations.workers.dev/proxy/api/index/${encodedRef}`;
          
          log(this.debug, 'Fetching Talmud TOC:', {
            originalTitle: book.title,
            processedRef: ref,
            encodedRef: encodedRef,
            apiUrl: apiUrl
          });
          
          const response = await axios.get(apiUrl);
          
          if (response.data && response.data.schema) {
            // For Talmud, we need to create sections based on daf numbers
            const sections = [];
            // Get the total number of dafim from the schema
            const totalDafim = response.data.schema.lengths?.[0] || 0;
            
            // Create sections for each daf (both a and b sides)
            for (let daf = 1; daf <= totalDafim; daf++) {
              sections.push({
                ref: `${book.title} ${daf}a`,
                title: `${daf}a`,
                heTitle: `${this.toHebrewNumeral(daf)}א`
              });
              sections.push({
                ref: `${book.title} ${daf}b`,
                title: `${daf}b`,
                heTitle: `${this.toHebrewNumeral(daf)}ב`
              });
            }
            
            this.complexSections = sections;
            log(this.debug, 'Processed Talmud sections:', this.complexSections);
          } else {
            throw new Error('No schema found for Talmud book');
          }
        } else {
          // Original complex book handling
          const ref = book.title.replace(/\s+/g, '_');
          const encodedRef = encodeURIComponent(ref);
          const apiUrl = `https://sefaria-proxy-worker.cogitations.workers.dev/proxy/api/index/${encodedRef}`;
          
          const response = await axios.get(apiUrl);
          
          if (response.data && response.data.schema) {
            this.complexSections = this.processSchemaNodes(response.data.schema.nodes);
            log(this.debug, 'Processed complex sections:', this.complexSections);
          } else {
            throw new Error('No schema found for complex book');
          }
        }
      } catch (error) {
        log(this.debug, 'Error fetching TOC:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        this.errorMessage = 'Failed to load table of contents for this book.';
        this.showErrorDialog = true;
      } finally {
        this.loading = false;
      }
    },
    processSchemaNodes(nodes, parentPath = '') {
      let sections = [];
      
      if (!Array.isArray(nodes)) {
        return sections;
      }

      for (const node of nodes) {
        // If this is a leaf node with titles, add it as a section
        if (node.titles && node.titles.length > 0) {
          const enTitle = node.titles.find(t => t.lang === 'en')?.text || node.title;
          const heTitle = node.titles.find(t => t.lang === 'he')?.text || node.heTitle;
          
          // Clean up the key by removing parenthetical notes and special characters
          const cleanKey = (node.key || node.title).replace(/\s*\([^)]*\)/g, '').trim();
          
          // Build the full reference path
          const fullPath = parentPath ? `${parentPath}/${cleanKey}` : cleanKey;
          
          sections.push({
            ref: fullPath,
            title: enTitle,
            heTitle: heTitle,
            key: cleanKey
          });
        }
        
        // Recursively process child nodes
        if (node.nodes) {
          const cleanKey = (node.key || node.title).replace(/\s*\([^)]*\)/g, '').trim();
          const childPath = parentPath ? `${parentPath}/${cleanKey}` : cleanKey;
          sections = sections.concat(this.processSchemaNodes(node.nodes, childPath));
        }
      }
      
      return sections;
    },
    async fetchBookContent(refOverride = null, stackOverride = null) {
      this.loading = true;
      try {
        const bookTitle = this.selectedBook?.title || '';
        let ref;
        let chapter = 1;
        let sectionLabel = null;
        
        // Check if it's a Talmud book
        const isTalmud = this.selectedBook?.categories?.includes('Talmud');
        
        if (refOverride) {
          // For complex books, use the full path
          if (this.isComplexBookFlag) {
            // Format the reference according to Sefaria's API requirements
            const parts = refOverride.split('/');
            // Remove any parenthetical notes from the last part
            const lastPart = parts[parts.length - 1].replace(/\s*\([^)]*\)/, '');
            parts[parts.length - 1] = lastPart;
            
            // For complex books, we need to include the book title in the path
            // and use the correct format for the API
            ref = `${bookTitle}, ${parts.join(', ')}`;
            // Clean up the reference - replace spaces with underscores and handle apostrophes
            ref = ref.replace(/\s+/g, '_')
                    .replace(/'([A-Za-z])/g, (match, letter) => 'e' + letter.toLowerCase());  // Replace apostrophe + any letter with 'e' + lowercase letter
          }
        } else {
          // Calculate chapter and verse based on pagination
          chapter = Math.floor(this.first / this.rowsPerPage) + 1;
          
          if (isTalmud) {
            // For Talmud, convert chapter number to daf reference (e.g., 2a, 2b)
            const daf = Math.floor((chapter - 1) / 2) + 1;
            const side = (chapter - 1) % 2 === 0 ? 'a' : 'b';
            ref = `${bookTitle} ${daf}${side}`;
            this.currentChapter = `${daf}${side}`;
          } else {
            ref = `${bookTitle} ${chapter}`;
            this.currentChapter = chapter;
          }
        }
        
        // Clean up the reference
        ref = ref.replace(/;/g, '_').replace(/\s+/g, '_');
        const encodedRef = encodeURIComponent(ref);
        const apiUrl = `https://sefaria-proxy-worker.cogitations.workers.dev/proxy/api/texts/${encodedRef}`;
        
        log(this.debug, 'Fetching book content:', {
          originalTitle: bookTitle,
          processedRef: ref,
          encodedRef: encodedRef,
          apiUrl: apiUrl,
          chapter: chapter,
          isComplex: this.isComplexBookFlag,
          isTalmud: isTalmud,
          refOverride: refOverride,
          categoryPath: this.selectedBook?.path
        });

        const response = await axios.get(apiUrl);

        log(this.debug, "Sefaria Proxy Response:", response);
        log(this.debug, "================================================")

        if (response.data && response.data.error) {
          this.errorMessage = `API Error: ${response.data.error}`;
          this.showErrorDialog = true;
          this.loading = false;
          return;
        }

        // Store next/firstAvailableSectionRef for navigation if no content
        this.nextSectionRef = response.data.next || response.data.firstAvailableSectionRef || null;

        let textData = [];
        
        // Special handling for Talmud books
        if (isTalmud && response.data) {
          // For Talmud, we need to use the correct reference format
          const ref = response.data.ref || response.data.sectionRef;
          const dafMatch = ref.match(/(\d+)([ab])/);
          
          // If we have no text content, try to fetch the next available section
          if ((!response.data.text || response.data.text.length === 0) && 
              (!response.data.he || response.data.he.length === 0)) {
            if (response.data.next) {
              log(this.debug, 'No content in current daf, fetching next section:', response.data.next);
              await this.fetchBookContent(response.data.next);
              return;
            }
          }

          // Build verse maps
          const englishTexts = Array.isArray(response.data.text) ? response.data.text : [];
          const hebrewTexts = Array.isArray(response.data.he) ? response.data.he : [];
          
          textData = englishTexts.map((en, idx) => {
            let displayNumber = `${idx + 1}`;
            if (dafMatch) {
              const [_, daf, side] = dafMatch;
              displayNumber = `${daf}${side}:${idx + 1}`;
            }
            
            return {
              number: idx + 1,
              displayNumber,
              en: en || '',
              he: hebrewTexts[idx] || ''
            };
          });

          // If we still have no content, try to fetch the next section
          if (textData.length === 0 && response.data.next) {
            log(this.debug, 'No content after processing, fetching next section:', response.data.next);
            await this.fetchBookContent(response.data.next);
            return;
          }
        } else if (Array.isArray(response.data)) {
          textData = response.data;
          log(this.debug, 'Processing array response data:', {
            length: textData.length,
            structure: textData.map(item => ({
              hasText: !!item.text,
              hasHebrew: !!item.he,
              hasVerses: !!item.verses
            }))
          });
        } else if (this.isComplexBookFlag && response.data.he) {
          // Special handling for complex books with Hebrew text
          const hebrewTexts = Array.isArray(response.data.he) ? response.data.he : [response.data.he];
          log(this.debug, 'Complex book Hebrew texts:', {
            length: hebrewTexts.length,
            isArray: Array.isArray(response.data.he)
          });

          textData = hebrewTexts.map((he, idx) => {
            let displayNumber = `${idx + 1}`;
            // Try to get section information if available
            if (response.data.sections && response.data.sections[idx]) {
              displayNumber = response.data.sections[idx];
            } else if (response.data.sectionRef) {
              displayNumber = response.data.sectionRef;
            }
            
            return {
              number: idx + 1,
              displayNumber,
              en: '',
              he: he
            };
          });
        } else if (response.data.text && response.data.he) {
          // Build verse maps
          const englishTexts = Array.isArray(response.data.text) ? response.data.text : [response.data.text];
          const hebrewTexts = Array.isArray(response.data.he) ? response.data.he : [response.data.he];
          log(this.debug, 'Text arrays:', {
            englishLength: englishTexts.length,
            hebrewLength: hebrewTexts.length
          });
          const enVerses = response.data.verses || englishTexts.map((_, i) => i + 1);
          const heVerses = response.data.he_verses || enVerses;
          log(this.debug, 'Verse arrays:', {
            englishVerses: enVerses.length,
            hebrewVerses: heVerses.length
          });
          // Build maps for fast lookup
          const enMap = {};
          englishTexts.forEach((en, i) => {
            enMap[enVerses[i]] = en;
          });
          const heMap = {};
          hebrewTexts.forEach((he, i) => {
            heMap[heVerses[i]] = he;
          });
          log(this.debug, 'Text maps:', {
            englishMapSize: Object.keys(enMap).length,
            hebrewMapSize: Object.keys(heMap).length
          });
          // Union of all verse numbers
          const allVerseNumbers = Array.from(new Set([...enVerses, ...heVerses])).sort((a, b) => a - b);
          log(this.debug, 'All verse numbers:', {
            count: allVerseNumbers.length,
            range: allVerseNumbers.length > 0 ? `${allVerseNumbers[0]}-${allVerseNumbers[allVerseNumbers.length - 1]}` : 'none'
          });

          // Branch logic: Tanakh vs. other
          const isTanakh = this.selectedBook?.categories?.includes('Tanakh');
          if (isTanakh) {
            textData = allVerseNumbers.map((num, idx) => {
              return {
                number: num,
                displayNumber: `${chapter}:${idx + 1}`,
                en: enMap[num] || '',
                he: heMap[num] || ''
              };
            });
          } else {
            // Previous logic: try to get displayNumber from Sefaria fields, fallback to num
            let enRefs = response.data.textRefs || response.data.verseMapping || response.data.versesRefs || null;
            if (!enRefs && response.data.verses && typeof response.data.verses[0] === 'string') {
              enRefs = response.data.verses;
            }
            textData = allVerseNumbers.map((num, idx) => {
              let displayNumber = num;
              if (enRefs && enRefs[idx]) {
                const match = enRefs[idx].match(/(\d+):(\d+)/);
                if (match) {
                  displayNumber = `${match[1]}:${match[2]}`;
                } else {
                  displayNumber = enRefs[idx];
                }
              }
              return {
                number: num,
                displayNumber,
                en: enMap[num] || '',
                he: heMap[num] || ''
              };
            });
          }
        } else if (response.data.he) {
          // Handle books with only Hebrew text
          const hebrewTexts = Array.isArray(response.data.he) ? response.data.he : [response.data.he];
          log(this.debug, 'Hebrew only texts:', {
            length: hebrewTexts.length,
            isArray: Array.isArray(response.data.he)
          });
          
          // If we have Hebrew text but no verses, treat each text entry as a verse
          textData = hebrewTexts.map((he, idx) => {
            // Try to get a more descriptive display number if available
            let displayNumber = `${idx + 1}`;
            if (response.data.verses && response.data.verses[idx]) {
              const match = response.data.verses[idx].match(/(\d+):(\d+)/);
              if (match) {
                displayNumber = `${match[1]}:${match[2]}`;
              } else {
                displayNumber = response.data.verses[idx];
              }
            }
            
            return {
              number: idx + 1,
              displayNumber,
              en: '',
              he: he
            };
          });
        } else if (response.data.text) {
          textData = Array.isArray(response.data.text) ? response.data.text : [response.data.text];
          log(this.debug, 'English only texts:', {
            length: textData.length,
            isArray: Array.isArray(response.data.text)
          });
          textData = textData.map((en, idx) => ({
            en,
            he: '',
            number: idx + 1,
            displayNumber: `${idx + 1}`
          }));
        } else if (response.data.he && response.data.en) {
          textData = [{
            ...response.data,
            number: 1,
            displayNumber: '1'
          }];
        } else if (typeof response.data === 'string') {
          textData = [{ he: response.data, en: '', number: 1, displayNumber: '1' }];
        }

        // Get the total number of verses in the chapter
        const totalVerses = textData.length;
        this.totalRecords = totalVerses;
        log(this.debug, 'Total verses:', totalVerses);

        // Slice the text data based on the current page
        const startIndex = this.first % this.rowsPerPage;
        const endIndex = Math.min(startIndex + this.rowsPerPage, totalVerses);
        const pageText = textData.slice(startIndex, endIndex);
        log(this.debug, 'Page text slice:', {
          startIndex,
          endIndex,
          length: pageText.length,
          hasContent: pageText.some(item => item.en || item.he),
          items: pageText.map(item => ({
            number: item.number,
            displayNumber: item.displayNumber,
            hasHebrew: !!item.he,
            hasEnglish: !!item.en,
            hebrewLength: item.he?.length || 0,
            englishLength: item.en?.length || 0,
            hebrewPreview: item.he?.substring(0, 50) + (item.he?.length > 50 ? '...' : ''),
            englishPreview: item.en?.substring(0, 50) + (item.en?.length > 50 ? '...' : '')
          }))
        });

        this.currentPageText = pageText.map(text => {
          return {
            he: text.he || '',
            en: text.en || '',
            number: text.number || 1,
            displayNumber: text.displayNumber || text.number || 1
          };
        });
        log(this.debug, 'Final currentPageText:', {
          length: this.currentPageText.length,
          hasContent: this.currentPageText.some(item => item.en || item.he),
          items: this.currentPageText.map(item => ({
            number: item.number,
            displayNumber: item.displayNumber,
            hasHebrew: !!item.he,
            hasEnglish: !!item.en,
            hebrewLength: item.he?.length || 0,
            englishLength: item.en?.length || 0,
            hebrewPreview: item.he?.substring(0, 50) + (item.he?.length > 50 ? '...' : ''),
            englishPreview: item.en?.substring(0, 50) + (item.en?.length > 50 ? '...' : '')
          }))
        });

        // Only show no content message if there's no Hebrew text either
        if (this.currentPageText.length === 0 && !response.data.he) {
          this.errorMessage = 'This book is not available via the API. Please visit the Sefaria website directly to access it.';
          this.showErrorDialog = true;
        }

        // If there is no content and a next section is available, automatically fetch the next section
        if (this.currentPageText.length === 0 && this.nextSectionRef && !refOverride) {
          await this.fetchBookContent(this.nextSectionRef);
          return;
        }

        // Log the full currentPageText array
        log(this.debug, '[currentPageText]', JSON.stringify(this.currentPageText, null, 2));
        // Wait for DOM update, then log computed styles
        await nextTick();

        this.complexSections = null;
        log(this.debug, 'Processed text data:', {
          sections: this.currentPageText.length,
          hasContent: this.currentPageText.length > 0,
          totalVerses: totalVerses,
          startIndex: startIndex,
          endIndex: endIndex
        });
      } catch (error) {
        log(this.debug, 'Error fetching content:', {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url
        });
        this.currentPageText = [];
        this.totalRecords = 0;
        
        // Show specific message for 500 errors with complex books
        if (error.response?.status === 500 && this.isComplexBookFlag) {
          this.errorMessage = 'This section is not available via the API. Please try another section.';
        } else if (error.response?.status === 400) {
          this.errorMessage = `This book (${this.selectedBook.title}) is not available via the API. Please visit the Sefaria website directly to access it.`;
        } else {
          this.errorMessage = error.message;
        }
        
        this.showErrorDialog = true;
        this.complexSections = null;
        this.nextSectionRef = null;
      }
      this.loading = false;
    },
    async isComplexBook(book) {
      if (!book) return false;
      
      // Check if it's a Talmud book
      const isTalmud = book.categories?.includes('Talmud');
      if (isTalmud) {
        return true; // Talmud books are complex and need special handling
      }
      
      try {
        // Try to fetch the book content
        const ref = book.title.replace(/\s+/g, '_');
        const encodedRef = encodeURIComponent(ref);
        const apiUrl = `https://sefaria-proxy-worker.cogitations.workers.dev/proxy/api/texts/${encodedRef}`;
        
        await axios.get(apiUrl);
        // If we get here, it's a simple text
        return false;
      } catch (error) {
        // Check if the error indicates a complex text
        const isComplex = error.response?.data?.error?.includes('complex') && 
                         error.response?.data?.error?.includes('book-level ref');
        
        log(this.debug, 'Complex book detection:', {
          title: book.title,
          isComplex: isComplex,
          error: error.response?.data?.error
        });
        
        return isComplex;
      }
    },
    findTocNode(ref, node) {
      if (!node) return null;
      
      // Check if this node matches the ref
      if (node.ref === ref || 
          (node.category && `${node.category}/${node.title}` === ref) ||
          node.title === ref) {
        return node;
      }

      // Search in contents
      if (node.contents) {
        for (const child of node.contents) {
          const found = this.findTocNode(ref, child);
          if (found) return found;
        }
      }

      return null;
    },
    async onPageChange(event) {
      this.first = event.first;
      await this.fetchBookContent();
    },
    goBackSection() {
      if (this.sectionStack.length > 1) {
        const newStack = this.sectionStack.slice(0, -1);
        const last = newStack[newStack.length - 1];
        this.fetchBookContent(last.ref, newStack);
      } else {
        // Go back to the book root
        this.sectionStack = [];
        this.fetchBookContent(this.selectedBook.ref, []);
      }
    },
    toggleCategory(category) {
      const index = this.expandedCategories.indexOf(category);
      if (index === -1) {
        this.expandedCategories.push(category);
      } else {
        this.expandedCategories.splice(index, 1);
      }
    },
    onBackFromBook() {
      logTime('Start onBackFromBook');
      this.selectedBook = null;
      logTime('End onBackFromBook');
    },
    handleTextSelection(event) {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText) {
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = selectedText;
        // Get the text content without HTML tags
        const cleanText = tempDiv.textContent || tempDiv.innerText;
        
        this.translate_with_openai(cleanText);
        
        // Clear the selection
        selection.removeAllRanges();
      }
    },
    async translate_with_openai(text) {
      try {
        this.translationLoading = true;
        this.showTranslationDialog = true;
        log(this.debug, 'Making translation request for text:', text);
        
        const requestBody = {
          prompt: `Translate this Hebrew text to English and return the response as a JSON object with the following structure:
{
  "originalPhrase": "Hebrew text",
  "translatedPhrase": "English translation",
  "wordTable": [
    {
      "word": "Hebrew word",
      "wordRoot": "root letters",
      "wordPartOfSpeech": "part of speech",
      "wordBinyan": "binyan or null",
      "wordGender": "gender or null",
      "wordTense": "tense or null"
    }
  ]
}: ${text}`,
          model: 'gpt-3.5-turbo'
        };
        log(this.debug, 'Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://sefaria-openai.cogitations.workers.dev', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_AUTH_TOKEN}`
          },
          body: JSON.stringify(requestBody)
        });

        log(this.debug, 'Response status:', response.status);
        log(this.debug, 'Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          throw new Error('Translation request failed');
        }

        const data = await response.json();
        log(this.debug, 'Response data:', JSON.stringify(data, null, 2));
        
        if (data.choices && Array.isArray(data.choices)) {
          data.choices.forEach((choice, index) => {
            log(this.debug, `Choice ${index}:`, JSON.stringify(choice, null, 2));
          });
          
          // Parse the content as JSON
          try {
            log(this.debug, 'Raw translation content:', data.choices[0].message.content);
            
            // Try to clean the content if it's not valid JSON
            let contentToParse = data.choices[0].message.content;
            if (!contentToParse.trim().startsWith('{')) {
              log(this.debug, 'Content does not start with {, attempting to extract JSON');
              // Try to find JSON-like content between curly braces
              const jsonMatch = contentToParse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                contentToParse = jsonMatch[0];
                log(this.debug, 'Extracted JSON content:', contentToParse);
              }
            }
            
            const translationData = JSON.parse(contentToParse);
            log(this.debug, 'Successfully parsed translation data:', translationData);
            
            // Validate the required fields
            if (!translationData.originalPhrase || !translationData.translatedPhrase || !translationData.wordTable) {
              throw new Error('Missing required fields in translation data');
            }
            
            // Create HTML table structure
            let tableHtml = `
              <div class="translation-container">
                <div class="translation-header">
                  <h3>Translation</h3>
                  <div class="translation-text">
                    <div class="hebrew-text">${translationData.originalPhrase}</div>
                    <div class="english-text">${translationData.translatedPhrase}</div>
                  </div>
                </div>
                <div class="word-by-word">
                  <h3>Word Analysis</h3>
                  <table class="translation-table">
                    <thead>
                      <tr>
                        <th>Word</th>
                        <th>Root</th>
                        <th>Part of Speech</th>
                        <th>Binyan</th>
                        <th>Gender</th>
                        <th>Tense</th>
                      </tr>
                    </thead>
                    <tbody>
            `;
            
            // Add each word to the table
            translationData.wordTable.forEach(word => {
              tableHtml += `
                <tr>
                  <td class="hebrew-word">${word.word}</td>
                  <td class="root-letters">${word.wordRoot || '-'}</td>
                  <td class="part-of-speech">${word.wordPartOfSpeech || '-'}</td>
                  <td class="binyan">${word.wordBinyan || '-'}</td>
                  <td class="gender">${word.wordGender || '-'}</td>
                  <td class="tense">${word.wordTense || '-'}</td>
                </tr>
              `;
            });
            
            // Close the table
            tableHtml += `
                    </tbody>
                  </table>
                </div>
              </div>
            `;
            
            this.formattedTranslation = tableHtml;
          } catch (parseError) {
            log(this.debug, 'Error parsing translation JSON:', {
              error: parseError,
              errorMessage: parseError.message,
              errorStack: parseError.stack,
              rawContent: data.choices[0].message.content,
              contentLength: data.choices[0].message.content.length,
              contentPreview: data.choices[0].message.content.substring(0, 100) + '...'
            });
            
            // Show the raw response content when JSON parsing fails
            const rawContent = data.choices[0].message.content;
            this.formattedTranslation = `
              <div class="translation-container">
                <div class="translation-header">
                  <h3>Translation</h3>
                  <div class="translation-text">
                    <div class="hebrew-text">${rawContent}</div>
                  </div>
                </div>
                <div class="translation-error">
                  <p>Note: The response could not be parsed as structured data. Showing raw translation.</p>
                </div>
              </div>
            `;
          }
        }
      } catch (error) {
        log(this.debug, 'Translation error:', error);
        log(this.debug, 'Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        alert('Failed to translate text. Please try again.');
      } finally {
        this.translationLoading = false;
      }
    },
    toHebrewNumeral(num) {
      const hebrewNumerals = {
        1: 'א',
        2: 'ב',
        3: 'ג',
        4: 'ד',
        5: 'ה',
        6: 'ו',
        7: 'ז',
        8: 'ח',
        9: 'ט',
        10: 'י',
        20: 'כ',
        30: 'ל',
        40: 'מ',
        50: 'נ',
        60: 'ס',
        70: 'ע',
        80: 'פ',
        90: 'צ',
        100: 'ק',
        200: 'ר',
        300: 'ש',
        400: 'ת'
      };

      if (num === 0) return '';
      if (num <= 10) return hebrewNumerals[num];
      
      let result = '';
      let remaining = num;
      
      // Handle special case for 15 and 16
      if (num === 15) return 'טו';
      if (num === 16) return 'טז';
      
      // Handle hundreds
      if (remaining >= 100) {
        const hundreds = Math.floor(remaining / 100);
        result += hebrewNumerals[hundreds * 100];
        remaining %= 100;
      }
      
      // Handle tens
      if (remaining >= 10) {
        const tens = Math.floor(remaining / 10);
        result += hebrewNumerals[tens * 10];
        remaining %= 10;
      }
      
      // Handle ones
      if (remaining > 0) {
        result += hebrewNumerals[remaining];
      }
      
      return result;
    },
    async goToNextSection() {
      if (this.nextSectionRef) {
        this.first = 0;
        await this.fetchBookContent(this.nextSectionRef);
      }
    },
    handleCloseBook() {
      this.loading = false;
      
      if (this.isComplexBookFlag) {
        if (this.currentPageText.length > 0) {
          // If we're viewing a section of a complex book, return to TOC
          this.currentPageText = [];
          this.totalRecords = 0;
          this.sectionStack = [];
          this.nextSectionRef = null;
          this.errorMessage = '';
          this.showErrorDialog = false;
          // Keep selectedBook and complexSections for TOC view
          this.fetchComplexBookToc(this.selectedBook);
        } else {
          // If we're at the TOC, return to home
          this.currentPageText = [];
          this.totalRecords = 0;
          this.sectionStack = [];
          this.complexSections = null;
          this.nextSectionRef = null;
          this.errorMessage = '';
          this.showErrorDialog = false;
          this.isComplexBookFlag = false;
          this.selectedBook = null;
        }
      } else {
        // For non-complex books, return to home
        this.currentPageText = [];
        this.totalRecords = 0;
        this.sectionStack = [];
        this.complexSections = null;
        this.nextSectionRef = null;
        this.errorMessage = '';
        this.showErrorDialog = false;
        this.isComplexBookFlag = false;
        this.selectedBook = null;
      }
    },
  }
}
</script>

<style>
.container {
  max-width: 1200px;
}

.hebrew-text {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  font-size: 1.2rem;
  line-height: 1.6;
  direction: rtl;
  text-align: right;
}

.english-text {
  font-size: 1rem;
  line-height: 1.4;
  color: #666;
}

.book-content {
  min-height: 400px;
}

.english-column, .hebrew-column {
  padding: 1rem;
}

.english-column {
  border-right: 1px solid #eee;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* Add responsive styles for mobile devices */
@media screen and (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .english-column {
    border-right: none;
    border-bottom: 1px solid #eee;
    padding-bottom: 2rem;
  }

  .hebrew-column {
    padding-top: 2rem;
  }

  /* Make the translation dialog full width on mobile */
  :deep(.p-dialog) {
    width: 95vw !important;
    max-width: 95vw !important;
  }

  /* Adjust text sizes for better mobile readability */
  .hebrew-text {
    font-size: 1.1rem;
  }

  .english-text {
    font-size: 0.95rem;
  }

  /* Adjust spacing for mobile */
  .container {
    padding: 0.5rem;
  }

  .mb-4 {
    margin-bottom: 0.75rem;
  }
}

/* Add styles for Sefaria's inline formatting */
.footnote-marker {
  color: #666;
  font-size: 0.8em;
  vertical-align: super;
}

.footnote {
  font-style: italic;
  color: #666;
}

.mam-spi-pe {
  color: #666;
  font-size: 0.9em;
}

big {
  font-size: 1.2em;
}

small {
  font-size: 0.8em;
}

.category-heading {
  margin: 2rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eee;
}

.category-heading h3 {
  color: #2c3e50;
  margin: 0;
}

.p-column-filter {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.p-input-icon-left {
  position: relative;
}

.p-input-icon-left i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.p-input-icon-left input {
  padding-left: 2.5rem;
}

.book-list {
  max-height: 70vh;
  overflow-y: auto;
}

.category-row {
  transition: background-color 0.2s;
}

.book-row {
  transition: background-color 0.2s;
}

.book-row:hover {
  background-color: #f9fafb;
}

/* Add styles for the chevron animation */
.pi-chevron-right, .pi-chevron-down {
  transition: transform 0.2s;
}

/* Add PrimeVue specific styles */
.p-accordion {
  margin-bottom: 1rem;
}

.p-accordion-tab {
  margin-bottom: 0.5rem;
}

.p-datatable {
  font-size: 0.9rem;
}

.p-datatable .p-datatable-thead > tr > th {
  background-color: #f8fafc;
  color: #1f2937;
  font-weight: 600;
  padding: 0.75rem;
}

.p-datatable .p-datatable-tbody > tr > td {
  padding: 0.75rem;
}

.p-datatable .p-datatable-tbody > tr:hover {
  background-color: #f9fafb;
}

.p-paginator {
  padding: 0.5rem;
}

.translation-content {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  line-height: 1.6;
}

.translation-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 1.1rem;
}

.translation-content th,
.translation-content td {
  padding: 0.75rem;
  border: 1px solid #ddd;
  text-align: left;
}

.translation-content th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #2c3e50;
  font-size: 1.1rem;
}

.translation-content td {
  color: #666;
}

.translation-content tr:hover {
  background-color: #f8f9fa;
}

.translation-content .hebrew-word {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  font-size: 1.3rem;
  color: #2c3e50;
}

.translation-content .english-word {
  font-family: Arial, sans-serif;
  font-size: 1.1rem;
  color: #666;
}

/* Additional styles for other markdown elements */
.translation-content h1,
.translation-content h2,
.translation-content h3,
.translation-content h4,
.translation-content h5,
.translation-content h6 {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.translation-content p {
  margin-bottom: 1rem;
}

.translation-content ul,
.translation-content ol {
  margin-bottom: 1rem;
  padding-left: 2rem;
}

.translation-content li {
  margin-bottom: 0.5rem;
}

.translation-content code {
  background-color: #f8f9fa;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
}

.translation-content pre {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.translation-content blockquote {
  border-left: 4px solid #ddd;
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 1rem;
  color: #666;
}

.word-section {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.hebrew-word {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  font-size: 1.2rem;
  color: #2c3e50;
}

.english-word {
  font-family: Arial, sans-serif;
  color: #666;
}

.root-section,
.pattern-section,
.verb-form-section,
.tense-section,
.translation-section {
  margin-left: 1rem;
  font-size: 0.9rem;
  color: #666;
}

.translation-section {
  font-weight: bold;
  color: #2c3e50;
  margin-top: 0.5rem;
}

.translation-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-size: 0.9rem;
}

.translation-table th {
  background-color: #f8f9fa;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e9ecef;
  white-space: nowrap;
}

.translation-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e9ecef;
  vertical-align: top;
}

.translation-table .hebrew-word {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  font-size: 1.2rem;
  color: #2c3e50;
  text-align: right;
  direction: rtl;
  min-width: 80px;
}

.translation-table .root-letters {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  color: #666;
  min-width: 60px;
}

.translation-table .part-of-speech {
  color: #666;
  min-width: 100px;
}

.translation-table .binyan {
  color: #666;
  min-width: 80px;
}

.translation-table .gender {
  color: #666;
  min-width: 80px;
}

.translation-table .tense {
  color: #666;
  min-width: 80px;
}

.translation-table tr:hover {
  background-color: #f8f9fa;
}

@media screen and (max-width: 768px) {
  .translation-table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
    font-size: 0.85rem;
  }
  
  .translation-table th,
  .translation-table td {
    padding: 0.5rem;
  }
  
  .translation-table .hebrew-word {
    font-size: 1.1rem;
  }
}

.p-button-outlined {
  border: 1px solid #2196F3;
  color: #2196F3;
  background: transparent;
}

.p-button-outlined:hover {
  background: rgba(33, 150, 243, 0.1);
}

.p-button-outlined:disabled {
  border-color: #ccc;
  color: #ccc;
}

.column-header {
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1.5rem;
  color: #1976d2;
}

.verse-number {
  font-size: 0.9rem;
  color: #666;
  font-weight: bold;
}

.verse-number.rtl {
  margin-left: 0.5rem;
  margin-right: 0;
  display: inline;
}

.hebrew-column .verse-number {
  margin-right: 0;
  margin-left: 0.5rem;
  display: block;
  margin-top: 0.25rem;
}

.english-text, .hebrew-text {
  display: inline;
}

.hebrew-verse-line {
  display: inline-block;
  width: 100%;
  white-space: pre-line;
}

.verses-flex {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.verses-header {
  display: flex;
  flex-direction: row;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.english-header, .hebrew-header {
  flex: 1 1 0;
  text-align: center;
  font-size: 1.1rem;
  color: #1976d2;
}

.verse-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1rem;
}

.verse-col {
  flex: 1 1 0;
  padding: 0.25rem 0.5rem;
  min-width: 0;
  word-break: break-word;
}

.english-verse {
  text-align: left;
  font-size: 0.95rem;
  line-height: 1.4;
}

.hebrew-verse {
  text-align: right;
  direction: rtl;
  font-size: 1.4rem;
  line-height: 1.6;
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
}

.translation-container {
  padding: 1rem;
}

.translation-header {
  margin-bottom: 2rem;
}

.translation-header h3,
.word-by-word h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.translation-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.translation-text .hebrew-text {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  font-size: 1.4rem;
  line-height: 1.6;
  color: #2c3e50;
  text-align: right;
  direction: rtl;
}

.translation-text .english-text {
  font-size: 1.1rem;
  line-height: 1.4;
  color: #666;
}

.word-by-word {
  margin-top: 2rem;
}

.translation-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-size: 0.9rem;
}

.translation-table th {
  background-color: #f8f9fa;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e9ecef;
  white-space: nowrap;
}

.translation-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e9ecef;
  vertical-align: top;
}

.translation-table .hebrew-word {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  font-size: 1.2rem;
  color: #2c3e50;
  text-align: right;
  direction: rtl;
  min-width: 80px;
}

.translation-table .root-letters {
  font-family: 'SBL Hebrew', 'Times New Roman', serif;
  color: #666;
  min-width: 60px;
}

.translation-table .part-of-speech {
  color: #666;
  min-width: 100px;
}

.translation-table .binyan {
  color: #666;
  min-width: 80px;
}

.translation-table .gender {
  color: #666;
  min-width: 80px;
}

.translation-table .tense {
  color: #666;
  min-width: 80px;
}

.translation-table tr:hover {
  background-color: #f8f9fa;
}

@media screen and (max-width: 768px) {
  .translation-table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
    font-size: 0.85rem;
  }
  
  .translation-table th,
  .translation-table td {
    padding: 0.5rem;
  }
  
  .translation-table .hebrew-word {
    font-size: 1.1rem;
  }
}

.translation-error {
  padding: 2rem;
  text-align: center;
  color: #dc3545;
}

.translation-error h3 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.translation-error p {
  color: #666;
}
</style> 