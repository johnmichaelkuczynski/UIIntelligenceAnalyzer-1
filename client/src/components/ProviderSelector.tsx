import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BrainCircuit, Bot, Sparkles, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type LLMProvider = "openai" | "anthropic" | "perplexity" | "all";

interface ProviderSelectorProps {
  selectedProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  className?: string;
  label?: string;
  smallSize?: boolean;
  apiStatus?: Record<string, boolean>;
  showTooltips?: boolean;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  className = "",
  label = "AI Provider",
  smallSize = false,
  apiStatus = { openai: true, anthropic: true, perplexity: true },
  showTooltips = true
}) => {
  return (
    <div className={`flex ${smallSize ? "flex-row items-center gap-2" : "flex-col gap-1.5"} ${className}`}>
      <div className="flex items-center gap-2">
        {label && <Label className={smallSize ? "min-w-24" : ""}>{label}</Label>}
        {showTooltips && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Choose which AI provider to use for document analysis:</p>
                <ul className="list-disc pl-5 mt-2 text-sm">
                  <li><span className="font-medium">OpenAI GPT-4o</span> - Excellent for detailed analysis, strong at recognizing complex patterns</li>
                  <li><span className="font-medium">Anthropic Claude</span> - Very good at nuanced text interpretation and detailed reasoning</li>
                  <li><span className="font-medium">Perplexity Llama</span> - Open source model with good analytical capabilities</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Select value={selectedProvider} onValueChange={(value) => onProviderChange(value as LLMProvider)}>
        <SelectTrigger className={`${smallSize ? "h-8" : ""} min-w-[220px]`}>
          <SelectValue placeholder="Select AI provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem 
            value="openai" 
            className="flex items-center" 
            disabled={!apiStatus.openai}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span>OpenAI (GPT-4o)</span>
              {!apiStatus.openai && <span className="text-xs text-red-500 ml-2">(Unavailable)</span>}
            </div>
          </SelectItem>
          <SelectItem 
            value="anthropic" 
            className="flex items-center"
            disabled={!apiStatus.anthropic}
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-purple-600" />
              <span>Anthropic (Claude 3.7)</span>
              {!apiStatus.anthropic && <span className="text-xs text-red-500 ml-2">(Unavailable)</span>}
            </div>
          </SelectItem>
          <SelectItem 
            value="perplexity" 
            className="flex items-center"
            disabled={!apiStatus.perplexity}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span>Perplexity (Llama 3.1)</span>
              {!apiStatus.perplexity && <span className="text-xs text-red-500 ml-2">(Unavailable)</span>}
            </div>
          </SelectItem>
          <SelectItem 
            value="all" 
            className="flex items-center"
            disabled={!apiStatus.openai || !apiStatus.anthropic || !apiStatus.perplexity}
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-indigo-600" />
              <span>All Providers (Compare)</span>
              {(!apiStatus.openai || !apiStatus.anthropic || !apiStatus.perplexity) && 
                <span className="text-xs text-red-500 ml-2">(Some APIs unavailable)</span>}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ProviderSelector;