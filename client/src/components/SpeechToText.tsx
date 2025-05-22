import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import * as sdk from '@azure/ai-speech-sdk';
import { AssemblyAI } from 'assemblyai';

// Define the speech service providers
type SpeechProvider = 'azure' | 'assemblyai' | 'gladia';

interface SpeechToTextProps {
  onTextCaptured: (text: string) => void;
  provider?: SpeechProvider;
  placeholder?: string;
  buttonLabel?: string;
  className?: string;
}

export const SpeechToText: React.FC<SpeechToTextProps> = ({
  onTextCaptured,
  provider = 'azure',
  placeholder = 'Click the microphone to start speaking...',
  buttonLabel = 'Speak',
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(placeholder);
  const audioChunks = useRef<Blob[]>([]);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  // Azure Speech client
  const azureSpeechRecognizer = useRef<sdk.SpeechRecognizer | null>(null);

  // Function to toggle listening
  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Start the speech recognition based on the selected provider
  const startListening = async () => {
    try {
      setIsListening(true);
      setStatusMessage('Listening... Speak now');

      switch (provider) {
        case 'azure':
          startAzureSpeechRecognition();
          break;
        case 'assemblyai':
        case 'gladia':
          startBrowserRecording();
          break;
        default:
          startBrowserRecording();
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      setStatusMessage('Error starting speech recognition. Please try again.');
      toast({
        title: 'Speech Recognition Error',
        description: 'Could not start the speech recognition. Please check your microphone permissions.',
        variant: 'destructive',
      });
    }
  };

  // Stop the speech recognition
  const stopListening = () => {
    setIsListening(false);
    setStatusMessage('Processing your speech...');
    setIsProcessing(true);

    switch (provider) {
      case 'azure':
        if (azureSpeechRecognizer.current) {
          azureSpeechRecognizer.current.stopContinuousRecognitionAsync();
        }
        break;
      case 'assemblyai':
      case 'gladia':
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
          mediaRecorder.current.stop();
        }
        break;
      default:
        // Default behavior
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
          mediaRecorder.current.stop();
        }
    }
  };

  // Azure Speech Recognition
  const startAzureSpeechRecognition = () => {
    // Check if the Azure Speech key and region are available
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey || !speechRegion) {
      setIsListening(false);
      setStatusMessage('Azure Speech credentials not configured.');
      toast({
        title: 'Configuration Error',
        description: 'Azure Speech API key is not configured. Please contact the administrator.',
        variant: 'destructive',
      });
      return;
    }

    // Create the speech configuration
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    // Create the audio configuration
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

    // Create the speech recognizer
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // Store full transcript
    let transcript = '';

    // Event handlers
    recognizer.recognized = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        transcript += ' ' + e.result.text;
        setStatusMessage(`Recognized: ${e.result.text}`);
      }
    };

    recognizer.canceled = (s, e) => {
      if (e.reason === sdk.CancellationReason.Error) {
        console.error(`CANCELED: Error Code=${e.errorCode}`);
        console.error(`CANCELED: Error Details=${e.errorDetails}`);
        setStatusMessage('Recognition canceled. Please try again.');
      }
      
      setIsListening(false);
      setIsProcessing(false);
      recognizer.stopContinuousRecognitionAsync();
    };

    recognizer.sessionStopped = (s, e) => {
      setIsListening(false);
      setIsProcessing(false);
      
      if (transcript.trim()) {
        onTextCaptured(transcript.trim());
        setStatusMessage('Speech processing completed.');
      } else {
        setStatusMessage(placeholder);
      }
      
      recognizer.stopContinuousRecognitionAsync();
    };

    // Start continuous speech recognition
    recognizer.startContinuousRecognitionAsync();
    azureSpeechRecognizer.current = recognizer;
  };

  // Start browser recording for AssemblyAI and Gladia
  const startBrowserRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream);
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        
        if (provider === 'assemblyai') {
          processWithAssemblyAI(audioBlob);
        } else if (provider === 'gladia') {
          processWithGladia(audioBlob);
        } else {
          // Default to AssemblyAI as a fallback
          processWithAssemblyAI(audioBlob);
        }
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsListening(false);
      setIsProcessing(false);
      setStatusMessage('Could not access microphone. Please check your permissions.');
      toast({
        title: 'Microphone Error',
        description: 'Could not access your microphone. Please check your browser permissions.',
        variant: 'destructive',
      });
    }
  };

  // Process recorded audio with AssemblyAI
  const processWithAssemblyAI = async (audioBlob: Blob) => {
    const assemblyAPIKey = process.env.ASSEMBLYAI_API_KEY;
    
    if (!assemblyAPIKey) {
      setIsProcessing(false);
      setStatusMessage('AssemblyAI API key not configured.');
      toast({
        title: 'Configuration Error',
        description: 'AssemblyAI API key is not configured. Please contact the administrator.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setStatusMessage('Processing with AssemblyAI...');
      
      const client = new AssemblyAI({ apiKey: assemblyAPIKey });
      
      // Convert Blob to File
      const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      
      // Upload the audio file
      const uploadResponse = await client.transcripts.transcribe({
        audio: file,
        language_code: 'en_us'
      });
      
      // Check for successful transcription
      if (uploadResponse.text) {
        onTextCaptured(uploadResponse.text);
        setStatusMessage('Speech processing completed.');
      } else {
        setStatusMessage('No speech detected. Please try again.');
      }
    } catch (error) {
      console.error('AssemblyAI processing error:', error);
      setStatusMessage('Error processing speech. Please try again.');
      toast({
        title: 'Processing Error',
        description: 'There was an error processing your speech with AssemblyAI.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process recorded audio with Gladia
  const processWithGladia = async (audioBlob: Blob) => {
    const gladiaAPIKey = process.env.GLADIA_API_KEY;
    
    if (!gladiaAPIKey) {
      setIsProcessing(false);
      setStatusMessage('Gladia API key not configured.');
      toast({
        title: 'Configuration Error',
        description: 'Gladia API key is not configured. Please contact the administrator.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setStatusMessage('Processing with Gladia...');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('language', 'english');
      formData.append('toggle_diarization', 'false');
      
      const response = await fetch('https://api.gladia.io/v2/transcription/', {
        method: 'POST',
        headers: {
          'x-gladia-key': gladiaAPIKey,
        },
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.prediction) {
        onTextCaptured(result.prediction);
        setStatusMessage('Speech processing completed.');
      } else {
        setStatusMessage('No speech detected. Please try again.');
      }
    } catch (error) {
      console.error('Gladia processing error:', error);
      setStatusMessage('Error processing speech. Please try again.');
      toast({
        title: 'Processing Error',
        description: 'There was an error processing your speech with Gladia.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean up event listeners and resources
  useEffect(() => {
    return () => {
      // Clean up Azure speech recognizer
      if (azureSpeechRecognizer.current) {
        azureSpeechRecognizer.current.stopContinuousRecognitionAsync();
      }
      
      // Clean up media recorder
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  return (
    <div className={`flex flex-col items-start space-y-2 ${className}`}>
      <div className="flex items-center space-x-2 w-full">
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="icon"
          onClick={toggleListening}
          disabled={isProcessing}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <div className="text-sm text-gray-700 flex-1">
          {isProcessing ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {statusMessage}
            </div>
          ) : (
            statusMessage
          )}
        </div>
        {buttonLabel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleListening}
            disabled={isProcessing}
          >
            {isListening ? 'Stop' : buttonLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SpeechToText;