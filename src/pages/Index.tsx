
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Database, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">HeyGen Transcript Manager</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Capture, store, and analyze conversations with your HeyGen AI avatars. 
            Keep track of all interactions in one centralized dashboard.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 my-12">
          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-blue-600 mx-auto" />
              <CardTitle>Real-time Capture</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Automatically capture and save all conversations with your HeyGen AI avatars
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-green-300 transition-colors">
            <CardHeader>
              <Database className="h-8 w-8 text-green-600 mx-auto" />
              <CardTitle>Secure Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Store all transcripts securely in Supabase with proper indexing for fast retrieval
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-purple-300 transition-colors">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-purple-600 mx-auto" />
              <CardTitle>Analytics & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Search through conversations, filter by session, and analyze interaction patterns
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Link to="/dashboard">
            <Button size="lg" className="px-8 py-3 text-lg">
              Open Dashboard
            </Button>
          </Link>
          <p className="text-sm text-gray-500">
            Start managing your HeyGen AI avatar conversations today
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
