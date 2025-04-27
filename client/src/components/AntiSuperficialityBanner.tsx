import React from 'react';
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * A component that explains the anti-superficiality rule in the intelligence scoring system
 */
const AntiSuperficialityBanner = () => {
  return (
    <Alert className="mb-6 bg-amber-50 border-amber-200">
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 font-medium text-sm">Anti-Superficiality Rule</AlertTitle>
      <AlertDescription className="text-amber-700 text-sm">
        <p className="mb-2">
          A text must not receive a high intelligence score (&gt;85) solely on the basis of surface structure 
          (grammar, paragraph flow, technical vocabulary, references to famous philosophers).
        </p>
        <p>
          High intelligence scoring requires demonstrated <span className="font-medium">inferential compression</span>, 
          <span className="font-medium"> original concept-definition</span>, and 
          <span className="font-medium"> mechanical progression of thought</span>.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default AntiSuperficialityBanner;