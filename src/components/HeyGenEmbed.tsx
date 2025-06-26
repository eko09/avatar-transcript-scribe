
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HeyGenEmbedProps {
  onTranscriptSaved: () => void;
}

const HeyGenEmbed: React.FC<HeyGenEmbedProps> = ({ onTranscriptSaved }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  const saveTranscript = async (transcriptData: {
    session_id: string;
    speaker: string;
    content: string;
    timestamp: string;
    metadata?: any;
  }) => {
    try {
      console.log('Saving transcript:', transcriptData);
      
      const { data, error } = await supabase
        .from('transcripts')
        .insert({
          session_id: transcriptData.session_id,
          speaker: transcriptData.speaker,
          content: transcriptData.content,
          timestamp: transcriptData.timestamp,
          metadata: transcriptData.metadata || null,
        });

      if (error) {
        console.error('Error saving transcript:', error);
        toast({
          title: "Error",
          description: "Failed to save transcript",
          variant: "destructive",
        });
        return;
      }

      console.log('Transcript saved successfully:', data);
      onTranscriptSaved();
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving transcript",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Listen for messages from HeyGen iframe
    const handleMessage = (event: MessageEvent) => {
      // Security check - make sure message is from HeyGen
      if (!event.origin.includes('heygen.com') && !event.origin.includes('localhost')) {
        return;
      }

      console.log('Received message from HeyGen:', event.data);

      // Handle different types of messages from HeyGen
      if (event.data && typeof event.data === 'object') {
        const { type, data } = event.data;

        switch (type) {
          case 'transcript':
            // Save transcript data
            if (data && data.content) {
              saveTranscript({
                session_id: data.session_id || `session_${Date.now()}`,
                speaker: data.speaker || 'AI Avatar',
                content: data.content,
                timestamp: data.timestamp || new Date().toISOString(),
                metadata: data.metadata,
              });
            }
            break;
          case 'user_message':
            // Save user input
            if (data && data.message) {
              saveTranscript({
                session_id: data.session_id || `session_${Date.now()}`,
                speaker: 'User',
                content: data.message,
                timestamp: data.timestamp || new Date().toISOString(),
                metadata: data.metadata,
              });
            }
            break;
          case 'conversation_start':
            console.log('Conversation started:', data);
            break;
          case 'conversation_end':
            console.log('Conversation ended:', data);
            break;
          default:
            console.log('Unknown message type:', type, data);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onTranscriptSaved, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>HeyGen AI Avatar</CardTitle>
        <p className="text-sm text-muted-foreground">
          Interact with the AI avatar below. All conversations will be automatically saved to your transcript database.
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ paddingBottom: '56.25%', height: 0 }}>
          <iframe
            ref={iframeRef}
            src="https://app.heygen.com/embed/c4b4c2e5aad2494d9e7b6a8ca9f2e7d1"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '8px',
            }}
            allow="camera; microphone; fullscreen"
            title="HeyGen AI Avatar"
          />
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This embed will automatically capture and save all conversation transcripts. 
            Make sure your HeyGen project is configured to send postMessage events for transcript data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeyGenEmbed;
