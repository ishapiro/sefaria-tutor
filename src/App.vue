<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Sefaria Book Reader</h1>
    
    <!-- Book List -->
    <div v-if="!selectedBook" class="mb-4">
      <div class="mb-4">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search books..." class="w-full pl-10 py-2 border rounded" />
        </span>
      </div>
      <DataTable :value="filteredBooks" :loading="loading" selectionMode="single" 
                @row-select="onBookSelect" class="p-datatable-sm"
                :paginator="true" :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown">
        <Column header="Type" class="w-24">
          <template #body="slotProps">
            <span v-if="slotProps.data.isCategory" class="text-green-600 font-semibold">Category</span>
            <span v-else class="text-gray-700">Book</span>
          </template>
        </Column>
        <Column field="title" header="Title" :sortable="true" />
        <Column field="heTitle" header="Hebrew Title" :sortable="true" />
        <Column field="category" header="Category" :sortable="true" />
      </DataTable>
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
</template>

<script>
import axios from 'axios'
import { ref, computed } from 'vue'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'

export default {
  components: {
    InputText,
    Dialog
  },
  data() {
    return {
      books: [],
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
      tocTree: null // Table of Contents tree
    }
  },
  computed: {
    filteredBooks() {
      if (!this.searchQuery) return this.books
      
      const query = this.searchQuery.toLowerCase()
      return this.books.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.heTitle.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query)
      )
    }
  },
  async created() {
    await this.fetchBooks();
    await this.fetchTocTree();
  },
  methods: {
    async fetchBooks() {
      this.loading = true
      try {
        const response = await axios.get('https://www.sefaria.org/api/index')
        
        // Process the array of categories and their nested contents
        this.books = response.data.flatMap(category => {
          if (!category.contents) return []
          
          return category.contents.flatMap(book => {
            // If the book has its own contents, it's a category
            if (book.contents) {
              // Add category heading
              const categoryHeading = {
                title: book.title || book.enShortDesc || 'Untitled',
                heTitle: book.heTitle || book.heShortDesc || '',
                category: category.category || 'Uncategorized',
                ref: book.ref || book.title,
                isCategory: true
              }
              
              // Map sub-books
              const subBooks = book.contents.map(subBook => ({
                ...subBook,
                title: subBook.title || subBook.enShortDesc || 'Untitled',
                heTitle: subBook.heTitle || subBook.heShortDesc || '',
                category: book.title || category.category || 'Uncategorized',
                ref: subBook.ref || subBook.title,
                parentCategory: book.title
              }))
              
              return [categoryHeading, ...subBooks]
            }
            // Otherwise, it's a book
            return [{
              ...book,
              title: book.title || book.enShortDesc || 'Untitled',
              heTitle: book.heTitle || book.heShortDesc || '',
              category: category.category || 'Uncategorized',
              ref: book.ref || book.title
            }]
          })
        })
      } catch (error) {
        console.error('Error fetching books:', error)
      }
      this.loading = false
    },
    async fetchTocTree() {
      try {
        const response = await axios.get('/api/table_of_contents', {
          headers: { Accept: 'application/json' }
        });
        this.tocTree = response.data;
        //console.log('TOC Tree:', this.tocTree);
      } catch (error) {
        console.error('Error fetching TOC tree:', error);
        this.tocTree = null;
      }
    },
    async onBookSelect(event) {
      if (!event.data.ref || event.data.isCategory) {
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
        // If this is a complex book, use the TOC tree to navigate
        let ref = refOverride || this.selectedBook.ref;
        // If the selected book is a Siddur or other complex book, use TOC
        if (this.isComplexBook(this.selectedBook)) {
          // Find the node in the TOC tree
          let node = this.findTocNode(ref, this.tocTree);
          if (node && node.contents) {
            this.complexSections = node.contents
              .filter(item => item.title)
              .map(item => ({
                ref: item.ref || item.title,
                title: item.title,
                heTitle: item.heTitle || '',
                isCategory: !!item.contents
              }));
            this.currentPageText = [];
            // Update the stack for navigation
            if (stackOverride) {
              this.sectionStack = stackOverride;
            } else if (refOverride) {
              this.sectionStack.push({ ref: refOverride, title: node.title || refOverride });
            } else {
              this.sectionStack = [];
            }
            this.loading = false;
            return;
          } else if (node && node.ref) {
            // It's a leaf node, fetch the text
            ref = node.ref;
          } else {
            this.complexSections = null;
            this.currentPageText = [];
            this.loading = false;
            return;
          }
        }
        // Otherwise, fetch the text as usual
        const apiUrl = `/api/texts/${encodeURIComponent(ref)}`;
        const response = await axios.get(apiUrl, {
          params: {
            offset: this.first,
            limit: this.rowsPerPage
          },
          headers: {
            Accept: 'application/json'
          }
        });
        // Log the full API response for debugging
        console.log('Full API response:', response.data);
        // Detect and handle non-JSON (HTML) responses
        if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE html>')) {
          this.currentPageText = [];
          this.errorMessage = 'Invalid response from Sefaria API. Please try a different section.';
          this.showErrorDialog = true;
          this.totalRecords = 0;
          this.complexSections = null;
          this.loading = false;
          return;
        }
        // Handle Sefaria API error
        if (response.data.error) {
          this.currentPageText = [];
          this.errorMessage = response.data.error;
          this.showErrorDialog = true;
          this.totalRecords = 0;
          this.complexSections = null;
          this.loading = false;
          return;
        }
        // Handle text
        let textData = [];
        if (Array.isArray(response.data)) {
          textData = response.data;
        } else if (response.data.text && response.data.he) {
          // Map English and Hebrew text arrays together
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
        // If we reached a leaf, clear the stack for further navigation
        // Log the processed text data
        console.log('Processed text data:', JSON.stringify(this.currentPageText, null, 2));
      } catch (error) {
        console.error('Error fetching book content:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
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
      // You can expand this check for other complex books
      return book && (book.title?.toLowerCase().includes('siddur') || book.title?.toLowerCase().includes('machzor'));
    },
    findTocNode(ref, node) {
      if (!node) return null;
      if ((node.ref && node.ref === ref) || (node.title && node.title === ref)) return node;
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
</style> 