import { useSearchParams } from 'react-router';
import { ProductQueryState, SortOption } from '../utils/productHelpers';

const DEFAULT_QUERY_STATE: ProductQueryState = {
  q: '',
  status: 'all',
  category: 'Todas',
  sort: 'UPDATED_DESC',
  page: 1,
  pageSize: 10,
  includeArchived: false,
  showOutOfStock: false
};

/**
 * Hook to manage product query params synchronized with URL
 */
export function useProductsQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse query state from URL params
  const queryState: ProductQueryState = {
    q: searchParams.get('q') || DEFAULT_QUERY_STATE.q,
    status: searchParams.get('status') || DEFAULT_QUERY_STATE.status,
    category: searchParams.get('category') || DEFAULT_QUERY_STATE.category,
    sort: (searchParams.get('sort') as SortOption) || DEFAULT_QUERY_STATE.sort,
    page: parseInt(searchParams.get('page') || '1', 10) || DEFAULT_QUERY_STATE.page,
    pageSize: parseInt(searchParams.get('pageSize') || '10', 10) || DEFAULT_QUERY_STATE.pageSize,
    includeArchived: searchParams.get('includeArchived') === 'true' || DEFAULT_QUERY_STATE.includeArchived,
    showOutOfStock: searchParams.get('showOutOfStock') === 'true' || DEFAULT_QUERY_STATE.showOutOfStock
  };

  // Update query params in URL
  const updateQueryParams = (updates: Partial<ProductQueryState>) => {
    const newParams = new URLSearchParams(searchParams);

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value === DEFAULT_QUERY_STATE[key as keyof ProductQueryState] || value === '' || value === 'all' || value === 'Todas') {
        // Remove default values to keep URL clean
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    setSearchParams(newParams);
  };

  // Reset all filters to default
  const resetFilters = () => {
    setSearchParams({});
  };

  // Update search query
  const setSearch = (q: string) => {
    updateQueryParams({ q, page: 1 }); // Reset to page 1 on search
  };

  // Update status filter
  const setStatus = (status: string) => {
    updateQueryParams({ status, page: 1 }); // Reset to page 1 on filter change
  };

  // Update category filter
  const setCategory = (category: string) => {
    updateQueryParams({ category, page: 1 }); // Reset to page 1 on filter change
  };

  // Update sort option
  const setSort = (sort: SortOption) => {
    updateQueryParams({ sort, page: 1 }); // Reset to page 1 on sort change
  };

  // Update page
  const setPage = (page: number) => {
    updateQueryParams({ page });
  };

  // Update page size
  const setPageSize = (pageSize: number) => {
    updateQueryParams({ pageSize, page: 1 }); // Reset to page 1 on page size change
  };

  // Update include archived
  const setIncludeArchived = (includeArchived: boolean) => {
    updateQueryParams({ includeArchived, page: 1 }); // Reset to page 1 on include archived change
  };

  // Update show out of stock
  const setShowOutOfStock = (showOutOfStock: boolean) => {
    updateQueryParams({ showOutOfStock, page: 1 }); // Reset to page 1 on show out of stock change
  };

  return {
    queryState,
    setSearch,
    setStatus,
    setCategory,
    setSort,
    setPage,
    setPageSize,
    resetFilters,
    updateQueryParams,
    setIncludeArchived,
    setShowOutOfStock
  };
}