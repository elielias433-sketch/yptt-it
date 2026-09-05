import { forwardRef } from 'react';

export const Table = forwardRef(({
  children,
  className = '',
  striped = true,
  hoverable = true,
  compact = false,
  ...props
}, ref) => {
  return (
    <div className={`overflow-x-auto rounded-card-lg border border-alien-500/20 bg-alien-800/50 backdrop-blur-sm ${className}`}>
      <table ref={ref} className="w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  );
});

Table.displayName = 'Table';

export const TableHeader = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => (
  <thead ref={ref} className={`bg-alien-900/50 ${className}`} {...props}>
    {children}
  </thead>
));

TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef(({
  children,
  className = '',
  striped = true,
  ...props
}, ref) => (
  <tbody ref={ref} className={`divide-y divide-alien-500/10 ${className}`} {...props}>
    {children}
  </tbody>
));

TableBody.displayName = 'TableBody';

export const TableRow = forwardRef(({
  children,
  className = '',
  clickable = false,
  selected = false,
  ...props
}, ref) => (
  <tr
    ref={ref}
    className={`
      transition-colors duration-150
      ${clickable ? 'cursor-pointer' : ''}
      ${selected 
        ? 'bg-alien-500/10 border-l-4 border-l-alien-500' 
        : ''
      }
      ${props.className}
    `}
    {...props}
  >
    {children}
  </tr>
));

TableRow.displayName = 'TableRow';

export const TableCell = forwardRef(({
  children,
  className = '',
  align = 'left',
  width,
  nowrap = false,
  ...props
}, ref) => (
  <td
    ref={ref}
    className={`
      px-4 py-3 text-body-sm text-alien-100
      border-b border-alien-500/10
      transition-colors duration-150
      ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}
      ${nowrap ? 'whitespace-nowrap' : ''}
      ${width ? `w-[${width}]` : ''}
      ${props.className}
    `}
    style={{ width }}
    {...props}
  >
    {children}
  </td>
));

TableCell.displayName = 'TableCell';

export const TableHeaderCell = forwardRef(({
  children,
  className = '',
  align = 'left',
  width,
  sortable = false,
  onSort,
  sortDirection,
  ...props
}, ref) => (
  <th
    ref={ref}
    className={`
      px-4 py-3 text-left text-caption font-semibold text-alien-400 uppercase tracking-wider
      border-b border-alien-500/20 bg-alien-900/30
      ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}
      ${width ? `w-[${width}]` : ''}
      ${sortable ? 'cursor-pointer select-none hover:text-alien-200 transition-colors' : ''}
      ${props.className}
    `}
    style={{ width }}
    onClick={sortable ? onSort : undefined}
    aria-sort={sortDirection}
    {...props}
  >
    <div className="flex items-center gap-2">
      {children}
      {sortable && sortDirection && (
        <span className="text-caption">
          {sortDirection === 'asc' ? '[UP]' : '[DOWN]'}
        </span>
      )}
    </div>
  </th>
));

TableHeaderCell.displayName = 'TableHeaderCell';

export const TablePagination = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalPages <= 1) return null;
  
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  
  return (
    <div className="px-4 py-3 border-t border-alien-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-body-sm text-alien-400">
        Showing <span className="text-alien-100 font-medium">{start}</span> to <span className="text-alien-100 font-medium">{end}</span> of <span className="text-alien-100 font-medium">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-3">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-3 py-1.5 text-body-sm text-alien-100 bg-alien-900/50 border border-alien-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-alien-500/50"
        >
          {[10, 20, 50, 100].map(size => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-body-sm font-medium text-alien-400 hover:text-alien-100 bg-alien-800/50 border border-alien-500/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="px-3 text-body-sm text-alien-300">
            Page <span className="text-alien-100 font-medium">{page}</span> of <span className="text-alien-100 font-medium">{totalPages}</span>
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-body-sm font-medium text-alien-400 hover:text-alien-100 bg-alien-800/50 border border-alien-500/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Table;