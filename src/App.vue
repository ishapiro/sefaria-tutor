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
        <div class="mb-4">
          <span class="p-input-icon-left w-full">
            <i class="pi pi-search" />
            <InputText v-model="searchQuery" placeholder="Search books..." class="w-full pl-10 py-2 border rounded" />
          </span>
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
              <span>{{ selectedBook.title }}</span>
              <Button icon="pi pi-times" @click="selectedBook = null" class="p-button-text" />
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
              <div v-if="!complexSections && !currentPageText.length" class="text-center text-gray-500 py-8">
                <div>No content or sections found for this book.</div>
                <div class="mt-2 text-xs">(Debug: If you expected sections, check the console for the full API response.)</div>
              </div>
              <div v-else-if="!complexSections" class="grid grid-cols-2 gap-4">
                <div class="english-column">
                  <template v-for="(section, index) in currentPageText" :key="'en-' + index">
                    <div v-if="section.isHeading" class="mb-4 border-b-2 border-gray-200 pb-2 mt-8">
                      <h3 class="text-xl font-bold">{{ section.en }}</h3>
                    </div>
                    <div v-else class="mb-4">
                      <div class="english-text" v-html="section.en"></div>
                    </div>
                  </template>
                </div>
                <div class="hebrew-column">
                  <template v-for="(section, index) in currentPageText" :key="'he-' + index">
                    <div v-if="section.isHeading" class="mb-4 border-b-2 border-gray-200 pb-2 mt-8">
                      <h3 class="text-xl font-bold text-right">{{ section.he }}</h3>
                    </div>
                    <div v-else class="mb-4">
                      <div class="hebrew-text text-right" v-html="section.he"></div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <Paginator v-if="!complexSections" v-model:first="first" :rows="rowsPerPage" :totalRecords="totalRecords"
                      @page="onPageChange" class="mt-4" />
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { ref, computed } from 'vue'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import CategoryAccordion from './components/CategoryAccordion.vue'

let lastTime = performance.now();
function logTime(label) {
  const now = performance.now();
  console.log(`[Timing] ${label}: ${(now - lastTime).toFixed(2)}ms`);
  lastTime = now;
}

export default {
  components: {
    InputText,
    Dialog,
    Accordion,
    AccordionTab,
    DataTable,
    Column,
    CategoryAccordion
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
      debug: true
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
    log(...args) {
      if (this.debug) {
        console.log(...args);
      }
    },
    async fetchAndCacheFullIndex() {
      logTime('Start fetchAndCacheFullIndex');
      if (this.fullIndex) return; // Already cached
      this.loading = true;
      try {
        const response = await axios.get('https://sefaria-proxy-worker.cogitations.workers.dev/proxy/api/index');
        this.fullIndex = response.data;
        // Set top-level categories for display, but do not process children yet
        this.categories = this.fullIndex.map(cat => ({
          ...cat,
          type: 'category',
          path: cat.category || cat.title,
          loaded: false, // Not loaded yet
          children: []   // Will process on demand
        }));
      } catch (error) {
        this.errorMessage = 'Failed to load categories.';
        this.showErrorDialog = true;
      } finally {
        this.loading = false;
        logTime('End fetchAndCacheFullIndex');
      }
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
      if (event.data.type === 'category') {
        this.showCategoryDialog = true;
        return;
      }
      this.selectedBook = event.data;
      this.first = 0;
      await this.fetchBookContent();
    },
    async fetchBookContent(refOverride = null, stackOverride = null) {
      this.loading = true;
      try {
        const bookTitle = this.selectedBook?.title || '';
        const ref = (refOverride || bookTitle).replace(/;/g, '_').replace(/\s+/g, '_');
        const encodedRef = encodeURIComponent(ref);
        const apiUrl = `https://sefaria-proxy-worker.cogitations.workers.dev/proxy/api/texts/${encodedRef}`;
        this.log('Fetching from URL:', apiUrl);
        
        const response = await axios.get(apiUrl, {
          params: {
            offset: this.first,
            limit: this.rowsPerPage
          }
        });

        this.log('API Response:', {
          status: response.status,
          hasText: !!response.data.text,
          hasHebrew: !!response.data.he,
          isArray: Array.isArray(response.data)
        });

        let textData = [];
        if (Array.isArray(response.data)) {
          textData = response.data;
        } else if (response.data.text && response.data.he) {
          const englishTexts = Array.isArray(response.data.text) ? response.data.text : [response.data.text];
          const hebrewTexts = Array.isArray(response.data.he) ? response.data.he : [response.data.he];
          textData = englishTexts.map((en, index) => ({
            en: en,
            he: hebrewTexts[index] || ''
          }));
        } else if (response.data.text) {
          textData = Array.isArray(response.data.text) ? response.data.text : [response.data.text];
        } else if (response.data.he && response.data.en) {
          textData = [response.data];
        } else if (typeof response.data === 'string') {
          textData = [{ he: response.data, en: '' }];
        }

        this.currentPageText = textData.map(text => {
          if (typeof text === 'string') {
            return { he: text, en: '' };
          }
          return {
            he: text.he || text.hebrew || text.text || '',
            en: text.en || text.english || text.translation || ''
          };
        });

        this.totalRecords = response.data.length || textData.length || 1;
        this.complexSections = null;
        this.log('Processed text data:', {
          sections: this.currentPageText.length,
          hasContent: this.currentPageText.length > 0
        });
      } catch (error) {
        this.log('Error fetching content:', {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url
        });
        this.currentPageText = [];
        this.totalRecords = 0;
        this.errorMessage = error.message;
        this.showErrorDialog = true;
        this.complexSections = null;
      }
      this.loading = false;
    },
    isComplexBook(book) {
      // Check if the book is a Siddur or other complex book based on categories
      return book && (
        book.categories?.some(cat => 
          cat.toLowerCase().includes('siddur') || 
          cat.toLowerCase().includes('machzor')
        ) ||
        book.title?.toLowerCase().includes('siddur') || 
        book.title?.toLowerCase().includes('machzor')
      );
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
    }
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

.mb-4 {
  margin-bottom: 1rem;
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
</style> 