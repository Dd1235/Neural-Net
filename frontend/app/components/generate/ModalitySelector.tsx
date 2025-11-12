"use client";
import React, { useState, useMemo } from "react";
import { ChevronDown, X } from "lucide-react"; // Dropdown icon and Close button icon
import InputCard from "./InputCard";

// The Modality type is simplified for the Tag-Dropdown component's needs.
// We'll manage the active/inactive state internally.
export interface Modality {
  name: string;
}

// Props now handle the initial selection and report changes via a callback.
interface ModalitySelectorProps {
  allChannels: Modality[]; // Full list of available options
  preSelectedNames: string[]; // Names that are already selected
  onSelectionChange: (selectedNames: string[]) => void; // Callback for state updates
}

const ModalitySelector: React.FC<ModalitySelectorProps> = ({
  allChannels,
  preSelectedNames,
  onSelectionChange,
}) => {
  // Use local state to manage the selected items for the UI
  const [selectedChannels, setSelectedChannels] = useState(preSelectedNames);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Determine available channels by filtering the full list
  const availableChannels = useMemo(() => 
    allChannels
      .map(m => m.name)
      .filter(name => !selectedChannels.includes(name))
      .sort((a, b) => a.localeCompare(b))
  , [allChannels, selectedChannels]);

  // Filter available channels based on user input
  const filteredAvailableChannels = useMemo(() => 
    availableChannels.filter(channel => 
      channel.toLowerCase().includes(inputValue.toLowerCase())
    )
  , [availableChannels, inputValue]);


  // --- Handlers ---

  // 1. Adds a channel to the selected list
  const addChannel = (name: string) => {
    const newSelected = [...selectedChannels, name];
    setSelectedChannels(newSelected);
    setInputValue('');
    onSelectionChange(newSelected); // Report change to parent
  };

  // 2. Removes a channel from the selected list
  const removeChannel = (name: string) => {
    const newSelected = selectedChannels.filter(c => c !== name);
    setSelectedChannels(newSelected);
    onSelectionChange(newSelected); // Report change to parent
  };

  return (
    <InputCard title="Modalities" description="Select the external platforms to cross-post your content.">
      <div className="relative">
        
        {/* Dropdown Input Area (The Tag Container) */}
        <div
          className={`flex flex-wrap items-center p-2 rounded-md transition-all duration-200 min-h-[40px]
            ${isDropdownOpen ? 'border-2 border-red-600 shadow-lg shadow-red-600/30' : 'border border-gray-700 hover:border-red-600'}
            bg-gray-800 focus-within:border-red-600`}
          onClick={() => setIsDropdownOpen(true)}
        >
          
          {/* Render Selected Tags (Pills) */}
          {selectedChannels.map((channel) => (
            <span
              key={channel}
              className="flex items-center bg-red-700 text-white rounded-md px-3 py-1 text-sm mr-2 mb-1 cursor-default"
            >
              {channel}
              <X 
                className="w-3 h-3 ml-2 cursor-pointer hover:text-gray-200 transition-colors" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeChannel(channel);
                }}
              />
            </span>
          ))}

          {/* Input Field for Search */}
          <input
            type="text"
            className="flex-grow bg-transparent text-white outline-none placeholder-gray-400 p-1 text-sm min-w-[50px] mb-1"
            placeholder={selectedChannels.length === 0 ? "Search or select channels..." : ""}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
          />
          
          {/* Dropdown Arrow Button */}
          <button 
            type="button" 
            className="p-1 text-gray-400 hover:text-white transition-colors absolute right-2 top-1/2 transform -translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(prev => !prev);
            }}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
          </button>
        </div>

        {/* Dropdown List */}
        {isDropdownOpen && filteredAvailableChannels.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto">
            {filteredAvailableChannels.map((channel) => (
              <div
                key={channel}
                className="px-3 py-2 text-white hover:bg-gray-700 cursor-pointer transition-colors text-sm"
                onClick={() => addChannel(channel)}
              >
                {channel}
              </div>
            ))}
          </div>
        )}
        {isDropdownOpen && filteredAvailableChannels.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-xl">
             <div className="px-3 py-2 text-gray-500 text-sm">
                {selectedChannels.length === allChannels.length ? "All channels selected." : "No matching channels found."}
              </div>
          </div>
        )}
      </div>
    </InputCard>
  );
};

export default ModalitySelector;