<template>
  <Accordion :multiple="true">
    <AccordionTab v-for="cat in categories" :key="cat.path">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center">
            <span class="font-semibold">{{ cat.category }}</span>
            <span v-if="cat.heCategory" class="ml-2 text-gray-600">({{ cat.heCategory }})</span>
          </div>
          <span class="text-sm text-gray-500">({{ countChildren(cat) }})</span>
        </div>
      </template>
      <div>
        <!-- Books at this level -->
        <DataTable v-if="cat.books && cat.books.some(isBook)"
                   :value="cat.books.filter(isBook)"
                   :loading="loading"
                   selectionMode="single"
                   @row-select="onBookSelect"
                   class="p-datatable-sm mb-4"
                   :paginator="true"
                   :rows="5"
                   :rowsPerPageOptions="[5, 10, 20]"
                   paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown">
          <Column field="title" header="Title" :sortable="true">
            <template #body="slotProps">
              <div>
                <div class="font-medium">{{ slotProps.data.title }}</div>
                <div v-if="slotProps.data.heTitle" class="text-sm text-gray-600">{{ slotProps.data.heTitle }}</div>
              </div>
            </template>
          </Column>
          <Column field="enShortDesc" header="Description" :sortable="true">
            <template #body="slotProps">
              <div class="text-sm text-gray-600">{{ slotProps.data.enShortDesc }}</div>
            </template>
          </Column>
        </DataTable>
        <!-- Subcategories -->
        <CategoryAccordion v-if="cat.books && cat.books.some(isCategory)"
                          :categories="cat.books.filter(isCategory)"
                          :loading="loading"
                          @book-select="$emit('book-select', $event)" />
      </div>
    </AccordionTab>
  </Accordion>
</template>

<script>
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

export default {
  name: 'CategoryAccordion',
  components: {
    Accordion,
    AccordionTab,
    DataTable,
    Column
  },
  props: {
    categories: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['book-select'],
  methods: {
    isCategory(item) {
      return item && item.type === 'category';
    },
    isBook(item) {
      return item && item.type === 'book';
    },
    countChildren(category) {
      if (!category || !Array.isArray(category.books)) return 0;
      return category.books.length;
    },
    onBookSelect(event) {
      this.$emit('book-select', event);
    }
  }
}
</script> 