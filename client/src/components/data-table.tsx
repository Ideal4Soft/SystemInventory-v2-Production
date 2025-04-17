import { useState } from 'react';
import { DataTableProps } from '../types';

export function DataTable({
  data,
  columns,
  isLoading,
  emptyMessage,
  searchable = false,
  placeholder = '',
  showActions = true
}: DataTableProps) {
  const [filteredData, setFilteredData] = useState(data);

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm) {
      setFilteredData(data);
      return;
    }

    const filtered = data.filter((item) => {
      return columns.some((column) => {
        const value = item[column.accessor];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    });
    setFilteredData(filtered);
  };

  return (
    <div>
      {searchable && (
        <div className="mb-4">
          <input
            type="text"
            placeholder={placeholder}
            className="w-full p-2 border rounded"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.accessor}
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
            {showActions && (
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td
                colSpan={showActions ? columns.length + 1 : columns.length}
                className="px-6 py-4 whitespace-nowrap text-center"
              >
                Loading...
              </td>
            </tr>
          ) : filteredData.length === 0 ? (
            <tr>
              <td
                colSpan={showActions ? columns.length + 1 : columns.length}
                className="px-6 py-4 whitespace-nowrap text-center"
              >
                {emptyMessage || 'No data available'}
              </td>
            </tr>
          ) : (
            filteredData.map((item, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td
                    key={column.accessor}
                    className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500"
                  >
                    {column.render ? column.render(item) : item[column.accessor]}
                  </td>
                ))}
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {item.actions}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ... existing code ... 