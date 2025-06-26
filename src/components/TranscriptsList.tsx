
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, User, Bot, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Transcript {
  id: string;
  session_id: string;
  speaker: string;
  content: string;
  timestamp: string;
  created_at: string;
  metadata: any;
}

interface TranscriptsListProps {
  transcripts: Transcript[];
  loading: boolean;
  onRefresh: () => void;
}

const TranscriptsList: React.FC<TranscriptsListProps> = ({ 
  transcripts, 
  loading, 
  onRefresh 
}) => {
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM dd, yyyy HH:mm:ss");
    } catch {
      return timestamp;
    }
  };

  const getSpeakerIcon = (speaker: string) => {
    return speaker.toLowerCase().includes('user') || speaker.toLowerCase().includes('human') 
      ? <User className="h-4 w-4" />
      : <Bot className="h-4 w-4" />;
  };

  const getSpeakerColor = (speaker: string) => {
    return speaker.toLowerCase().includes('user') || speaker.toLowerCase().includes('human')
      ? "bg-blue-100 text-blue-800"
      : "bg-green-100 text-green-800";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading transcripts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Conversation Transcripts</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {transcripts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No transcripts found</p>
            <p className="text-sm">Start a conversation with the AI avatar to see transcripts here</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {transcripts.map((transcript) => (
              <div
                key={transcript.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={getSpeakerColor(transcript.speaker)}>
                      {getSpeakerIcon(transcript.speaker)}
                      <span className="ml-1">{transcript.speaker}</span>
                    </Badge>
                    <Badge variant="outline">
                      Session: {transcript.session_id}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimestamp(transcript.created_at)}
                  </div>
                </div>
                <p className="text-sm mb-2 leading-relaxed">{transcript.content}</p>
                {transcript.metadata && (
                  <div className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 py-0.5 rounded">
                      {JSON.stringify(transcript.metadata)}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TranscriptsList;
