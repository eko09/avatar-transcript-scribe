
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

  // Filter out unwanted system events that cause loops
  const shouldIgnoreMessage = (data: any, messageType: string, messageContent: string): boolean => {
    // Ignore intercom and other third-party events
    if (messageType.includes('intercom') || messageContent.includes('intercom')) {
      return true;
    }
    
    // Ignore empty or whitespace-only content
    if (!messageContent || messageContent.trim().length === 0) {
      return true;
    }
    
    // Ignore generic system ready events
    if (messageType === 'ready' && messageContent === 'HeyGen event: ready') {
      return true;
    }
    
    // Only capture meaningful conversation content
    const meaningfulEvents = [
      'user_message', 'avatar_message', 'user_speech', 'avatar_speech',
      'speech_recognition', 'text_to_speech', 'conversation'
    ];
    
    // If it's a HeyGen event, only allow specific meaningful ones
    if (messageContent.startsWith('HeyGen event:')) {
      const eventType = messageContent.replace('HeyGen event: ', '');
      return !meaningfulEvents.some(event => eventType.includes(event));
    }
    
    return false;
  };

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

    // Message handler with filtering to prevent loops
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Raw message received:', {
        origin: event.origin,
        data: event.data,
        type: typeof event.data,
        stringified: JSON.stringify(event.data)
      });

      // Security check - only allow HeyGen origins
      if (!event.origin.includes('heygen.com') && !event.origin.includes('labs.heygen.com')) {
        console.log('🚫 Rejected message from invalid origin:', event.origin);
        return;
      }

      setMessageCount(prev => prev + 1);
      const timestamp = new Date().toISOString();

      // Try to extract meaningful content from any message format
      let messageContent = '';
      let speaker = 'System';
      let messageType = 'unknown';

      if (event.data && typeof event.data === 'object') {
        const data = event.data;
        
        // Log the structure for debugging
        console.log('📋 Message structure:', {
          keys: Object.keys(data),
          type: data.type,
          action: data.action,
          event: data.event,
          message: data.message,
          text: data.text,
          content: data.content
        });

        // Extract content from various possible fields
        messageContent = data.message || data.text || data.content || data.transcript || '';
        messageType = data.type || data.event || data.action || 'message';
        
        // Determine speaker based on message type and content
        if (messageType.includes('user') || data.from === 'user' || data.speaker === 'user') {
          speaker = 'User';
        } else if (messageType.includes('avatar') || messageType.includes('assistant') || data.from === 'avatar') {
          speaker = 'AI Avatar';
        } else if (messageType.includes('system') || messageType.includes('ready') || messageType.includes('connected')) {
          speaker = 'System';
          if (!messageContent) {
            messageContent = `HeyGen event: ${messageType}`;
          }
        }

        // Handle HeyGen streaming events
        if (data.type === 'streaming-embed') {
          if (data.action === 'ready' || data.action === 'connected') {
            setConnectionStatus('connected');
            setErrorDetails([]);
            messageContent = 'HeyGen session ready';
            speaker = 'System';
          } else if (data.action === 'error' || data.action === 'failed') {
            setConnectionStatus('failed');
            setErrorDetails(prev => [...prev, `HeyGen Error: ${JSON.stringify(data)}`]);
            messageContent = `Error: ${data.message || 'Connection failed'}`;
            speaker = 'System';
          }
        }

        // Check if we should ignore this message (to prevent loops)
        if (shouldIgnoreMessage(data, messageType, messageContent)) {
          console.log('🚫 Ignoring message to prevent loop:', { messageType, messageContent });
          return;
        }

        // Capture meaningful messages only
        if (messageContent && typeof messageContent === 'string' && messageContent.trim().length > 0) {
          console.log(`💬 Capturing ${speaker} message (${messageType}):`, messageContent.substring(0, 100));
          
          saveTranscript({
            session_id: sessionIdRef.current,
            speaker,
            content: messageContent.trim(),
            timestamp,
            metadata: {
              type: messageType,
              originalData: data,
              origin: event.origin,
              fullMessage: data
            }
          });
        } else {
          console.log('⚠️ No extractable content from message:', data);
        }
      } else if (typeof event.data === 'string') {
        // Handle string messages
        console.log('📝 String message received:', event.data);
        
        // Check if we should ignore this string message
        if (shouldIgnoreMessage(null, 'string', event.data)) {
          console.log('🚫 Ignoring string message to prevent loop:', event.data);
          return;
        }
        
        if (event.data.trim().length > 0) {
          saveTranscript({
            session_id: sessionIdRef.current,
            speaker: 'System',
            content: event.data.trim(),
            timestamp,
            metadata: {
              type: 'string_message',
              origin: event.origin
            }
          });
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
          <p className="text-xs text-muted-foreground mt-1">
            💡 <strong>Tip:</strong> System events like 'intercom-snippet' are now filtered out to prevent loops. Only meaningful conversation messages will be captured.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeyGenEmbed;
