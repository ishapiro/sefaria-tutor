<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Sefaria Book Reader</h1>
    
    <!-- Book List -->
    <div v-if="!selectedBook" class="mb-4">
      <DataTable :value="books" :loading="loading" selectionMode="single" 
                @row-select="onBookSelect" class="p-datatable-sm">
        <Column field="title" header="Title"></Column>
        <Column field="heTitle" header="Hebrew Title"></Column>
        <Column field="category" header="Category"></Column>
      </DataTable>
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
            <div class="grid grid-cols-2 gap-4">
              <div class="english-column">
                <div v-for="(text, index) in currentPageText" :key="'en-' + index" class="mb-4">
                  <div class="english-text" v-html="text.en"></div>
                </div>
              </div>
              <div class="hebrew-column">
                <div v-for="(text, index) in currentPageText" :key="'he-' + index" class="mb-4">
                  <div class="hebrew-text text-right" v-html="text.he"></div>
                </div>
              </div>
            </div>
          </div>
          <Paginator v-model:first="first" :rows="rowsPerPage" :totalRecords="totalRecords"
                    @page="onPageChange" class="mt-4" />
        </template>
      </Card>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      books: [],
      selectedBook: null,
      loading: false,
      currentPageText: [],
      first: 0,
      rowsPerPage: 5,
      totalRecords: 0
    }
  },
  async created() {
    await this.fetchBooks()
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
              return book.contents.map(subBook => ({
                ...subBook,
                title: subBook.title || subBook.enShortDesc || 'Untitled',
                heTitle: subBook.heTitle || subBook.heShortDesc || '',
                category: book.title || category.category || 'Uncategorized',
                ref: subBook.ref || subBook.title
              }))
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
    async onBookSelect(event) {
      this.selectedBook = event.data
      this.first = 0
      await this.fetchBookContent()
    },
    async fetchBookContent() {
      this.loading = true
      try {
        // Log the selected book for debugging
        console.log('Selected book:', JSON.stringify(this.selectedBook, null, 2))
        
        // Construct the API URL with the correct reference
        const apiUrl = `https://www.sefaria.org/api/texts/${this.selectedBook.ref}`
        console.log('API URL:', apiUrl)
        
        // Use the book's ref for the API call
        const response = await axios.get(apiUrl, {
          params: {
            offset: this.first,
            limit: this.rowsPerPage
          }
        })
        
        // Log the API response for debugging
        console.log('API Response:', JSON.stringify(response.data, null, 2))
        
        // Handle different response structures
        let textData = []
        if (Array.isArray(response.data)) {
          textData = response.data
        } else if (response.data.text && response.data.he) {
          // Map English and Hebrew text arrays together
          const englishTexts = Array.isArray(response.data.text) ? response.data.text : [response.data.text]
          const hebrewTexts = Array.isArray(response.data.he) ? response.data.he : [response.data.he]
          
          textData = englishTexts.map((en, index) => ({
            en: en,
            he: hebrewTexts[index] || ''
          }))
        } else if (response.data.text) {
          textData = Array.isArray(response.data.text) ? response.data.text : [response.data.text]
        } else if (response.data.he && response.data.en) {
          textData = [response.data]
        } else if (typeof response.data === 'string') {
          textData = [{ he: response.data, en: '' }]
        }
        
        // Map the text data to our format
        this.currentPageText = textData.map(text => {
          // If text is a string, it's Hebrew text
          if (typeof text === 'string') {
            return { he: text, en: '' }
          }
          // Otherwise, it's an object with he/en properties
          return {
            he: text.he || text.hebrew || text.text || '',
            en: text.en || text.english || text.translation || ''
          }
        })
        
        // Set total records
        this.totalRecords = response.data.length || textData.length || 1
        
        // Log the processed text data
        console.log('Processed text data:', JSON.stringify(this.currentPageText, null, 2))
      } catch (error) {
        console.error('Error fetching book content:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
        this.currentPageText = []
        this.totalRecords = 0
      }
      this.loading = false
    },
    async onPageChange(event) {
      this.first = event.first
      await this.fetchBookContent()
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
</style> 