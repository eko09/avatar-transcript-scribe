
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HeyGenEmbedProps {
  onTranscriptSaved: () => void;
}

const HeyGenEmbed: React.FC<HeyGenEmbedProps> = ({ onTranscriptSaved }) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (!containerRef.current) return;

    const host = "https://labs.heygen.com";
    const url = host + "/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdW5lX0hSX3B1YmxpYyIsInByZXZpZXdJbWciOiJodHRwczovL2ZpbGVzMi5oZXlnZW4uYWkvYXZhdGFyL3YzLzc0NDQ3YTI3ODU5YTQ1NmM5NTVlMDFmMjFlZjE4MjE2XzQ1NjIwL3ByZXZpZXdfdGFsa18xLndlYnAiLCJuZWVkUmVtb3ZlQmFja2dyb3VuZCI6ZmFsc2UsImtub3dsZWRnZUJhc2VJZCI6ImFjODY1MWMzOWNlNTRiNTQ4NTkzOWRhZWM4YjdiZjRlIiwidXNlcm5hbWUiOiJhODQ1OTg5ZWY3NTY0NmY5OWZmY2RhOWNmMDMwMjVlNSJ9&inIFrame=1";

    // Clear any existing content
    containerRef.current.innerHTML = '';

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.allowFullscreen = true;
    iframe.title = "HeyGen Streaming Avatar";
    iframe.allow = "microphone; camera; autoplay; encrypted-media";
    iframe.src = url;
    iframe.style.width = "100%";
    iframe.style.height = "600px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "8px";
    iframe.style.backgroundColor = "#ffffff";

    // Generate session ID for this conversation
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Starting session:', sessionId);

    // Listen for messages from HeyGen iframe
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data, 'from origin:', event.origin);

      // Security check - make sure message is from HeyGen
      if (!event.origin.includes('heygen.com') && !event.origin.includes('labs.heygen.com')) {
        return;
      }

      if (event.data && typeof event.data === 'object') {
        const { type, action, data } = event.data;

        // Handle streaming embed specific messages
        if (type === 'streaming-embed') {
          console.log('Streaming embed action:', action);
          return;
        }

        // Handle transcript and conversation messages
        switch (type) {
          case 'transcript':
          case 'ai_response':
          case 'avatar_speech':
            if (data && data.content) {
              saveTranscript({
                session_id: sessionId,
                speaker: data.speaker || 'AI Avatar',
                content: data.content,
                timestamp: data.timestamp || new Date().toISOString(),
                metadata: { 
                  type: type,
                  ...data.metadata 
                },
              });
            }
            break;
          
          case 'user_message':
          case 'user_input':
          case 'user_speech':
            if (data && data.message) {
              saveTranscript({
                session_id: sessionId,
                speaker: 'User',
                content: data.message,
                timestamp: data.timestamp || new Date().toISOString(),
                metadata: { 
                  type: type,
                  ...data.metadata 
                },
              });
            }
            break;
          
          case 'conversation_start':
            console.log('Conversation started:', data);
            saveTranscript({
              session_id: sessionId,
              speaker: 'System',
              content: 'Conversation started',
              timestamp: new Date().toISOString(),
              metadata: { 
                type: 'system_event',
                event: 'conversation_start',
                ...data 
              },
            });
            break;
          
          case 'conversation_end':
            console.log('Conversation ended:', data);
            saveTranscript({
              session_id: sessionId,
              speaker: 'System',
              content: 'Conversation ended',
              timestamp: new Date().toISOString(),
              metadata: { 
                type: 'system_event',
                event: 'conversation_end',
                ...data 
              },
            });
            break;
          
          default:
            console.log('Unknown message type:', type, data);
        }
      }
    };

    // Add message listener
    window.addEventListener('message', handleMessage);

    // Append iframe to container
    containerRef.current.appendChild(iframe);

    // Send initialization message to establish connection
    const initMessage = {
      type: 'init',
      session_id: sessionId,
      timestamp: new Date().toISOString()
    };
    
    // Wait a bit for iframe to load before sending init message
    setTimeout(() => {
      iframe.contentWindow?.postMessage(initMessage, host);
    }, 2000);

    // Cleanup function
    return () => {
      window.removeEventListener('message', handleMessage);
      if (containerRef.current && iframe.parentNode) {
        containerRef.current.removeChild(iframe);
      }
    };
  }, [onTranscriptSaved]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>HeyGen AI Avatar</CardTitle>
        <p className="text-sm text-muted-foreground">
          Interact with the AI avatar below. All conversations will be automatically captured and saved to your transcript database.
        </p>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="relative w-full h-[600px] bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          {/* iframe will be inserted here by useEffect */}
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This embed automatically captures conversation data through postMessage events.
            Each participant will have a unique session ID for tracking individual conversations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeyGenEmbed;
