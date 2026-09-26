import type { OccupationDataPoint } from "../report-data-helper";

export interface OccupationTableProps {
  data: OccupationDataPoint[];
  totalJaring?: number;
  className?: string;
}

export function OccupationTable({ data, totalJaring, className = "" }: OccupationTableProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = totalJaring ?? sorted.reduce((sum, item) => sum + item.value, 0);

  return (
    <div
      className={`report-visualization overflow-hidden rounded-lg border border-[#C9D9E1] shadow-xs ${className}`}
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      <div className="flex items-center justify-between bg-[#174D6B] px-3.5 py-2 text-white">
        <span className="font-bold text-[10px] uppercase tracking-wider">
          Tabel Data Presisi Klasifikasi Pekerjaan Jaring
        </span>
        <span className="font-mono text-[10px] text-white/80">
          Total Terdata: {total.toLocaleString("id-ID")} Orang
        </span>
      </div>

      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-[#C9D9E1] border-b bg-[#F1F5F9] font-bold text-[#1E293B] text-[10px] uppercase tracking-wider">
            <th className="w-10 px-3 py-2 text-center">No</th>
            <th className="px-3 py-2">Kategori Pekerjaan</th>
            <th className="px-3 py-2 text-right">Jumlah Jaring</th>
            <th className="w-24 px-3 py-2 text-right">Proporsi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {sorted.map((item, index) => {
            const isTopRank = index < 3;
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
            return (
              <tr key={item.name} className={index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
                <td className="px-3 py-1.5 text-center font-mono text-[#64748B] text-[11px]">{index + 1}</td>
                <td className="px-3 py-1.5">
                  <span className={`font-semibold ${isTopRank ? "text-[#174D6B]" : "text-[#334155]"}`}>
                    {item.name}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right font-bold font-mono text-[#0F172A]">
                  {item.value.toLocaleString("id-ID")}{" "}
                  <span className="font-normal text-[#64748B] text-[10px]">Orang</span>
                </td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold text-[#0284C7]">{pct}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-[#174D6B] border-t-2 bg-[#EAF5FA] font-bold text-[#174D6B]">
            <td colSpan={2} className="px-3 py-2 text-[11px] uppercase">
              Total Kategori Terklasifikasi
            </td>
            <td className="px-3 py-2 text-right font-mono text-sm">{total.toLocaleString("id-ID")} Orang</td>
            <td className="px-3 py-2 text-right font-mono text-[11px]">100,0%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
