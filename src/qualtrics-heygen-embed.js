
/*
 * Qualtrics HeyGen AI Avatar Embed Script
 * This script captures HeyGen avatar interactions and saves them to Supabase
 * 
 * Instructions for Qualtrics:
 * 1. Add this script to your Qualtrics survey JavaScript
 * 2. Create an Embedded Data field called "transcript_data" in your survey flow
 * 3. Replace the HeyGen embed URL with your specific avatar configuration
 * 4. The script will automatically capture and store all interactions
 */

Qualtrics.SurveyEngine.addOnload(function() {
    // Supabase configuration
    const SUPABASE_URL = "https://xcznuookkehqcfcrhevq.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjem51b29ra2VocWNmY3JoZXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTk4NzUsImV4cCI6MjA2NjQ3NTg3NX0.t9rsVefD7nElpgNiH9WGN5CymJrNL_KF_xNJFgNAeCg";
    
    // HeyGen embed configuration - replace with your specific avatar URL
    const HEYGEN_EMBED_URL = "https://labs.heygen.com/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJKdW5lX0hSX3B1YmxpYyIsInByZXZpZXdJbWciOiJodHRwczovL2ZpbGVzMi5oZXlnZW4uYWkvYXZhdGFyL3YzLzc0NDQ3YTI3ODU5YTQ1NmM5NTVlMDFmMjFlZjE4MjE2XzQ1NjIwL3ByZXZpZXdfdGFsa18xLndlYnAiLCJuZWVkUmVtb3ZlQmFja2dyb3VuZCI6ZmFsc2UsImtub3dsZWRnZUJhc2VJZCI6ImFjODY1MWMzOWNlNTRiNTQ4NTkzOWRhZWM4YjdiZjRlIiwidXNlcm5hbWUiOiJhODQ1OTg5ZWY3NTY0NmY5OWZmY2RhOWNmMDMwMjVlNSJ9&inIFrame=1";
    
    // Generate unique session ID for this survey response
    const sessionId = `qualtrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const responseId = Qualtrics.SurveyEngine.getResponseID();
    
    // Store for collecting transcript data
    let transcriptData = [];
    
    console.log('Qualtrics HeyGen Integration - Starting session:', sessionId);
    console.log('Qualtrics Response ID:', responseId);
    
    // Function to save transcript to Supabase
    async function saveToSupabase(transcriptEntry) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/transcripts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    speaker: transcriptEntry.speaker,
                    content: transcriptEntry.content,
                    timestamp: transcriptEntry.timestamp,
                    metadata: {
                        ...transcriptEntry.metadata,
                        qualtrics_response_id: responseId,
                        source: 'qualtrics_embed'
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            console.log('Successfully saved to Supabase:', transcriptEntry.speaker, transcriptEntry.content.substring(0, 50));
        } catch (error) {
            console.error('Error saving to Supabase:', error);
        }
    }
    
    // Function to update Qualtrics Embedded Data
    function updateQualtricsData() {
        try {
            const transcriptSummary = {
                session_id: sessionId,
                response_id: responseId,
                total_messages: transcriptData.length,
                last_updated: new Date().toISOString(),
                messages: transcriptData.slice(-10) // Keep last 10 messages to avoid data limits
            };
            
            // Set the embedded data field
            Qualtrics.SurveyEngine.setEmbeddedData('transcript_data', JSON.stringify(transcriptSummary));
            console.log('Updated Qualtrics Embedded Data');
        } catch (error) {
            console.error('Error updating Qualtrics data:', error);
        }
    }
    
    // Function to handle transcript messages
    function handleTranscript(transcriptEntry) {
        // Add to local storage
        transcriptData.push(transcriptEntry);
        
        // Save to Supabase
        saveToSupabase(transcriptEntry);
        
        // Update Qualtrics Embedded Data
        updateQualtricsData();
        
        console.log('Processed transcript:', transcriptEntry.speaker, '-', transcriptEntry.content.substring(0, 100));
    }
    
    // Message event listener for HeyGen iframe communication
    function handleMessage(event) {
        console.log('Received message:', event.data, 'from origin:', event.origin);
        
        // Security check - ensure message is from HeyGen
        if (!event.origin.includes('heygen.com') && !event.origin.includes('labs.heygen.com')) {
            return;
        }
        
        if (event.data && typeof event.data === 'object') {
            const { type, action, data } = event.data;
            const timestamp = new Date().toISOString();
            
            // Handle different types of messages from HeyGen
            switch (type) {
                case 'transcript':
                case 'ai_response':
                case 'avatar_speech':
                    if (data && data.content) {
                        handleTranscript({
                            speaker: data.speaker || 'AI Avatar',
                            content: data.content,
                            timestamp: data.timestamp || timestamp,
                            metadata: {
                                type: type,
                                source: 'heygen_avatar',
                                ...data.metadata
                            }
                        });
                    }
                    break;
                
                case 'user_message':
                case 'user_input':
                case 'user_speech':
                    if (data && (data.message || data.content)) {
                        handleTranscript({
                            speaker: 'User',
                            content: data.message || data.content,
                            timestamp: data.timestamp || timestamp,
                            metadata: {
                                type: type,
                                source: 'user_input',
                                ...data.metadata
                            }
                        });
                    }
                    break;
                
                case 'conversation_start':
                    handleTranscript({
                        speaker: 'System',
                        content: 'Conversation started in Qualtrics survey',
                        timestamp: timestamp,
                        metadata: {
                            type: 'system_event',
                            event: 'conversation_start',
                            qualtrics_response_id: responseId,
                            ...data
                        }
                    });
                    break;
                
                case 'conversation_end':
                    handleTranscript({
                        speaker: 'System',
                        content: 'Conversation ended in Qualtrics survey',
                        timestamp: timestamp,
                        metadata: {
                            type: 'system_event',
                            event: 'conversation_end',
                            qualtrics_response_id: responseId,
                            total_messages: transcriptData.length,
                            ...data
                        }
                    });
                    break;
                
                case 'streaming-embed':
                    console.log('HeyGen streaming embed action:', action);
                    if (action === 'ready') {
                        handleTranscript({
                            speaker: 'System',
                            content: 'HeyGen avatar ready for interaction',
                            timestamp: timestamp,
                            metadata: {
                                type: 'system_event',
                                event: 'avatar_ready',
                                qualtrics_response_id: responseId
                            }
                        });
                    }
                    break;
                
                default:
                    console.log('Unknown HeyGen message type:', type, data);
            }
        }
    }
    
    // Add the message event listener
    window.addEventListener('message', handleMessage);
    
    // Create and inject the HeyGen iframe
    function createHeyGenEmbed() {
        // Find the question container or create a container
        const questionContainer = document.querySelector('#' + this.questionId) || document.querySelector('.QuestionOuter');
        
        if (!questionContainer) {
            console.error('Could not find question container for HeyGen embed');
            return;
        }
        
        // Create container for the embed
        const embedContainer = document.createElement('div');
        embedContainer.style.cssText = `
            width: 100%;
            max-width: 800px;
            margin: 20px auto;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = HEYGEN_EMBED_URL;
        iframe.allow = 'microphone';
        iframe.style.cssText = `
            width: 100%;
            height: 500px;
            border: none;
            border-radius: 8px;
        `;
        iframe.title = 'HeyGen AI Avatar';
        
        embedContainer.appendChild(iframe);
        
        // Add title and instructions
        const titleElement = document.createElement('h3');
        titleElement.textContent = 'AI Avatar Interview';
        titleElement.style.cssText = 'margin-bottom: 10px; color: #333;';
        
        const instructionElement = document.createElement('p');
        instructionElement.textContent = 'Please interact with the AI avatar below. Your conversation will be automatically recorded.';
        instructionElement.style.cssText = 'margin-bottom: 15px; color: #666; font-size: 14px;';
        
        // Insert into question container
        const wrapper = document.createElement('div');
        wrapper.appendChild(titleElement);
        wrapper.appendChild(instructionElement);
        wrapper.appendChild(embedContainer);
        
        questionContainer.appendChild(wrapper);
        
        // Send initialization message after iframe loads
        setTimeout(() => {
            const initMessage = {
                type: 'init',
                session_id: sessionId,
                timestamp: new Date().toISOString(),
                source: 'qualtrics'
            };
            iframe.contentWindow?.postMessage(initMessage, 'https://labs.heygen.com');
        }, 2000);
        
        console.log('HeyGen embed created successfully');
    }
    
    // Initialize the embed
    createHeyGenEmbed.call(this);
    
    // Log session start
    handleTranscript({
        speaker: 'System',
        content: 'Qualtrics survey session started with HeyGen integration',
        timestamp: new Date().toISOString(),
        metadata: {
            type: 'system_event',
            event: 'qualtrics_session_start',
            qualtrics_response_id: responseId,
            session_id: sessionId
        }
    });
});

// Clean up on page unload
Qualtrics.SurveyEngine.addOnunload(function() {
    console.log('Qualtrics HeyGen Integration - Session ending');
    
    // Final update to embedded data
    try {
        const finalSummary = {
            session_completed: true,
            total_messages: transcriptData?.length || 0,
            session_end: new Date().toISOString()
        };
        Qualtrics.SurveyEngine.setEmbeddedData('transcript_session_summary', JSON.stringify(finalSummary));
    } catch (error) {
        console.error('Error in cleanup:', error);
    }
});
