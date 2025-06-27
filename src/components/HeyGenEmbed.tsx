
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
  const [savedTranscripts, setSavedTranscripts] = useState(0);
  const sessionIdRef = useRef<string>('');

  const saveTranscript = async (transcriptData: {
    session_id: string;
    speaker: string;
    content: string;
    timestamp: string;
    metadata?: any;
  }) => {
    try {
      console.log('🔄 Attempting to save transcript:', transcriptData);
      
      // Validate required fields
      if (!transcriptData.session_id || !transcriptData.speaker || !transcriptData.content) {
        console.error('❌ Missing required fields:', transcriptData);
        return false;
      }

      // Ensure content is not empty or just whitespace
      if (transcriptData.content.trim().length === 0) {
        console.log('⚠️ Skipping empty content');
        return false;
      }

      const { data, error } = await supabase
        .from('transcripts')
        .insert({
          session_id: transcriptData.session_id,
          speaker: transcriptData.speaker,
          content: transcriptData.content.trim(),
          timestamp: transcriptData.timestamp,
          metadata: transcriptData.metadata || {},
        })
        .select();

      if (error) {
        console.error('❌ Supabase error saving transcript:', error);
        toast({
          title: "Database Error",
          description: `Failed to save transcript: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ Transcript saved successfully:', data);
      setSavedTranscripts(prev => prev + 1);
      
      toast({
        title: "Message Captured",
        description: `${transcriptData.speaker}: ${transcriptData.content.substring(0, 50)}...`,
      });
      
      onTranscriptSaved();
      return true;
    } catch (error) {
      console.error('❌ Unexpected error saving transcript:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving transcript",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const host = "https://labs.heygen.com";
    const url = host + "/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdWR5X1RlYWNoZXJfU2l0dGluZzJfcHVi%0D%0AbGljIiwicHJldmlld0ltZyI6Imh0dHBzOi8vZmlsZXMyLmhleWdlbi5haS9hdmF0YXIvdjMvZjk0%0D%0AYWUzZTg5ZjRjNGZmOTg1NDFhYjU5ZWZhNTg3OGJfNDU2MzAvcHJldmlld190YWxrXzIud2VicCIs%0D%0AIm5lZWRSZW1vdmVCYWNrZ3JvdW5kIjpmYWxzZSwia25vd2xlZGdlQmFzZUlkIjoiZjQ0Mzg0MTU4%0D%0AMWVlNDJmMDkwYTVmMmYzNWYwMzA5YmUiLCJ1c2VybmFtZSI6IjQwODU1NDE4YTZkZTRhOGVhMzcz%0D%0AMDMwY2UwMGUwMzQ1In0%3D&inIFrame=1";

    // Generate session ID once
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🚀 Starting HeyGen session:', sessionIdRef.current);

    // Clear container
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

    // Message handler
    const handleMessage = (event: MessageEvent) => {
      // Security check - only allow HeyGen origins
      if (!event.origin.includes('heygen.com') && !event.origin.includes('labs.heygen.com')) {
        return;
      }

      setMessageCount(prev => prev + 1);
      
      console.log('📨 Message received:', {
        origin: event.origin,
        type: event.data?.type,
        data: event.data
      });

      if (event.data && typeof event.data === 'object') {
        const data = event.data;
        const timestamp = new Date().toISOString();
        
        // Handle connection status
        if (data.type === 'streaming-embed') {
          if (data.action === 'ready' || data.action === 'connected') {
            setConnectionStatus('connected');
            setErrorDetails([]);
            saveTranscript({
              session_id: sessionIdRef.current,
              speaker: 'System',
              content: 'HeyGen session started',
              timestamp,
              metadata: { event: 'session_start', data }
            });
          } else if (data.action === 'error' || data.action === 'failed') {
            setConnectionStatus('failed');
            setErrorDetails(prev => [...prev, `HeyGen Error: ${JSON.stringify(data)}`]);
          }
        }

        // Capture all messages with content regardless of type
        const messageContent = data.message || data.text || data.content || '';
        
        if (messageContent && typeof messageContent === 'string' && messageContent.trim().length > 0) {
          let speaker = 'System';
          
          // Determine speaker based on various indicators
          if (data.type?.includes('user') || data.from === 'user' || data.source === 'user') {
            speaker = 'User';
          } else if (data.type?.includes('avatar') || data.from === 'avatar' || data.source === 'avatar') {
            speaker = 'AI Avatar';
          } else if (data.type?.includes('assistant') || data.role === 'assistant') {
            speaker = 'AI Avatar';
          }

          console.log(`💬 Saving ${speaker} message:`, messageContent.substring(0, 100));
          
          saveTranscript({
            session_id: sessionIdRef.current,
            speaker,
            content: messageContent.trim(),
            timestamp,
            metadata: {
              type: data.type,
              originalData: data,
              origin: event.origin
            }
          });
        }

        // Also capture specific HeyGen events
        const eventTypes = [
          'conversation_start', 'conversation_end', 'avatar_talking_message',
          'user_message', 'user_input', 'speech_recognition', 'avatar_response'
        ];

        if (eventTypes.includes(data.type)) {
          const eventContent = data.type === 'conversation_start' ? 'Conversation started' :
                               data.type === 'conversation_end' ? 'Conversation ended' :
                               messageContent || `Event: ${data.type}`;

          if (eventContent && eventContent.trim().length > 0) {
            saveTranscript({
              session_id: sessionIdRef.current,
              speaker: data.type.includes('user') ? 'User' : 
                      data.type.includes('avatar') ? 'AI Avatar' : 'System',
              content: eventContent,
              timestamp,
              metadata: { event: data.type, data }
            });
          }
        }
      }
    };

    // Add message listener
    window.addEventListener('message', handleMessage);

    // Handle iframe load
    iframe.onload = () => {
      console.log('✅ Iframe loaded successfully');
      setConnectionStatus('connected');
    };

    iframe.onerror = (error) => {
      console.error('❌ Iframe loading error:', error);
      setConnectionStatus('failed');
      setErrorDetails(prev => [...prev, 'Iframe failed to load']);
    };

    // Append iframe
    containerRef.current.appendChild(iframe);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up HeyGen embed');
      window.removeEventListener('message', handleMessage);
      if (containerRef.current && iframe.parentNode) {
        containerRef.current.removeChild(iframe);
      }
    };
  }, [onTranscriptSaved]);

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
          Session: {sessionIdRef.current} | Messages: {messageCount} | Saved: {savedTranscripts}
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
                  <li>Check your internet connection</li>
                  <li>Verify the HeyGen avatar is properly configured</li>
                  <li>Check browser console for detailed error messages</li>
                </ul>
                {errorDetails.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">Error Details:</p>
                    {errorDetails.slice(-2).map((error, index) => (
                      <p key={index} className="text-xs text-red-600 truncate">• {error}</p>
                    ))}
                  </div>
                )}
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
        
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Debug Info:</strong> Session: {sessionIdRef.current} | 
            Messages: {messageCount} | Saved: {savedTranscripts} | Status: {connectionStatus}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeyGenEmbed;
