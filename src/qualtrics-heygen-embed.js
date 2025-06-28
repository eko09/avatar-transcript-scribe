
// HeyGen AI Avatar Integration for Qualtrics
// This script embeds HeyGen avatar and captures conversation transcripts

Qualtrics.SurveyEngine.addOnload(function() {
    // Configuration - Update these values for your setup
    const HEYGEN_TOKEN = 'NDA4NTU0MThhNmRlNGE4ZWEzNzMwMzBjZTAwZTAzNDUtMTc1MDA4NDUyMA==';
    const HEYGEN_AVATAR_ID = 'Judy_Teacher_Sitting2_public';
    const HEYGEN_KNOWLEDGE_BASE_ID = 'f4438415581ee42f090a5f2f35f0309be';
    
    // Supabase configuration - Replace with your actual credentials
    const SUPABASE_URL = "https://xcznuookkehqcfcrhevq.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjem51b29ra2VocWNmY3JoZXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTk4NzUsImV4cCI6MjA2NjQ3NTg3NX0.t9rsVefD7nElpgNiH9WGN5CymJrNL_KF_xNJFgNAeCg";

    // Generate unique session ID for this survey response
    const sessionId = `qualtrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const responseId = "${e://Field/ResponseID}"; // Qualtrics embedded data
    
    // Storage for conversation data
    let conversationLog = [];
    let avatar = null;

    // Initialize Supabase client
    function initializeSupabase() {
        if (typeof supabase === 'undefined') {
            // Load Supabase client library
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = function() {
                window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase client initialized');
            };
            document.head.appendChild(script);
        } else {
            window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    }

    // Save transcript to Supabase database
    async function saveTranscript(transcriptData) {
        if (!window.supabaseClient) {
            console.error('❌ Supabase client not initialized');
            return false;
        }

        try {
            console.log('🔄 Saving transcript:', transcriptData);
            
            const { data, error } = await window.supabaseClient
                .from('transcripts')
                .insert({
                    session_id: transcriptData.session_id,
                    speaker: transcriptData.speaker,
                    content: transcriptData.content,
                    timestamp: transcriptData.timestamp,
                    metadata: {
                        ...transcriptData.metadata,
                        qualtrics_response_id: responseId,
                        platform: 'qualtrics'
                    }
                });

            if (error) {
                console.error('❌ Error saving transcript:', error);
                return false;
            }

            console.log('✅ Transcript saved successfully:', data);
            return true;
        } catch (error) {
            console.error('❌ Unexpected error saving transcript:', error);
            return false;
        }
    }

    // Update Qualtrics embedded data with conversation summary
    function updateQualtricsData() {
        try {
            // Get last 10 messages for summary
            const recentMessages = conversationLog.slice(-10);
            const transcriptSummary = recentMessages.map(msg => 
                `${msg.speaker}: ${msg.content.substring(0, 100)}`
            ).join(' | ');

            // Update embedded data fields
            Qualtrics.SurveyEngine.setEmbeddedData('transcript_data', transcriptSummary);
            Qualtrics.SurveyEngine.setEmbeddedData('transcript_session_summary', JSON.stringify({
                session_id: sessionId,
                total_messages: conversationLog.length,
                user_messages: conversationLog.filter(m => m.speaker.includes('User')).length,
                avatar_messages: conversationLog.filter(m => m.speaker.includes('Avatar')).length,
                last_updated: new Date().toISOString()
            }));

            console.log('✅ Qualtrics embedded data updated');
        } catch (error) {
            console.error('❌ Error updating Qualtrics data:', error);
        }
    }

    // Process and save conversation message
    async function processMessage(speaker, content, eventData = null) {
        if (!content || content.trim().length === 0) {
            console.log('⚠️ Skipping empty message');
            return;
        }

        const messageData = {
            session_id: sessionId,
            speaker: speaker,
            content: content.trim(),
            timestamp: new Date().toISOString(),
            metadata: {
                event_type: eventData?.type || 'MESSAGE',
                event_data: eventData || {},
                qualtrics_response_id: responseId
            }
        };

        // Add to conversation log
        conversationLog.push(messageData);
        console.log(`📝 ${speaker}: ${content}`);

        // Save to database
        await saveTranscript(messageData);

        // Update Qualtrics embedded data
        updateQualtricsData();
    }

    // Initialize HeyGen SDK
    function initializeHeyGenSDK() {
        console.log('🚀 Initializing HeyGen SDK...');
        
        // Load HeyGen SDK
        const script = document.createElement('script');
        script.src = 'https://sdk.heygen.com/latest/streaming-avatar.js';
        script.onload = function() {
            try {
                console.log('✅ HeyGen SDK loaded');
                
                // Create avatar container
                const avatarContainer = document.getElementById('heygen-avatar-container');
                if (!avatarContainer) {
                    console.error('❌ Avatar container not found');
                    return;
                }

                // Initialize HeyGen Streaming Avatar
                avatar = new HeyGenStreamingAvatar({
                    token: HEYGEN_TOKEN,
                    container: avatarContainer,
                    avatarId: HEYGEN_AVATAR_ID,
                    quality: 'high',
                    knowledgeBaseId: HEYGEN_KNOWLEDGE_BASE_ID,
                });

                // Set up event listeners for conversation capture
                
                // Capture Avatar talking messages
                avatar.on('AVATAR_TALKING_MESSAGE', (message) => {
                    console.log('🤖 Avatar talking message:', message);
                    
                    // Extract the actual message content
                    const content = message.message || message.text || message.content || '';
                    if (content) {
                        processMessage('AI Avatar', content, {
                            type: 'AVATAR_TALKING_MESSAGE',
                            original_event: message
                        });
                    }
                });

                // Capture User talking messages
                avatar.on('USER_TALKING_MESSAGE', (message) => {
                    console.log('👤 User talking message:', message);
                    
                    // Extract the actual message content
                    const content = message.message || message.text || message.content || '';
                    if (content) {
                        processMessage('User', content, {
                            type: 'USER_TALKING_MESSAGE',
                            original_event: message
                        });
                    }
                });

                // Additional event listeners for better tracking
                avatar.on('AVATAR_READY', () => {
                    console.log('✅ Avatar ready');
                    processMessage('System', 'Avatar session started', {
                        type: 'AVATAR_READY',
                        session_id: sessionId
                    });
                });

                avatar.on('CONNECTION_ERROR', (error) => {
                    console.error('❌ Avatar connection error:', error);
                    processMessage('System', `Connection error: ${error.message || 'Unknown error'}`, {
                        type: 'CONNECTION_ERROR',
                        error: error
                    });
                });

                avatar.on('STREAM_READY', () => {
                    console.log('✅ Stream ready');
                    processMessage('System', 'Streaming started', {
                        type: 'STREAM_READY'
                    });
                });

                avatar.on('STREAM_DISCONNECTED', () => {
                    console.log('⚠️ Stream disconnected');
                    processMessage('System', 'Streaming ended', {
                        type: 'STREAM_DISCONNECTED'
                    });
                });

                // Start the avatar
                avatar.start().then(() => {
                    console.log('✅ HeyGen Avatar started successfully');
                }).catch((error) => {
                    console.error('❌ Failed to start avatar:', error);
                    processMessage('System', `Failed to start avatar: ${error.message}`, {
                        type: 'START_ERROR',
                        error: error
                    });
                });

            } catch (error) {
                console.error('❌ Error initializing HeyGen Avatar:', error);
            }
        };
        
        script.onerror = function() {
            console.error('❌ Failed to load HeyGen SDK');
        };
        
        document.head.appendChild(script);
    }

    // Create avatar container in the question
    function createAvatarContainer() {
        const questionContainer = document.getElementById(this.questionId);
        if (!questionContainer) {
            console.error('❌ Question container not found');
            return;
        }

        // Create avatar container
        const avatarHTML = `
            <div id="heygen-avatar-container" style="
                width: 100%; 
                height: 600px; 
                border: 1px solid #ccc; 
                border-radius: 8px; 
                background: #f9f9f9;
                margin: 20px 0;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    color: #666;
                ">
                    <div>Loading HeyGen AI Avatar...</div>
                    <div style="font-size: 12px; margin-top: 10px;">Session: ${sessionId}</div>
                </div>
            </div>
            <div style="margin: 10px 0; padding: 10px; background: #e8f4f8; border-radius: 4px; font-size: 12px; color: #666;">
                <strong>Instructions:</strong> Interact with the AI avatar above. Your conversation will be automatically captured and saved.
                <br><strong>Session ID:</strong> ${sessionId}
            </div>
        `;

        // Insert avatar container
        questionContainer.innerHTML = avatarHTML + questionContainer.innerHTML;
    }

    // Initialize everything
    try {
        console.log('🔄 Starting HeyGen Qualtrics integration...');
        console.log('📝 Session ID:', sessionId);
        console.log('📋 Response ID:', responseId);

        // Initialize components
        initializeSupabase();
        createAvatarContainer();
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            initializeHeyGenSDK();
        }, 1000);

    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
});

// Cleanup when leaving the page
Qualtrics.SurveyEngine.addOnunload(function() {
    try {
        if (avatar) {
            console.log('🧹 Cleaning up HeyGen Avatar...');
            avatar.destroy();
        }
    } catch (error) {
        console.warn('⚠️ Error during cleanup:', error);
    }
});
