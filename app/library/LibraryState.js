// app/library/LibraryState.js
// Shared navigation state — read and written by StudyLibraryView and LibraryModal

const LibraryState = {
  viewMode: 'years',           // 'years' | 'year' | 'semester' | 'subject' | 'topic'
  selectedYearId: null,
  selectedSemesterId: null,
  selectedSubjectId: null,
  selectedTopicId: null,
  activeTopicTab: 'overview',
  searchQuery: '',
  activeFilter: 'all'
};
