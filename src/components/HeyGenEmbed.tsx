
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
      console.log('Attempting to save transcript:', transcriptData);
      
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
      toast({
        title: "Success",
        description: "Message captured successfully",
      });
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
    console.log('Starting HeyGen session:', sessionId);

    // Enhanced message listener with broader capture
    const handleMessage = (event: MessageEvent) => {
      console.log('=== RECEIVED MESSAGE ===');
      console.log('Origin:', event.origin);
      console.log('Data type:', typeof event.data);
      console.log('Full message data:', JSON.stringify(event.data, null, 2));

      // Security check - allow HeyGen origins
      const allowedOrigins = [
        'https://labs.heygen.com',
        'https://heygen.com',
        'https://www.heygen.com',
        'https://app.heygen.com'
      ];
      
      if (!allowedOrigins.some(origin => event.origin.includes(origin.replace('https://', '')))) {
        console.log('Message from non-HeyGen origin, ignoring');
        return;
      }

      // Handle different message formats
      if (event.data && typeof event.data === 'object') {
        const data = event.data;
        
        // Log all message properties to understand the structure
        console.log('Message properties:', Object.keys(data));

        // Try to extract meaningful content from various possible formats
        let speaker = 'Unknown';
        let content = '';
        let messageType = 'unknown';

        // Check for common HeyGen message patterns
        if (data.type) {
          messageType = data.type;
          console.log('Message type detected:', messageType);
        }

        if (data.event) {
          messageType = data.event;
          console.log('Event type detected:', messageType);
        }

        // Extract content from various possible formats
        if (data.content) {
          content = data.content;
        } else if (data.message) {
          content = data.message;
        } else if (data.text) {
          content = data.text;
        } else if (data.transcript) {
          content = data.transcript;
        } else if (typeof data === 'string') {
          content = data;
        }

        // Determine speaker
        if (data.speaker) {
          speaker = data.speaker;
        } else if (data.from === 'user' || messageType.includes('user')) {
          speaker = 'User';
        } else if (data.from === 'assistant' || data.from === 'ai' || messageType.includes('ai') || messageType.includes('assistant')) {
          speaker = 'AI Avatar';
        } else if (messageType.includes('avatar')) {
          speaker = 'AI Avatar';
        }

        // Save any message with content
        if (content && content.trim().length > 0) {
          console.log('Saving message - Speaker:', speaker, 'Content:', content);
          
          saveTranscript({
            session_id: sessionId,
            speaker: speaker,
            content: content.trim(),
            timestamp: new Date().toISOString(),
            metadata: {
              messageType: messageType,
              originalData: data,
              origin: event.origin
            },
          });
        } else {
          console.log('No content found in message, not saving');
        }

        // Also handle system events
        if (messageType.includes('start') || messageType.includes('begin')) {
          saveTranscript({
            session_id: sessionId,
            speaker: 'System',
            content: `Conversation started (${messageType})`,
            timestamp: new Date().toISOString(),
            metadata: {
              messageType: 'system_event',
              event: messageType,
              originalData: data
            },
          });
        }

        if (messageType.includes('end') || messageType.includes('stop')) {
          saveTranscript({
            session_id: sessionId,
            speaker: 'System',
            content: `Conversation ended (${messageType})`,
            timestamp: new Date().toISOString(),
            metadata: {
              messageType: 'system_event',
              event: messageType,
              originalData: data
            },
          });
        }
      } else if (typeof event.data === 'string') {
        // Handle string messages
        console.log('String message received:', event.data);
        
        if (event.data.trim().length > 0) {
          saveTranscript({
            session_id: sessionId,
            speaker: 'Unknown',
            content: event.data.trim(),
            timestamp: new Date().toISOString(),
            metadata: {
              messageType: 'string_message',
              origin: event.origin
            },
          });
        }
      }
    };

    // Add message listener
    window.addEventListener('message', handleMessage);
    console.log('Message listener added for session:', sessionId);

    // Append iframe to container
    containerRef.current.appendChild(iframe);

    // Send initialization messages to establish connection
    const sendInitMessages = () => {
      const initMessages = [
        { type: 'init', session_id: sessionId, timestamp: new Date().toISOString() },
        { type: 'ready', session_id: sessionId },
        { action: 'init', session_id: sessionId },
        { event: 'ready', session_id: sessionId }
      ];

      initMessages.forEach((msg, index) => {
        setTimeout(() => {
          console.log('Sending init message:', msg);
          iframe.contentWindow?.postMessage(msg, host);
        }, (index + 1) * 1000);
      });
    };

    // Wait for iframe to load before sending init messages
    iframe.onload = () => {
      console.log('Iframe loaded, sending init messages...');
      setTimeout(sendInitMessages, 2000);
    };

    // Also try sending messages after a delay as fallback
    setTimeout(() => {
      console.log('Fallback: sending init messages...');
      sendInitMessages();
    }, 5000);

    // Cleanup function
    return () => {
      console.log('Cleaning up HeyGen embed for session:', sessionId);
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
            <strong>Debug Info:</strong> Check the browser console for detailed message logging.
            Each conversation gets a unique session ID for tracking.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeyGenEmbed;
