<template>
  <Accordion :multiple="true" @tab-open="onTabOpen">
    <AccordionTab v-for="cat in categories" :key="cat.path">
      <template #header>
        <div class="flex items-center justify-between w-full min-w-0">
          <div class="flex items-center min-w-0" style="max-width: 70%;">
            <span class="font-semibold truncate block max-w-full">{{ cat.category }}</span>
            <span v-if="cat.heCategory" class="ml-2 text-gray-600 truncate block max-w-full">({{ cat.heCategory }})</span>
          </div>
          <span class="text-sm text-gray-500 whitespace-nowrap ml-2 flex-shrink-0">({{ countChildren(cat) }})</span>
        </div>
      </template>
      <div>
        <!-- Books at this level -->
        <DataTable v-if="cat.loaded && cat.children && cat.children.some(isBook)"
                   :value="cat.children.filter(isBook)"
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
        <CategoryAccordion v-if="cat.loaded && cat.children && cat.children.some(isCategory)"
                          :categories="cat.children.filter(isCategory)"
                          :loading="loading"
                          @book-select="$emit('book-select', $event)"
                          @tab-open="$emit('tab-open', $event)" />
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
  emits: ['book-select', 'tab-open'],
  methods: {
    isCategory(item) {
      return item && item.type === 'category';
    },
    isBook(item) {
      return item && item.type === 'book';
    },
    countChildren(category) {
      if (!category.loaded) return '...';
      if (!category || !Array.isArray(category.children)) return 0;
      return category.children.length;
    },
    onBookSelect(event) {
      this.$emit('book-select', event);
    },
    onTabOpen(event) {
      // event.index is the index of the opened tab
      const cat = this.categories[event.index];
      this.$emit('tab-open', cat);
    }
  }
}
</script> 