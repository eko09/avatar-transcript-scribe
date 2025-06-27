
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
  
  // HeyGen SDK token
  const HEYGEN_TOKEN = 'NDA4NTU0MThhNmRlNGE4ZWEzNzMwMzBjZTAwZTAzNDUtMTc1MDA4NDUyMA==';

  const saveTranscript = async (transcriptData: {
    session_id: string;
    speaker: string;
    content: string;
    timestamp: string;
    metadata?: any;
  }) => {
    try {
      console.log('🔄 Attempting to save transcript:', transcriptData);
      
      if (!transcriptData.session_id || !transcriptData.speaker || !transcriptData.content) {
        console.error('❌ Missing required fields:', transcriptData);
        return false;
      }

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

    // Generate session ID
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🚀 Starting HeyGen SDK session:', sessionIdRef.current);

    // Clear container
    containerRef.current.innerHTML = '';

    // Load HeyGen SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.heygen.com/latest/streaming-avatar.js';
    script.onload = () => {
      console.log('✅ HeyGen SDK loaded');
      initializeHeyGenAvatar();
    };
    script.onerror = () => {
      console.error('❌ Failed to load HeyGen SDK');
      setConnectionStatus('failed');
      setErrorDetails(prev => [...prev, 'Failed to load HeyGen SDK']);
    };
    document.head.appendChild(script);

    const initializeHeyGenAvatar = () => {
      try {
        console.log('🔄 Initializing HeyGen Avatar...');
        
        // Initialize HeyGen Streaming Avatar
        const avatar = new (window as any).HeyGenStreamingAvatar({
          token: HEYGEN_TOKEN,
          container: containerRef.current,
          avatarId: 'Judy_Teacher_Sitting2_public', // Based on your embed URL
          quality: 'high',
          knowledgeBaseId: 'f4438415581ee42f090a5f2f35f0309be', // From your embed URL
        });

        // Set up event listeners for conversation capture
        avatar.on('AVATAR_TALKING_MESSAGE', (event: any) => {
          console.log('🤖 Avatar talking:', event);
          
          if (event.message && event.message.trim()) {
            saveTranscript({
              session_id: sessionIdRef.current,
              speaker: 'AI Avatar',
              content: event.message.trim(),
              timestamp: new Date().toISOString(),
              metadata: {
                type: 'AVATAR_TALKING_MESSAGE',
                eventData: event
              }
            });
          }
        });

        avatar.on('USER_TALKING_MESSAGE', (event: any) => {
          console.log('👤 User talking:', event);
          
          if (event.message && event.message.trim()) {
            saveTranscript({
              session_id: sessionIdRef.current,
              speaker: 'User',
              content: event.message.trim(),
              timestamp: new Date().toISOString(),
              metadata: {
                type: 'USER_TALKING_MESSAGE',
                eventData: event
              }
            });
          }
        });

        // Handle connection events
        avatar.on('AVATAR_READY', () => {
          console.log('✅ Avatar ready');
          setConnectionStatus('connected');
        });

        avatar.on('CONNECTION_ERROR', (error: any) => {
          console.error('❌ Connection error:', error);
          setConnectionStatus('failed');
          setErrorDetails(prev => [...prev, `Connection error: ${error.message || 'Unknown error'}`]);
        });

        avatar.on('CONNECTION_CLOSED', () => {
          console.log('🔌 Connection closed');
          setConnectionStatus('disconnected');
        });

        // Start the avatar
        avatar.start().then(() => {
          console.log('✅ HeyGen Avatar started successfully');
          setConnectionStatus('connected');
        }).catch((error: any) => {
          console.error('❌ Failed to start avatar:', error);
          setConnectionStatus('failed');
          setErrorDetails(prev => [...prev, `Failed to start avatar: ${error.message || 'Unknown error'}`]);
        });

        // Store avatar reference for cleanup
        (containerRef.current as any)._avatar = avatar;

      } catch (error) {
        console.error('❌ Error initializing HeyGen Avatar:', error);
        setConnectionStatus('failed');
        setErrorDetails(prev => [...prev, `Initialization error: ${(error as Error).message}`]);
      }
    };

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up HeyGen SDK');
      
      // Clean up avatar instance
      if (containerRef.current && (containerRef.current as any)._avatar) {
        try {
          (containerRef.current as any)._avatar.destroy();
        } catch (error) {
          console.warn('⚠️ Error during avatar cleanup:', error);
        }
      }
      
      // Remove script if it exists
      const existingScript = document.querySelector('script[src="https://sdk.heygen.com/latest/streaming-avatar.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
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
        {connectionStatus === 'failed' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Connection Issues Detected:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Check your internet connection</li>
                  <li>Verify the HeyGen token is valid</li>
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
          {connectionStatus === 'connecting' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Clock className="h-8 w-8 animate-pulse mx-auto mb-2 text-yellow-500" />
                <p className="text-sm text-muted-foreground">Loading HeyGen Avatar...</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>SDK Info:</strong> Session: {sessionIdRef.current} | 
            Messages: {messageCount} | Saved: {savedTranscripts} | Status: {connectionStatus}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            💡 <strong>Using HeyGen SDK:</strong> Now capturing AVATAR_TALKING_MESSAGE and USER_TALKING_MESSAGE events directly from the SDK.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeyGenEmbed;
