import React from "react";
import { Leaf } from "lucide-react";
import { User, ProfileMetrics, CarbonMetrics } from "../types";

interface ConsumerProfileProps {
  currentUser: User;
  profileMetrics: ProfileMetrics | null;
  carbonMetrics: CarbonMetrics | null;
}

export const ConsumerProfile: React.FC<ConsumerProfileProps> = ({
  currentUser,
  profileMetrics,
  carbonMetrics,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm" id="consumer_profile_card">
      {/* Profile Card Header Info */}
      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 pb-6 border-b border-slate-100">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center font-black text-white text-xl shadow-lg">
          {currentUser.name.substring(0, 2).toUpperCase()}
        </div>
        
        <div className="text-center md:text-left space-y-1">
          <h2 className="text-lg font-bold text-slate-900 font-display">
            {currentUser.name}
          </h2>
          <p className="text-xs text-slate-500">{currentUser.email}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {currentUser.consumer_id && (
              <p className="text-xs font-mono text-slate-800 font-bold bg-slate-100 px-3 py-1 rounded-lg inline-block border border-slate-200">
                Consumer ID: <span className="text-emerald-600 font-black">{currentUser.consumer_id}</span>
              </p>
            )}
            <p className="text-xs font-mono text-slate-800 font-bold bg-slate-100 px-3 py-1 rounded-lg inline-block border border-slate-200">
              Connection: <span className="text-blue-600 font-black">{currentUser.connection_type || "Residential"}</span>
            </p>
          </div>
          <div className="mt-2 text-[10px] font-bold text-slate-400">
            ACCOUNT CLASS: <span className="text-emerald-700 uppercase">PREMIUM GREEN PRO CONSUMER</span>
          </div>
        </div>
      </div>

      {/* Consumer metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-center">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Appliances</p>
          <p className="text-2xl font-black text-slate-800">{profileMetrics?.totalAppliances ?? 0}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Daily Load</p>
          <p className="text-2xl font-black text-emerald-600">{profileMetrics?.averageDailyUsage ?? 0} <span className="text-xs font-bold">kWh</span></p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Monthly Load</p>
          <p className="text-2xl font-black text-indigo-600">{profileMetrics?.estimatedMonthlyConsumption ?? 0} <span className="text-xs font-bold">kWh</span></p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Monthly Bill</p>
          <p className="text-2xl font-black text-violet-600">₹{profileMetrics?.estimatedMonthlyBill ?? 0}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Carbon Footprint</p>
          <p className="text-2xl font-black text-rose-600">{carbonMetrics?.carbonEmission ?? 0} <span className="text-xs font-bold">KG CO₂</span></p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Opt. Savings Potential</p>
          <p className="text-2xl font-black text-blue-600">₹{profileMetrics?.estimatedSavings ?? 0} <span className="text-xs font-bold">/ Month</span></p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 col-span-2 md:col-span-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Efficiency Score</p>
          <p className="text-2xl font-black text-teal-600">{profileMetrics?.efficiencyScore ?? 100} <span className="text-xs font-bold">/ 100</span></p>
        </div>
      </div>

      <div className="mt-6 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
        <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide mb-2 flex items-center">
          <Leaf className="w-4 h-4 mr-1.5 text-emerald-600" /> Active Ecological Optimization Target
        </h3>
        <p className="text-xs text-emerald-900 leading-relaxed">
          By limiting high-wattage hardware utilization logs (such as Air Conditioners or Geysers) within peak hours (6:00 PM to 10:00 PM), consumers can reduce neighborhood electrical transformer stress index values by up to 15% and claim premium municipal offsets.
        </p>
      </div>
    </div>
  );
};
