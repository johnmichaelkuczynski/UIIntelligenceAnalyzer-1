import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BrainCircuit, Bot, Sparkles } from "lucide-react";

export type LLMProvider = "openai" | "anthropic" | "perplexity";

interface ProviderSelectorProps {
  selectedProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  className?: string;
  label?: string;
  smallSize?: boolean;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  className = "",
  label = "AI Provider",
  smallSize = false
}) => {
  return (
    <div className={`flex ${smallSize ? "flex-row items-center gap-2" : "flex-col gap-1.5"} ${className}`}>
      {label && <Label className={smallSize ? "min-w-24" : ""}>{label}</Label>}
      <Select value={selectedProvider} onValueChange={(value) => onProviderChange(value as LLMProvider)}>
        <SelectTrigger className={smallSize ? "h-8" : ""}>
          <SelectValue placeholder="Select AI provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openai" className="flex items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span>OpenAI (GPT-4o)</span>
            </div>
          </SelectItem>
          <SelectItem value="anthropic" className="flex items-center">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-purple-600" />
              <span>Anthropic (Claude 3.7)</span>
            </div>
          </SelectItem>
          <SelectItem value="perplexity" className="flex items-center">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span>Perplexity (Llama 3.1)</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ProviderSelector;