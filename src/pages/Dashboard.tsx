
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, User, MessageSquare, Search } from "lucide-react";
import TranscriptsList from "@/components/TranscriptsList";
import HeyGenEmbed from "@/components/HeyGenEmbed";
import { useToast } from "@/hooks/use-toast";

interface Transcript {
  id: string;
  session_id: string;
  speaker: string;
  content: string;
  timestamp: string;
  created_at: string;
  metadata: any;
}

const Dashboard = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const { toast } = useToast();

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching transcripts from database...');
      
      let query = supabase
        .from('transcripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedSession) {
        query = query.eq('session_id', selectedSession);
      }

      if (searchTerm) {
        query = query.ilike('content', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching transcripts:', error);
        toast({
          title: "Error",
          description: "Failed to fetch transcripts",
          variant: "destructive",
        });
        return;
      }

      console.log(`✅ Fetched ${data?.length || 0} transcripts`);
      setTranscripts(data || []);
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranscripts();
  }, [searchTerm, selectedSession]);

  const handleTranscriptSaved = () => {
    console.log('📝 Transcript saved, refreshing dashboard...');
    fetchTranscripts();
  };

  const uniqueSessions = [...new Set(transcripts.map(t => t.session_id))];
  const totalSessions = uniqueSessions.length;
  const totalTranscripts = transcripts.length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">HeyGen Transcript Dashboard</h1>
            <p className="text-muted-foreground">Manage and analyze your AI avatar conversations</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {uniqueSessions.length > 0 && `Latest: ${uniqueSessions[0]?.substring(0, 20)}...`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transcripts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTranscripts}</div>
              <p className="text-xs text-muted-foreground">
                {loading ? 'Loading...' : 'Up to date'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueSessions.length}</div>
              <p className="text-xs text-muted-foreground">
                Manual refresh enabled
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transcripts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transcripts">Transcripts ({totalTranscripts})</TabsTrigger>
            <TabsTrigger value="avatar">AI Avatar</TabsTrigger>
          </TabsList>

          <TabsContent value="transcripts" className="space-y-4">
            {/* Search and Filter */}
            <Card>
              <CardHeader>
                <CardTitle>Search & Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search transcripts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-64">
                    <select
                      value={selectedSession}
                      onChange={(e) => setSelectedSession(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="">All Sessions ({totalSessions})</option>
                      {uniqueSessions.map(sessionId => (
                        <option key={sessionId} value={sessionId}>
                          {sessionId.length > 30 ? `${sessionId.substring(0, 30)}...` : sessionId}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {transcripts.length === 0 && !loading && (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border">
                    <p className="text-sm text-yellow-800">
                      <strong>No transcripts found.</strong> Try interacting with the AI Avatar tab to generate some conversations!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <TranscriptsList 
              transcripts={transcripts} 
              loading={loading}
              onRefresh={fetchTranscripts}
            />
          </TabsContent>

          <TabsContent value="avatar">
            <HeyGenEmbed onTranscriptSaved={handleTranscriptSaved} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
