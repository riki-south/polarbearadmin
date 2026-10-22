import type { ReactNode } from "react";

export type EditableColumn<Row> = {
  key: string;
  header: string;
  className?: string;
  render: (row: Row, index: number) => ReactNode;
};

type EditableTableProps<Row> = {
  rows: Row[];
  columns: Array<EditableColumn<Row>>;
  emptyMessage: string;
  getRowKey?: (row: Row, index: number) => string | number;
};

export function EditableTable<Row>({
  rows,
  columns,
  emptyMessage,
  getRowKey,
}: EditableTableProps<Row>) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={getRowKey ? getRowKey(row, index) : index} className="align-top">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-slate-700">
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
