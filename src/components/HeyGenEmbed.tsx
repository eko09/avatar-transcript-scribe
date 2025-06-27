import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Wifi, WifiOff, CheckCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HeyGenEmbedProps {
  onTranscriptSaved: () => void;
}

type ConnectionStatus = 'connecting' | 'connected' | 'failed' | 'disconnected';

const HeyGenEmbed: React.FC<HeyGenEmbedProps> = ({ onTranscriptSaved }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);

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
    const url = host + "/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdWR5X1RlYWNoZXJfU2l0dGluZzJfcHVi%0D%0AbGljIiwicHJldmlld0ltZyI6Imh0dHBzOi8vZmlsZXMyLmhleWdlbi5haS9hdmF0YXIvdjMvZjk0%0D%0AYWUzZTg5ZjRjNGZmOTg1NDFhYjU5ZWZhNTg3OGJfNDU2MzAvcHJldmlld190YWxrXzIud2VicCIs%0D%0AIm5lZWRSZW1vdmVCYWNrZ3JvdW5kIjpmYWxzZSwia25vd2xlZGdlQmFzZUlkIjoiZjQ0Mzg0MTU4%0D%0AMWVlNDJmMDkwYTVmMmYzNWYwMzA5YmUiLCJ1c2VybmFtZSI6IjQwODU1NDE4YTZkZTRhOGVhMzcz%0D%0AMDMwY2UwMGUwMzQ1In0%3D&inIFrame=1";

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

    // Enhanced message listener with connection status tracking
    const handleMessage = (event: MessageEvent) => {
      setMessageCount(prev => prev + 1);
      
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

      // Update connection status based on message type
      if (event.data && typeof event.data === 'object') {
        const data = event.data;
        
        // Track connection status
        if (data.type === 'streaming-embed') {
          if (data.action === 'ready' || data.action === 'connected' || data.action === 'init') {
            setConnectionStatus('connected');
            setErrorDetails([]);
          } else if (data.action === 'error' || data.action === 'failed') {
            setConnectionStatus('failed');
            setErrorDetails(prev => [...prev, `HeyGen Error: ${JSON.stringify(data)}`]);
          } else if (data.action === 'hide' || data.action === 'disconnect') {
            setConnectionStatus('disconnected');
          }
        }

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

        // Enhanced content extraction
        if (data.content) {
          content = data.content;
        } else if (data.message) {
          content = data.message;
        } else if (data.text) {
          content = data.text;
        } else if (data.transcript) {
          content = data.transcript;
        } else if (data.response) {
          content = data.response;
        } else if (data.data && typeof data.data === 'string') {
          content = data.data;
        } else if (data.payload) {
          if (typeof data.payload === 'string') {
            try {
              const payload = JSON.parse(data.payload);
              content = payload.text || payload.content || payload.message || payload.transcript || '';
            } catch (e) {
              content = data.payload;
            }
          } else if (typeof data.payload === 'object') {
            content = data.payload.text || data.payload.content || data.payload.message || data.payload.transcript || '';
          }
        }

        // Enhanced speaker detection
        if (data.speaker) {
          speaker = data.speaker;
        } else if (data.from === 'user' || data.source === 'user' || messageType.includes('user') || data.role === 'user') {
          speaker = 'User';
        } else if (data.from === 'assistant' || data.from === 'ai' || data.source === 'ai' || messageType.includes('ai') || messageType.includes('assistant') || data.role === 'assistant') {
          speaker = 'AI Avatar';
        } else if (messageType.includes('avatar') || messageType.includes('bot')) {
          speaker = 'AI Avatar';
        } else if (data.action === 'user_message' || data.type === 'user_input') {
          speaker = 'User';
        } else if (data.action === 'bot_message' || data.type === 'bot_response') {
          speaker = 'AI Avatar';
        }

        // Save any message with meaningful content
        if (content && content.trim().length > 0 && content.trim().length < 10000) {
          console.log('💾 Saving message - Speaker:', speaker, 'Content:', content);
          
          saveTranscript({
            session_id: sessionId,
            speaker: speaker,
            content: content.trim(),
            timestamp: new Date().toISOString(),
            metadata: {
              messageType: messageType,
              originalData: data,
              origin: event.origin,
              messageCount: messageCount,
              action: data.action || null,
              event: data.event || null
            },
          });
        } else {
          console.log('❌ No valid content found in message, not saving');
          console.log('Content length:', content.length, 'Content preview:', content.substring(0, 100));
        }

        // Handle system events with more specificity
        if (messageType === 'conversation_started' || messageType === 'session_start' || data.action === 'start' || data.action === 'init') {
          saveTranscript({
            session_id: sessionId,
            speaker: 'System',
            content: `Conversation started with new avatar (${messageType})`,
            timestamp: new Date().toISOString(),
            metadata: {
              messageType: 'system_event',
              event: messageType,
              originalData: data
            },
          });
        }

        if (messageType === 'conversation_ended' || messageType === 'session_end' || data.action === 'end') {
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
      }
    };

    // Track iframe loading errors
    iframe.onerror = (error) => {
      console.error('Iframe loading error:', error);
      setConnectionStatus('failed');
      setErrorDetails(prev => [...prev, 'Iframe failed to load']);
    };

    // Add message listener
    window.addEventListener('message', handleMessage);
    console.log('Message listener added for session:', sessionId);

    // Append iframe to container
    containerRef.current.appendChild(iframe);

    // Enhanced connection monitoring
    iframe.onload = () => {
      console.log('🚀 Iframe loaded successfully with new avatar');
      setConnectionStatus('connecting');
      
      // Send initialization messages
      setTimeout(() => {
        const initMessages = [
          { type: 'init', session_id: sessionId, timestamp: new Date().toISOString() },
          { type: 'ready', session_id: sessionId },
          { action: 'connect', session_id: sessionId },
          { event: 'ready', session_id: sessionId },
          { type: 'streaming-embed', action: 'init' },
          { type: 'transcript_request', enabled: true, session_id: sessionId }
        ];

        initMessages.forEach((msg, index) => {
          setTimeout(() => {
            console.log('📤 Sending init message:', msg);
            try {
              iframe.contentWindow?.postMessage(msg, host);
            } catch (e) {
              console.error('Failed to send message:', e);
            }
          }, (index + 1) * 1000);
        });
      }, 2000);
    };

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up HeyGen embed for session:', sessionId);
      window.removeEventListener('message', handleMessage);
      if (containerRef.current && iframe.parentNode) {
        containerRef.current.removeChild(iframe);
      }
    };
  }, [onTranscriptSaved, messageCount]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'disconnected':
        return <Wifi className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to HeyGen';
      case 'connecting':
        return 'Connecting to HeyGen...';
      case 'failed':
        return 'Connection failed';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown status';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>HeyGen AI Avatar (Judy Teacher)</span>
          <div className="flex items-center space-x-2 text-sm">
            {getStatusIcon()}
            <span className={`${connectionStatus === 'connected' ? 'text-green-600' : 
                             connectionStatus === 'failed' ? 'text-red-600' : 
                             connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-gray-600'}`}>
              {getStatusText()}
            </span>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Interact with the AI avatar below. Messages received: {messageCount}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status Alert */}
        {connectionStatus === 'failed' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Connection Issues Detected:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Check if the new avatar configuration is working</li>
                  <li>Verify the knowledge base is accessible</li>
                  <li>Ensure sharing permissions are enabled</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div 
          ref={containerRef}
          className="relative w-full h-[600px] bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          {/* iframe will be inserted here by useEffect */}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Debug Info:</strong> Messages received: {messageCount} | 
              Status: {connectionStatus} | New Avatar: Judy Teacher
            </p>
          </div>
          
          {errorDetails.length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">
                <strong>Recent Errors:</strong>
              </p>
              <ul className="text-xs text-red-500 mt-1">
                {errorDetails.slice(-3).map((error, index) => (
                  <li key={index} className="truncate">• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HeyGenEmbed;
