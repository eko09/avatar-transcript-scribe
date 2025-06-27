
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Wifi, WifiOff, CheckCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
  const [useIframeMode, setUseIframeMode] = useState(false);
  
  // HeyGen URLs
  const HEYGEN_TOKEN = 'NDA4NTU0MThhNmRlNGE4ZWEzNzMwMzBjZTAwZTAzNDUtMTc1MDA4NDUyMA==';
  const HEYGEN_IFRAME_URL = 'https://labs.heygen.com/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdWR5X1RlYWNoZXJfU2l0dGluZzJfcHVibGljIiwicHJldmlld0ltZyI6Imh0dHBzOi8vZmlsZXMyLmhlend.com/avatar/v3/74447a27859a456c955e01f21ef18216_45620/preview_talk_1.webp","needRemoveBackground":false,"knowledgeBaseId":"f4438415581ee42f090a5f2f35f0309be","username":"a845989ef75646f99ffcda9cf030025e5"}&inIFrame=1';

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
      setMessageCount(prev => prev + 1);
      
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

  const initializeIframeMode = () => {
    if (!containerRef.current) return;

    console.log('🔄 Initializing iframe mode...');
    setConnectionStatus('connecting');
    
    // Generate session ID
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = HEYGEN_IFRAME_URL;
    iframe.width = '100%';
    iframe.height = '600';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.allow = 'microphone; camera';
    
    // Clear and add iframe
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(iframe);
    
    // Set up message listener for iframe communication
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== 'https://labs.heygen.com') return;
      
      console.log('📨 Received message from HeyGen iframe:', event.data);
      
      // Handle different message types
      if (event.data.type === 'AVATAR_READY') {
        setConnectionStatus('connected');
        console.log('✅ Avatar ready in iframe mode');
      } else if (event.data.type === 'CONVERSATION' && event.data.message) {
        // Save conversation data
        saveTranscript({
          session_id: sessionIdRef.current,
          speaker: event.data.speaker || 'Unknown',
          content: event.data.message,
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'IFRAME_MESSAGE',
            source: 'iframe',
            eventData: event.data
          }
        });
      }
    };

    window.addEventListener('message', messageListener);
    
    // Set connected after a delay (since we can't reliably detect iframe load)
    setTimeout(() => {
      setConnectionStatus('connected');
      console.log('✅ Iframe mode initialized');
    }, 3000);

    // Store cleanup function
    (containerRef.current as any)._cleanup = () => {
      window.removeEventListener('message', messageListener);
    };
  };

  const initializeSDKMode = () => {
    if (!containerRef.current) return;

    // Generate session ID
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🚀 Starting HeyGen SDK session:', sessionIdRef.current);

    // Clear container
    containerRef.current.innerHTML = '';

    // Try multiple SDK URLs
    const sdkUrls = [
      'https://sdk.heygen.com/latest/streaming-avatar.js',
      'https://app.heygen.com/sdk/streaming-avatar.js',
      'https://api.heygen.com/sdk/streaming-avatar.js'
    ];

    let currentUrlIndex = 0;

    const tryLoadSDK = () => {
      if (currentUrlIndex >= sdkUrls.length) {
        console.log('❌ All SDK URLs failed, switching to iframe mode');
        setUseIframeMode(true);
        return;
      }

      const script = document.createElement('script');
      script.src = sdkUrls[currentUrlIndex];
      script.onload = () => {
        console.log('✅ HeyGen SDK loaded from:', sdkUrls[currentUrlIndex]);
        initializeHeyGenAvatar();
      };
      script.onerror = () => {
        console.error('❌ Failed to load SDK from:', sdkUrls[currentUrlIndex]);
        currentUrlIndex++;
        tryLoadSDK();
      };
      document.head.appendChild(script);
    };

    const initializeHeyGenAvatar = () => {
      try {
        console.log('🔄 Initializing HeyGen Avatar...');
        
        // Check if SDK is available
        if (!(window as any).HeyGenStreamingAvatar) {
          console.error('❌ HeyGen SDK not found in window object');
          setUseIframeMode(true);
          return;
        }

        // Initialize HeyGen Streaming Avatar
        const avatar = new (window as any).HeyGenStreamingAvatar({
          token: HEYGEN_TOKEN,
          container: containerRef.current,
          avatarId: 'Judy_Teacher_Sitting2_public',
          quality: 'high',
          knowledgeBaseId: 'f4438415581ee42f090a5f2f35f0309be',
        });

        // Set up event listeners
        avatar.on('AVATAR_TALKING_MESSAGE', (event: any) => {
          console.log('🤖 Avatar talking:', event);
          if (event.message && event.message.trim()) {
            saveTranscript({
              session_id: sessionIdRef.current,
              speaker: 'AI Avatar',
              content: event.message.trim(),
              timestamp: new Date().toISOString(),
              metadata: { type: 'AVATAR_TALKING_MESSAGE', eventData: event }
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
              metadata: { type: 'USER_TALKING_MESSAGE', eventData: event }
            });
          }
        });

        avatar.on('AVATAR_READY', () => {
          console.log('✅ Avatar ready');
          setConnectionStatus('connected');
        });

        avatar.on('CONNECTION_ERROR', (error: any) => {
          console.error('❌ Connection error:', error);
          setConnectionStatus('failed');
          setErrorDetails(prev => [...prev, `Connection error: ${error.message || 'Unknown error'}`]);
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
        setUseIframeMode(true);
      }
    };

    tryLoadSDK();
  };

  useEffect(() => {
    if (!containerRef.current) return;

    setConnectionStatus('connecting');
    setErrorDetails([]);

    if (useIframeMode) {
      initializeIframeMode();
    } else {
      initializeSDKMode();
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up HeyGen component');
      
      if (containerRef.current) {
        // Clean up avatar instance
        if ((containerRef.current as any)._avatar) {
          try {
            (containerRef.current as any)._avatar.destroy();
          } catch (error) {
            console.warn('⚠️ Error during avatar cleanup:', error);
          }
        }
        
        // Clean up iframe listeners
        if ((containerRef.current as any)._cleanup) {
          (containerRef.current as any)._cleanup();
        }
      }
      
      // Remove script if it exists
      const existingScript = document.querySelector('script[src*="heygen"]');
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, [useIframeMode, onTranscriptSaved]);

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
        return `Connected via ${useIframeMode ? 'Iframe' : 'SDK'}`;
      case 'connecting':
        return `Connecting via ${useIframeMode ? 'Iframe' : 'SDK'}...`;
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Session: {sessionIdRef.current} | Messages: {messageCount} | Saved: {savedTranscripts}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseIframeMode(!useIframeMode)}
              disabled={connectionStatus === 'connecting'}
            >
              Switch to {useIframeMode ? 'SDK' : 'Iframe'} Mode
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus === 'failed' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Issues Detected:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>SDK loading failed - trying iframe mode</li>
                  <li>Check internet connection</li>
                  <li>Verify HeyGen service availability</li>
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
                <p className="text-sm text-muted-foreground">
                  Loading HeyGen Avatar ({useIframeMode ? 'Iframe' : 'SDK'} mode)...
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Mode:</strong> {useIframeMode ? 'Iframe' : 'SDK'} | 
            <strong> Session:</strong> {sessionIdRef.current} | 
            <strong> Messages:</strong> {messageCount} | 
            <strong> Saved:</strong> {savedTranscripts}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            💡 <strong>Auto-fallback enabled:</strong> If SDK fails, automatically switches to iframe mode for better reliability.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeyGenEmbed;
