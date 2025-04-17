import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo, useEffect } from "react";
import { Search, RefreshCw, Download, Trash, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DataTableProps } from '@/types';

interface Column {
  id: string;
  header: string;
  accessorKey: string;
  cell?: (info: any) => React.ReactNode;
  meta?: {
    align?: 'right' | 'center' | 'left';
    className?: string;
  };
}

export function DataTable({
  data = [],
  columns,
  isLoading,
  emptyMessage = 'لا توجد بيانات للعرض',
  searchable = false,
  placeholder = 'بحث...',
  showActions = true,
  totals = {},
  onDeleteSelected,
  onRefresh,
  onAddNew,
  onDownload
}: DataTableProps) {
  const [filteredData, setFilteredData] = useState(data);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  
  // Update filtered data when main data changes
  useEffect(() => {
    // Sort data by createdAt or date if available (newest first)
    let sortedData = [...data];
    if (sortedData.length > 0) {
      if (sortedData[0].createdAt) {
        sortedData = sortedData.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sortedData[0].date) {
        sortedData = sortedData.sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
      }
    }
    
    setFilteredData(sortedData);
    setSelectedRows([]);
  }, [data]);

  const handleSearch = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    if (!searchTerm) {
      setFilteredData(data);
      return;
    }

    const filtered = data.filter((item) => {
      return columns.some((column) => {
        const value = item[column.accessorKey];
        if (value === undefined || value === null) return false;
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
    setFilteredData(filtered);
  };

 // Calculate automatic totals for numeric columns if no totals provided
const calculatedTotals = useMemo(() => {
  if (Object.keys(totals).length > 0) return totals;
  
  const result: Record<string, number> = {};
  columns.forEach(column => {
    const firstValue = filteredData[0]?.[column.accessorKey];
    if (typeof firstValue === 'number' || typeof firstValue === 'bigint') {
      result[column.accessorKey] = filteredData.reduce((sum, row) => {
        const value = Number(row[column.accessorKey]) || 0;
        return sum + value;
      }, 0);
    }
  });
  return result;
}, [filteredData, columns, totals]);
  // Check if all rows are selected
  const allSelected = useMemo(() => {
    return filteredData.length > 0 && selectedRows.length === filteredData.length;
  }, [filteredData, selectedRows]);
  
  // Some rows are selected
  const someSelected = useMemo(() => {
    return !allSelected && selectedRows.length > 0;
  }, [allSelected, selectedRows]);
  
  // Toggle all rows selection
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(row => row.id));
    }
  };
  
  // Toggle single row selection
  const toggleRowSelection = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // Handle delete selected
  const handleDeleteSelected = () => {
    if (onDeleteSelected && selectedRows.length > 0) {
      onDeleteSelected(selectedRows);
      setSelectedRows([]);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full text-center py-4">
        جاري التحميل...
      </div>
    );
  }

  // Show empty state
  if (!data || data.length === 0) {
    return (
      <div className="w-full text-center py-4">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Actions Bar */}
      {(searchable || showActions) && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {showActions && (
              <>
                <Button 
                  variant="outline" 
                  className="gap-1" 
                  onClick={handleDeleteSelected}
                  disabled={selectedRows.length === 0}
                >
                  <Trash className="h-4 w-4" />
                  حذف ({selectedRows.length})
                </Button>
                {onAddNew && (
                  <Button 
                    variant="default" 
                    className="gap-1"
                    onClick={onAddNew}
                  >
                    <Plus className="h-4 w-4" />
                    إضافة جديد
                  </Button>
                )}
                {onRefresh && (
                  <Button 
                    variant="outline" 
                    className="gap-1"
                    onClick={onRefresh}
                  >
                    <RefreshCw className="h-4 w-4" />
                    تحديث
                  </Button>
                )}
                {onDownload && (
                  <Button 
                    variant="outline" 
                    className="gap-1"
                    onClick={onDownload}
                  >
                    <Download className="h-4 w-4" />
                    تصدير
                  </Button>
                )}
              </>
            )}
          </div>
          
          {searchable && (
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pr-10 w-[240px]"
              />
              {searchQuery && (
                <button 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Table */}
      <div className="rounded-md border bg-white overflow-hidden">
        <Table className="custom-table">
          <TableHeader>
            <TableRow>
              {showActions && (
                <TableHead className="w-[40px]">
                  <Checkbox 
                    checked={allSelected && filteredData.length > 0} 
                    onCheckedChange={toggleSelectAll}
                    aria-label="تحديد الكل"
                    className={someSelected ? "bg-primary/50" : ""}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={column.id}
                  className={column.meta?.className}
                  style={{ textAlign: column.meta?.align || 'right' }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={showActions ? columns.length + 1 : columns.length}
                  className="text-center h-24"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredData.map((row) => (
                  <TableRow 
                    key={row.id} 
                    className={selectedRows.includes(row.id) ? 'bg-primary/10' : ''}
                  >
                    {showActions && (
                      <TableCell>
                        <Checkbox 
                          checked={selectedRows.includes(row.id)} 
                          onCheckedChange={() => toggleRowSelection(row.id)}
                          aria-label={`تحديد صف ${row.id}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell 
                        key={`${row.id}-${column.id}`} 
                        className={column.meta?.className}
                        style={{ textAlign: column.meta?.align || 'right' }}
                      >
                        {column.cell 
                          ? column.cell({ 
                              row: { 
                                original: row 
                              } 
                            }) 
                          : row[column.accessorKey]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                
                {/* Totals Row */}
                {showActions && (
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell />
                    {columns.map((column) => {
                      if (column.accessorKey in calculatedTotals) {
                        return (
                          <TableCell 
                            key={`total-${column.id}`}
                            className={column.meta?.className}
                            style={{ textAlign: column.meta?.align || 'right' }}
                          >
                            {formatCurrency(calculatedTotals[column.accessorKey])}
                          </TableCell>
                        );
                      }
                      
                      if (column.id === 'summary') {
                        return (
                          <TableCell 
                            key={`total-${column.id}`}
                            className={column.meta?.className}
                            style={{ textAlign: column.meta?.align || 'right' }}
                          >
                            الإجمالي
                          </TableCell>
                        );
                      }
                      
                      if (column.id === 'count') {
                        return (
                          <TableCell 
                            key={`total-${column.id}`}
                            className={column.meta?.className}
                            style={{ textAlign: column.meta?.align || 'right' }}
                          >
                            {filteredData.length} سجل
                          </TableCell>
                        );
                      }
                      
                      return <TableCell key={`total-${column.id}`} />;
                    })}
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}